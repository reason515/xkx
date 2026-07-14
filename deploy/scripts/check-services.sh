#!/usr/bin/env bash
# 服务器上一键检查 MUD / Gateway / Nginx 状态
set -euo pipefail

ok() { echo -e "\033[32m[OK]\033[0m $*"; }
fail() { echo -e "\033[31m[FAIL]\033[0m $*"; }

echo "=== XKX 服务检查 ==="

if ss -tlnp 2>/dev/null | grep -q ':8888 '; then
  ok "MUD 端口 8888 监听中"
else
  fail "MUD 端口 8888 未监听 — systemctl status xkx-mud"
fi

if curl -sf http://127.0.0.1:3001/health >/dev/null 2>&1; then
  ok "Gateway /health 正常"
  curl -s http://127.0.0.1:3001/health
  echo ""
else
  fail "Gateway 无响应 — systemctl status xkx-gateway"
fi

if systemctl is-active nginx >/dev/null 2>&1; then
  ok "Nginx 运行中"
else
  fail "Nginx 未运行 — systemctl status nginx"
fi

if [[ -f /opt/xkx/web/app/dist/index.html ]]; then
  ok "前端 dist 已构建"
else
  fail "缺少 /opt/xkx/web/app/dist/index.html — 请 npm run build"
fi

echo "=== 检查完成 ==="
