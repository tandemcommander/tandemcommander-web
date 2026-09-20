# Screenshot guest driver — runs INSIDE Windows Sandbox as the logon command
# (spec: specs/007-release-news-gallery/, research R1/R2, contracts/scene-catalog.md).
#
# SPIKE CUT (tasks T032/T036): installs the published installer, bootstraps a
# base configuration, stages three hard-coded scenes — main window (light),
# main window (dark), Markdown viewer — and reports what the environment can
# do. The catalog-driven scene loop (steps.ps1, config layering, workspace
# manifest) replaces the hard-coded part after the spike (T037).
#
# Windows PowerShell 5.1 only — a fresh Sandbox has nothing else.
#
# NEVER run this on the host: it deletes and rewrites
# HKCU\Software\Tandem Commander. The guard below refuses outside the Sandbox.

$ErrorActionPreference = 'Stop'
$OutDir = 'C:\out'
$Progress = Join-Path $OutDir 'progress.jsonl'
$ProductKey = 'HKCU:\Software\Tandem Commander'
$CfgKey = Join-Path $ProductKey '0.1\Configuration'   # src/mainwnd2.cpp: SalamanderConfigurationRoots[0]
$BaseReg = 'C:\base-config.reg'

function Write-Progress-Line([string]$event, [hashtable]$data = @{}) {
    $data['event'] = $event
    $data['at'] = (Get-Date).ToString('o')
    $line = $data | ConvertTo-Json -Compress -Depth 6
    # The host tails this file from the other side of a shared folder, so a
    # write can collide with a read. Progress is diagnostics, never data:
    # retry a few times, then carry on rather than fail the run.
    for ($i = 0; $i -lt 5; $i++) {
        try { Add-Content -Path $Progress -Value $line -Encoding UTF8 -ErrorAction Stop; return }
        catch { Start-Sleep -Milliseconds 200 }
    }
}

function Save-Result($result) {
    $result | ConvertTo-Json -Depth 8 | Set-Content -Path (Join-Path $OutDir 'result.json') -Encoding UTF8
}

if ($env:USERNAME -ne 'WDAGUtilityAccount') {
    Write-Error 'run.ps1 must only run inside Windows Sandbox (user WDAGUtilityAccount). Refusing: it resets the application configuration of the current user.'
    exit 90
}

$job = Get-Content 'C:\job\job.json' -Raw | ConvertFrom-Json
$result = [ordered]@{ app = $null; environment = $null; checks = [ordered]@{}; scenes = @() }

