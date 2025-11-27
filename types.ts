export interface OEEData {
    name: string;
    value: number;
    color: string;
  }
  
  export interface ProductionData {
    name: string;
    value: number;
    target: number;
  }
  
  export interface InventoryItem {
    id: string;
    name: string;
    code: string;
    warehouse: string;
    quantity: number;
    available: number;
  }
  
  export interface KeyMetric {
    id: string;
    label: string;
    value: string | number;
    unit?: string;
    color: 'blue' | 'cyan' | 'orange' | 'purple';
  }
  
  export interface EnergyData {
    time: string;
    value: number;
  }
  
  export interface TeamEfficiency {
    name: string;
    group1: number;
    group2: number;
    group3: number;
    group4: number;
  }
  
  export interface DashboardData {
    oee: OEEData[];
    monthlyEfficiency: { name: string; availability: number; performance: number; quality: number; }[];
    inventoryMetrics: { label: string; value: number; unit: string; color: string; total: number }[];
    inventoryTable: InventoryItem[];
    keyMetrics: KeyMetric[];
    energyTrend: EnergyData[];
    energyStats: { label: string; value: number; unit: string; color: string }[];
    teamEfficiency: TeamEfficiency[];
    perCapitaEfficiency: { name: string; value: number }[];
    productionTrend: ProductionData[];
    annualKPI: { label: string; value: number; color: string }[];
  }