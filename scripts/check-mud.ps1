$Host = "127.0.0.1"
$Port = 8888

Write-Host "检测 MUD $Host`:$Port ..." -ForegroundColor Cyan
try {
  $tcp = New-Object System.Net.Sockets.TcpClient
  $tcp.Connect($Host, $Port)
  if ($tcp.Connected) {
    Write-Host "MUD 可连接" -ForegroundColor Green
    $tcp.Close()
    exit 0
  }
} catch {
  Write-Host "MUD 未运行: $_" -ForegroundColor Red
  Write-Host "请使用 FluffOS driver 启动: ./driver config.xkx" -ForegroundColor Yellow
  exit 1
}
