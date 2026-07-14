#!/usr/bin/env bash
# TencentOS / CentOS 依赖安装（需 root 执行）
set -euo pipefail

echo "=== XKX 服务器依赖安装 ==="

if [[ $EUID -ne 0 ]]; then
  echo "请使用 root 执行: sudo bash $0"
  exit 1
fi

# TencentOS 4 使用 EPOL，无 epel-release；旧版 CentOS 才尝试安装
if grep -qi 'TencentOS Server 4' /etc/os-release 2>/dev/null; then
  echo "检测到 TencentOS Server 4，使用 EPOL 源（跳过 epel-release）"
else
  yum install -y epel-release || true
fi
yum makecache

yum groupinstall -y "Development Tools"
yum install -y \
  git cmake make bison flex nginx \
  zlib-devel pcre-devel openssl-devel \
  libicu-devel sqlite-devel jemalloc-devel || \
  yum install -y jemalloc-devel --enablerepo=EPOL || \
  yum install -y jemalloc-devel --enablerepo=epel || true

echo "依赖安装完成。接下来："
echo "  git clone https://github.com/reason515/xkx.git /opt/xkx   # 或 bash deploy/scripts/clone-repo.sh"
echo "  以 xkx 用户按 docs/deploy-tencentos.md 编译 driver 并部署"
