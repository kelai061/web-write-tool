@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ============================================
echo    新建文章（像写记事本一样）
echo ============================================
node new-post.cjs
pause
