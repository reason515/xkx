# 侠客行 — TencentOS 服务器部署指南

**代码仓库**：[github.com/reason515/xkx](https://github.com/reason515/xkx)

本文档面向 **TencentOS Server**（及 CentOS / RHEL 系）云服务器，从零部署完整 Web 游玩栈：

```
浏览器 ──HTTPS/WSS──► Nginx (:80/443)
                         ├── 静态前端  web/app/dist
                         └── /ws 反代 ──► Gateway (:3001)
                                              └── TCP ──► MUD (:8888, 仅本机)
```

**安全原则**：只对外开放 80/443（和 SSH 22），**不要**在安全组放行 8888、3001。

### 两个账号，别搞混

| 账号 | 什么时候用 | 能 sudo 吗 |
|------|------------|-----------|
| **root / 腾讯云管理员**（如 `root`） | `yum install`、配 nginx、配 systemd、创建用户 | 可以 |
| **xkx** | 编译代码、`npm install`、`npm run build`、手动试跑 driver | **不可以** |

SSH 请始终用 **root 或管理员账号** 登录。装系统软件用管理员执行；只有部署应用代码时才 `sudo su - xkx` 切过去。

若你已直接登录为 `xkx` 并遇到 `xkx is not in the sudoers file`，先执行 `exit` 回到管理员账号，或用管理员重新 SSH 登录。

---

## 0. 前置检查

登录服务器后先确认环境：

```bash
uname -a                    # 确认是 Linux x86_64
cat /etc/os-release         # 确认 TencentOS / CentOS 版本
free -h                     # 建议 ≥ 2GB 内存
df -h                       # 建议 ≥ 10GB 可用磁盘
curl -I https://github.com  # 确认能访问外网（编译需拉 GitHub）
```

| 项目 | 最低建议 |
|------|----------|
| CPU | 2 核 |
| 内存 | 2 GB（MUD 编译+运行较吃内存） |
| 磁盘 | 20 GB |
| Node.js | ≥ 18 |
| 域名 | 可选；无域名可先用 IP + HTTP 测试 |

---

## 1. 创建运行用户与目录

不要用 root 长期跑游戏进程。

```bash
sudo useradd -r -m -s /bin/bash xkx
sudo mkdir -p /opt/xkx
sudo chown xkx:xkx /opt/xkx
```

> **关于 `xkx` 账号密码**  
> 这是 Linux **系统服务账号**，用于跑 MUD 和网关，**没有默认密码**，也**不需要密码登录**。  
> 文档里用 `sudo su - xkx` 切换身份——用的是你当前 root/管理员账号的 sudo 权限，不是 xkx 的密码。  
> 若确实要用 `xkx` 账号 SSH 登录，需手动设置：`sudo passwd xkx`  
> （游戏里的玩家账号密码，是在 Web 登录页「注册并进入」时自行设置的，与此无关。）

后续应用部署在 `xkx` 用户下执行（`sudo su - xkx`）；**第 2 节起的 yum/nginx/systemd 操作必须用管理员账号**。

---

## 2. 安装系统依赖

> **以下命令用 root / 管理员账号执行，不要用 xkx。**

### 2.1 额外软件源

**TencentOS Server 4**：没有 `epel-release` 包，改用系统自带的 **EPOL** 源。若 `yum makecache` 输出里已有 `EPOL`，**直接跳过本步**，继续 2.2。

```bash
# TencentOS 4 — 确认 EPOL 已启用即可，无需装 epel-release
sudo yum makecache
```

**TencentOS 2 / CentOS 7 等旧版** 才需要：

```bash
sudo yum install -y epel-release
sudo yum makecache
```

若仍缺包，可尝试 Fedora EPEL（仅旧系统）：

```bash
sudo yum install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-$(rpm -E %rhel).noarch.rpm
```

### 2.2 编译 FluffOS 所需依赖

```bash
sudo yum groupinstall -y "Development Tools"
sudo yum install -y \
  git cmake make bison flex \
  zlib-devel pcre-devel openssl-devel \
  libicu-devel sqlite-devel \
  jemalloc-devel
```

> 若 `jemalloc-devel` 找不到，可先跳过；TencentOS 4 可试 `--enablerepo=EPOL`。

### 2.3 安装 Node.js 20（推荐 nvm）

系统自带的 node 往往过旧，建议：

```bash
sudo su - xkx
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node -v    # 应显示 v20.x
npm -v
```

### 2.4 安装 Nginx

```bash
sudo yum install -y nginx
sudo systemctl enable nginx
```

---

## 3. 获取项目代码

任选一种方式把代码放到 `/opt/xkx`。

### 方式 A：Git 克隆（推荐）

```bash
sudo su - xkx
cd /opt/xkx
git clone https://github.com/reason515/xkx.git .
```

> `/opt/xkx` 须为空目录。若已有文件，可先 `cd /opt && sudo rm -rf xkx && sudo mkdir -p xkx && sudo chown xkx:xkx xkx` 再克隆。

或一键脚本（root 创建目录后，xkx 用户执行）：

```bash
bash deploy/scripts/clone-repo.sh
```

### 方式 B：从本地上传

在本地 Windows PowerShell：

```powershell
scp -r D:\code\xkx\xkx2001-utf8\* xkx@<服务器IP>:/opt/xkx/
```

上传后修正权限：

```bash
sudo chown -R xkx:xkx /opt/xkx
```

---

## 4. 安装 FluffOS driver（Linux 版）

> **重要（xkx 这套 mudlib）**  
> 官方 **v2025 / v2026** 预编译静态包在本库上会于加载 `master` 后 **Segmentation fault**。  
> 请使用 **v2019.20220507**（更贴近 MudOS），需**自行编译**（旧 release 通常没有现成 Linux 包）。

### 方式 A：编译 FluffOS v2019（推荐）

服务器访问 GitHub 不稳定时，在**本地 Windows** 拉源码再上传：

```powershell
# 本地 PowerShell（需能访问 GitHub）
cd D:\code
Remove-Item -Recurse -Force fluffos-v2019 -ErrorAction SilentlyContinue
git clone https://github.com/fluffos/fluffos.git fluffos-v2019
cd fluffos-v2019
git checkout v2019.20220507
git submodule update --init --recursive
# 确认第三方库存在
Test-Path .\thirdparty\libevent   # 必须 True
```

上传到服务器：

```powershell
scp -r -i D:\docs\tencent-cloud-key\reason515.pem D:\code\fluffos-v2019 root@<服务器IP>:/tmp/
```

服务器编译（root 切 xkx，或直接用 /tmp 权限）：

```bash
rm -rf /home/xkx/fluffos-v2019
mv /tmp/fluffos-v2019 /home/xkx/
chown -R xkx:xkx /home/xkx/fluffos-v2019

su - xkx -c '
  cd ~/fluffos-v2019
  rm -rf build && mkdir build && cd build
  cmake -DCMAKE_BUILD_TYPE=RelWithDebInfo \
    -DPACKAGE_DB_SQLITE=1 \
    -DPACKAGE_DB_MYSQL="" \
    -DPACKAGE_CRYPTO=OFF \
    ..
  make -j$(nproc)
  cp bin/driver /opt/xkx/driver || cp ../bin/driver /opt/xkx/driver || find .. -name driver -type f -executable
'
# 若 find 找到路径，再手动 cp 到 /opt/xkx/driver
chmod +x /opt/xkx/driver
chown xkx:xkx /opt/xkx/driver
file /opt/xkx/driver
```

> 若 cmake 报缺 `thirdparty/*`，说明 submodule 未拉全，回本地重跑 `git submodule update --init --recursive`。

### 方式 B：官方预编译包（仅作对照，不推荐本库）

v2025+ 的 `linux-x86_64-static.tar.gz` **对本仓库会段错误**，仅适合其他新 mudlib。见 [Releases](https://github.com/fluffos/fluffos/releases)。

### 方式 C：在能访问 GitHub 的机器上完整编译后只上传 driver

```bash
# 编好后只传二进制
scp -i reason515.pem ./bin/driver root@<IP>:/opt/xkx/driver
```


---

## 5. 首次手动启动 MUD（验证）

```bash
sudo su - xkx
cd /opt/xkx
./driver config.xkx
```

**另开一个 SSH 窗口**测试：

```bash
# 应能连上
nc -zv 127.0.0.1 8888
# 或
telnet 127.0.0.1 8888
```

看到 MUD 启动日志、8888 可连接后，`Ctrl+C` 停掉，改由 systemd 管理（第 8 步）。

常见启动失败：

| 现象 | 处理 |
|------|------|
| `Permission denied` | `chmod +x /opt/xkx/driver` |
| `error while loading shared libraries` | 缺少运行库，`sudo yum install zlib pcre libicu sqlite jemalloc` |
| 端口占用 | `ss -tlnp | grep 8888` 查占用进程 |
| 编译报错缺头文件 | 回到 2.2 补装 `-devel` 包 |

---

## 6. 部署 Gateway

```bash
sudo su - xkx
cd /opt/xkx/gateway
npm install --production
```

### 6.1 生产配置

复制并编辑网关配置：

```bash
cp config.production.json.example config.json
vi config.json
```

**必须修改** `corsOrigins`，填入你的访问地址：

```json
"corsOrigins": [
  "https://your.domain.com",
  "http://your.domain.com",
  "http://<服务器公网IP>"
]
```

> 无域名测试阶段，把公网 IP 的 `http://` 地址加进去。

手动试跑：

```bash
npm start
```

另开窗口验证：

```bash
curl -s http://127.0.0.1:3001/health
# 应返回 {"ok":true,...}
```

确认无误后 `Ctrl+C`，交给 systemd（第 8 步）。

---

## 7. 构建前端

```bash
sudo su - xkx
cd /opt/xkx/web/app
npm install
npm run build
```

产物在 `web/app/dist/`。生产环境 WebSocket 走同域 `/ws`（由 Nginx 反代到网关），无需改前端代码。

本地预览（可选，仅服务器上自测）：

```bash
npm run preview -- --host 127.0.0.1 --port 5180
```

---

## 8. 配置 systemd 自启

以下命令需要 **root**。

```bash
sudo cp /opt/xkx/deploy/systemd/xkx-mud.service /etc/systemd/system/
sudo cp /opt/xkx/deploy/systemd/xkx-gateway.service /etc/systemd/system/
```

若代码不在 `/opt/xkx`，编辑 service 文件中的路径：

```bash
sudo vi /etc/systemd/system/xkx-mud.service
sudo vi /etc/systemd/system/xkx-gateway.service
```

加载并启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable xkx-mud xkx-gateway
sudo systemctl start xkx-mud
sudo systemctl start xkx-gateway
```

查看状态：

```bash
sudo systemctl status xkx-mud
sudo systemctl status xkx-gateway
journalctl -u xkx-mud -f      # MUD 日志
journalctl -u xkx-gateway -f  # 网关日志
```

---

## 9. 配置 Nginx

```bash
sudo cp /opt/xkx/deploy/nginx/xkx.conf.example /etc/nginx/conf.d/xkx.conf
sudo vi /etc/nginx/conf.d/xkx.conf
```

**必须修改**：

- `server_name` → 你的域名或 `_`（仅 IP 访问时可用 `_`）
- `root` → 确认指向 `/opt/xkx/web/app/dist`

检查并重载：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 9.1 配置 HTTPS（有域名时推荐）

```bash
sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your.domain.com
```

按提示选择自动跳转 HTTPS。certbot 会修改 nginx 配置并申请 Let's Encrypt 证书。

证书自动续期：

```bash
sudo certbot renew --dry-run
```

---

## 10. 防火墙与安全组

### 10.1 云厂商安全组（腾讯云控制台）

| 端口 | 协议 | 来源 | 说明 |
|------|------|------|------|
| 22 | TCP | 你的 IP | SSH |
| 80 | TCP | 0.0.0.0/0 | HTTP |
| 443 | TCP | 0.0.0.0/0 | HTTPS |
| ~~8888~~ | — | **不要放行** | MUD 仅本机 |
| ~~3001~~ | — | **不要放行** | 网关仅本机 |

### 10.2 系统防火墙（如启用了 firewalld）

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## 11. 验收清单

在服务器上：

```bash
# 1. MUD 监听本机 8888
ss -tlnp | grep 8888

# 2. 网关健康
curl -s http://127.0.0.1:3001/health

# 3. Nginx 静态页
curl -I http://127.0.0.1/

# 4. 服务自启状态
systemctl is-enabled xkx-mud xkx-gateway nginx
```

在浏览器（你的电脑）：

1. 打开 `http://<域名或IP>/`
2. 勾选「新玩家注册」，填写账号密码
3. 点击「注册并进入」
4. 应进入游戏场景（扬州客店一带）

若失败，看第 12 节排错。

---

## 12. 常见问题

### MUD 启动报 master.c 语法错误（`static` 函数）

FluffOS 启用 `__SENSIBLE_MODIFIERS__` 后，**不能**再用旧式 `static` 修饰函数：

- `crash()` → 改为普通 `void crash(...)`（驱动 apply）
- `update_file()` → 改为 `private string *update_file(...)`（仅本文件可调）

服务器上若尚未 `git pull`，可临时手动改：

```bash
sed -i 's/^static void crash(/void crash(/' /opt/xkx/adm/single/master.c
sed -i 's/^static string \*update_file(/private string *update_file(/' /opt/xkx/adm/single/master.c
```

或更新仓库代码后重启 MUD。

### MUD 提示 locale 不是 UTF-8

在 systemd 或启动前设置：

```bash
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
```

`deploy/systemd/xkx-mud.service` 已包含 `Environment=LANG=en_US.UTF-8`。

### MUD 加载 master 后 Segmentation fault

常见原因：空的 `domain_stats`/`author_stats`（0 字节）解析崩溃，或 FluffOS 过新与旧 mudlib 不兼容。

**1. 准备目录，并删除空的 stats 文件：**

```bash
cd /opt/xkx
bash deploy/scripts/prepare-mudlib.sh
# 或手动：
mkdir -p log/static adm/tmp binaries
# 不要 touch 空的 domain_stats/author_stats：0 字节文件可能导致 FluffOS 解析时崩溃
# 缺失时只会警告，通常可继续启动
rm -f log/domain_stats log/author_stats
chown -R xkx:xkx log adm/tmp binaries 2>/dev/null || true
```

然后：

```bash
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
su - xkx -c 'cd /opt/xkx && ./driver config.xkx'
```

**2. 若仍段错误，看日志：**

```bash
tail -100 /opt/xkx/log/debug.log
```

**3. 改用较旧的 FluffOS（推荐 v2019，更贴近 MudOS 时代的 mudlib）：**

在本机下载后上传：

- [FluffOS Releases](https://github.com/fluffos/fluffos/releases) 中找带 `linux-x86_64` 的较旧版本，或自编译 v2019 标签。

也可临时用 gdb 抓崩溃点：

```bash
yum install -y gdb
cd /opt/xkx
su - xkx -c 'cd /opt/xkx && gdb -batch -ex run -ex bt --args ./driver config.xkx' 2>&1 | tail -80
```

### 登录页提示「无法连接游戏服务器」

MUD 未运行或网关连不上 8888：

```bash
sudo systemctl status xkx-mud
ss -tlnp | grep 8888
journalctl -u xkx-mud -n 50
```

### 登录页提示「无法连接网关」

网关未运行或 Nginx `/ws` 反代未配置：

```bash
sudo systemctl status xkx-gateway
curl -s http://127.0.0.1:3001/health
sudo nginx -t
```

浏览器 F12 → Network → WS，看 `/ws` 请求是否 101 Switching Protocols。

### 页面能开，但 WebSocket 失败

- 检查 Nginx `location /ws` 是否包含 `Upgrade` / `Connection` 头
- HTTPS 站点必须用 `wss://`（前端已自动处理）
- 若用了 CDN，需开启 WebSocket 支持

### CORS 相关错误

更新 `gateway/config.json` 的 `corsOrigins`，加入浏览器地址栏的完整 origin（含 `http://` 或 `https://`），然后：

```bash
sudo systemctl restart xkx-gateway
```

### MUD 重启后玩家连不上

```bash
sudo systemctl restart xkx-mud
sleep 3
sudo systemctl restart xkx-gateway
```

### 更新代码后如何重新部署

**推荐（root 一键，含 FluffOS `static→nosave` 补丁 + 登录 e2e 门禁）：**

```bash
# 本地已 push 到 github.com/reason515/xkx 后，在服务器执行：
bash /opt/xkx/deploy/scripts/remote-update.sh
```

该脚本会：`git reset --hard origin/master` → 恢复 `gateway/config.json` →  
从 **`/home/xkx/bin/driver`**（Linux ELF，勿用仓库里的 macOS `driver`）覆盖 `/opt/xkx/driver` →  
跑 `fix-static-to-nosave.py`（**必做**，否则 `/feature/dbase` 加载失败、登录无响应）→  
构建前端 → 重启 systemd → **跑 `deploy/scripts/run-e2e-smoke.sh`，失败则部署失败**。

首次部署请先放好 Linux 驱动：

```bash
mkdir -p /home/xkx/bin
cp /path/to/fluffos/build/src/driver /home/xkx/bin/driver
chown xkx:xkx /home/xkx/bin/driver && chmod +x /home/xkx/bin/driver
```

仅手动检查登录链路：

```bash
bash /opt/xkx/deploy/scripts/run-e2e-smoke.sh
```

针对公网页面的 Playwright（在开发机，需本机有 Chromium）：

```powershell
$env:XKX_E2E_BASE_URL = "http://119.45.224.68"
$env:XKX_E2E_REGISTER = "1"
cd web\app
npm run test:e2e
```

---

## 13. 日常运维命令速查

```bash
# 查看服务状态
sudo systemctl status xkx-mud xkx-gateway nginx

# 重启
sudo systemctl restart xkx-mud
sudo systemctl restart xkx-gateway
sudo systemctl reload nginx

# 日志
journalctl -u xkx-mud -f
journalctl -u xkx-gateway -f
tail -f /opt/xkx/log/debug.log    # MUD 调试日志（若存在）

# 资源占用
top -p $(pgrep -d',' -f 'driver config|node src/index')
free -h
```

---

## 14. 目录与配置文件一览

| 路径 | 说明 |
|------|------|
| `/opt/xkx/driver` | FluffOS 驱动（需 Linux 版） |
| `/opt/xkx/config.xkx` | MUD 配置（端口 8888） |
| `/opt/xkx/gateway/config.json` | 网关配置 |
| `/opt/xkx/web/app/dist/` | 前端静态产物 |
| `/etc/nginx/conf.d/xkx.conf` | Nginx 站点配置 |
| `/etc/systemd/system/xkx-mud.service` | MUD 自启 |
| `/etc/systemd/system/xkx-gateway.service` | 网关自启 |
| `deploy/` | 本仓库自带的模板文件 |

---

## 15. 最小化快速路径（已有 Linux driver 时）

若你已在其他机器编译好 Linux `driver`，可跳过第 4 步：

```bash
# 拉代码
sudo su - xkx
cd /opt/xkx && git clone https://github.com/reason515/xkx.git .

# 部署
cp /path/to/driver /opt/xkx/driver && chmod +x /opt/xkx/driver
cd /opt/xkx/gateway && npm install && cp config.production.json.example config.json && vi config.json
cd /opt/xkx/web/app && npm install && npm run build
sudo cp deploy/systemd/*.service /etc/systemd/system/
sudo cp deploy/nginx/xkx.conf.example /etc/nginx/conf.d/xkx.conf
sudo systemctl daemon-reload && sudo systemctl enable --now xkx-mud xkx-gateway nginx
```

然后在浏览器访问服务器 IP 完成注册测试。

---

## 相关文档

- [README-WEB.md](../README-WEB.md) — 本地开发启动
- [PLAYER.md](PLAYER.md) — 玩家操作说明
- [launch-area.md](launch-area.md) — 首发区范围
