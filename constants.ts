import { DashboardData } from './types';

export const INITIAL_DATA: DashboardData = {
  oee: [
    { name: 'OEE综合效率', value: 66, color: '#06b6d4' },
    { name: '可用性效率', value: 75, color: '#3b82f6' },
    { name: '性能效率', value: 88, color: '#6366f1' },
    { name: '质量效率', value: 100, color: '#10b981' },
  ],
  monthlyEfficiency: [
    { name: '1月', availability: 80, performance: 85, quality: 90 },
    { name: '2月', availability: 78, performance: 88, quality: 92 },
    { name: '3月', availability: 82, performance: 86, quality: 95 },
    { name: '4月', availability: 85, performance: 89, quality: 94 },
    { name: '5月', availability: 88, performance: 90, quality: 96 },
    { name: '6月', availability: 86, performance: 92, quality: 95 },
    { name: '7月', availability: 84, performance: 88, quality: 93 },
    { name: '8月', availability: 89, performance: 91, quality: 97 },
    { name: '9月', availability: 90, performance: 93, quality: 98 },
    { name: '10月', availability: 91, performance: 94, quality: 98 },
    { name: '11月', availability: 88, performance: 90, quality: 96 },
    { name: '12月', availability: 85, performance: 89, quality: 95 },
  ],
  inventoryMetrics: [
    { label: '成品仓', value: 356, unit: '吨', color: '#3b82f6', total: 500 },
    { label: '原材料仓', value: 482, unit: '吨', color: '#f59e0b', total: 600 },
    { label: '半成品', value: 37, unit: '吨', color: '#06b6d4', total: 100 },
    { label: '车间仓', value: 100, unit: '吨', color: '#10b981', total: 120 },
  ],
  inventoryTable: [],
  keyMetrics: [
    { id: 'm1', label: '今年销售单量', value: '2,202', unit: '单', color: 'blue' },
    { id: 'm2', label: '今年出库重量', value: '1,468', unit: '吨', color: 'orange' },
    { id: 'm3', label: '累计客户数量', value: 695, unit: '家', color: 'cyan' },
    { id: 'm4', label: '全年新增客户', value: 18, unit: '家', color: 'purple' },
    { id: 'm5', label: '安全生产', value: 476, unit: '天', color: 'blue' },
    { id: 'm6', label: '今年累计产量', value: '1,398', unit: '吨', color: 'orange' },
    { id: 'm7', label: '平均天生产效率', value: 51, unit: '吨', color: 'cyan' },
    { id: 'm8', label: '生产入库周期', value: 3, unit: '天', color: 'purple' },
  ],
  energyTrend: [
    { time: '1月', value: 200000 },
    { time: '2月', value: 120000 },
    { time: '3月', value: 450000 },
    { time: '4月', value: 380000 },
    { time: '5月', value: 420000 },
    { time: '6月', value: 550000 },
    { time: '7月', value: 680000 },
    { time: '8月', value: 700000 },
    { time: '9月', value: 620000 },
    { time: '10月', value: 480000 },
    { time: '11月', value: 350000 },
    { time: '12月', value: 280000 },
  ],
  energyStats: [
    { label: '今年总用电量', value: 494560, unit: 'kw/h', color: '#06b6d4' },
    { label: '去年总用电量', value: 477160, unit: 'kw/h', color: '#fbbf24' },
    { label: '去年当月总电量', value: 0, unit: 'kw/h', color: '#6366f1' },
  ],
  teamEfficiency: [
    { name: '1', group1: 850, group2: 900, group3: 700, group4: 950 },
    { name: '2', group1: 880, group2: 920, group3: 750, group4: 980 },
    { name: '3', group1: 900, group2: 950, group3: 800, group4: 960 },
  ],
  perCapitaEfficiency: [
    { name: '1', value: 820 },
    { name: '2', value: 850 },
    { name: '3', value: 920 },
  ],
  productionTrend: [], // Not used in this specific view but kept for type compatibility
  annualKPI: [
    { label: '达成率', value: 100, color: '#3b82f6' },
    { label: '成品合格率', value: 100, color: '#06b6d4' },
    { label: '准交率', value: 93, color: '#f59e0b' },
  ]
};