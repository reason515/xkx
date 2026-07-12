# Run all unit tests for gateway and web/app
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "=== gateway unit tests ===" -ForegroundColor Cyan
Push-Location (Join-Path $Root "gateway")
try {
  npm test
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}

Write-Host "=== web/app unit tests ===" -ForegroundColor Cyan
Push-Location (Join-Path $Root "web\app")
try {
  npm test
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}

Write-Host "All unit tests passed." -ForegroundColor Green
