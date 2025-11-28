# 库存数据同步脚本使用说明

## 问题背景

局域网内的多个用户访问看板系统时，由于K3 Cloud API可能有访问限制（IP白名单、防火墙等），导致部分用户无法直接从K3获取库存数据。

## 解决方案

通过服务器端定期同步K3库存数据，生成两种格式的缓存文件：
1. **inventory-cache.json** - JSON格式，快速加载（优先）
2. **dashboard-data.xlsx** - Excel格式，完整数据（包含所有维度）

所有用户从这些缓存文件读取数据，实现数据共享。

## 使用方法

### 方式一：手动同步（推荐用于测试）

在服务器上执行一次性同步：

```bash
npm run sync:inventory
```

这会立即从K3 Cloud获取最新库存数据并生成：

**JSON缓存文件**:
- `public/inventory-cache.json`
- `dist/inventory-cache.json`

**Excel完整数据**:
- `dashboard-data.xlsx`（根目录）
- `public/dashboard-data.xlsx`
- `dist/dashboard-data.xlsx`

### 方式二：后台持续同步（推荐用于生产环境）

启动后台服务，每24小时自动同步一次：

```bash
npm run sync:inventory:watch
```

或者使用 PM2 管理后台进程：

```bash
# 安装 PM2（如果未安装）
npm install -g pm2

# 启动同步服务
pm2 start "npm run sync:inventory:watch" --name inventory-sync

# 查看日志
pm2 logs inventory-sync

# 停止服务
pm2 stop inventory-sync

# 设置开机自启
pm2 startup
pm2 save
```

### 方式三：使用系统定时任务

#### Linux/Mac (cron)

编辑 crontab：
```bash
crontab -e
```

添加定时任务（每天凌晨2点执行）：
```
0 2 * * * cd /path/to/dashboard && npm run sync:inventory >> /var/log/inventory-sync.log 2>&1
```

#### Windows (任务计划程序)

1. 打开"任务计划程序"
2. 创建基本任务
3. 触发器：每天凌晨2点
4. 操作：启动程序
   - 程序：`cmd.exe`
   - 参数：`/c cd D:\_workspace_\dashboard && npm run sync:inventory`

## 验证同步结果

同步成功后，检查文件内容：

```bash
# 查看缓存文件
cat public/inventory-cache.json

# 或使用 PowerShell (Windows)
Get-Content public\inventory-cache.json
```

文件格式示例：
```json
{
  "data": [
    {
      "materialCode": "M001",
      "materialName": "原材料A",
      "warehouseCode": "CK0201",
      "warehouseName": "成品仓",
      "quantity": 1500.5
    }
  ],
  "updatedAt": 1732795200000
}
```

## 数据流程

```
                    服务器端同步脚本
                          ↓
        ┌─────────────────┴─────────────────┐
        ↓                                   ↓
inventory-cache.json                dashboard-data.xlsx
(JSON格式，快速加载)                 (Excel格式，完整数据)
        ↓                                   ↓
    客户端优先加载JSON              延迟加载Excel（包含OEE等）
```

1. **服务器端**：`syncInventoryCache.ts` 脚本从K3 Cloud获取数据
2. **生成文件**：
   - `inventory-cache.json` - 库存数据（JSON格式）
   - `dashboard-data.xlsx` - 完整看板数据（Excel格式）
3. **客户端加载**：
   - 优先加载JSON（快速，1秒内）
   - 延迟加载Excel（完整，2-3秒后）

## 注意事项

1. **网络访问**：确保运行同步脚本的服务器可以访问K3 Cloud API
2. **文件权限**：确保脚本有写入项目根目录、`public/` 和 `dist/` 的权限
3. **缓存时效**：默认缓存有效期24小时，可在 `services/inventoryService.ts` 中修改
4. **错误处理**：同步失败时，客户端会继续使用旧缓存数据
5. **并发访问**：多用户同时访问时，都从同一个缓存文件读取，不会产生重复请求
6. **Excel文件**：自动生成的Excel包含完整看板数据，会保留现有的非库存数据（OEE、能耗等）
7. **磁盘空间**：JSON约10MB，Excel约15MB，确保有足够磁盘空间

## 故障排查

### 问题1：同步失败，提示K3 API错误

**原因**：服务器无法访问K3 Cloud API

**解决方案**：
- 检查服务器网络连接
- 确认K3 API地址和端口是否正确
- 检查防火墙和IP白名单设置

### 问题2：客户端仍然获取不到数据

**原因**：缓存文件未正确生成或路径错误

**解决方案**：
- 检查 `public/inventory-cache.json` 是否存在
- 检查文件内容是否为有效JSON
- 确认前端访问路径：`/inventory-cache.json`
- 检查服务器是否正确配置静态文件服务

### 问题3：数据不是最新的

**原因**：同步任务未按时执行

**解决方案**：
- 检查定时任务或PM2服务是否正常运行
- 查看同步日志，确认执行时间
- 手动执行 `npm run sync:inventory` 测试

## 性能优化建议

1. **缓存策略**：根据业务需求调整缓存有效期
2. **压缩传输**：配置nginx启用gzip压缩 `inventory-cache.json`
3. **CDN加速**：对于分布式部署，可考虑使用CDN分发缓存文件
4. **增量更新**：如果数据量很大，可考虑实现增量同步机制

## 相关文件

- `scripts/syncInventoryCache.ts` - 同步脚本主文件
- `scripts/peekK3Inventory.ts` - K3数据预览脚本（调试用）
- `services/k3cloud.ts` - K3 Cloud API接口
- `services/inventoryService.ts` - 库存数据服务和缓存逻辑
- `public/inventory-cache.json` - 库存数据缓存文件

