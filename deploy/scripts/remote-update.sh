#!/usr/bin/env bash
# Run on the server as root: bash deploy/scripts/remote-update.sh
set -euo pipefail

NODE_BIN="/home/xkx/.nvm/versions/node/v20.20.2/bin/node"

echo "=== 1. backup ==="
cp -a /opt/xkx/gateway/config.json /tmp/xkx-gw-config.json
cp -a /opt/xkx/driver /tmp/xkx-driver.bin
chmod +x /tmp/xkx-driver.bin

echo "=== 2. git fetch + hard reset ==="
sudo -u xkx bash -lc 'cd /opt/xkx && git fetch origin && git reset --hard origin/master && git log -1 --oneline'

echo "=== 3. restore prod files ==="
cp -a /tmp/xkx-gw-config.json /opt/xkx/gateway/config.json
cp -a /tmp/xkx-driver.bin /opt/xkx/driver
chown xkx:xkx /opt/xkx/gateway/config.json /opt/xkx/driver
chmod +x /opt/xkx/driver

echo "=== 4. npm install + frontend build ==="
sudo -u xkx bash -lc '
set -euo pipefail
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
cd /opt/xkx/gateway && npm install --production
cd /opt/xkx/web/app && npm install && npm run build
ls -la /opt/xkx/web/app/dist | head
'

echo "=== 5. install systemd units ==="
ln -sfn "$NODE_BIN" /usr/local/bin/node
sed "s|/usr/bin/node|/usr/local/bin/node|" /opt/xkx/deploy/systemd/xkx-gateway.service \
  > /etc/systemd/system/xkx-gateway.service
cp /opt/xkx/deploy/systemd/xkx-mud.service /etc/systemd/system/xkx-mud.service
systemctl daemon-reload
systemctl enable xkx-mud xkx-gateway

echo "=== 6. restart services ==="
pkill -u xkx -f "node src/index.js" || true
pkill -u xkx -f "./driver config.xkx" || true
sleep 2
systemctl restart xkx-mud
sleep 2
systemctl restart xkx-gateway
systemctl reload nginx || true

echo "=== 7. verify ==="
sleep 2
systemctl is-active xkx-mud xkx-gateway nginx
curl -sS http://127.0.0.1:3001/health || true
echo
curl -sS -o /dev/null -w "http_root=%{http_code}\n" http://127.0.0.1/
ss -lntp | grep -E "80|3001|8888" || true
echo DONE
