$MudHost = "127.0.0.1"
$MudPort = 8888

Write-Host "检测 MUD ${MudHost}:${MudPort} ..." -ForegroundColor Cyan
try {
  $tcp = New-Object System.Net.Sockets.TcpClient
  $tcp.Connect($MudHost, $MudPort)
  if ($tcp.Connected) {
    Write-Host "MUD 可连接" -ForegroundColor Green
    $tcp.Close()
    exit 0
  }
} catch {
  Write-Host "MUD 未运行" -ForegroundColor Red
  Write-Host "请启动 FluffOS driver: ./driver config.xkx" -ForegroundColor Yellow
  Write-Host "Windows 需 WSL 或 MSYS2/MINGW64 编译运行，见 README-WEB.md" -ForegroundColor Yellow
  exit 1
}
