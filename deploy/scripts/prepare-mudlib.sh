#!/usr/bin/env bash
# 准备 MUD 运行所需目录（在 /opt/xkx 下执行）
# 注意：不要创建空的 domain_stats/author_stats（0 字节会让新版 FluffOS 解析崩溃）
set -euo pipefail

ROOT="${1:-.}"
cd "$ROOT"

mkdir -p log/static adm/tmp binaries data
rm -f log/domain_stats log/author_stats
chmod -R u+rwX log adm/tmp binaries data 2>/dev/null || true

echo "OK: prepared under $(pwd)"
ls -la log/
