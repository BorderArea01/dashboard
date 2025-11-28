# 生产环境部署指南

## 概述

本文档说明如何将数字化智能工厂看板系统部署到生产环境或局域网环境，供多个用户访问。

## 部署架构

```
                                    局域网
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                服务器端            Web服务器         客户端们
                    │                 │                 │
    ┌───────────────┴────────┐       │       ┌─────────┴─────────┐
    │                        │       │       │                   │
K3 Cloud API  ←→  同步脚本   │   nginx/IIS   │  浏览器A  浏览器B  浏览器C
(39.108.116.74)   (PM2/定时)  │   (静态文件)  │  (读缓存) (读缓存) (读缓存)
                    │         │       │       │                   │
                    ↓         │       │       └───────────────────┘
        public/inventory-cache.json ← ┘
        (共享缓存文件)
```

## 部署步骤

### 1. 环境准备

#### 服务器要求
- **操作系统**: Linux/Windows Server
- **Node.js**: v18+ 
- **内存**: 2GB+
- **磁盘**: 10GB+
- **网络**: 能访问K3 Cloud API (`http://39.108.116.74/K3Cloud`)

#### 软件依赖
```bash
# 安装 Node.js (如果未安装)
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Windows
# 从 https://nodejs.org 下载安装

# 安装 PM2（进程管理工具）
npm install -g pm2
```

### 2. 项目部署

#### 步骤 2.1: 克隆或上传项目
```bash
# 方式1: Git克隆（如果有仓库）
git clone <repository-url> /var/www/dashboard
cd /var/www/dashboard

# 方式2: 手动上传（使用FTP/SCP）
# 将项目文件上传到 /var/www/dashboard
```

#### 步骤 2.2: 安装依赖
```bash
cd /var/www/dashboard
npm install
```

#### 步骤 2.3: 构建项目
```bash
npm run build
```

构建完成后，生成的文件在 `dist/` 目录。

### 3. 配置Web服务器

#### 方式A: Nginx（推荐）

