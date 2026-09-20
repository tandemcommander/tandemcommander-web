# One-off environment probe for the capture spike (spec 007, research R2).
# Answers: is UAC filtering active in the Sandbox, and which launch method
# gives the application a non-elevated token (no "(Administrator)" suffix)?
$ErrorActionPreference = 'Continue'
$OutDir = 'C:\out'
$exe = 'C:\Program Files\Tandem Commander\tandemcommander.exe'
$report = [ordered]@{}

if ($env:USERNAME -ne 'WDAGUtilityAccount') { Write-Error 'sandbox only'; exit 90 }
$job = Get-Content 'C:\job\job.json' -Raw | ConvertFrom-Json
Add-Type -Path 'C:\guest\Win32.cs' -ReferencedAssemblies System.Drawing
[TcShots.Win32]::EnablePerMonitorDpi()
Set-Culture -CultureInfo 'en-US'

$p = Start-Process -FilePath (Join-Path 'C:\installer' $job.installer) -ArgumentList '/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART' -Wait -PassThru
$report['installExit'] = $p.ExitCode

$lua = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System'
$report['EnableLUA'] = $lua.EnableLUA
$report['ConsentPromptBehaviorAdmin'] = $lua.ConsentPromptBehaviorAdmin
$report['FilterAdministratorToken'] = $lua.FilterAdministratorToken
$report['driverIntegrity'] = (whoami /groups | Select-String 'Mandatory Level') -join ' ; '
$report['isAdminUser'] = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

Copy-Item 'C:\demo\files' 'C:\Workspace' -Recurse -Force -ErrorAction SilentlyContinue

function Probe([string]$label, [scriptblock]$start) {
    Get-Process tandemcommander -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Milliseconds 500
    $entry = [ordered]@{}
    try {
        & $start
        $deadline = (Get-Date).AddSeconds(20)
        do {
            Start-Sleep -Milliseconds 400
            $proc = Get-Process tandemcommander -ErrorAction SilentlyContinue | Select-Object -First 1
            $w = if ($proc) { [TcShots.Win32]::FindTopLevelWindows(@($proc.Id)) | Where-Object { $_.Title -like '*Tandem Commander*' } | Select-Object -First 1 } else { $null }
        } until ($w -or (Get-Date) -gt $deadline)
        if ($w) {
            $entry['title'] = $w.Title
            # WM_CLOSE, then whatever dialog appears
            [TcShots.Win32]::CloseWindow($w.Handle)
            Start-Sleep -Seconds 3
            $rest = [TcShots.Win32]::FindTopLevelWindows(@($proc.Id)) | ForEach-Object { "$($_.ClassName): $($_.Title)" }
            $entry['afterClose'] = if ($proc.HasExited) { 'exited' } else { ($rest -join ' | ') }
            if (-not $proc.HasExited) {
                [TcShots.Win32]::Capture([TcShots.Win32]::Foreground(), (Join-Path $OutDir "close-$label.png"), $true)
            }
        } else {
            $entry['title'] = 'NO WINDOW'
        }
    } catch { $entry['error'] = "$_" }
    Get-Process tandemcommander -ErrorAction SilentlyContinue | Stop-Process -Force
    return $entry
}

$report['direct'] = Probe 'direct' { Start-Process -FilePath $exe -ArgumentList '-l', 'C:\Workspace\Documents', '-r', 'C:\Workspace\Projects' }

$report['task'] = Probe 'task' {
    Unregister-ScheduledTask -TaskName 'tc-probe' -Confirm:$false -ErrorAction SilentlyContinue
    $a = New-ScheduledTaskAction -Execute $exe -Argument '-l C:\Workspace\Documents -r C:\Workspace\Projects'
    $pr = New-ScheduledTaskPrincipal -UserId "$env:COMPUTERNAME\$env:USERNAME" -LogonType Interactive -RunLevel Limited
    Register-ScheduledTask -TaskName 'tc-probe' -Action $a -Principal $pr -Force | Out-Null
    Start-ScheduledTask -TaskName 'tc-probe'
}

$report['normalUser'] = Probe 'normalUser' {
    [TcShots.Win32]::StartAsNormalUser($exe, '-l C:\Workspace\Documents -r C:\Workspace\Projects', 'C:\Workspace') | Out-Null
}

$report['medium'] = Probe 'medium' {
    $mpid = [TcShots.Win32]::StartAtMediumIntegrity($exe, '-l C:\Workspace\Documents -r C:\Workspace\Projects', 'C:\Workspace')
    $script:mediumPid = $mpid
    Start-Sleep -Seconds 4
    $script:mediumAlive = [bool](Get-Process -Id $mpid -ErrorAction SilentlyContinue)
    $all = @()
    Get-Process -ErrorAction SilentlyContinue | ForEach-Object {
        $proc = $_
        [TcShots.Win32]::FindTopLevelWindows(@($proc.Id)) | ForEach-Object {
            $all += "$($proc.ProcessName)($($proc.Id)) [$($_.ClassName)] $($_.Title)"
        }
    }
    $script:allWindows = $all
    try {
        Add-Type -AssemblyName System.Windows.Forms
        $b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        $bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.CopyFromScreen(0, 0, 0, 0, $bmp.Size)
        $bmp.Save('C:\out\desktop.png', [System.Drawing.Imaging.ImageFormat]::Png)
        $g.Dispose(); $bmp.Dispose()
    } catch { }
}

$report['mediumPid'] = $script:mediumPid
$report['mediumAlive'] = $script:mediumAlive
$report['allWindows'] = $script:allWindows
$report | ConvertTo-Json -Depth 6 | Set-Content (Join-Path $OutDir 'diagnose.json') -Encoding UTF8
'{"event":"diagnose-done"}' | Add-Content (Join-Path $OutDir 'progress.jsonl') -Encoding UTF8
if (-not $job.keep) { Stop-Computer -Force }
