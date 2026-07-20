#!/bin/bash
set -euo pipefail
chown xkx:xkx /opt/xkx/adm/daemons/assistd.c /opt/xkx/adm/daemons/xkd_pathd.c /opt/xkx/cmds/usr/webassist.c
chown xkx:xkx /opt/xkx/web/app/src/lib/grindTargets.ts
cd /opt/xkx
bash deploy/scripts/prepare-mudlib.sh
python3 deploy/scripts/fix-static-to-nosave.py
sudo -u xkx env PATH=/home/xkx/.nvm/versions/node/v20.20.2/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  /home/xkx/.nvm/versions/node/v20.20.2/bin/npm --prefix /opt/xkx/web/app run build
systemctl restart xkx-mud
sleep 3
systemctl restart xkx-gateway
sleep 2
bash /opt/xkx/deploy/scripts/run-e2e-smoke.sh
