import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line, Legend,
  ComposedChart, CartesianGrid
} from 'recharts';
import {
  Activity, Database, Zap, Upload, Download, Factory
} from 'lucide-react';

import Card from './components/Card';
import { INITIAL_DATA } from './constants';
import { DashboardData } from './types';
import { parseExcelFile } from './utils/excelParser';
import { exportDashboardData } from './utils/excelExporter';
import {
  startInventorySync,
  getCachedInventory,
  formatInventoryForDashboard
} from './services/inventoryService';

type InventoryPanelProps = {
  metrics: DashboardData['inventoryMetrics'];
  initialTable: DashboardData['inventoryTable'];
  onTableChange?: (rows: DashboardData['inventoryTable']) => void;
};

// 库存指标环形圈 - 填满效果（仅用于库存数据指标）
const InventoryGaugeRing = ({ value, color, title, unit, subTitle }: { value: number, color: string, title?: string, unit?: string, subTitle?: string }) => {
  const data = [{ name: 'val', value: 100 }]; // 填满整个圆环
  return (
      <div className="flex flex-col items-center justify-center relative">
          <div className="relative w-20 h-20 md:w-24 md:h-24">
              <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                      <Pie
                          data={data}
                          cx="50%"
                          cy="50%"
                          innerRadius={32}
                          outerRadius={40}
                          startAngle={90}
                          endAngle={-270}
                          dataKey="value"
                          stroke="none"
                      >
                          <Cell fill={color} />
                      </Pie>
                  </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
                   <span className="text-lg md:text-xl font-bold font-mono" style={{ color }}>{value}{unit || '%'}</span>
                   {subTitle && <span className="text-[10px] text-slate-400">{subTitle}</span>}
              </div>
          </div>
          {title && <span className="text-xs text-slate-300 font-medium mt-1">{title}</span>}
      </div>
  );
};

