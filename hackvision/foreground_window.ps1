$code = @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public class DesktopForegrounder {
  [DllImport("user32.dll")]
  public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);
  [DllImport("user32.dll")]
  public static extern bool EnumDesktopWindows(IntPtr hDesktop, EnumWindowsProc lpfn, IntPtr lParam);
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")]
  public static extern bool BringWindowToTop(IntPtr hWnd);
  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")]
  public static extern bool CloseDesktop(IntPtr hDesktop);

  public static void ForegroundTarget(string matchText) {
    IntPtr hDesk = OpenInputDesktop(0, false, 0x0100);
    if (hDesk == IntPtr.Zero) return;
    EnumDesktopWindows(hDesk, (hwnd, lparam) => {
      StringBuilder sb = new StringBuilder(256);
      GetWindowText(hwnd, sb, 256);
      string title = sb.ToString();
      if (title.IndexOf(matchText, StringComparison.OrdinalIgnoreCase) >= 0) {
        Console.WriteLine("Found & Foregrounding: " + title + " (HWND: " + hwnd + ")");
        ShowWindow(hwnd, 9); // SW_RESTORE
        ShowWindow(hwnd, 5); // SW_SHOW
        BringWindowToTop(hwnd);
        SetForegroundWindow(hwnd);
      }
      return true;
    }, IntPtr.Zero);
    CloseDesktop(hDesk);
  }
}
'@

Add-Type -TypeDefinition $code -Language CSharp
[DesktopForegrounder]::ForegroundTarget("emulator.exe")
[DesktopForegrounder]::ForegroundTarget("ExamOpt")
