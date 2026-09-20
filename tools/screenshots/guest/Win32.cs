// Win32 helpers for the screenshot guest driver (spec:
// specs/007-release-news-gallery/, research R2). Loaded with Add-Type from
// Windows PowerShell 5.1, so: C# 5 syntax and .NET Framework 4.8 APIs only —
// no string interpolation, no expression-bodied members, no tuples.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

namespace TcShots
{
    public static class Win32
    {
        [StructLayout(LayoutKind.Sequential)]
        public struct RECT { public int Left, Top, Right, Bottom; }

        [StructLayout(LayoutKind.Sequential)]
        struct INPUT { public uint type; public InputUnion u; }

        [StructLayout(LayoutKind.Explicit)]
        struct InputUnion
        {
            [FieldOffset(0)] public KEYBDINPUT ki;
            [FieldOffset(0)] public MOUSEINPUT mi; // sizes the union correctly on x64
        }

        [StructLayout(LayoutKind.Sequential)]
        struct KEYBDINPUT { public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }

        [StructLayout(LayoutKind.Sequential)]
        struct MOUSEINPUT { public int dx, dy; public uint mouseData, dwFlags, time; public IntPtr dwExtraInfo; }

        delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lParam);

        [DllImport("user32.dll")] static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lParam);
        [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
        [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr hwnd, StringBuilder sb, int max);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr hwnd, StringBuilder sb, int max);
        [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
        [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr hwnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
        [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr hwnd, int cmd);
        [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr hwnd);
        [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
        [DllImport("user32.dll")] static extern bool PrintWindow(IntPtr hwnd, IntPtr hdc, uint flags);
        [DllImport("user32.dll")] static extern uint GetDpiForWindow(IntPtr hwnd);
        [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr hwnd, int index);
        [DllImport("user32.dll")] static extern uint SendInput(uint count, INPUT[] inputs, int size);
        [DllImport("user32.dll")] static extern bool PostMessage(IntPtr hwnd, uint msg, IntPtr wParam, IntPtr lParam);
        [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr value);
        [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr hwnd, int attr, out RECT rect, int size);

        const int DWMWA_EXTENDED_FRAME_BOUNDS = 9;
        const uint PW_RENDERFULLCONTENT = 2;
        const int GWL_STYLE = -16;
        const int WS_THICKFRAME = 0x00040000;
        const uint SWP_NOZORDER = 0x0004, SWP_NOACTIVATE = 0x0010;
        const int SW_RESTORE = 9;
        const uint INPUT_KEYBOARD = 1, KEYEVENTF_KEYUP = 0x0002, KEYEVENTF_UNICODE = 0x0004, KEYEVENTF_EXTENDEDKEY = 0x0001;

        // Pixel-exact geometry needs a per-monitor-aware process; call once at start.
        public static void EnablePerMonitorDpi()
        {
            try { SetProcessDpiAwarenessContext(new IntPtr(-4)); } catch (Exception) { }
        }

        public class WindowInfo
        {
            public IntPtr Handle; public uint ProcessId; public string Title; public string ClassName;
        }

        // Visible top-level windows of the given processes (the application and
        // its viewer/plugin windows all belong to tandemcommander.exe).
        public static List<WindowInfo> FindTopLevelWindows(int[] processIds)
        {
            HashSet<uint> pids = new HashSet<uint>();
            foreach (int p in processIds) pids.Add((uint)p);
            List<WindowInfo> found = new List<WindowInfo>();
            EnumWindows(delegate(IntPtr hwnd, IntPtr l)
            {
                if (!IsWindowVisible(hwnd)) return true;
                uint pid; GetWindowThreadProcessId(hwnd, out pid);
                if (!pids.Contains(pid)) return true;
                StringBuilder title = new StringBuilder(512); GetWindowText(hwnd, title, 512);
                StringBuilder cls = new StringBuilder(256); GetClassName(hwnd, cls, 256);
                RECT r; GetWindowRect(hwnd, out r);
                if (r.Right - r.Left < 50 || r.Bottom - r.Top < 50) return true; // tool/helper windows
                WindowInfo w = new WindowInfo();
                w.Handle = hwnd; w.ProcessId = pid; w.Title = title.ToString(); w.ClassName = cls.ToString();
                found.Add(w);
                return true;
            }, IntPtr.Zero);
            return found;
        }

        public static IntPtr Foreground() { return GetForegroundWindow(); }

        public static string TitleOf(IntPtr hwnd)
        {
            StringBuilder sb = new StringBuilder(512); GetWindowText(hwnd, sb, 512); return sb.ToString();
        }

        public static uint ProcessOf(IntPtr hwnd)
        {
            uint pid; GetWindowThreadProcessId(hwnd, out pid); return pid;
        }

        public static int GetDpi(IntPtr hwnd) { return (int)GetDpiForWindow(hwnd); }

        // Asks the window to close, exactly as its close button does: first the
        // system command the button itself sends, then the plain close message.
        // More reliable than Alt+F4, which depends on who has the focus.
        public static void CloseWindow(IntPtr hwnd)
        {
            const uint WM_CLOSE = 0x0010;
            const uint WM_SYSCOMMAND = 0x0112;
            const int SC_CLOSE = 0xF060;
            PostMessage(hwnd, WM_SYSCOMMAND, new IntPtr(SC_CLOSE), IntPtr.Zero);
            Thread.Sleep(300);
            PostMessage(hwnd, WM_CLOSE, IntPtr.Zero, IntPtr.Zero);
        }

        public static bool IsResizable(IntPtr hwnd) { return (GetWindowLong(hwnd, GWL_STYLE) & WS_THICKFRAME) != 0; }

        public static void Activate(IntPtr hwnd)
        {
            ShowWindow(hwnd, SW_RESTORE);
            SetForegroundWindow(hwnd);
            Thread.Sleep(150);
        }

        // The visible frame (without the invisible resize border and drop shadow).
        public static RECT GetFrameBounds(IntPtr hwnd)
        {
            RECT frame;
            if (DwmGetWindowAttribute(hwnd, DWMWA_EXTENDED_FRAME_BOUNDS, out frame, Marshal.SizeOf(typeof(RECT))) != 0)
                GetWindowRect(hwnd, out frame);
            return frame;
        }

        // Makes the VISIBLE frame exactly width × height at (x, y): SetWindowPos
        // works on the outer rectangle, which includes the invisible border.
        public static void MoveResize(IntPtr hwnd, int x, int y, int width, int height)
        {
            RECT outer; GetWindowRect(hwnd, out outer);
            RECT frame = GetFrameBounds(hwnd);
            int padL = frame.Left - outer.Left, padT = frame.Top - outer.Top;
            int padR = outer.Right - frame.Right, padB = outer.Bottom - frame.Bottom;
            SetWindowPos(hwnd, IntPtr.Zero, x - padL, y - padT, width + padL + padR, height + padT + padB, SWP_NOZORDER | SWP_NOACTIVATE);
            Thread.Sleep(200);
        }

        // PrintWindow renders the window itself — independent of what covers it
        // and without the desktop showing through rounded corners.
        public static Bitmap CaptureBitmap(IntPtr hwnd)
        {
            RECT outer; GetWindowRect(hwnd, out outer);
            RECT frame = GetFrameBounds(hwnd);
            int w = outer.Right - outer.Left, h = outer.Bottom - outer.Top;
            using (Bitmap full = new Bitmap(w, h, PixelFormat.Format32bppArgb))
            {
                using (Graphics g = Graphics.FromImage(full))
                {
                    IntPtr hdc = g.GetHdc();
                    try { PrintWindow(hwnd, hdc, PW_RENDERFULLCONTENT); }
                    finally { g.ReleaseHdc(hdc); }
                }
                Rectangle crop = new Rectangle(frame.Left - outer.Left, frame.Top - outer.Top,
                                               frame.Right - frame.Left, frame.Bottom - frame.Top);
                return full.Clone(crop, PixelFormat.Format24bppRgb);
            }
        }

        // Fallback (research R2): copy the screen area of the frame. Needs the
        // window uncovered and the session visible.
        public static Bitmap CaptureScreenBitmap(IntPtr hwnd)
        {
            RECT frame = GetFrameBounds(hwnd);
            int w = frame.Right - frame.Left, h = frame.Bottom - frame.Top;
            Bitmap bmp = new Bitmap(w, h, PixelFormat.Format24bppRgb);
            using (Graphics g = Graphics.FromImage(bmp))
                g.CopyFromScreen(frame.Left, frame.Top, 0, 0, new Size(w, h));
            return bmp;
        }

        public static void Capture(IntPtr hwnd, string path, bool fromScreen)
        {
            using (Bitmap bmp = fromScreen ? CaptureScreenBitmap(hwnd) : CaptureBitmap(hwnd))
                bmp.Save(path, ImageFormat.Png);
        }

        // A dialog rendered onto the window it belongs to, at the position it
        // really occupies. Both parts are captured with PrintWindow, so the
        // result does not depend on what covers the screen — and a small dialog
        // still yields a full-size picture, which a card-sized thumbnail of the
        // dialog alone would not.
        public static void CaptureWithDialog(IntPtr main, IntPtr dialog, string path)
        {
            RECT mainFrame = GetFrameBounds(main);
            RECT dialogFrame = GetFrameBounds(dialog);
            using (Bitmap background = CaptureBitmap(main))
            using (Bitmap front = CaptureBitmap(dialog))
            using (Graphics g = Graphics.FromImage(background))
            {
                int x = dialogFrame.Left - mainFrame.Left;
                int y = dialogFrame.Top - mainFrame.Top;
                // Keep the dialog inside the picture even if it sits off-centre.
                x = Math.Max(0, Math.Min(x, background.Width - front.Width));
                y = Math.Max(0, Math.Min(y, background.Height - front.Height));
                using (SolidBrush shadow = new SolidBrush(Color.FromArgb(40, 0, 0, 0)))
                    g.FillRectangle(shadow, x + 6, y + 6, front.Width, front.Height);
                g.DrawImage(front, x, y, front.Width, front.Height);
                background.Save(path, ImageFormat.Png);
            }
        }

        // Share of pixels that differ between two captures of the same window
        // (0 = identical). Used by "settle" and by the blank-render check.
        public static double Difference(Bitmap a, Bitmap b)
        {
            if (a.Width != b.Width || a.Height != b.Height) return 1.0;
            if (a.Width <= 0 || a.Height <= 0) return 1.0;
            Rectangle rect = new Rectangle(0, 0, a.Width, a.Height);
            BitmapData da = a.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
            BitmapData db = b.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
            try
            {
                // Each bitmap has its own stride; compare only what both hold.
                int bytes = Math.Min(Math.Abs(da.Stride), Math.Abs(db.Stride)) * a.Height;
                byte[] ba = new byte[bytes], bb = new byte[bytes];
                Marshal.Copy(da.Scan0, ba, 0, bytes); Marshal.Copy(db.Scan0, bb, 0, bytes);
                long diff = 0;
                for (int i = 0; i < bytes; i += 3)
                    if (ba[i] != bb[i] || ba[i + 1] != bb[i + 1] || ba[i + 2] != bb[i + 2]) diff++;
                return (double)diff / (bytes / 3);
            }
            finally { a.UnlockBits(da); b.UnlockBits(db); }
        }

        // Share of pixels equal to the most common colour — a window that did
        // not render (all black / all white) scores close to 1.
        public static double DominantColourShare(Bitmap bmp)
        {
            Dictionary<int, int> counts = new Dictionary<int, int>();
            int step = 4, total = 0, best = 0;
            for (int y = 0; y < bmp.Height; y += step)
                for (int x = 0; x < bmp.Width; x += step)
                {
                    int c = bmp.GetPixel(x, y).ToArgb(), n;
                    counts.TryGetValue(c, out n); counts[c] = ++n; total++;
                    if (n > best) best = n;
                }
            return total == 0 ? 1.0 : (double)best / total;
        }

        // ---- launching the application without administrator rights ------
        //
        // Windows Sandbox runs with UAC switched off (EnableLUA = 0), so every
        // process of its admin account gets a High-integrity token and Tandem
        // Commander appends "(Administrator)" to its title — which must never
        // appear in a published screenshot. There is no split token to fall
        // back on, so the driver builds a normal-user token itself (the Safer
        // API, exactly what "runas /trustlevel" uses), pins it to medium
        // integrity and starts the program with it.

        [StructLayout(LayoutKind.Sequential)]
        struct STARTUPINFO
        {
            public int cb; public string lpReserved, lpDesktop, lpTitle;
            public int dwX, dwY, dwXSize, dwYSize, dwXCountChars, dwYCountChars, dwFillAttribute, dwFlags;
            public short wShowWindow, cbReserved2; public IntPtr lpReserved2, hStdInput, hStdOutput, hStdError;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct PROCESS_INFORMATION { public IntPtr hProcess, hThread; public int dwProcessId, dwThreadId; }

        [StructLayout(LayoutKind.Sequential)]
        struct SID_AND_ATTRIBUTES { public IntPtr Sid; public uint Attributes; }

        [StructLayout(LayoutKind.Sequential)]
        struct TOKEN_MANDATORY_LABEL { public SID_AND_ATTRIBUTES Label; }

        [DllImport("advapi32.dll", SetLastError = true)]
        static extern bool SaferCreateLevel(uint scopeId, uint levelId, uint openFlags, out IntPtr levelHandle, IntPtr reserved);
        [DllImport("advapi32.dll", SetLastError = true)]
        static extern bool SaferComputeTokenFromLevel(IntPtr levelHandle, IntPtr inAccessToken, out IntPtr outAccessToken, uint flags, IntPtr reserved);
        [DllImport("advapi32.dll", SetLastError = true)]
        static extern bool SaferCloseLevel(IntPtr levelHandle);
        [DllImport("advapi32.dll", SetLastError = true)]
        static extern bool SetTokenInformation(IntPtr token, int infoClass, IntPtr info, uint length);
        [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        static extern bool ConvertStringSidToSid(string sid, out IntPtr pSid);
        // CreateProcessWithTokenW needs SE_IMPERSONATE (an administrator has
        // it); CreateProcessAsUser needs SE_ASSIGNPRIMARYTOKEN (usually not
        // held), so the first is tried first and the second is the fallback.
        [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        static extern bool CreateProcessWithTokenW(IntPtr token, uint logonFlags, string applicationName,
            string commandLine, uint creationFlags, IntPtr environment, string currentDirectory,
            ref STARTUPINFO startupInfo, out PROCESS_INFORMATION processInformation);
        [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        static extern bool CreateProcessAsUser(IntPtr token, string applicationName, string commandLine,
            IntPtr processAttributes, IntPtr threadAttributes, bool inheritHandles, uint creationFlags,
            IntPtr environment, string currentDirectory, ref STARTUPINFO startupInfo, out PROCESS_INFORMATION processInformation);
        [DllImport("kernel32.dll", SetLastError = true)] static extern bool CloseHandle(IntPtr handle);
        [DllImport("userenv.dll", SetLastError = true)] static extern bool CreateEnvironmentBlock(out IntPtr env, IntPtr token, bool inherit);
        [DllImport("userenv.dll", SetLastError = true)] static extern bool DestroyEnvironmentBlock(IntPtr env);

        const uint SAFER_SCOPEID_USER = 2;
        const uint SAFER_LEVELID_NORMALUSER = 0x20000;
        const uint SAFER_LEVEL_OPEN = 1;
        const int TokenIntegrityLevel = 25;
        const uint SE_GROUP_INTEGRITY = 0x20;
        const uint CREATE_UNICODE_ENVIRONMENT = 0x00000400;
        const string MEDIUM_INTEGRITY_SID = "S-1-16-8192";

        // Starts the program with a normal-user, medium-integrity token and
        // returns the new process id.
        public static int StartAsNormalUser(string exePath, string arguments, string workingDirectory)
        {
            IntPtr level;
            if (!SaferCreateLevel(SAFER_SCOPEID_USER, SAFER_LEVELID_NORMALUSER, SAFER_LEVEL_OPEN, out level, IntPtr.Zero))
                throw new InvalidOperationException("SaferCreateLevel failed: " + Marshal.GetLastWin32Error());
            IntPtr token;
            bool ok = SaferComputeTokenFromLevel(level, IntPtr.Zero, out token, 0, IntPtr.Zero);
            SaferCloseLevel(level);
            if (!ok) throw new InvalidOperationException("SaferComputeTokenFromLevel failed: " + Marshal.GetLastWin32Error());

            IntPtr mediumSid;
            if (!ConvertStringSidToSid(MEDIUM_INTEGRITY_SID, out mediumSid))
                throw new InvalidOperationException("ConvertStringSidToSid failed: " + Marshal.GetLastWin32Error());
            TOKEN_MANDATORY_LABEL label = new TOKEN_MANDATORY_LABEL();
            label.Label.Sid = mediumSid;
            label.Label.Attributes = SE_GROUP_INTEGRITY;
            int size = Marshal.SizeOf(typeof(TOKEN_MANDATORY_LABEL));
            IntPtr labelPtr = Marshal.AllocHGlobal(size);
            try
            {
                Marshal.StructureToPtr(label, labelPtr, false);
                if (!SetTokenInformation(token, TokenIntegrityLevel, labelPtr, (uint)(size + GetLengthSid(mediumSid))))
                    throw new InvalidOperationException("SetTokenInformation failed: " + Marshal.GetLastWin32Error());

                IntPtr env;
                if (!CreateEnvironmentBlock(out env, token, false)) env = IntPtr.Zero;
                STARTUPINFO si = new STARTUPINFO();
                si.cb = Marshal.SizeOf(typeof(STARTUPINFO));
                si.lpDesktop = "winsta0\\default";
                PROCESS_INFORMATION pi;
                string commandLine = "\"" + exePath + "\" " + arguments;
                bool started = CreateProcessWithTokenW(token, 0, null, commandLine,
                    CREATE_UNICODE_ENVIRONMENT, env, workingDirectory, ref si, out pi);
                int error = Marshal.GetLastWin32Error();
                if (!started)
                {
                    started = CreateProcessAsUser(token, null, commandLine, IntPtr.Zero, IntPtr.Zero, false,
                        CREATE_UNICODE_ENVIRONMENT, env, workingDirectory, ref si, out pi);
                    int error2 = Marshal.GetLastWin32Error();
                    if (!started)
                    {
                        if (env != IntPtr.Zero) DestroyEnvironmentBlock(env);
                        throw new InvalidOperationException("CreateProcessWithTokenW failed: " + error + "; CreateProcessAsUser failed: " + error2);
                    }
                }
                if (env != IntPtr.Zero) DestroyEnvironmentBlock(env);
                CloseHandle(pi.hThread);
                CloseHandle(pi.hProcess);
                return pi.dwProcessId;
            }
            finally
            {
                Marshal.FreeHGlobal(labelPtr);
                CloseHandle(token);
            }
        }

        [DllImport("advapi32.dll")] static extern int GetLengthSid(IntPtr sid);

        [DllImport("advapi32.dll", SetLastError = true)]
        static extern bool OpenProcessToken(IntPtr process, uint access, out IntPtr token);
        [DllImport("advapi32.dll", SetLastError = true)]
        static extern bool DuplicateTokenEx(IntPtr existing, uint access, IntPtr attributes, int impersonationLevel, int tokenType, out IntPtr newToken);
        [DllImport("kernel32.dll")] static extern IntPtr GetCurrentProcess();

        // A copy of this process's own token with the integrity level lowered
        // to medium. Unlike a Safer "normal user" token it keeps every SID —
        // including the logon SID the window station and desktop are shared
        // by — so user32 can still initialise (a Safer token fails with
        // 0xc0000142), while the program no longer sees itself as elevated.
        public static int StartAtMediumIntegrity(string exePath, string arguments, string workingDirectory)
        {
            const uint TOKEN_ALL = 0xF01FF;
            const uint MAXIMUM_ALLOWED = 0x02000000;
            IntPtr own;
            if (!OpenProcessToken(GetCurrentProcess(), TOKEN_ALL, out own))
                throw new InvalidOperationException("OpenProcessToken failed: " + Marshal.GetLastWin32Error());
            IntPtr token;
            bool duplicated = DuplicateTokenEx(own, MAXIMUM_ALLOWED, IntPtr.Zero, 2 /*SecurityImpersonation*/, 1 /*TokenPrimary*/, out token);
            CloseHandle(own);
            if (!duplicated) throw new InvalidOperationException("DuplicateTokenEx failed: " + Marshal.GetLastWin32Error());

            IntPtr mediumSid;
            if (!ConvertStringSidToSid(MEDIUM_INTEGRITY_SID, out mediumSid))
                throw new InvalidOperationException("ConvertStringSidToSid failed: " + Marshal.GetLastWin32Error());
            TOKEN_MANDATORY_LABEL label = new TOKEN_MANDATORY_LABEL();
            label.Label.Sid = mediumSid;
            label.Label.Attributes = SE_GROUP_INTEGRITY;
            int size = Marshal.SizeOf(typeof(TOKEN_MANDATORY_LABEL));
            IntPtr labelPtr = Marshal.AllocHGlobal(size);
            try
            {
                Marshal.StructureToPtr(label, labelPtr, false);
                if (!SetTokenInformation(token, TokenIntegrityLevel, labelPtr, (uint)(size + GetLengthSid(mediumSid))))
                    throw new InvalidOperationException("SetTokenInformation failed: " + Marshal.GetLastWin32Error());

                IntPtr env;
                if (!CreateEnvironmentBlock(out env, token, false)) env = IntPtr.Zero;
                STARTUPINFO si = new STARTUPINFO();
                si.cb = Marshal.SizeOf(typeof(STARTUPINFO));
                si.lpDesktop = "winsta0\\default";
                PROCESS_INFORMATION pi;
                string commandLine = "\"" + exePath + "\" " + arguments;
                bool started = CreateProcessWithTokenW(token, 0, null, commandLine,
                    CREATE_UNICODE_ENVIRONMENT, env, workingDirectory, ref si, out pi);
                int error = Marshal.GetLastWin32Error();
                if (!started)
                {
                    started = CreateProcessAsUser(token, null, commandLine, IntPtr.Zero, IntPtr.Zero, false,
                        CREATE_UNICODE_ENVIRONMENT, env, workingDirectory, ref si, out pi);
                    int error2 = Marshal.GetLastWin32Error();
                    if (!started)
                    {
                        if (env != IntPtr.Zero) DestroyEnvironmentBlock(env);
                        throw new InvalidOperationException("CreateProcessWithTokenW failed: " + error + "; CreateProcessAsUser failed: " + error2);
                    }
                }
                if (env != IntPtr.Zero) DestroyEnvironmentBlock(env);
                CloseHandle(pi.hThread);
                CloseHandle(pi.hProcess);
                return pi.dwProcessId;
            }
            finally
            {
                Marshal.FreeHGlobal(labelPtr);
                CloseHandle(token);
            }
        }

        // ---- keyboard ---------------------------------------------------

        static readonly Dictionary<string, ushort> Keys = BuildKeys();

        static Dictionary<string, ushort> BuildKeys()
        {
            Dictionary<string, ushort> k = new Dictionary<string, ushort>(StringComparer.OrdinalIgnoreCase);
            k["Ctrl"] = 0x11; k["Shift"] = 0x10; k["Alt"] = 0x12; k["Win"] = 0x5B;
            k["Enter"] = 0x0D; k["Esc"] = 0x1B; k["Tab"] = 0x09; k["Space"] = 0x20; k["Backspace"] = 0x08;
            k["Up"] = 0x26; k["Down"] = 0x28; k["Left"] = 0x25; k["Right"] = 0x27;
            k["Home"] = 0x24; k["End"] = 0x23; k["PageUp"] = 0x21; k["PageDown"] = 0x22;
            k["Insert"] = 0x2D; k["Delete"] = 0x2E; k["Apps"] = 0x5D;
            k["NumDivide"] = 0x6F; k["NumMultiply"] = 0x6A; k["NumPlus"] = 0x6B; k["NumMinus"] = 0x6D;
            for (int i = 1; i <= 12; i++) k["F" + i] = (ushort)(0x6F + i);
            for (char c = 'A'; c <= 'Z'; c++) k[c.ToString()] = (ushort)c;
            for (char c = '0'; c <= '9'; c++) k[c.ToString()] = (ushort)c;
            return k;
        }

        static readonly HashSet<ushort> Extended = new HashSet<ushort>(new ushort[] {
            0x26, 0x28, 0x25, 0x27, 0x24, 0x23, 0x21, 0x22, 0x2D, 0x2E, 0x5D, 0x6F, 0x5B });

        static INPUT Key(ushort vk, bool up)
        {
            INPUT i = new INPUT(); i.type = INPUT_KEYBOARD;
            i.u.ki.wVk = vk;
            i.u.ki.dwFlags = (up ? KEYEVENTF_KEYUP : 0) | (Extended.Contains(vk) ? KEYEVENTF_EXTENDEDKEY : 0);
            return i;
        }

        // "F3", "Ctrl+Shift+T", "Alt+5", "Down*3"
        public static void SendChord(string chord)
        {
            int repeat = 1;
            int star = chord.LastIndexOf('*');
            if (star > 0) { repeat = int.Parse(chord.Substring(star + 1)); chord = chord.Substring(0, star); }
            string[] parts = chord.Split('+');
            List<ushort> vks = new List<ushort>();
            foreach (string part in parts)
            {
                ushort vk;
                if (!Keys.TryGetValue(part.Trim(), out vk)) throw new ArgumentException("unknown key '" + part + "' in chord '" + chord + "'");
                vks.Add(vk);
            }
            for (int n = 0; n < repeat; n++)
            {
                List<INPUT> inputs = new List<INPUT>();
                foreach (ushort vk in vks) inputs.Add(Key(vk, false));
                for (int i = vks.Count - 1; i >= 0; i--) inputs.Add(Key(vks[i], true));
                SendInput((uint)inputs.Count, inputs.ToArray(), Marshal.SizeOf(typeof(INPUT)));
                Thread.Sleep(60);
            }
        }

        // Literal text as Unicode key events — independent of keyboard layout.
        public static void TypeText(string text)
        {
            foreach (char c in text)
            {
                INPUT down = new INPUT(); down.type = INPUT_KEYBOARD; down.u.ki.wScan = c; down.u.ki.dwFlags = KEYEVENTF_UNICODE;
                INPUT up = down; up.u.ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP;
                SendInput(2, new INPUT[] { down, up }, Marshal.SizeOf(typeof(INPUT)));
                Thread.Sleep(25);
            }
        }
    }
}
