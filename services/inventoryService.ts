import { queryAllWarehousesInventory, InventoryItem } from './k3cloud';

// 库存数据缓存
let cachedInventoryData: InventoryItem[] = [];
let lastUpdateTime: Date | null = null;
let updateInterval: NodeJS.Timeout | null = null;

/**
 * 更新库存数据
 */
async function updateInventoryData(): Promise<void> {
  try {
    console.log('正在获取K3 Cloud库存数据...');
    const data = await queryAllWarehousesInventory();
    cachedInventoryData = data;
    lastUpdateTime = new Date();
    console.log(`库存数据更新成功，共 ${data.length} 条记录，更新时间: ${lastUpdateTime.toLocaleString('zh-CN')}`);
  } catch (error) {
    console.error('更新库存数据失败:', error);
  }
}

/**
 * 启动定时任务，每24小时更新一次库存数据
 */
export function startInventorySync(): void {
  // 立即执行一次
  updateInventoryData();

  // 如果已存在定时任务，先清除
  if (updateInterval) {
    clearInterval(updateInterval);
  }

  // 设置24小时定时任务 (24 * 60 * 60 * 1000 毫秒)
  updateInterval = setInterval(() => {
    updateInventoryData();
  }, 24 * 60 * 60 * 1000);

  console.log('库存数据同步任务已启动，每24小时自动更新一次');
}

/**
 * 停止定时任务
 */
export function stopInventorySync(): void {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
    console.log('库存数据同步任务已停止');
  }
}

/**
 * 获取缓存的库存数据
 */
export function getCachedInventory(): InventoryItem[] {
  return cachedInventoryData;
}

/**
 * 获取最后更新时间
 */
export function getLastUpdateTime(): Date | null {
  return lastUpdateTime;
}

/**
 * 手动触发更新
 */
export async function manualUpdate(): Promise<InventoryItem[]> {
  await updateInventoryData();
  return cachedInventoryData;
}

/**
 * 格式化库存数据为Dashboard所需格式
 */
export function formatInventoryForDashboard(inventory: InventoryItem[]): Array<{
  id: string;
  name: string;
  code: string;
  warehouse: string;
  quantity: number;
}> {
  const filtered = inventory.filter(item => (item.quantity ?? 0) > 0);
  const source = filtered.length > 0 ? filtered : inventory; // 若全为0，则显示原始数据避免空表

  return source.map((item, index) => ({
    id: `inv-${index}`,
    name: item.materialName,
    code: item.materialCode,
    warehouse: item.warehouseName,
    quantity: item.quantity
  }));
}
