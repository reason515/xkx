#!/usr/bin/env bash
# 克隆 reason515/xkx 到 /opt/xkx（xkx 用户执行，或 root 执行后 chown）
set -euo pipefail

REPO_URL="https://github.com/reason515/xkx.git"
TARGET="/opt/xkx"

echo "=== 克隆 $REPO_URL -> $TARGET ==="

if [[ ! -d "$TARGET" ]]; then
  echo "目录 $TARGET 不存在，请先以 root 创建："
  echo "  sudo mkdir -p $TARGET && sudo chown xkx:xkx $TARGET"
  exit 1
fi

if [[ -n "$(ls -A "$TARGET" 2>/dev/null)" ]]; then
  echo "错误: $TARGET 非空，请先清空或删除后重试"
  exit 1
fi

git clone "$REPO_URL" "$TARGET"
echo "完成。下一步: cd $TARGET && 按 docs/deploy-tencentos.md 继续"
