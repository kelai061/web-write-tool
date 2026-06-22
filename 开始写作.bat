@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ============================================
echo    启动写作环境
echo    浏览器会自动打开 http://localhost:4321
echo    （写完关闭这个窗口即可）
echo ============================================
echo.
start "" http://localhost:4321
call npm run dev
pause
