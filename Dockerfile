#
# Multi-stage build for production
#
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --no-fund --no-audit

# Copy source
COPY . .

# Build static assets
RUN npm run build


# ------------------------------
# Runtime image
# ------------------------------
FROM nginx:1.27-alpine

# Nginx config for SPA routing + compression
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