**创建配置文件** `/etc/nginx/sites-available/dashboard`:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 或局域网IP

    root /var/www/dashboard/dist;
    index index.html;

    # 启用gzip压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;

    # 缓存静态资源
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # inventory-cache.json 不缓存，确保获取最新数据
    location = /inventory-cache.json {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # dashboard-data.xlsx 不缓存
    location = /dashboard-data.xlsx {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # 单页应用路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 可选：K3 Cloud API代理（如果需要）
    location /K3Cloud {
        proxy_pass http://39.108.116.74/K3Cloud;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**启用配置**:
```bash
sudo ln -s /etc/nginx/sites-available/dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 方式B: IIS（Windows Server）

1. 安装 **URL Rewrite** 模块
2. 在IIS管理器中创建新站点
3. 物理路径指向 `D:\_workspace_\dashboard\dist`
4. 创建 `web.config`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
    </staticContent>
  </system.webServer>
</configuration>
```

### 4. 启动库存数据同步服务（核心步骤）

#### 方式A: 使用PM2（推荐）

```bash
cd /var/www/dashboard

# 启动同步服务
pm2 start "npm run sync:inventory:watch" --name inventory-sync

# 查看状态
pm2 status

# 查看日志
pm2 logs inventory-sync

# 设置开机自启
pm2 startup
pm2 save
```

#### 方式B: 使用systemd（Linux）

创建服务文件 `/etc/systemd/system/inventory-sync.service`:

```ini
[Unit]
Description=Dashboard Inventory Sync Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/dashboard
ExecStart=/usr/bin/npm run sync:inventory:watch
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务:
```bash
sudo systemctl daemon-reload
sudo systemctl enable inventory-sync
sudo systemctl start inventory-sync
sudo systemctl status inventory-sync
```

#### 方式C: Windows任务计划程序

1. 打开"任务计划程序"
2. 创建基本任务："Dashboard库存同步"
3. 触发器：**系统启动时**
4. 操作：**启动程序**
   - 程序：`cmd.exe`
   - 参数：`/c cd D:\_workspace_\dashboard && npm run sync:inventory:watch`
5. 设置：勾选"允许任务按需运行"

### 5. 验证部署

#### 5.1 检查同步服务
```bash
# PM2
pm2 logs inventory-sync --lines 50

# systemd
sudo journalctl -u inventory-sync -n 50

# 手动测试
npm run sync:inventory
```

应该看到类似输出：
```
[同步任务] 开始获取K3库存数据...
[同步任务] 成功保存 49796 条库存记录到 /var/www/dashboard/public/inventory-cache.json
[同步任务] 更新时间: 2025/11/28 19:25:48
```

#### 5.2 检查缓存文件
```bash
# Linux
ls -lh /var/www/dashboard/dist/inventory-cache.json
cat /var/www/dashboard/dist/inventory-cache.json | head -30

# Windows
dir D:\_workspace_\dashboard\dist\inventory-cache.json
Get-Content D:\_workspace_\dashboard\dist\inventory-cache.json -Head 30
```

#### 5.3 访问测试
1. 浏览器访问 `http://服务器IP/`
2. 打开浏览器开发者工具 > Network
3. 查找 `inventory-cache.json` 请求
4. 确认状态码为 200，且有数据返回
5. 检查看板中的库存数据是否正常显示

### 6. 监控与维护

#### 日志管理
```bash
# PM2日志
pm2 logs inventory-sync
pm2 flush  # 清空日志

# systemd日志
sudo journalctl -u inventory-sync -f  # 实时查看
sudo journalctl -u inventory-sync --since today  # 今天的日志
```

#### 性能监控
```bash
# PM2
pm2 monit
pm2 info inventory-sync

# 系统资源
htop
df -h
```

#### 手动触发同步
```bash
cd /var/www/dashboard
npm run sync:inventory
```

### 7. 故障排查

#### 问题1: 客户端无法加载库存数据

**检查项**:
1. 缓存文件是否存在？
   ```bash
   ls -l dist/inventory-cache.json
   ```
2. 文件内容是否正常？
   ```bash
   cat dist/inventory-cache.json | jq .
   ```
3. Web服务器是否允许访问？
   ```bash
   curl http://localhost/inventory-cache.json
   ```
4. 浏览器控制台是否有错误？

**解决方案**:
- 手动运行 `npm run sync:inventory` 生成缓存
- 检查nginx/IIS配置，确保允许访问 `.json` 文件
- 检查文件权限：`chmod 644 dist/inventory-cache.json`

#### 问题2: 同步服务无法连接K3 API

**检查项**:
```bash
# 测试网络连通性
ping 39.108.116.74
curl -v http://39.108.116.74/K3Cloud/

# 检查服务器防火墙
sudo iptables -L
sudo firewall-cmd --list-all
```

**解决方案**:
- 联系网络管理员，将服务器IP加入K3 API白名单
- 配置防火墙允许出站HTTP请求
- 如果使用代理，配置环境变量：
  ```bash
  export HTTP_PROXY=http://proxy.company.com:8080
  export HTTPS_PROXY=http://proxy.company.com:8080
  ```

#### 问题3: PM2服务异常停止

**检查日志**:
```bash
pm2 logs inventory-sync --err --lines 100
```

**重启服务**:
```bash
pm2 restart inventory-sync
pm2 save
```

### 8. 更新项目

```bash
cd /var/www/dashboard

# 备份当前版本
cp -r dist dist.backup

# 拉取最新代码（如果使用Git）
git pull

# 重新安装依赖（如果package.json有变化）
npm install

# 重新构建
npm run build

# 重启同步服务
pm2 restart inventory-sync
```

### 9. 安全建议

1. **限制访问**: 使用防火墙限制只有局域网IP可访问
   ```bash
   # nginx
   location / {
       allow 192.168.1.0/24;
       deny all;
   }
   ```

2. **HTTPS**: 配置SSL证书（生产环境推荐）
   ```bash
   # 使用 Let's Encrypt
   sudo certbot --nginx -d your-domain.com
   ```

3. **定期备份**: 备份缓存文件和配置
   ```bash
   # 添加到crontab
   0 2 * * * tar -czf /backup/dashboard-$(date +\%Y\%m\%d).tar.gz /var/www/dashboard
   ```

4. **日志轮转**: 防止日志文件过大
   ```bash
   # PM2自动处理，或配置logrotate
   ```

## 快速部署脚本（Linux）

```bash
#!/bin/bash
# deploy.sh - 一键部署脚本

set -e

echo "=== 数字化智能工厂看板部署脚本 ==="

# 1. 安装依赖
echo "[1/5] 安装项目依赖..."
npm install

# 2. 构建项目
echo "[2/5] 构建生产版本..."
npm run build

# 3. 首次同步库存数据
echo "[3/5] 首次同步库存数据..."
npm run sync:inventory

# 4. 启动PM2服务
echo "[4/5] 启动同步服务..."
pm2 delete inventory-sync 2>/dev/null || true
pm2 start "npm run sync:inventory:watch" --name inventory-sync
pm2 save

# 5. 配置开机自启
echo "[5/5] 配置开机自启..."
pm2 startup

echo "=== 部署完成 ==="
echo "请配置nginx/IIS指向 $(pwd)/dist 目录"
echo "同步服务状态: pm2 status"
echo "查看日志: pm2 logs inventory-sync"
```

使用方法:
```bash
chmod +x deploy.sh
./deploy.sh
```

## 联系与支持

如果部署过程中遇到问题，请查看：
- [CHANGELOG.md](./CHANGELOG.md) - 最新变更记录
- [README.md](./README.md) - 项目文档
- [scripts/README.md](../scripts/README.md) - 同步脚本详细说明

或联系技术支持团队。

