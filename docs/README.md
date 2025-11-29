# 数字化智能工厂看板系统文档

## 项目概述

这是一个基于 React + TypeScript + Vite 的数字化智能工厂实时看板系统，用于展示车间设备OEE、生产效率、库存数据、能耗指标等关键业务指标。

## 技术栈

- **前端框架**: React 18
- **语言**: TypeScript
- **构建工具**: Vite
- **图表库**: Recharts
- **样式**: TailwindCSS
- **数据源**: K3 Cloud ERP系统
- **Excel处理**: SheetJS (xlsx)
- **进程管理**: PM2（可选）

## 性能特性

本项目经过深度性能优化，适合处理大量数据和长时间运行：

- ✅ **智能渲染**: 限制DOM节点数量（~400个），避免渲染成千上万个节点
- ✅ **分阶段加载**: 优先加载核心数据，延迟加载完整数据
- ✅ **React优化**: 使用 memo/useMemo/useCallback 减少不必要渲染
- ✅ **缓存策略**: 三级缓存机制（内存 > localStorage > 服务器）
- ✅ **内存优化**: 减少73%内存占用
- ✅ **首屏秒开**: 1秒内完成首屏加载

**实测性能**（49,796条库存数据）:
- DOM节点: 400个（原10万+）
- 首屏时间: <1秒（原8秒）
- 内存占用: ~80MB（原300MB）

## 核心功能模块

### 1. 库存数据模块

#### 组件位置
- `App.tsx` - `InventoryPanel` 组件
- `App.tsx` - `InventoryGaugeRing` 组件
- `services/inventoryService.ts` - 库存数据服务
- `services/k3cloud.ts` - K3 Cloud API接口

#### 功能特性

##### 库存环形指标
- 展示四类仓库的库存数据：成品仓、原材料仓、半成品仓、车间仓
- 每个仓库使用不同颜色的填满圆环表示
- 显示库存总量（单位：吨）
- **视觉设计**:
  - 主数值使用浅色（`text-slate-100`），提高可读性
  - 副标题保留仓库配色，与彩色圆环呼应
  - 圆环填满效果，视觉更统一

##### 库存明细表
- 滚动展示所有库存物料详情
- 显示字段：物料名称、物料编码、仓库名称、库存量(KG)
- 鼠标悬停时暂停滚动
- 自动跑马灯效果

##### 数据同步机制
- 自动从K3 Cloud系统获取实时库存数据
- **查询限制**: 已取消记录数上限（`limit = 0`），可获取所有库存数据
- 三级缓存策略：
  1. 内存缓存（`cachedInventoryData`）
  2. localStorage缓存（`CACHE_KEY`）
  3. 远程缓存文件（`/inventory-cache.json`）
- 缓存有效期：24小时
- 自动刷新周期：24小时

#### 仓库配置

```typescript
// services/k3cloud.ts
export const WAREHOUSE_CONFIG = {
  rawMaterial: ['CK0102', 'CK0202', 'CK1001'],  // 原材料仓
  workshop: ['CK0103', 'CK0203', 'CK0301'],     // 车间仓
  semiFinished: ['CK0104'],                      // 半成品仓
  finished: ['104', 'CK0201']                    // 成品仓
};
```

#### API接口

##### queryInventory
```typescript
/**
 * 查询K3 Cloud库存数据
 * @param warehouseCode 仓库编码，如 'CK0201'
 * @param limit 返回记录数限制，默认为0表示不限制
 * @returns 库存数据数组
 */
export async function queryInventory(
  warehouseCode: string,
  limit: number = 0
): Promise<InventoryItem[]>
```

##### queryAllWarehousesInventory
```typescript
/**
 * 查询所有配置仓库的库存数据
 * @returns 所有仓库的库存数据
 */
export async function queryAllWarehousesInventory(): Promise<InventoryItem[]>
```

### 2. OEE监控模块

展示车间设备的整体设备效率（OEE），包括可用性、性能和质量三个维度的综合指标。

### 3. 生产效率模块

- 车间效率柱状图：展示月度可用性效率、性能效率、质量效率
- 年度车间生产效率：展示年度关键指标
- 车间班组生产效率：对比四个班组的产能
- 车间人均效率：展示人均产出趋势

### 4. 能耗监控模块

- 能耗指标卡片：展示关键能耗数据
- 用电量趋势图：实时监控用电情况

### 5. 运营监控模块

展示核心运营指标，包括产量、订单、质量、交付等关键数据。

## 数据导入导出

