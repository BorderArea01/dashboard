// 定期同步K3库存数据到public目录，供局域网用户访问
import { queryAllWarehousesInventory } from '../services/k3cloud';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Polyfill browser globals for Node environment
if (!(globalThis as any).btoa) {
  (globalThis as any).btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
}
if (!(globalThis as any).atob) {
  (globalThis as any).atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
}

interface InventoryCachePayload {
  data: any[];
  updatedAt: number;
}

async function syncInventoryCache() {
  try {
    console.log('[同步任务] 开始获取K3库存数据...');
    const rows = await queryAllWarehousesInventory();
    
    const payload: InventoryCachePayload = {
      data: rows,
      updatedAt: Date.now()
    };

    // 保存到 public 目录
    const publicPath = join(process.cwd(), 'public', 'inventory-cache.json');
    writeFileSync(publicPath, JSON.stringify(payload, null, 2), 'utf-8');
    console.log(`[同步任务] 成功保存 ${rows.length} 条库存记录到 ${publicPath}`);
    console.log(`[同步任务] 更新时间: ${new Date().toLocaleString('zh-CN')}`);
    
    // 同时保存到 dist 目录（如果存在）
    try {
      const distPath = join(process.cwd(), 'dist', 'inventory-cache.json');
      writeFileSync(distPath, JSON.stringify(payload, null, 2), 'utf-8');
      console.log(`[同步任务] 同步到 ${distPath}`);
    } catch (err) {
      console.warn('[同步任务] dist 目录不存在，跳过同步');
    }
    
    return rows.length;
  } catch (error) {
    console.error('[同步任务] 同步失败:', error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isWatch = args.includes('--watch');
  
  // 首次执行
  await syncInventoryCache();
  
  if (isWatch) {
    console.log('[同步任务] 启动定时同步，每24小时执行一次');
    setInterval(async () => {
      try {
        await syncInventoryCache();
      } catch (err) {
        console.error('[同步任务] 定时同步出错:', err);
      }
    }, 24 * 60 * 60 * 1000); // 24小时
    
    // 保持进程运行
    console.log('[同步任务] 同步服务已启动，按 Ctrl+C 停止');
  } else {
    console.log('[同步任务] 单次同步完成');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('[同步任务] 执行失败:', err);
  process.exit(1);
});

