#
# 多阶段构建 - 数字化智能工厂看板系统
# 支持: React前端 + Nginx服务 + Node.js同步脚本
#

# ==============================
# 阶段1: 构建前端资源
# ==============================
FROM node:20-alpine AS builder

WORKDIR /app

# 复制package文件并安装依赖（利用Docker缓存层）
COPY package*.json ./
RUN npm ci --no-fund --no-audit

# 复制源代码
COPY . .

# 构建生产版本
RUN npm run build

# ==============================
# 阶段2: 运行时环境
# 同时支持Nginx静态服务和Node.js同步脚本
# ==============================
FROM node:20-alpine

# 安装nginx和必要工具
RUN apk add --no-cache nginx tzdata bash && \
    # 设置时区为中国
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    # 创建nginx运行目录
    mkdir -p /run/nginx

WORKDIR /app

# 从构建阶段复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制项目文件（用于运行同步脚本）
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/services ./services
COPY --from=builder /app/types.ts ./
COPY --from=builder /app/constants.ts ./

# 复制配置文件
COPY nginx.conf /etc/nginx/http.d/default.conf

# 复制启动脚本
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# 创建数据目录（用于持久化缓存文件）
RUN mkdir -p /data && \
    # 创建软链接，将缓存文件指向持久化目录
    ln -sf /data/inventory-cache.json /usr/share/nginx/html/inventory-cache.json && \
    ln -sf /data/dashboard-data.xlsx /usr/share/nginx/html/dashboard-data.xlsx && \
    # 设置权限
    chown -R node:node /app /data /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# 使用启动脚本管理服务
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
