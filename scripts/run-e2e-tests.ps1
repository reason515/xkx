# Playwright e2e 默认打生产站（随机注册）
# 本地调试：$env:XKX_E2E_BASE_URL = "http://127.0.0.1:5180"（需本机 MUD+网关+前端）
param(
  [string]$BaseUrl = "",
  [string]$GatewayUrl = "http://127.0.0.1:3001/health",
  [string]$MudHost = "127.0.0.1",
  [int]$MudPort = 8888
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$ProdUrl = "http://119.45.224.68"

if (-not $env:XKX_E2E_BASE_URL) {
  $env:XKX_E2E_BASE_URL = if ($BaseUrl) { $BaseUrl } else { $ProdUrl }
}
if (-not $env:XKX_E2E_REGISTER -and (-not $env:XKX_E2E_ID -or -not $env:XKX_E2E_PASSWORD)) {
  $env:XKX_E2E_REGISTER = "1"
}

$againstLocal = $env:XKX_E2E_BASE_URL -match "127\.0\.0\.1|localhost"

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

function Test-BaseUrl {
  try {
    Invoke-WebRequest -Uri $env:XKX_E2E_BASE_URL -TimeoutSec 10 -UseBasicParsing | Out-Null
    return $true
  } catch {
    return $false
  }
}

if (-not (Test-BaseUrl)) {
  Write-Host "Skip e2e: $($env:XKX_E2E_BASE_URL) unreachable" -ForegroundColor Yellow
  exit 0
}

if ($againstLocal) {
  if (-not (Test-MudTcp)) {
    Write-Host "Skip e2e: local MUD ${MudHost}:${MudPort} unreachable" -ForegroundColor Yellow
    exit 0
  }
  if (-not (Test-GatewayHealth)) {
    Write-Host "Skip e2e: local gateway $GatewayUrl unavailable" -ForegroundColor Yellow
    exit 0
  }
}

Write-Host "=== Playwright e2e against $($env:XKX_E2E_BASE_URL) (REGISTER=$($env:XKX_E2E_REGISTER)) ===" -ForegroundColor Cyan
Push-Location (Join-Path $Root "web\app")
try {
  npx playwright install chromium 2>$null
  npm run test:e2e
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}

Write-Host "E2E smoke passed." -ForegroundColor Green
