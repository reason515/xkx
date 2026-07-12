param(
  [switch]$SkipMud,
  [switch]$SkipGateway,
  [switch]$SkipWeb
)

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "=== XKX Web 启动 ===" -ForegroundColor Cyan

if (-not $SkipMud) {
  $driver = Get-Command driver -ErrorAction SilentlyContinue
  if ($driver) {
    Write-Host "启动 MUD (driver config.xkx)..." -ForegroundColor Green
    Start-Process -FilePath "driver" -ArgumentList "config.xkx" -WorkingDirectory $Root
  } else {
    Write-Host "未找到 driver，请先在 WSL/Linux/macOS 启动 MUD，或使用 -SkipMud" -ForegroundColor Yellow
  }
}

if (-not $SkipGateway) {
  Set-Location "$Root\gateway"
  if (-not (Test-Path "node_modules")) { npm install }
  Write-Host "启动网关 :3001..." -ForegroundColor Green
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\gateway'; npm start"
}

if (-not $SkipWeb) {
  Set-Location "$Root\web\app"
  if (-not (Test-Path "node_modules")) { npm install }
  Write-Host "启动前端 :5180..." -ForegroundColor Green
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\web\app'; npm run dev"
}

Write-Host "完成。浏览器: http://localhost:5180" -ForegroundColor Cyan
