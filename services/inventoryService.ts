import { queryAllWarehousesInventory, InventoryItem as K3InventoryItem, WAREHOUSE_CONFIG } from './k3cloud';
import type { DashboardData, InventoryRawItem } from '../types';

const CACHE_KEY = 'k3-inventory-cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type InventoryCachePayload = {
  data: InventoryRawItem[];
  updatedAt: number;
};

let cachedInventoryData: InventoryRawItem[] = [];
let lastUpdateTime: Date | null = null;
let updateInterval: NodeJS.Timeout | null = null;
const isBrowser = typeof window !== 'undefined';

const INVENTORY_GROUP_META = [
  { key: 'finished', label: '成品仓', color: '#3b82f6' },
  { key: 'rawMaterial', label: '原材料仓', color: '#f59e0b' },
  { key: 'semiFinished', label: '半成品仓', color: '#06b6d4' },
  { key: 'workshop', label: '车间仓', color: '#10b981' },
] as const;

function normalizeInventory(items: K3InventoryItem[]): InventoryRawItem[] {
  return items.map(item => ({
    materialCode: item.materialCode,
    materialName: item.materialName,
    warehouseCode: item.warehouseCode,
    warehouseName: item.warehouseName,
    quantity: item.quantity
  }));
}

function loadLocalCache(): InventoryCachePayload | null {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InventoryCachePayload;
    if (!Array.isArray(parsed.data) || typeof parsed.updatedAt !== 'number') return null;
    return parsed;
  } catch (err) {
    console.warn('读取库存缓存失败，将忽略缓存', err);
    return null;
  }
}

async function loadRemoteCache(): Promise<InventoryCachePayload | null> {
  if (!isBrowser) return null;
  try {
    const response = await fetch('/inventory-cache.json', { cache: 'no-cache' });
    if (!response.ok) return null;
    const payload = await response.json() as InventoryCachePayload;
    if (!Array.isArray(payload.data) || typeof payload.updatedAt !== 'number') return null;
    return payload;
  } catch (err) {
    console.warn('读取本地缓存文件失败，将忽略缓存', err);
    return null;
  }
}

function persistCache(data: InventoryRawItem[], updatedAt: number = Date.now()): void {
  cachedInventoryData = data;
  lastUpdateTime = new Date(updatedAt);

  if (!isBrowser) return;
  try {
    const payload: InventoryCachePayload = { data, updatedAt };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('写入库存缓存失败', err);
  }
}

function isCacheFresh(updatedAt: number | null, now = Date.now()): boolean {
  if (!updatedAt) return false;
  return now - updatedAt < CACHE_TTL_MS;
}

async function fetchFreshInventory(): Promise<InventoryRawItem[]> {
  const rows = await queryAllWarehousesInventory();
  const normalized = normalizeInventory(rows);
  persistCache(normalized);
  console.log(`库存数据更新成功，共 ${normalized.length} 条记录，更新时间: ${new Date().toLocaleString('zh-CN')}`);
  return normalized;
}

/**
 * 从缓存读取库存数据（内存 -> localStorage），未命中则调用 K3。
 */
export async function getInventoryWithCache(forceRefresh = false): Promise<InventoryRawItem[]> {
  const now = Date.now();

  if (!forceRefresh && cachedInventoryData.length && isCacheFresh(lastUpdateTime?.getTime() ?? null, now)) {
    return cachedInventoryData;
  }

  if (!forceRefresh) {
    const cached = loadLocalCache();
    if (cached && isCacheFresh(cached.updatedAt, now)) {
      cachedInventoryData = cached.data;
      lastUpdateTime = new Date(cached.updatedAt);
      return cachedInventoryData;
    }

    const remoteCache = await loadRemoteCache();
    if (remoteCache && isCacheFresh(remoteCache.updatedAt, now)) {
      persistCache(remoteCache.data, remoteCache.updatedAt);
      return remoteCache.data;
    }
  }

  return fetchFreshInventory();
}

/**
 * 利用外部数据（例如Excel缓存）刷新内存和本地缓存。
 */
export function hydrateInventoryCache(data: InventoryRawItem[], updatedAt: number = Date.now()): void {
  if (!data || !Array.isArray(data) || data.length === 0) return;
  persistCache(data, updatedAt);
}

/**
 * 更新库存数据（强制刷新），可选回调。
 */
async function updateInventoryData(onUpdated?: (rows: InventoryRawItem[]) => void): Promise<void> {
  try {
    console.log('正在获取K3 Cloud库存数据...');
    const data = await fetchFreshInventory();
    if (onUpdated) onUpdated(data);
  } catch (error) {
    console.error('更新库存数据失败:', error);
  }
}

/**
 * 启动定时任务，每24小时更新一次库存数据
 */
export function startInventorySync(onUpdated?: (rows: InventoryRawItem[]) => void): void {
  updateInventoryData(onUpdated);

  if (updateInterval) {
    clearInterval(updateInterval);
  }

  updateInterval = setInterval(() => {
    updateInventoryData(onUpdated);
  }, CACHE_TTL_MS);

  console.log('库存数据同步任务已启动，24小时自动更新一次');
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
export function getCachedInventory(): InventoryRawItem[] {
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
export async function manualUpdate(): Promise<InventoryRawItem[]> {
  await updateInventoryData();
  return cachedInventoryData;
}

/**
 * 根据K3库存数据计算环形指标（吨）
 */
export function calculateInventoryMetrics(inventory: InventoryRawItem[]): DashboardData['inventoryMetrics'] {
  return INVENTORY_GROUP_META.map(group => {
    const codes = (WAREHOUSE_CONFIG as any)[group.key] as string[] | undefined;
    const totalKg = (inventory || []).reduce((sum, item) => {
      if (codes?.includes(item.warehouseCode)) {
        return sum + (item.quantity ?? 0);
      }
      return sum;
    }, 0);
    const tons = totalKg / 1000;
    const rounded = Number.isFinite(tons) ? Number(tons.toFixed(2)) : 0;
    return {
      label: group.label,
      value: rounded,
      unit: '吨',
      color: group.color,
      total: rounded
    };
  });
}

/**
 * 格式化库存数据为Dashboard所需格式
 */
export function formatInventoryForDashboard(inventory: InventoryRawItem[]): DashboardData['inventoryTable'] {
  const filtered = inventory.filter(item => (item.quantity ?? 0) > 0);
  const source = filtered.length > 0 ? filtered : inventory;

  return source.map((item, index) => {
    const quantity = Number(item.quantity ?? 0);
    return {
      id: item.materialCode ? `${item.materialCode}-${index}` : `inv-${index}`,
      name: item.materialName,
      code: item.materialCode,
      warehouse: item.warehouseName,
      quantity: Math.round(quantity),
      available: Math.round(quantity)
    };
  });
}
