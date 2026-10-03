$ErrorActionPreference='Stop'
[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
$folder=Join-Path $PSScriptRoot 'runtime'
New-Item -ItemType Directory -Path $folder -Force | Out-Null
$node=Join-Path $folder 'node.exe'
$expected='f8d162c0641dcee512132f3bcf8a68169c7ecb852efd8e1a46c9fec5a0f469ed'
if((Test-Path -LiteralPath $node) -and (Get-FileHash -LiteralPath $node -Algorithm SHA256).Hash.ToLower() -eq $expected){Write-Host 'Runtime is ready.';exit 0}
$temp=Join-Path $folder 'node.download'
Write-Host 'Downloading Node.js 22.23.1 from nodejs.org...'
Invoke-WebRequest 'https://nodejs.org/dist/v22.23.1/win-x64/node.exe' -OutFile $temp -UseBasicParsing
if((Get-FileHash -LiteralPath $temp -Algorithm SHA256).Hash.ToLower() -ne $expected){throw 'Node download checksum mismatch. Nothing was installed.'}
Invoke-WebRequest 'https://raw.githubusercontent.com/nodejs/node/v22.23.1/LICENSE' -OutFile (Join-Path $folder 'LICENSE') -UseBasicParsing
Move-Item -LiteralPath $temp -Destination $node -Force
Write-Host 'Runtime is ready. Run Start.cmd, then Open.cmd.'