try {
    Add-Type -Path 'C:\guest\Win32.cs' -ReferencedAssemblies System.Drawing
    Add-Type -AssemblyName System.Drawing
    [TcShots.Win32]::EnablePerMonitorDpi()
    Write-Progress-Line 'start' @{ siteVersion = $job.siteVersion; installer = $job.installer }

    # The Sandbox inherits the host's regional settings; screenshots use the
    # English UI, so dates and numbers must be English too (applies to
    # processes started from now on).
    Set-Culture -CultureInfo 'en-US'

    # ---- user account control -------------------------------------------
    # Windows Sandbox ships with UAC switched off (EnableLUA = 0), so every
    # process of its administrator account gets a High-integrity token and the
    # program appends "(Administrator)" to its title — which must never appear
    # in a published screenshot. Probes confirmed there is no way around it
    # from inside a session started this way: a Safer token and a duplicated
    # token lowered to medium integrity both fail with 0xc0000142, because the
    # window station itself is high. Switching UAC on needs a restart of the
    # guest, so the driver does that once and continues on the second boot.
    $UacMarker = Join-Path $OutDir 'uac-enabled.marker'
    $policyKey = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System'
    $enableLua = (Get-ItemProperty $policyKey -Name EnableLUA -ErrorAction SilentlyContinue).EnableLUA
    $result.checks['enableLUA'] = $enableLua
    if ($enableLua -ne 1 -and -not (Test-Path $UacMarker) -and $job.uacRestart -ne $false) {
        # The same restart also switches the guest's display language to
        # English. With no configuration of its own the program follows the
        # Windows UI language, and the Sandbox inherits the host's — which is
        # how the first runs came out in Czech.
        try {
            Set-WinUILanguageOverride -Language en-US
            Set-WinUserLanguageList -LanguageList en-US -Force
            Set-WinSystemLocale -SystemLocale en-US
        } catch { }
        Set-ItemProperty $policyKey -Name 'EnableLUA' -Value 1 -Type DWord
        Set-ItemProperty $policyKey -Name 'ConsentPromptBehaviorAdmin' -Value 0 -Type DWord  # elevate silently, never prompt
        Set-ItemProperty $policyKey -Name 'EnableInstallerDetection' -Value 0 -Type DWord
        New-Item -ItemType File -Path $UacMarker -Force | Out-Null
        Write-Progress-Line 'uac-restart'
        Restart-Computer -Force
        Start-Sleep -Seconds 120       # the restart takes over; never returns
    }

    # ---- WebView2 (Markdown and Code Viewer need it) --------------------
    function Get-WebView2Version {
        foreach ($key in 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
                         'HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
                         'HKCU:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}') {
            if (Test-Path $key) { $pv = (Get-ItemProperty $key).pv; if ($pv -and $pv -ne '0.0.0.0') { return $pv } }
        }
        return $null
    }
    $wv2 = Get-WebView2Version
    if (-not $wv2 -and $job.webview2Installer) {
        Write-Progress-Line 'webview2-install'
        $p = Start-Process -FilePath (Join-Path 'C:\installer' $job.webview2Installer) -ArgumentList '/silent', '/install' -Wait -PassThru
        $wv2 = Get-WebView2Version
        if (-not $wv2) { $wv2 = "install exit code $($p.ExitCode), version not registered" }
    }
    $result.checks['webview2'] = if ($wv2) { "$wv2" } else { 'MISSING' }

    # ---- install the published installer --------------------------------
    Write-Progress-Line 'install'
    # Skipped when a restart of the guest already installed it (see above).
    $exe = 'C:\Program Files\Tandem Commander\tandemcommander.exe'
    if (-not (Test-Path $exe)) {
        $setup = Join-Path 'C:\installer' $job.installer
        $p = Start-Process -FilePath $setup -ArgumentList '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/NORESTARTAPPLICATIONS' -Wait -PassThru
        if ($p.ExitCode -ne 0) { throw "installer exited with code $($p.ExitCode)" }
    }
    if (-not (Test-Path $exe)) { throw "installed program not found at $exe" }
    Get-Process tandemcommander -ErrorAction SilentlyContinue | Stop-Process -Force

    $vi = (Get-Item $exe).VersionInfo
    $appVersion = '{0}.{1}.{2}' -f $vi.ProductMajorPart, $vi.ProductMinorPart, $vi.ProductBuildPart
    $result.app = [ordered]@{ version = $appVersion; build = $vi.FilePrivatePart; productVersion = $vi.ProductVersion; path = $exe }
    Write-Progress-Line 'installed' @{ version = $appVersion }

    if ([version]$appVersion -lt [version]$job.siteVersion) {
        $result['status'] = 'refused'
        $result['reason'] = "installed version $appVersion is older than the site's version $($job.siteVersion)"
        Save-Result $result
        Write-Progress-Line 'refused' @{ reason = $result.reason }
        if (-not $job.keep) { Stop-Computer -Force }
        exit 3
    }

    # ---- demo workspace --------------------------------------------------
    # The committed files, plus what demo/workspace.json says to generate here:
    # names Git and Windows tooling handle badly (Unicode, a path past 260
    # characters), archives, and bulk trees. Finally every timestamp is pinned,
    # because dates and times are visible in every panel.
    Write-Progress-Line 'workspace'
    $WS = 'C:\Workspace'
    if (Test-Path $WS) { Remove-Item $WS -Recurse -Force }
    Copy-Item 'C:\demo\files' $WS -Recurse -Force

    $manifest = Get-Content 'C:\demo\workspace.json' -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($item in $manifest.generate) {
        $target = Join-Path $WS $item.path
        switch ($item.type) {
            'dir' { New-Item -ItemType Directory -Path $target -Force | Out-Null }
            'file' {
                New-Item -ItemType Directory -Path (Split-Path $target) -Force | Out-Null
                Set-Content -LiteralPath $target -Value $item.content -Encoding UTF8
            }
            'longpath' {
                # The \\?\ prefix lifts the 260-character limit, but only for
                # the .NET file APIs — the PowerShell providers choke on it.
                $deep = $target
                for ($i = 0; $i -lt [int]$item.depth; $i++) { $deep = Join-Path $deep $item.segment }
                [void][System.IO.Directory]::CreateDirectory('\\?\' + $deep)
                [System.IO.File]::WriteAllText('\\?\' + (Join-Path $deep $item.leaf), 'A file behind a very long path.')
            }
            'zip' {
                New-Item -ItemType Directory -Path (Split-Path $target) -Force | Out-Null
                Compress-Archive -Path (Join-Path $WS $item.from) -DestinationPath $target -Force
            }
            'bulk' {
                New-Item -ItemType Directory -Path $target -Force | Out-Null
                $bytes = New-Object byte[] ([int]$item.bytes)
                $rand = New-Object Random 20260920          # same content in every run
                $rand.NextBytes($bytes)
                for ($n = 1; $n -le [int]$item.count; $n++) {
                    $name = $item.pattern -replace '\{n\}', ('{0:D2}' -f $n)
                    [IO.File]::WriteAllBytes((Join-Path $target $name), $bytes)
                }
            }
            default { throw "workspace.json: unknown item type '$($item.type)'" }
        }
    }

    # Times: the default first, then the globs, deepest entries first so a
    # parent is not touched again by the file written inside it.
    $default = [datetime]$manifest.times.default
    # -ErrorAction: the long-path branch is beyond what the provider can walk.
    Get-ChildItem $WS -Recurse -Force -ErrorAction SilentlyContinue |
        Sort-Object { $_.FullName.Length } -Descending | ForEach-Object {
            try { $_.LastWriteTime = $default } catch { }
        }
    foreach ($glob in ($manifest.times | Get-Member -MemberType NoteProperty | Where-Object { $_.Name -ne 'default' })) {
        $when = [datetime]$manifest.times.($glob.Name)
        Get-ChildItem (Join-Path $WS $glob.Name) -Recurse -Force -ErrorAction SilentlyContinue |
            Sort-Object { $_.FullName.Length } -Descending | ForEach-Object { try { $_.LastWriteTime = $when } catch { } }
    }
    (Get-Item $WS).LastWriteTime = $default

    # ---- starting the application ---------------------------------------
    # The Sandbox logon command runs elevated, and an elevated instance appends
    # "(Administrator)" to its title (src/mainwnd1.cpp: integrity level >= High).
    # A scheduled task registered with RunLevel "Limited" starts the program at
    # medium integrity as the same interactive user, so the title is clean and
    # the configuration still lives in this account's HKCU.
    $TaskName = 'tc-shots-launch'

    # With UAC switched on (above), a copy of the driver's own token lowered to
    # medium integrity starts the program exactly as double-clicking it would:
    # a plain command line the program parses itself, and no elevation. The
    # scheduled task is the fallback — it also runs unelevated, but it mangles
    # the arguments, so the panels end up at C:\ instead of the demo workspace.
    function Start-AppProcess([string]$arguments) {
        Get-Process tandemcommander -ErrorAction SilentlyContinue | Stop-Process -Force
        Start-Sleep -Milliseconds 300
        $started = $null
        try {
            $newPid = [TcShots.Win32]::StartAtMediumIntegrity($exe, $arguments, 'C:\Workspace')
            $deadline = (Get-Date).AddSeconds(20)
            do {
                Start-Sleep -Milliseconds 300
                $started = Get-Process -Id $newPid -ErrorAction SilentlyContinue
            } until ($started -or (Get-Date) -gt $deadline)
            if ($started) { $script:launchMethod = 'medium-token' }
        } catch {
            $script:launchError = "$_"
        }
        if (-not $started) {
            Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
            $action = New-ScheduledTaskAction -Execute $exe -Argument $arguments
            $principal = New-ScheduledTaskPrincipal -UserId "$env:COMPUTERNAME\$env:USERNAME" -LogonType Interactive -RunLevel Limited
            $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero)
            Register-ScheduledTask -TaskName $TaskName -Action $action -Principal $principal -Settings $settings -Force | Out-Null
            Start-ScheduledTask -TaskName $TaskName
            $deadline = (Get-Date).AddSeconds(30)
            do {
                Start-Sleep -Milliseconds 300
                $started = Get-Process tandemcommander -ErrorAction SilentlyContinue | Select-Object -First 1
            } until ($started -or (Get-Date) -gt $deadline)
            if ($started) { $script:launchMethod = 'scheduled-task' }
        }
        if (-not $started) { throw "tandemcommander.exe did not start (medium token: $script:launchError)" }
        return $started
    }

    function Get-AppWindows($proc) {
        [TcShots.Win32]::FindTopLevelWindows(@($proc.Id)) | ForEach-Object { "$($_.ClassName): $($_.Title)" }
    }

    # Asks the window to close, answers a confirmation dialog if one appears,
    # and waits; returns $true when the process ended.
    function Close-App($proc, $hwnd) {
        [TcShots.Win32]::CloseWindow($hwnd)
        if ($proc.WaitForExit(4000)) { return $true }
        for ($attempt = 0; $attempt -lt 3; $attempt++) {
            # A modal dialog is a separate top-level window of the same process.
            $dialog = [TcShots.Win32]::FindTopLevelWindows(@($proc.Id)) |
                      Where-Object { $_.Handle -ne $hwnd } | Select-Object -First 1
            if ($dialog) {
                [TcShots.Win32]::Activate($dialog.Handle)
                Start-Sleep -Milliseconds 300
                [TcShots.Win32]::SendChord('Enter')
            } else {
                [TcShots.Win32]::Activate($hwnd)
                Start-Sleep -Milliseconds 200
                [TcShots.Win32]::SendChord('Alt+F4')
            }
            if ($proc.WaitForExit(5000)) { return $true }
        }
        return $false
    }

    $MainWindowClass = 'TandemCommanderMainWindowVer01'

    function Wait-MainWindow($proc) {
        $deadline = (Get-Date).AddSeconds(60)
        do {
            Start-Sleep -Milliseconds 400
            # By class, not by title: the splash screen carries the product
            # name too, and vanishes while we are measuring it.
            $main = [TcShots.Win32]::FindTopLevelWindows(@($proc.Id)) |
                    Where-Object { $_.ClassName -eq $MainWindowClass } | Select-Object -First 1
        } until ($main -or (Get-Date) -gt $deadline)
        if (-not $main) { throw 'main window did not appear within 60 s (first-run dialog? see the evidence image)' }
        # The splash screen may still be on top of it.
        $settle = (Get-Date).AddSeconds(15)
        do { Start-Sleep -Milliseconds 400 } while ((Get-Date) -lt $settle -and
            ([TcShots.Win32]::FindTopLevelWindows(@($proc.Id)) | Where-Object { $_.ClassName -ne $MainWindowClass }))
        return $main
    }

    # No configuration is inherited from anywhere: the product key is deleted
    # and the handful of values a scene needs is written into a fresh one. The
    # program fills in every other default itself, and since nothing is ever
    # saved back (instances are killed, never closed), one scene cannot leak
    # state into the next.
    function Reset-Config([string]$theme) {
        Get-Process tandemcommander -ErrorAction SilentlyContinue | Stop-Process -Force
        Start-Sleep -Milliseconds 300
        if (Test-Path $ProductKey) { Remove-Item $ProductKey -Recurse -Force }
        # With no configuration at all the program starts as it does for a new
        # user: it registers the plugins that ship with it (so F3 opens the
        # Markdown and Code viewers) and follows the Windows display language,
        # which the restart above set to English. A configuration key, even an
        # almost empty one, makes it skip that first-run work — so one is
        # written only for the scenes that need a non-default value.
        if ($theme -eq 'dark') {
            New-Item -Path $CfgKey -Force | Out-Null
            # Value name and encoding: src/mainwnd2.cpp, src/themes.h
            Set-ItemProperty $CfgKey -Name 'Theme Mode' -Value ([int]$job.themeValues.$theme) -Type DWord
        }
    }

    function Start-App([string]$left, [string]$right) {
        # No quotes around the paths: the program receives them literally, and
        # every demo path is free of spaces by design.
        # A trailing backslash marks a directory: without it the program treats
        # the last component as an item to put the cursor on in its parent, so
        # "C:\Workspace" lands the panel in "C:\" with Workspace highlighted.
        $proc = Start-AppProcess ('-l ' + $left.TrimEnd('\') + '\ -r ' + $right.TrimEnd('\') + '\ -p 1')
        $main = Wait-MainWindow $proc
        return @{ Process = $proc; Main = $main }
    }

    function Wait-Window($proc, [string]$titleContains, [int]$timeoutMs) {
        $deadline = (Get-Date).AddMilliseconds($timeoutMs)
        do {
            Start-Sleep -Milliseconds 300
            $w = [TcShots.Win32]::FindTopLevelWindows(@($proc.Id)) | Where-Object { $_.Title -like "*$titleContains*" -and $_.Title -notlike '*- Tandem Commander*' } | Select-Object -First 1
        } until ($w -or (Get-Date) -gt $deadline)
        if (-not $w) { throw "waitWindow timed out: titleContains='$titleContains'" }
        return $w
    }

    function Assert-Window($hwnd) {
        $b = [TcShots.Win32]::GetFrameBounds($hwnd)
        if (($b.Right - $b.Left) -lt 100 -or ($b.Bottom - $b.Top) -lt 100) {
            throw "the window is gone or has no size (frame $($b.Right - $b.Left) x $($b.Bottom - $b.Top))"
        }
    }

    function Wait-Settled($hwnd, [int]$timeoutMs) {
        Assert-Window $hwnd
        $deadline = (Get-Date).AddMilliseconds($timeoutMs)
        $prev = [TcShots.Win32]::CaptureBitmap($hwnd)
        do {
            Start-Sleep -Milliseconds 250
            try {
                $cur = [TcShots.Win32]::CaptureBitmap($hwnd)
                $diff = [TcShots.Win32]::Difference($prev, $cur)
                $prev.Dispose(); $prev = $cur
            } catch {
                # the window is still being laid out; measure again
                $diff = 1
            }
        } until ($diff -eq 0 -or (Get-Date) -gt $deadline)
        $prev.Dispose()
    }

    # One retry per scene: starting a program and driving it by keyboard is
    # occasionally disturbed by something outside the scene (a slow first
    # start, a stray focus change), and a retry costs 25 seconds.
    function Invoke-Scene([string]$id, [string]$theme, [scriptblock]$body) {
        $entry = Invoke-SceneOnce $id $theme $body
        if ($entry.status -eq 'failed') {
            Write-Progress-Line 'scene-retry' @{ id = $id; theme = $theme; reason = $entry.reason }
            $retry = Invoke-SceneOnce $id $theme $body
            if ($retry.status -eq 'ok') { $retry['retried'] = $true; return $retry }
            $retry['firstAttempt'] = $entry.reason
            return $retry
        }
        return $entry
    }

    function Invoke-SceneOnce([string]$id, [string]$theme, [scriptblock]$body) {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        Write-Progress-Line 'scene' @{ id = $id; theme = $theme }
        $entry = [ordered]@{ id = $id; theme = $theme }
        try {
            Reset-Config $theme
            $file = "$id-$theme.png"
            $info = & $body (Join-Path $OutDir $file)
            $bmp = [System.Drawing.Bitmap]::FromFile((Join-Path $OutDir $file))
            $entry['status'] = 'ok'; $entry['file'] = $file
            $entry['launchMethod'] = $script:launchMethod
            $entry['width'] = $bmp.Width; $entry['height'] = $bmp.Height
            $entry['dominantColourShare'] = [math]::Round([TcShots.Win32]::DominantColourShare($bmp), 3)
            if ($info) { $entry['windowTitle'] = "$info" }
            $bmp.Dispose()
        } catch {
            $entry['status'] = 'failed'; $entry['reason'] = "$_"
            try {
                $fg = [TcShots.Win32]::Foreground()
                if ($fg -ne [IntPtr]::Zero) {
                    [TcShots.Win32]::Capture($fg, (Join-Path $OutDir "$id-$theme.fail.png"), $true)
                    $entry['evidence'] = "$id-$theme.fail.png"; $entry['foregroundTitle'] = [TcShots.Win32]::TitleOf($fg)
                }
            } catch { }
        } finally {
            Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
            Get-Process tandemcommander -ErrorAction SilentlyContinue | Stop-Process -Force
            $entry['ms'] = $sw.ElapsedMilliseconds
        }
        Write-Progress-Line 'scene-done' @{ id = $id; theme = $theme; status = $entry.status }
        return $entry
    }


    # ---- scenes from the catalog ----------------------------------------
    # The step vocabulary of contracts/scene-catalog.md; anything else is
    # rejected before the Sandbox is even started (the host validates too).
    function Invoke-Steps($app, $steps, [string]$path) {
        $current = $app.Main
        $captured = $false
        foreach ($step in $steps) {
            $name = ($step | Get-Member -MemberType NoteProperty | Select-Object -First 1).Name
            $value = $step.$name
            switch ($name) {
                'focus' {
                    [TcShots.Win32]::Activate($app.Main.Handle)
                    [TcShots.Win32]::TypeText($value)      # quick search
                    Start-Sleep -Milliseconds 400
                    [TcShots.Win32]::SendChord('Esc')      # leave it, keep the cursor
                    Start-Sleep -Milliseconds 200
                }
                'keys' {
                    [TcShots.Win32]::Activate($current.Handle)
                    [TcShots.Win32]::SendChord($value)
                    Start-Sleep -Milliseconds 400
                }
                'text' { [TcShots.Win32]::TypeText($value); Start-Sleep -Milliseconds 200 }
                'waitWindow' {
                    $timeout = if ($value.timeoutMs) { [int]$value.timeoutMs } else { 30000 }
                    $current = Wait-Window $app.Process $value.titleContains $timeout
                    [TcShots.Win32]::Activate($current.Handle)
                }
                'resize' {
                    if ([TcShots.Win32]::IsResizable($current.Handle)) {
                        [TcShots.Win32]::MoveResize($current.Handle, 60, 60, [int]$value.width, [int]$value.height)
                    }
                }
                'settle' {
                    $timeout = if ($value.timeoutMs) { [int]$value.timeoutMs } else { 8000 }
                    Wait-Settled $current.Handle $timeout
                }
                'capture' {
                    if ($value -eq 'withDialog') {
                        # The dialog drawn onto the main window: a 600-pixel
                        # dialog on its own would be smaller than the card that
                        # shows it.
                        Assert-Window $app.Main.Handle
                        Assert-Window $current.Handle
                        [TcShots.Win32]::CaptureWithDialog($app.Main.Handle, $current.Handle, $path)
                        $script:lastTitle = [TcShots.Win32]::TitleOf($current.Handle)
                    } else {
                        $hwnd = if ($value -eq 'main') { $app.Main.Handle } else { $current.Handle }
                        Assert-Window $hwnd
                        [TcShots.Win32]::Capture($hwnd, $path, $false)
                        $script:lastTitle = [TcShots.Win32]::TitleOf($hwnd)
                    }
                    $captured = $true
                }
                'close' {
                    if ($value -eq 'app') { Get-Process tandemcommander -ErrorAction SilentlyContinue | Stop-Process -Force }
                    else { [TcShots.Win32]::CloseWindow($current.Handle); Start-Sleep -Milliseconds 600; $current = $app.Main }
                }
                default { throw "unknown step '$name'" }
            }
        }
        if (-not $captured) { throw 'the scene has no capture step' }
        return $script:lastTitle
    }

    $catalog = Get-Content 'C:\demo\scenes.json' -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($scene in $catalog) {
        if ($scene.mode -ne 'auto') { continue }
        if ($scene.published -eq $false) { continue }
        if ($job.scenes -and ($job.scenes -notcontains $scene.id)) { continue }
        foreach ($theme in $scene.themes) {
            if ($job.theme -and $job.theme -ne $theme) { continue }
            $result.scenes += Invoke-Scene $scene.id $theme {
                param($path)
                $cfg = $scene.stage.config
                $left = if ($cfg.left.path) { $cfg.left.path } else { 'C:\Workspace' }
                $right = if ($cfg.right.path) { $cfg.right.path } else { 'C:\Workspace' }
                $app = Start-App $left $right
                [TcShots.Win32]::Activate($app.Main.Handle)
                $w = if ($scene.stage.window.width) { [int]$scene.stage.window.width } else { 1200 }
                $h = if ($scene.stage.window.height) { [int]$scene.stage.window.height } else { 800 }
                [TcShots.Win32]::MoveResize($app.Main.Handle, 40, 40, $w, $h)
                if (-not $script:dpi) { $script:dpi = [TcShots.Win32]::GetDpi($app.Main.Handle) }
                Invoke-Steps $app $scene.stage.steps $path
            }
        }
    }

    $result.environment = [ordered]@{
        kind = 'sandbox'
        dpi = $script:dpi
        os = [System.Environment]::OSVersion.Version.ToString()
        user = $env:USERNAME
        culture = (Get-Culture).Name
    }
    $result['status'] = 'done'
} catch {
    $result['status'] = 'error'
    $result['reason'] = "$_"
    Write-Progress-Line 'error' @{ reason = "$_" }
}

Save-Result $result
Write-Progress-Line 'done' @{ status = $result.status }
if (-not $job.keep) { Stop-Computer -Force }
