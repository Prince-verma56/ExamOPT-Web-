@echo off
title ExamOpt Mobile Emulator Viewer
echo ========================================================
echo   ExamOpt - Mobile Application Live Emulator Viewer
echo ========================================================
echo.
echo Connecting to Android Emulator (emulator-5554)...
echo App package: in.ac.glau.examopt_mobile
echo.
start "" "C:\Users\prakhyat\AppData\Local\Microsoft\WinGet\Packages\Genymobile.scrcpy_Microsoft.Winget.Source_8wekyb3d8bbwe\scrcpy-win64-v4.1\scrcpy.exe" -s emulator-5554 --window-title "ExamOpt Mobile - Android Emulator" --always-on-top
echo [OK] Interactive window launched on your desktop!
echo You can use your mouse or touch to interact with ExamOpt.
