@echo off
cd /d "%~dp0"
title Glowy temporary link
echo.
echo Starting Glowy temporary internet link...
echo Keep this window open.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-online.ps1"
echo.
pause
