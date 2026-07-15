#!/usr/bin/env bash
# Apply already-synced tree (no git fetch). Used when GitHub is unreachable.
set -euo pipefail
ROOT=/opt/xkx
LINUX_DRIVER="${XKX_LINUX_DRIVER:-/home/xkx/bin/driver}"

echo "=== verify synced files ==="
grep -n webassist "$ROOT/d/xiakedao/shatan1.c" | head -3
grep -n beachGreeterActions "$ROOT/web/app/src/lib/parser.ts" | head -3
grep -n "Re-look after mark" "$ROOT/gateway/src/session.js"

echo "=== FluffOS nosave ==="
bash "$ROOT/deploy/scripts/prepare-mudlib.sh" "$ROOT"
python3 "$ROOT/deploy/scripts/fix-static-to-nosave.py" "$ROOT"
chown -R xkx:xkx "$ROOT/feature" "$ROOT/inherit" "$ROOT/clone" "$ROOT/adm" "$ROOT/cmds" "$ROOT/kungfu" "$ROOT/d/xiakedao" 2>/dev/null || true

echo "=== build frontend ==="
sudo -u xkx bash -lc "
set -euo pipefail
export NVM_DIR=\"\$HOME/.nvm\"
. \"\$NVM_DIR/nvm.sh\"
cd $ROOT/web/app && npm run build
"

echo "=== stop services, restore driver, restart ==="
systemctl stop xkx-gateway || true
systemctl stop xkx-mud || true
pkill -u xkx -f "node src/index.js" || true
pkill -u xkx -f "./driver config.xkx" || true
sleep 2
cp -a "$LINUX_DRIVER" "$ROOT/driver"
chown xkx:xkx "$ROOT/driver"
chmod +x "$ROOT/driver"
systemctl restart xkx-mud
for i in $(seq 1 60); do
  if ss -lntp | grep -q ':8888'; then
    echo "MUD up try $i"
    break
  fi
  sleep 1
done
ss -lntp | grep ':8888' || {
  echo "MUD failed to listen on 8888"
  exit 1
}
systemctl restart xkx-gateway
systemctl reload nginx || true
sleep 2
curl -sf http://127.0.0.1:3001/health
echo

echo "=== e2e ==="
bash "$ROOT/deploy/scripts/run-e2e-smoke.sh"
echo DEPLOY_OK
