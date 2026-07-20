#!/bin/bash
set -euo pipefail
export NVM_DIR="/home/xkx/.nvm"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
cd /opt/xkx
exec node deploy/scripts/debug-room-items.cjs
