import { DashboardData, KeyMetric } from '../types';

declare global {
  interface Window {
    XLSX: any;
  }
}

const XLSX_CDN_SRC = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';

const loadXLSX = (): Promise<any> => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('XLSX requires browser environment'));
  }
  if (window.XLSX) return Promise.resolve(window.XLSX);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${XLSX_CDN_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.XLSX));
      existing.addEventListener('error', () => reject(new Error('Failed to load XLSX library')));
      return;
    }
    const script = document.createElement('script');
    script.src = XLSX_CDN_SRC;
    script.async = true;
    script.onload = () => (window.XLSX ? resolve(window.XLSX) : reject(new Error('XLSX library not available after load')));
    script.onerror = () => reject(new Error('Failed to load XLSX library'));
    document.head.appendChild(script);
  });
};

const pickValue = <T = any>(row: any, keys: string[], fallback?: T): T => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== '') {
      return value as T;
    }
  }
  return fallback as T;
};

const toNumber = (value: any, fallback = 0) => {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(normalized) ? normalized : fallback;
};

const normalizeMetricColor = (color: string | undefined, index: number): KeyMetric['color'] => {
  const palette: KeyMetric['color'][] = ['blue', 'cyan', 'orange', 'purple'];
  return palette.includes(color as KeyMetric['color'])
    ? (color as KeyMetric['color'])
    : palette[index % palette.length];
};

export const parseExcelFile = (file: File): Promise<Partial<DashboardData>> => {
  return loadXLSX().then(() => new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const workbook = window.XLSX.read(data, { type: 'array' });
        if (!workbook || !workbook.SheetNames?.length) {
          throw new Error('Excel 工作簿为空或无法读取');
        }

        const parsedData: Partial<DashboardData> = {};

        const getSheetRows = (...names: string[]) => {
          for (const name of names) {
            const sheet = workbook.Sheets[name];
            if (sheet) {
              return window.XLSX.utils.sheet_to_json(sheet, { defval: '' });
            }
          }
          return null;
        };

        const oeeRows = getSheetRows('OEE', '设备OEE');
        if (oeeRows) {
          parsedData.oee = oeeRows.map((row: any, idx: number) => ({
            name: pickValue(row, ['name', '指标', 'label'], `OEE-${idx + 1}`),
            value: toNumber(pickValue(row, ['value', '数值', 'score'], 0)),
            color: pickValue(row, ['color', '颜色'], '#06b6d4'),
          }));
        }

        const monthlyRows = getSheetRows('MonthlyEfficiency', '车间效率');
        if (monthlyRows) {
          parsedData.monthlyEfficiency = monthlyRows.map((row: any, idx: number) => ({
            name: pickValue(row, ['name', '月份'], `${idx + 1}月`),
            availability: toNumber(pickValue(row, ['availability', '可用性效率'], 0)),
            performance: toNumber(pickValue(row, ['performance', '性能效率'], 0)),
            quality: toNumber(pickValue(row, ['quality', '质量效率'], 0)),
          }));
        }

        const inventoryMetricsRows = getSheetRows('InventoryMetrics', '库存指标');
        if (inventoryMetricsRows) {
          parsedData.inventoryMetrics = inventoryMetricsRows.map((row: any) => ({
            label: pickValue(row, ['label', '仓库'], ''),
            value: toNumber(pickValue(row, ['value', '当前量'], 0)),
            unit: pickValue(row, ['unit', '单位'], '吨'),
            color: pickValue(row, ['color', '颜色'], '#3b82f6'),
            total: toNumber(pickValue(row, ['total', '总量', '容量'], 0)),
          }));
        }

        const inventoryRows = getSheetRows('InventoryTable', 'Inventory', '库存');
        if (inventoryRows) {
          parsedData.inventoryTable = inventoryRows.map((row: any, index: number) => ({
            id: pickValue(row, ['id', 'ID'], `${index + 1}`),
            name: pickValue(row, ['name', '物料名称'], ''),
            code: pickValue(row, ['code', '物料编码'], ''),
            warehouse: pickValue(row, ['warehouse', '仓库', '仓库名称'], ''),
            quantity: toNumber(pickValue(row, ['quantity', '库存量'], 0)),
            available: toNumber(pickValue(row, ['available', '可用量'], pickValue(row, ['quantity', '库存量'], 0))),
          }));
        }

        const metricRows = getSheetRows('KeyMetrics', 'Metrics', '指标');
        if (metricRows) {
          parsedData.keyMetrics = metricRows.map((row: any, idx: number) => ({
            id: pickValue(row, ['id'], `m-import-${idx}`),
            label: pickValue(row, ['label', '指标名称'], ''),
            value: pickValue(row, ['value', '值'], ''),
            unit: pickValue(row, ['unit', '单位'], undefined),
            color: normalizeMetricColor(pickValue(row, ['color', '颜色'], ''), idx),
          }));
        }

        const energyTrendRows = getSheetRows('EnergyTrend', '能耗趋势');
        if (energyTrendRows) {
          parsedData.energyTrend = energyTrendRows.map((row: any, idx: number) => ({
            time: pickValue(row, ['time', '月份', '日期'], `${idx + 1}`),
            value: toNumber(pickValue(row, ['value', '用电量'], 0)),
          }));
        }

        const energyStatsRows = getSheetRows('EnergyStats', '能耗统计');
        if (energyStatsRows) {
          parsedData.energyStats = energyStatsRows.map((row: any) => ({
            label: pickValue(row, ['label', '名称'], ''),
            value: toNumber(pickValue(row, ['value', '数值'], 0)),
            unit: pickValue(row, ['unit', '单位'], ''),
            color: pickValue(row, ['color', '颜色'], '#06b6d4'),
          }));
        }

        const teamEfficiencyRows = getSheetRows('TeamEfficiency', '班组效率');
        if (teamEfficiencyRows) {
          parsedData.teamEfficiency = teamEfficiencyRows.map((row: any) => ({
            name: pickValue(row, ['name', '班组'], ''),
            group1: toNumber(pickValue(row, ['group1', '一组'], 0)),
            group2: toNumber(pickValue(row, ['group2', '二组'], 0)),
            group3: toNumber(pickValue(row, ['group3', '三组'], 0)),
            group4: toNumber(pickValue(row, ['group4', '四组'], 0)),
          }));
        }

        const perCapitaRows = getSheetRows('PerCapitaEfficiency', '人均效率');
        if (perCapitaRows) {
          parsedData.perCapitaEfficiency = perCapitaRows.map((row: any, idx: number) => ({
            name: pickValue(row, ['name', '班组'], `${idx + 1}`),
            value: toNumber(pickValue(row, ['value', '效率'], 0)),
          }));
        }

        const productionRows = getSheetRows('ProductionTrend', 'Production', '生产趋势');
        if (productionRows) {
          parsedData.productionTrend = productionRows.map((row: any) => ({
            name: pickValue(row, ['name', '月份'], ''),
            value: toNumber(pickValue(row, ['value', '实际产量'], 0)),
            target: toNumber(pickValue(row, ['target', '计划目标'], 0)),
          }));
        }

        const annualKPIRows = getSheetRows('AnnualKPI', '年度KPI');
        if (annualKPIRows) {
          parsedData.annualKPI = annualKPIRows.map((row: any) => ({
            label: pickValue(row, ['label', '指标'], ''),
            value: toNumber(pickValue(row, ['value', '达成率'], 0)),
            color: pickValue(row, ['color', '颜色'], '#3b82f6'),
          }));
        }

        resolve(parsedData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  }));
};
