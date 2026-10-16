$code = @'
using System;
using System.Runtime.InteropServices;

public class InteractiveLauncher {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct STARTUPINFO {
    public int cb;
    public string lpReserved;
    public string lpDesktop;
    public string lpTitle;
    public int dwX;
    public int dwY;
    public int dwXSize;
    public int dwYSize;
    public int dwXCountChars;
    public int dwYCountChars;
    public int dwFillAttribute;
    public int dwFlags;
    public short wShowWindow;
    public short cbReserved2;
    public IntPtr lpReserved2;
    public IntPtr hStdInput;
    public IntPtr hStdOutput;
    public IntPtr hStdError;
  }

  [StructLayout(LayoutKind.Sequential)]
  public struct PROCESS_INFORMATION {
    public IntPtr hProcess;
    public IntPtr hThread;
    public int dwProcessId;
    public int dwThreadId;
  }

  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool CreateProcess(
    string lpApplicationName,
    string lpCommandLine,
    IntPtr lpProcessAttributes,
    IntPtr lpThreadAttributes,
    bool bInheritHandles,
    uint dwCreationFlags,
    IntPtr lpEnvironment,
    string lpCurrentDirectory,
    ref STARTUPINFO lpStartupInfo,
    out PROCESS_INFORMATION lpProcessInformation
  );

  public static int LaunchOnDefaultDesktop(string appPath, string cmdLine) {
    STARTUPINFO si = new STARTUPINFO();
    si.cb = Marshal.SizeOf(si);
    si.lpDesktop = @"WinSta0\Default";
    si.dwFlags = 1; // STARTF_USESHOWWINDOW
    si.wShowWindow = 5; // SW_SHOW

    PROCESS_INFORMATION pi = new PROCESS_INFORMATION();
    string fullCmd = "\"" + appPath + "\" " + cmdLine;
    bool res = CreateProcess(null, fullCmd, IntPtr.Zero, IntPtr.Zero, false, 0, IntPtr.Zero, null, ref si, out pi);
    if (!res) {
      int err = Marshal.GetLastWin32Error();
      Console.WriteLine("CreateProcess failed with error: " + err);
      return -1;
    }
    Console.WriteLine("Launched successfully on WinSta0\\Default! PID: " + pi.dwProcessId);
    return pi.dwProcessId;
  }
}
'@

Add-Type -TypeDefinition $code -Language CSharp

$scrcpy = "C:\Users\prakhyat\AppData\Local\Microsoft\WinGet\Packages\Genymobile.scrcpy_Microsoft.Winget.Source_8wekyb3d8bbwe\scrcpy-win64-v4.1\scrcpy.exe"
$args = "-s emulator-5554 --window-title=`"ExamOpt Android App`" --always-on-top"

[InteractiveLauncher]::LaunchOnDefaultDesktop($scrcpy, $args)