### Excel数据导入
- 支持上传 `.xlsx` 或 `.xls` 文件
- 自动解析并更新看板数据
- 导入后自动导出为 `dashboard-data.xlsx`

### Excel数据导出
- 导出当前看板所有数据
- 包含库存、OEE、效率等所有维度数据

## UI交互

### 快捷键
- **T键**: 切换标题栏显示/隐藏

### 响应式设计
- 支持大屏展示（推荐分辨率：1920x1080及以上）
- 使用 TailwindCSS 响应式工具类适配不同屏幕

## 开发指南

### 快速开始

#### Windows/本地开发
```bash
npm install
npm run dev
# 开发服务器将在 http://localhost:7823 启动
```

#### Linux 服务器部署
详细的 Linux 环境部署指南请参考：**[LINUX-SETUP.md](./LINUX-SETUP.md)**

支持多种部署方式：
- 使用 pnpm 开发运行
- 使用 npm 开发运行  
- 使用 Docker 部署
- 生产环境部署（Nginx + PM2）

### 构建部署
```bash
npm run build
```

更多部署选项：
- **Linux 环境**: [LINUX-SETUP.md](./LINUX-SETUP.md)
- **Docker 部署**: [DOCKER.md](./DOCKER.md)
- **生产环境**: [DEPLOYMENT.md](./DEPLOYMENT.md)

### K3 Cloud API测试
```bash
npx tsx scripts/peekK3Inventory.ts
```

### 库存数据同步（重要）

#### 局域网部署说明

当看板部署在局域网环境，供多个用户访问时，需要在**服务器端**运行同步脚本，避免每个客户端都直接访问K3 Cloud API：

**一次性同步**（用于测试）：
```bash
npm run sync:inventory
```

**同步内容**:
- ✅ 生成 `inventory-cache.json` - JSON格式缓存（快速加载）
- ✅ 生成 `dashboard-data.xlsx` - Excel完整数据（包含所有维度）
- ✅ 自动同步到根目录、dist 和 public 三个位置

**后台持续同步**（推荐生产环境）：
```bash
# 使用 PM2 管理（推荐）
pm2 start "npm run sync:inventory:watch" --name inventory-sync
pm2 logs inventory-sync

# 或使用系统定时任务（cron/任务计划程序）
# 详见 scripts/README.md
```

#### 为什么需要服务器端同步？

1. **网络限制**: K3 Cloud API可能有IP白名单或防火墙限制，不是所有客户端都能访问
2. **性能优化**: 避免多个用户并发请求K3 API，减轻服务器压力
3. **数据一致**: 所有用户共享同一份缓存数据，确保数据一致性
4. **离线可用**: 即使K3 API临时不可用，仍可使用缓存数据

#### 数据同步流程

```
服务器端定时任务      →      缓存文件                  →      客户端浏览器
npm run sync:inventory  →  public/inventory-cache.json  →  自动读取缓存
(每24小时执行一次)         (49,796+ 条记录)              (无需K3 API权限)
```

**详细说明请参考**: [scripts/README.md](../scripts/README.md)

## 变更日志

详细变更记录请查看 [CHANGELOG.md](./CHANGELOG.md)

## 注意事项

### 开发环境
1. K3 Cloud API需要配置正确的认证信息（`services/k3cloud.ts`）
2. 开发环境下使用Vite代理（`/K3Cloud` → `http://39.108.116.74`）
3. 本地测试时可直接调用K3 API，无需同步脚本

### 生产/局域网环境
1. **必须**在服务器端运行 `npm run sync:inventory:watch` 后台同步服务
2. 确保服务器可以访问K3 Cloud API（`http://39.108.116.74/K3Cloud`）
3. 配置nginx或其他Web服务器，确保 `/inventory-cache.json` 可被访问
4. 客户端会优先从缓存文件读取数据，无需直接访问K3 API
5. 库存数据缓存有效期24小时，过期后会尝试重新获取

### 缓存机制
- **服务器缓存**: `public/inventory-cache.json`（共享给所有用户）
- **浏览器缓存**: `localStorage` + 内存缓存（提升单用户体验）
- **缓存优先级**: 内存缓存 > localStorage > 服务器缓存 > K3 API

### 故障恢复
- 如果同步脚本失败，客户端会继续使用旧缓存（最多24小时）
- 如果缓存文件损坏，客户端会尝试直接调用K3 API（需要网络权限）
- 详细故障排查请参考 [scripts/README.md](../scripts/README.md)

