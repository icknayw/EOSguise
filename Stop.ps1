$runner=Join-Path $PSScriptRoot 'Run.ps1'
$server=Join-Path $PSScriptRoot 'server.mjs'
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object {$_.CommandLine -and $_.CommandLine.Contains($runner)} | ForEach-Object {Stop-Process -Id $_.ProcessId}
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object {$_.CommandLine -and $_.CommandLine.Contains($server)} | ForEach-Object {Stop-Process -Id $_.ProcessId}
