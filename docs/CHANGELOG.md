# 项目变更日志

## 2025-11-28 (第二次更新)

### Bug修复

#### 1. 库存环数字溢出问题修复
**文件**: `App.tsx` - `InventoryGaugeRing` 组件

**问题描述**:
- 当库存数值较大（如1630.43吨）时，数字和单位连在一起显示导致溢出圆环边界
- 文字显示不完整，影响数据可读性

**修复方案**:
- 将数值和单位分成两行显示
- 数值字体从 `text-lg md:text-xl` 调整为 `text-base md:text-lg`
- 单位独立显示为小字号（`text-[10px]`）
- 副标题字号微调为 `text-[9px]`，并增加间距 `mt-0.5`

**代码变更**:
```typescript
// 修改前
<span className="text-lg md:text-xl font-bold font-mono text-slate-100">
  {value}{unit || '%'}
</span>

// 修改后
<span className="text-base md:text-lg font-bold font-mono text-slate-100 leading-tight">
  {value}
</span>
<span className="text-[10px] text-slate-300 leading-tight">
  {unit || '%'}
</span>
```

**效果**:
- 数字完整显示在圆环内，不再溢出
- 视觉层次更清晰：数值 > 单位 > 仓库名称

#### 2. 局域网用户无法获取库存数据问题修复
**相关文件**: 
- `scripts/syncInventoryCache.ts` (新增)
- `scripts/README.md` (新增)
- `package.json` (更新)

**问题描述**:
- 局域网内多个用户访问看板时，部分用户因网络限制无法直接访问K3 Cloud API
- Excel导出功能仅触发浏览器下载，不会保存到服务器共享目录
- 缓存文件 `inventory-cache.json` 没有自动更新机制

**根本原因**:
1. K3 Cloud API可能有IP白名单或防火墙限制
2. 前端直接调用K3 API，每个用户都需要独立的网络访问权限
3. 浏览器端无法直接写入服务器文件系统

**解决方案**:
创建服务器端同步脚本，定期从K3获取数据并保存到共享缓存文件：

1. **新增同步脚本** (`scripts/syncInventoryCache.ts`)
   - 从K3 Cloud API获取全量库存数据
   - 保存到 `public/inventory-cache.json` 和 `dist/inventory-cache.json`
   - 支持单次执行和持续监听两种模式
   - 包含详细日志输出和错误处理

2. **新增npm命令** (`package.json`)
   - `npm run sync:inventory`: 手动执行一次同步
   - `npm run sync:inventory:watch`: 启动后台服务，每24小时自动同步

3. **新增使用文档** (`scripts/README.md`)
   - 完整的使用说明和故障排查指南
   - 支持多种部署方式：手动、PM2、cron、Windows任务计划

**数据流程**:
```
服务器端                    共享缓存                客户端
K3 Cloud API  ──→  syncInventoryCache.ts  ──→  public/inventory-cache.json  ──→  所有用户浏览器
                   (定时任务/PM2)              (nginx/静态文件服务)         (优先读取缓存)
```

**使用示例**:
```bash
# 手动同步一次
npm run sync:inventory

# 后台持续同步（推荐生产环境）
pm2 start "npm run sync:inventory:watch" --name inventory-sync

# 查看同步日志
pm2 logs inventory-sync
```

**实测效果**:
- 成功从K3获取并缓存 49,796 条库存记录
- 所有局域网用户可以共享同一份缓存数据
- 不再需要每个客户端都有K3 API访问权限

**优势**:
1. **统一数据源**: 所有用户访问同一份缓存，数据一致性更好
2. **降低API压力**: 避免多个用户并发请求K3 API
3. **提升加载速度**: 从本地缓存读取比远程API更快
4. **容错能力**: 即使K3 API临时不可用，仍可使用缓存数据

---

## 2025-11-28 (第一次更新)

### 功能优化

#### 1. 库存环显示优化
**文件**: `App.tsx` - `InventoryGaugeRing` 组件

**变更说明**:
- 将库存环内的主数值文字颜色从仓库配色改为浅色（`text-slate-100`），提高可读性
- 保留副标题的仓库配色（通过 `style={{ color }}` 动态设置），与彩色圆环区分开
- 增强了视觉层次感，使数值更易识别

**影响范围**:
- 库存数据卡片中的环形指标显示
- 成品仓、原材料仓、半成品仓、车间仓四个指标环

#### 2. K3库存查询上限优化
**文件**: `services/k3cloud.ts` - `queryInventory` 函数

**变更说明**:
- 取消K3库存查询的900条记录上限限制
- 将 `queryInventory` 函数的默认 `limit` 参数从 100 改为 0
- `limit = 0` 表示不限制返回记录数，可以获取所有库存数据

**影响范围**:
- 所有仓库的库存数据查询（`queryAllWarehousesInventory`）
- 自动同步和手动刷新库存数据功能

**技术细节**:
```typescript
// 修改前
export async function queryInventory(
  warehouseCode: string,
  limit: number = 100
): Promise<InventoryItem[]>

// 修改后
export async function queryInventory(
  warehouseCode: string,
  limit: number = 0  // 0 表示不限制
): Promise<InventoryItem[]>
```

### 优化效果
1. **视觉体验**: 库存环内数值更清晰易读，与彩色背景形成更好的对比
2. **数据完整性**: 可以获取所有库存数据，不会因为记录数限制而遗漏数据
3. **业务准确性**: 库存统计数据更加准确完整

