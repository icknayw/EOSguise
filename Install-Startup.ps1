$startup=[Environment]::GetFolderPath('Startup')
$shell=New-Object -ComObject WScript.Shell
$link=$shell.CreateShortcut((Join-Path $startup 'EOSguise.lnk'))
$link.TargetPath=Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$link.Arguments='-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "'+(Join-Path $PSScriptRoot 'Start.ps1')+'"'
$link.WorkingDirectory=$PSScriptRoot
$link.WindowStyle=7
$link.Save()
