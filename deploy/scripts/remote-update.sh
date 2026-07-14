#!/usr/bin/env bash
# Run on the server as root: bash deploy/scripts/remote-update.sh
# Pulls code, applies FluffOS mudlib fixes, rebuilds web, restarts services,
# then REQUIRES e2e login smoke to pass before exiting 0.
set -euo pipefail

NODE_BIN="/home/xkx/.nvm/versions/node/v20.20.2/bin/node"
ROOT="/opt/xkx"
# Linux driver must live outside the git worktree — repo `driver` is macOS.
LINUX_DRIVER="${XKX_LINUX_DRIVER:-/home/xkx/bin/driver}"

echo "=== 1. backup gateway config ==="
cp -a "$ROOT/gateway/config.json" /tmp/xkx-gw-config.json

if [[ ! -x "$LINUX_DRIVER" ]]; then
  echo "Missing Linux driver at $LINUX_DRIVER"
  echo "Build FluffOS and: cp build/src/driver $LINUX_DRIVER"
  exit 1
fi
if file "$LINUX_DRIVER" | grep -qi 'Mach-O'; then
  echo "LINUX_DRIVER is not a Linux ELF binary: $LINUX_DRIVER"
  exit 1
fi

echo "=== 2. git fetch + hard reset ==="
sudo -u xkx bash -lc "cd $ROOT && git fetch origin && git reset --hard origin/master && git log -1 --oneline"

echo "=== 3. restore prod files ==="
cp -a /tmp/xkx-gw-config.json "$ROOT/gateway/config.json"
# Always reinstall Linux driver after reset (git has macOS binary)
cp -a "$LINUX_DRIVER" "$ROOT/driver"
chown xkx:xkx "$ROOT/gateway/config.json" "$ROOT/driver"
chmod +x "$ROOT/driver"
file "$ROOT/driver" | grep -qi 'ELF' || {
  echo "Restored driver is not ELF"
  exit 1
}

echo "=== 4. FluffOS mudlib prepare (static -> nosave) ==="
bash "$ROOT/deploy/scripts/prepare-mudlib.sh" "$ROOT"
python3 "$ROOT/deploy/scripts/fix-static-to-nosave.py" "$ROOT"
chown -R xkx:xkx "$ROOT/feature" "$ROOT/inherit" "$ROOT/clone" "$ROOT/adm" "$ROOT/cmds" "$ROOT/kungfu" 2>/dev/null || true

echo "=== 5. npm install + frontend build ==="
sudo -u xkx bash -lc "
set -euo pipefail
export NVM_DIR=\"\$HOME/.nvm\"
. \"\$NVM_DIR/nvm.sh\"
cd $ROOT/gateway && npm install --omit=dev
cd $ROOT/web/app && npm install && npm run build
"

echo "=== 6. install systemd units ==="
ln -sfn "$NODE_BIN" /usr/local/bin/node
sed "s|/usr/bin/node|/usr/local/bin/node|" "$ROOT/deploy/systemd/xkx-gateway.service" \
  > /etc/systemd/system/xkx-gateway.service
cp "$ROOT/deploy/systemd/xkx-mud.service" /etc/systemd/system/xkx-mud.service
systemctl daemon-reload
systemctl enable xkx-mud xkx-gateway

echo "=== 7. restart services ==="
pkill -u xkx -f "node src/index.js" || true
pkill -u xkx -f "./driver config.xkx" || true
sleep 2
systemctl restart xkx-mud
# Wait until MUD accepts TCP (preload can take a while)
for i in $(seq 1 60); do
  if ss -lntp | grep -q ':8888'; then
    echo "MUD listening on :8888 (try $i)"
    break
  fi
  sleep 1
done
ss -lntp | grep ':8888' || {
  echo "MUD failed to listen on 8888"
  journalctl -u xkx-mud -n 40 --no-pager || true
  exit 1
}
systemctl restart xkx-gateway
systemctl reload nginx || true

echo "=== 8. health ==="
for i in $(seq 1 20); do
  if curl -sf http://127.0.0.1:3001/health >/dev/null; then
    break
  fi
  sleep 1
done
systemctl is-active xkx-mud xkx-gateway nginx
curl -sS http://127.0.0.1:3001/health
echo
curl -sS -o /dev/null -w "http_root=%{http_code}\n" http://127.0.0.1/

echo "=== 9. e2e login smoke (required) ==="
bash "$ROOT/deploy/scripts/run-e2e-smoke.sh"

echo "DEPLOY OK"
