param(
  [int]$Port = 5050
)

$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repo

# Optional security token for uploads
if (-not $env:PC_STORAGE_TOKEN) {
  # Create a token once (and keep it) if you want: setx PC_STORAGE_TOKEN "..."
  Write-Host "[info] PC_STORAGE_TOKEN not set (uploads not protected)." -ForegroundColor Yellow
}

# Ensure PC app uses the requested port
$env:PC_APP_PORT = "$Port"

Write-Host "[1/2] Starting PC app server on http://localhost:$Port" -ForegroundColor Cyan
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit","-Command","cd `"$repo`" ; npm run pc-app" | Out-Null

Start-Sleep -Seconds 2

Write-Host "[2/2] Starting Cloudflare quick tunnel (public https URL)" -ForegroundColor Cyan
Write-Host "When you see the trycloudflare.com URL, copy it." -ForegroundColor Gray

# This prints a public URL like https://xxxx.trycloudflare.com
cloudflared tunnel --url "http://localhost:$Port"
