# Run Playwright e2e smoke tests when MUD + gateway + credentials are available
param(
  [string]$GatewayUrl = "http://127.0.0.1:3001/health",
  [string]$MudHost = "127.0.0.1",
  [int]$MudPort = 8888
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

function Test-MudTcp {
  try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect($MudHost, $MudPort)
    $ok = $tcp.Connected
    $tcp.Close()
    return $ok
  } catch {
    return $false
  }
}

function Test-GatewayHealth {
  try {
    Invoke-RestMethod -Uri $GatewayUrl -TimeoutSec 5 | Out-Null
    return $true
  } catch {
    return $false
  }
}

if (-not (Test-MudTcp)) {
  Write-Host "Skip e2e: MUD ${MudHost}:${MudPort} unreachable" -ForegroundColor Yellow
  exit 0
}

if (-not (Test-GatewayHealth)) {
  Write-Host "Skip e2e: gateway $GatewayUrl unavailable" -ForegroundColor Yellow
  exit 0
}

if (-not $env:XKX_E2E_REGISTER -and (-not $env:XKX_E2E_ID -or -not $env:XKX_E2E_PASSWORD)) {
  Write-Host "Skip e2e: set XKX_E2E_REGISTER=1 or XKX_E2E_ID + XKX_E2E_PASSWORD" -ForegroundColor Yellow
  exit 0
}

Write-Host "=== Playwright e2e smoke ===" -ForegroundColor Cyan
Push-Location (Join-Path $Root "web\app")
try {
  npx playwright install chromium 2>$null
  npm run test:e2e
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}

Write-Host "E2E smoke passed." -ForegroundColor Green
