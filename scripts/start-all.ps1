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
  $on3001 = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
  if ($on3001) {
    Write-Host "端口 3001 已被占用，正在结束旧网关进程..." -ForegroundColor Yellow
    $on3001 | ForEach-Object {
      Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 1
  }
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

& "$PSScriptRoot\check-mud.ps1"
if ($LASTEXITCODE -ne 0) {
  Write-Host "提示: 网关和前端已启动，但 MUD 未运行，登录会提示「无法连接游戏服务器」。" -ForegroundColor Yellow
}
