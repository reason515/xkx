# Simple monitor: poll gateway /health and optionally restart (manual setup)
param(
  [string]$GatewayUrl = "http://127.0.0.1:3001/health",
  [int]$IntervalSec = 30
)

while ($true) {
  try {
    $r = Invoke-RestMethod -Uri $GatewayUrl -TimeoutSec 5
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] gateway ok connections=$($r.connections) uptime=$($r.uptimeSec)s"
  } catch {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] gateway DOWN: $_" -ForegroundColor Red
  }
  Start-Sleep -Seconds $IntervalSec
}
