#!/bin/bash
#
# Docker 容器启动脚本
# 同时启动 Nginx 和 Node.js 库存同步服务
#

set -e

echo "=== 数字化智能工厂看板系统启动 ==="

# 1. 检查数据目录
echo "[1/5] 检查数据目录..."
mkdir -p /data /app/public /app/dist
if [ ! -f /data/inventory-cache.json ]; then
    echo "  首次启动，创建初始缓存文件..."
    echo '{"data":[],"updatedAt":0}' > /data/inventory-cache.json
fi

# 2. 确保软链接存在
echo "[2/5] 配置文件链接..."
# Nginx 访问路径
ln -sf /data/inventory-cache.json /usr/share/nginx/html/inventory-cache.json
ln -sf /data/dashboard-data.xlsx /usr/share/nginx/html/dashboard-data.xlsx
# 同步脚本写入路径
ln -sf /data/inventory-cache.json /app/public/inventory-cache.json
ln -sf /data/dashboard-data.xlsx /app/public/dashboard-data.xlsx
ln -sf /data/inventory-cache.json /app/dist/inventory-cache.json
ln -sf /data/dashboard-data.xlsx /app/dist/dashboard-data.xlsx

# 3. 创建健康检查端点
echo "[3/5] 创建健康检查端点..."
echo "healthy" > /usr/share/nginx/html/health

# 4. 启动 Nginx
echo "[4/5] 启动 Nginx 服务..."
nginx -g "daemon off;" &
NGINX_PID=$!
echo "  Nginx 已启动 (PID: $NGINX_PID)"

# 5. 启动库存同步服务
echo "[5/5] 启动库存同步服务..."
cd /app
npm run sync:inventory:watch &
SYNC_PID=$!
echo "  同步服务已启动 (PID: $SYNC_PID)"

echo "=== 启动完成 ==="
echo "  - Nginx: http://0.0.0.0:80"
echo "  - 健康检查: http://0.0.0.0:80/health"
echo "  - 同步服务: 每24小时自动执行"
echo ""

# 等待任一进程退出
wait -n

# 如果任一进程退出，停止其他进程
echo "检测到服务异常退出，正在关闭..."
kill $NGINX_PID $SYNC_PID 2>/dev/null || true
exit 1

