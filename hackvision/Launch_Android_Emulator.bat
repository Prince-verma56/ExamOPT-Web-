@echo off
title ExamOpt Android Emulator Launcher
echo ========================================================
echo        ExamOpt Mobile - Android Emulator Screen Mirror
echo ========================================================
echo Connecting to live Android Emulator (emulator-5554)...
echo.
set SCRCPY="C:\Users\prakhyat\AppData\Local\Microsoft\WinGet\Packages\Genymobile.scrcpy_Microsoft.Winget.Source_8wekyb3d8bbwe\scrcpy-win64-v4.1\scrcpy.exe"
if exist %SCRCPY% (
    %SCRCPY% -s emulator-5554 --window-title="ExamOpt Android Phone" --always-on-top
) else (
    scrcpy -s emulator-5554 --window-title="ExamOpt Android Phone" --always-on-top
)
pause
