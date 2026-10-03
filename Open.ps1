$cfg=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'config.json') -Raw | ConvertFrom-Json
Start-Process "http://127.0.0.1:$($cfg.port)/"