const InventoryPanel: React.FC<InventoryPanelProps> = React.memo(({ metrics, initialTable, onTableChange }) => {
  const [inventoryTable, setInventoryTable] = useState(initialTable);
  const [inventorySlide, setInventorySlide] = useState<number>(0);
  const [inventoryPaused, setInventoryPaused] = useState<boolean>(false);
  const rowsPerSlide = 6;

  const inventoryRows = inventoryTable;

  const visibleInventoryRows = useMemo(() => {
    if (!inventoryRows.length) return [];
    const windowSize = Math.min(rowsPerSlide, inventoryRows.length);
    const start = inventorySlide % inventoryRows.length;
    const loopedRows = [...inventoryRows, ...inventoryRows];
    return loopedRows.slice(start, start + windowSize);
  }, [inventoryRows, inventorySlide, rowsPerSlide]);

  // 外部数据变更时（例如导入Excel）刷新列表，但不触发其他区域重渲染
  useEffect(() => {
    setInventoryTable(initialTable);
    onTableChange?.(initialTable);
  }, [initialTable, onTableChange]);

  // 启动库存同步，只影响该组件
  useEffect(() => {
    console.log('=== 启动库存数据同步（仅库存卡片） ===');
    startInventorySync();

    const checkInterval = setInterval(() => {
      const inventory = getCachedInventory();
      if (inventory.length > 0) {
        const formattedData = formatInventoryForDashboard(inventory);
        setInventoryTable(formattedData);
        onTableChange?.(formattedData);
      }
    }, 3000);

    return () => {
      clearInterval(checkInterval);
    };
  }, [onTableChange]);

  // 幻灯片行切换
  useEffect(() => {
    if (!inventoryRows.length) return;
    setInventorySlide(prev => prev % inventoryRows.length);
  }, [inventoryRows.length]);

  useEffect(() => {
    if (!inventoryRows.length || inventoryPaused) return;

    const timer = setInterval(() => {
      setInventorySlide(prev => (prev + 1) % inventoryRows.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [inventoryRows.length, inventoryPaused]);

  return (
    <Card title="库存数据" icon={<Database size={14}/>} className="h-[42%] flex flex-col">
         <div className="flex justify-around items-center h-[100px] mb-2 border-b border-slate-700/30">
             {metrics.map((m, i) => (
                 <div key={i} className="scale-90">
                     <InventoryGaugeRing value={m.value} color={m.color} title={m.label} unit="吨" subTitle={m.value.toString()}/>
                 </div>
             ))}
         </div>
         
         <div className="flex items-center justify-between px-2 py-1 text-[10px] text-slate-500 bg-slate-800/50 rounded-t border-b border-slate-700">
             <span className="w-1/4">物料名称</span>
             <span className="w-1/4">物料编码</span>
             <span className="w-1/4">仓库名称</span>
             <span className="w-1/4 text-right">库存量(KG)</span>
         </div>
         <div
           className="flex-1 overflow-hidden overflow-x-hidden custom-scrollbar"
           onMouseEnter={() => setInventoryPaused(true)}
           onMouseLeave={() => setInventoryPaused(false)}
         >
             <table className="w-full text-[10px] text-left border-collapse">
                 <tbody
                   key={`inventory-${inventorySlide}`}
                   className="divide-y divide-slate-800/50 transition-all duration-700"
                 >
                     {visibleInventoryRows.length === 0 ? (
                       <tr>
                         <td colSpan={4} className="p-3 text-center text-slate-400">暂无库存数据</td>
                       </tr>
                     ) : (
                       visibleInventoryRows.map((row, idx) => (
                         <tr
                           key={`${row.id}-${inventorySlide}-${idx}`}
                           className={`${idx % 2 === 0 ? 'bg-slate-800/20' : ''} hover:bg-slate-700/30 transition-colors inventory-slide`}
                           style={{ animationDelay: `${idx * 80}ms` }}
                         >
                             <td className="p-2 text-cyan-100">{row.name}</td>
                             <td className="p-2 text-slate-400 font-mono">{row.code}</td>
                             <td className="p-2 text-slate-400">{row.warehouse}</td>
                             <td className="p-2 text-right font-mono text-cyan-300 font-bold">{row.quantity.toLocaleString()}</td>
                         </tr>
                       ))
                     )}
                 </tbody>
             </table>
         </div>
    </Card>
  );
});


const App: React.FC = () => {
  const [data, setData] = useState<DashboardData>(INITIAL_DATA);
  const [headerVisible, setHeaderVisible] = useState<boolean>(false); // 默认隐藏
  const latestInventoryRef = useRef(data.inventoryTable);

  // 按T键切换标题栏显示/隐藏
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 't' || e.key === 'T') {
        setHeaderVisible(prev => !prev);
        console.log('标题栏切换:', !headerVisible ? '显示' : '隐藏');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [headerVisible]);

  // 同步外部导入的库存到导出用的ref，避免影响其他区域渲染
  useEffect(() => {
    latestInventoryRef.current = data.inventoryTable;
  }, [data.inventoryTable]);

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    if (input.files && input.files[0]) {
      try {
        const partialData = await parseExcelFile(input.files[0]);
        setData(prev => ({
            ...prev,
            ...partialData
        }));
        alert('Data imported successfully!');
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        alert(`Failed to parse Excel file: ${message}`);
      } finally {
        // allow re-uploading the same file after processing
        input.value = '';
      }
    }
  };

  const handleExport = () => {
    exportDashboardData({
      ...data,
      inventoryTable: latestInventoryRef.current
    });
  };
  
  // Reusable Gauge Ring Component - 根据值显示进度
  const GaugeRing = ({ value, color, title, unit, subTitle }: { value: number, color: string, title?: string, unit?: string, subTitle?: string }) => {
    const data = [{ name: 'val', value: value }, { name: 'rem', value: 100 - value }];
    return (
        <div className="flex flex-col items-center justify-center relative">
            <div className="relative w-20 h-20 md:w-24 md:h-24">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={32}
                            outerRadius={40}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                            stroke="none"
                        >
                            <Cell fill={color} />
                            <Cell fill="#1e293b" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
                     <span className="text-lg md:text-xl font-bold font-mono" style={{ color }}>{value}{unit || '%'}</span>
                     {subTitle && <span className="text-[10px] text-slate-400">{subTitle}</span>}
                </div>
            </div>
            {title && <span className="text-xs text-slate-300 font-medium mt-1">{title}</span>}
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0b1121] text-slate-200 p-2 font-sans overflow-hidden bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-blend-overlay">
      <div className="absolute inset-0 bg-[#0f172a]/95 pointer-events-none"></div>
      
      {/* Header - 可通过T键切换显示/隐藏 */}
      <header
        className={`relative z-10 flex justify-between items-center mb-2 border-b border-slate-700/50 pb-2 transition-all duration-500 ease-in-out overflow-hidden ${
          headerVisible ? 'h-[50px] opacity-100' : 'h-0 opacity-0 mb-0 pb-0 border-b-0'
        }`}
        style={{ transformOrigin: 'top' }}
      >
        <div className="flex items-center gap-3 pl-2">
            <Factory className="w-6 h-6 text-cyan-400" />
            <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent whitespace-nowrap">
                    数字化智能工厂看板
                </h1>
            </div>
        </div>

        <div className="flex gap-4 items-center pr-2">
            <button
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-slate-400 hover:text-white transition-colors border border-slate-700 rounded bg-slate-800/50 backdrop-blur whitespace-nowrap"
            >
                <Upload size={14} />
                导出Excel数据
            </button>

            <div className="relative">
                <button className="flex items-center gap-2 px-3 py-1 text-xs font-bold text-white bg-cyan-600/80 hover:bg-cyan-500 transition-all rounded backdrop-blur whitespace-nowrap">
                    <Download size={14} />
                    导入Excel数据
                </button>
                <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    aria-label="导入Excel数据"
                />
            </div>
        </div>
      </header>

      {/* T键提示 - 仅在隐藏时显示 */}
      {!headerVisible && (
        <div className="fixed top-4 right-4 z-50 bg-slate-800/90 backdrop-blur-sm border border-cyan-500/30 rounded px-3 py-1.5 text-xs text-cyan-300 animate-pulse">
          按 <kbd className="px-1.5 py-0.5 bg-slate-700 rounded font-mono font-bold">T</kbd> 显示标题栏
        </div>
      )}

      {/* Main Grid */}
      <div className={`relative z-10 grid grid-cols-12 gap-3 transition-all duration-500 ${
        headerVisible ? 'h-[calc(100vh-80px)]' : 'h-[calc(100vh-20px)]'
      }`}>
        
        {/* Left Column (3/12) */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-3">
            
            {/* OEE Section */}
            <Card title="车间设备OEE" icon={<Activity size={14}/>} className="h-[28%]">
                <div className="flex justify-between items-center h-full px-2">
                    {data.oee.map((item, idx) => (
                        <GaugeRing key={idx} value={item.value} color={item.color} title={item.name} />
                    ))}
                </div>
            </Card>

            {/* Efficiency Bar Chart */}
            <Card title="车间效率" className="h-[30%]">
                 <div className="flex justify-end gap-3 pr-2 mb-1">
                     <div className="flex items-center gap-1"><div className="w-2 h-2 bg-cyan-500 rounded-[1px]"></div><span className="text-[9px] text-slate-400">可用性效率</span></div>
                     <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded-[1px]"></div><span className="text-[9px] text-slate-400">性能效率</span></div>
                     <div className="flex items-center gap-1"><div className="w-2 h-2 bg-amber-500 rounded-[1px]"></div><span className="text-[9px] text-slate-400">质量效率</span></div>
                 </div>
                <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={data.monthlyEfficiency} barGap={1}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                        <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 9}} axisLine={{stroke: '#334155'}} tickLine={false} dy={5}/>
                        <YAxis hide domain={[0, 100]}/>
                        <Tooltip 
                            contentStyle={{backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px'}}
                            itemStyle={{fontSize: 10, padding: 0}}
                            labelStyle={{fontSize: 10, color: '#94a3b8', marginBottom: '4px'}}
                        />
                        <Bar dataKey="availability" fill="#06b6d4" radius={[1, 1, 0, 0]} />
                        <Bar dataKey="performance" fill="#10b981" radius={[1, 1, 0, 0]} />
                        <Bar dataKey="quality" fill="#f59e0b" radius={[1, 1, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </Card>

            {/* Inventory Data */}
            <InventoryPanel
              metrics={data.inventoryMetrics}
              initialTable={data.inventoryTable}
              onTableChange={(rows) => { latestInventoryRef.current = rows; }}
            />
        </div>

        {/* Center Column (6/12) */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-3">
            {/* Operations Monitoring - Key Metrics */}
            <Card title="运营监控" className="h-[55%] border-t-2 border-t-cyan-500">
                <div className="h-full relative flex items-center justify-center pt-4">
                    {/* Background Graphic Effect */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15)_0%,transparent_60%)]"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-cyan-500/10 rounded-full"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] border border-cyan-500/20 rounded-full border-dashed animate-[spin_60s_linear_infinite]"></div>
                    
                    {/* Grid of Circles */}
                    <div className="grid grid-cols-4 gap-x-6 gap-y-10 relative z-10 w-full px-8">
                        {data.keyMetrics.map((item) => (
                            <div key={item.id} className="flex flex-col items-center group">
                                <div className={`w-28 h-28 rounded-full border border-${item.color}-500/30 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center relative shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all duration-300 group-hover:scale-105 group-hover:border-${item.color}-400 group-hover:shadow-${item.color}-500/20`}>
                                    {/* Inner ring */}
                                    <div className={`absolute inset-1 rounded-full border-2 border-${item.color}-500/10 border-t-${item.color}-500/60 animate-[spin_3s_linear_infinite]`} style={{ animationDuration: '8s' }}></div>
                                    
                                    <span className="text-2xl font-bold text-white tracking-tighter font-mono">{item.value}</span>
                                    <span className={`text-xs text-${item.color}-400 mt-1 uppercase tracking-wider`}>{item.unit}</span>
                                </div>
                                <div className="mt-[-12px] z-10 bg-slate-900 px-3 py-1 rounded border border-slate-700 shadow-lg">
                                    <span className="text-xs font-medium text-slate-300 whitespace-nowrap">{item.label}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Energy and Power Section */}
            <div className="h-[45%] flex flex-col gap-3">
                <Card title="能耗指标" icon={<Zap size={14}/>} className="flex-none h-[110px]">
                    <div className="flex justify-between items-center h-full px-4 gap-4">
                        {data.energyStats.map((stat, i) => (
                             <div key={i} className="flex-1 flex items-center gap-3 p-3 bg-gradient-to-r from-slate-800/50 to-transparent rounded border-l-2" style={{ borderLeftColor: stat.color }}>
                                <div className="p-2 rounded-full bg-slate-800" style={{ color: stat.color }}>
                                    <Zap size={20} fill="currentColor" className="drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]"/>
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">{stat.label}</div>
                                    <div className="text-lg font-bold font-mono text-white leading-none">
                                        {stat.value.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">{stat.unit}</span>
                                    </div>
                                </div>
                             </div>
                        ))}
                    </div>
                </Card>

                <Card title="用电量(Kw/h)" className="flex-1">
                    <div className="absolute top-3 right-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_5px_#06b6d4]"></div>
                        <span className="text-[10px] text-cyan-300">用电量</span>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.energyTrend} margin={{top: 10, right: 10, left: 0, bottom: 0}}>
                            <defs>
                                <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5}/>
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                            <XAxis dataKey="time" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} dy={5}/>
                            <YAxis tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false}/>
                            <Tooltip 
                                contentStyle={{backgroundColor: '#0f172a', border: '1px solid #334155'}}
                                itemStyle={{color: '#fff', fontSize: 12}}
                            />
                            <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={3} fill="url(#energyGrad)" activeDot={{r: 4, strokeWidth: 0, fill: '#fff'}} />
                        </AreaChart>
                    </ResponsiveContainer>
                </Card>
            </div>
        </div>

        {/* Right Column (3/12) */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-3">
            
            {/* Annual Efficiency */}
            <Card title="年度车间生产效率" className="h-[25%]">
                <div className="flex justify-around items-center h-full pt-2">
                    {data.annualKPI.map((kpi, idx) => (
                        <GaugeRing 
                            key={idx} 
                            value={kpi.value} 
                            color={kpi.color} 
                            title={kpi.label} 
                        />
                    ))}
                </div>
            </Card>

            {/* Team Efficiency - Bar Chart 4 Groups */}
            <Card title="车间班组生产效率 (KG)" className="h-[40%]">
                 <div className="flex items-center justify-end gap-2 pr-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-1"><div className="w-2 h-1 bg-[#06b6d4]"></div><span className="text-[9px] text-slate-400">挤研一组</span></div>
                    <div className="flex items-center gap-1"><div className="w-2 h-1 bg-[#10b981]"></div><span className="text-[9px] text-slate-400">挤研二组</span></div>
                    <div className="flex items-center gap-1"><div className="w-2 h-1 bg-[#f59e0b]"></div><span className="text-[9px] text-slate-400">挤研三组</span></div>
                    <div className="flex items-center gap-1"><div className="w-2 h-1 bg-[#3b82f6]"></div><span className="text-[9px] text-slate-400">挤研四组</span></div>
                 </div>
                <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={data.teamEfficiency} barGap={2} margin={{top: 10, right: 5, left: -20, bottom: 0}}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                        <XAxis dataKey="name" tick={{fontSize: 9, fill: '#64748b'}} axisLine={{stroke: '#334155'}} tickLine={false} dy={5}/>
                        <YAxis tick={{fontSize: 9, fill: '#64748b'}} axisLine={false} tickLine={false}/>
                        <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '10px'}}/>
                        <Bar dataKey="group1" fill="#06b6d4" radius={[2,2,0,0]} barSize={8} />
                        <Bar dataKey="group2" fill="#10b981" radius={[2,2,0,0]} barSize={8} />
                        <Bar dataKey="group3" fill="#f59e0b" radius={[2,2,0,0]} barSize={8} />
                        <Bar dataKey="group4" fill="#3b82f6" radius={[2,2,0,0]} barSize={8} />
                    </BarChart>
                </ResponsiveContainer>
            </Card>

            {/* Workshop Per Capita Efficiency */}
            <Card title="车间人均效率 (KG)" className="h-[35%]">
                 <div className="absolute top-3 right-4 flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                     <span className="text-[10px] text-blue-200">人均效率(KG)</span>
                 </div>
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.perCapitaEfficiency} margin={{top: 20, right: 10, left: -10, bottom: 0}}>
                        <defs>
                            <linearGradient id="perCapitaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                        <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} axisLine={{stroke: '#334155'}} tickLine={false} dy={5}/>
                        <YAxis domain={[0, 1200]} tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false}/>
                        <Tooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px'}}/>
                        <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#3b82f6" 
                            strokeWidth={3} 
                            fill="url(#perCapitaGrad)" 
                            activeDot={{r: 4, strokeWidth: 2, stroke: '#fff'}}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </Card>
        </div>
      </div>
    </div>
  );
};

export default App;
