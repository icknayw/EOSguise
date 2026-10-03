@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Setup-Runtime.ps1"
if errorlevel 1 pause
