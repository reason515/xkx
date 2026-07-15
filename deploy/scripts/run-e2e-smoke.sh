#!/usr/bin/env bash
# Required post-deploy gate: register via WebSocket and reach in-game.
set -euo pipefail

ROOT="${XKX_ROOT:-/opt/xkx}"
NODE_BIN="${XKX_NODE:-/usr/local/bin/node}"
SCRIPT="$ROOT/deploy/scripts/e2e-login-smoke.cjs"

if [[ ! -x "$NODE_BIN" && -x /home/xkx/.nvm/versions/node/v20.20.2/bin/node ]]; then
  NODE_BIN=/home/xkx/.nvm/versions/node/v20.20.2/bin/node
fi

export XKX_E2E_WS="${XKX_E2E_WS:-ws://127.0.0.1:3001/ws}"
export XKX_E2E_MODE="${XKX_E2E_MODE:-register}"
export XKX_E2E_TIMEOUT_MS="${XKX_E2E_TIMEOUT_MS:-120000}"

echo "Running $SCRIPT against $XKX_E2E_WS ..."
cd "$ROOT"
if [[ -n "${SUDO_USER:-}" ]] || [[ "$(id -u)" -eq 0 ]]; then
  sudo -u xkx env \
    XKX_E2E_WS="$XKX_E2E_WS" \
    XKX_E2E_MODE="$XKX_E2E_MODE" \
    XKX_E2E_TIMEOUT_MS="$XKX_E2E_TIMEOUT_MS" \
    XKX_E2E_ID="${XKX_E2E_ID:-}" \
    XKX_E2E_PASSWORD="${XKX_E2E_PASSWORD:-}" \
    "$NODE_BIN" "$SCRIPT"
else
  "$NODE_BIN" "$SCRIPT"
fi

echo "E2E smoke passed."
