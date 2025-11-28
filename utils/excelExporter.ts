import { DashboardData, KeyMetric } from '../types';

declare global {
  interface Window {
    XLSX: any;
  }
}

const ensureSheetHasHeader = (sheet: any, header: string[]) => {
  if (sheet['!ref']) return;
  header.forEach((key, idx) => {
    const cell = window.XLSX.utils.encode_cell({ c: idx, r: 0 });
    sheet[cell] = { v: key };
  });
  sheet['!ref'] = `A1:${window.XLSX.utils.encode_cell({ c: header.length - 1, r: 0 })}`;
};

const mapKeyMetricColor = (color: KeyMetric['color'] | string, fallback: KeyMetric['color']) => {
  const palette: KeyMetric['color'][] = ['blue', 'cyan', 'orange', 'purple'];
  return palette.includes(color as KeyMetric['color']) ? (color as KeyMetric['color']) : fallback;
};

export const exportDashboardData = (data: DashboardData, filename = 'dashboard-data.xlsx') => {
  if (!window.XLSX) {
    alert('Excel 库尚未加载，请稍后重试');
    return;
  }

  const workbook = window.XLSX.utils.book_new();

  const appendSheet = (rows: any[], sheetName: string, header: string[]) => {
    const normalizedRows = (rows || []).map((row) => ({ ...row }));

    const sheet = window.XLSX.utils.json_to_sheet(normalizedRows, {
      header,
      skipHeader: false,
    });

    ensureSheetHasHeader(sheet, header);
    window.XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  };

  appendSheet(data.oee, 'OEE', ['name', 'value', 'color']);
  appendSheet(data.monthlyEfficiency, 'MonthlyEfficiency', ['name', 'availability', 'performance', 'quality']);
  appendSheet(data.inventoryMetrics, 'InventoryMetrics', ['label', 'value', 'unit', 'color', 'total']);
  appendSheet(data.inventoryTable, 'InventoryTable', ['id', 'name', 'code', 'warehouse', 'quantity', 'available']);
  appendSheet(data.inventoryRaw, 'InventoryRaw', ['materialCode', 'materialName', 'warehouseCode', 'warehouseName', 'quantity']);
  appendSheet(
    data.keyMetrics.map((metric, idx) => ({
      ...metric,
      color: mapKeyMetricColor(metric.color, (['blue', 'cyan', 'orange', 'purple'] as KeyMetric['color'][])[idx % 4]),
    })),
    'KeyMetrics',
    ['id', 'label', 'value', 'unit', 'color'],
  );
  appendSheet(data.energyTrend, 'EnergyTrend', ['time', 'value']);
  appendSheet(data.energyStats, 'EnergyStats', ['label', 'value', 'unit', 'color']);
  appendSheet(data.teamEfficiency, 'TeamEfficiency', ['name', 'group1', 'group2', 'group3', 'group4']);
  appendSheet(data.perCapitaEfficiency, 'PerCapitaEfficiency', ['name', 'value']);
  appendSheet(data.productionTrend, 'ProductionTrend', ['name', 'value', 'target']);
  appendSheet(data.annualKPI, 'AnnualKPI', ['label', 'value', 'color']);

  window.XLSX.writeFile(workbook, filename);
};
