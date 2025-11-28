// 定期同步K3库存数据到public目录，供局域网用户访问
import { queryAllWarehousesInventory } from '../services/k3cloud';
import { calculateInventoryMetrics, formatInventoryForDashboard } from '../services/inventoryService';
import { INITIAL_DATA } from '../constants';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as XLSX from 'xlsx';

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

/**
 * 生成Excel文件
 */
function generateExcelFile(inventoryRaw: any[], outputPath: string) {
  try {
    console.log('[Excel生成] 开始生成Excel文件...');
    
    // 计算库存指标和表格数据
    const inventoryMetrics = calculateInventoryMetrics(inventoryRaw);
    const inventoryTable = formatInventoryForDashboard(inventoryRaw);
    
    // 读取现有的Excel文件（如果存在），保留其他sheet数据
    let existingData: any = {};
    if (existsSync(outputPath)) {
      try {
        const existingWorkbook = XLSX.readFile(outputPath);
        const sheetNames = ['OEE', 'MonthlyEfficiency', 'KeyMetrics', 'EnergyTrend', 'EnergyStats', 'TeamEfficiency', 'PerCapitaEfficiency', 'ProductionTrend', 'AnnualKPI'];
        
        sheetNames.forEach(sheetName => {
          if (existingWorkbook.Sheets[sheetName]) {
            existingData[sheetName] = XLSX.utils.sheet_to_json(existingWorkbook.Sheets[sheetName]);
          }
        });
      } catch (err) {
        console.warn('[Excel生成] 无法读取现有Excel文件，将使用默认数据');
      }
    }
    
    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    
    // 添加各个sheet
    const addSheet = (data: any[], sheetName: string, defaultData: any[]) => {
      const sheetData = data.length > 0 ? data : (existingData[sheetName] || defaultData);
      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    };
    
    // 使用现有数据或默认数据
    addSheet(existingData.OEE || [], 'OEE', INITIAL_DATA.oee);
    addSheet(existingData.MonthlyEfficiency || [], 'MonthlyEfficiency', INITIAL_DATA.monthlyEfficiency);
    addSheet(inventoryMetrics, 'InventoryMetrics', []);
    addSheet(inventoryTable, 'InventoryTable', []);
    addSheet(inventoryRaw, 'InventoryRaw', []);
    addSheet(existingData.KeyMetrics || [], 'KeyMetrics', INITIAL_DATA.keyMetrics);
    addSheet(existingData.EnergyTrend || [], 'EnergyTrend', INITIAL_DATA.energyTrend);
    addSheet(existingData.EnergyStats || [], 'EnergyStats', INITIAL_DATA.energyStats);
    addSheet(existingData.TeamEfficiency || [], 'TeamEfficiency', INITIAL_DATA.teamEfficiency);
    addSheet(existingData.PerCapitaEfficiency || [], 'PerCapitaEfficiency', INITIAL_DATA.perCapitaEfficiency);
    addSheet(existingData.ProductionTrend || [], 'ProductionTrend', INITIAL_DATA.productionTrend);
    addSheet(existingData.AnnualKPI || [], 'AnnualKPI', INITIAL_DATA.annualKPI);
    
    // 写入文件
    XLSX.writeFile(workbook, outputPath);
    console.log(`[Excel生成] 成功生成Excel文件: ${outputPath}`);
  } catch (error) {
    console.error('[Excel生成] 生成Excel文件失败:', error);
  }
}

async function syncInventoryCache() {
  try {
    console.log('[同步任务] 开始获取K3库存数据...');
    const rows = await queryAllWarehousesInventory();
    
    const payload: InventoryCachePayload = {
      data: rows,
      updatedAt: Date.now()
    };

    // 1. 保存JSON缓存到 public 目录
    const publicPath = join(process.cwd(), 'public', 'inventory-cache.json');
    writeFileSync(publicPath, JSON.stringify(payload, null, 2), 'utf-8');
    console.log(`[同步任务] 成功保存 ${rows.length} 条库存记录到 ${publicPath}`);
    console.log(`[同步任务] 更新时间: ${new Date().toLocaleString('zh-CN')}`);
    
    // 2. 同时保存到 dist 目录（如果存在）
    try {
      const distPath = join(process.cwd(), 'dist', 'inventory-cache.json');
      writeFileSync(distPath, JSON.stringify(payload, null, 2), 'utf-8');
      console.log(`[同步任务] 同步到 ${distPath}`);
    } catch (err) {
      console.warn('[同步任务] dist 目录不存在，跳过同步');
    }
    
    // 3. 生成Excel文件到根目录
    const excelPath = join(process.cwd(), 'dashboard-data.xlsx');
    generateExcelFile(rows, excelPath);
    
    // 4. 同时复制到 dist 和 public 目录
    try {
      const distExcelPath = join(process.cwd(), 'dist', 'dashboard-data.xlsx');
      const publicExcelPath = join(process.cwd(), 'public', 'dashboard-data.xlsx');
      
      const excelBuffer = readFileSync(excelPath);
      writeFileSync(distExcelPath, excelBuffer);
      writeFileSync(publicExcelPath, excelBuffer);
      
      console.log(`[Excel生成] Excel文件已同步到 dist 和 public 目录`);
    } catch (err) {
      console.warn('[Excel生成] 复制Excel文件失败:', err);
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

