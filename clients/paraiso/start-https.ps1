# Start the local server separately: node serve.mjs
# Each execution generates a new temporary public HTTPS address.
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot '.runtime/cloudflared.exe') tunnel --url http://127.0.0.1:4174 --no-autoupdate
