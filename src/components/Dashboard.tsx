import { Filter, Plus } from 'lucide-react';
import { MOCK_DATA } from '../lib/utils';
import type { ChartSpec } from '../lib/types';
import { ChartRenderer } from './charts';
import type { UploadedDataset } from './data/DataUploader';

// Mock specs for the demo dashboard (shown when no real data is loaded)
const MOCK_KPIS: ChartSpec[] = [
  {
    id: 'kpi-revenue',
    chartType: 'kpi',
    title: 'Total Revenue',
    data: [{ value: 1200000 }],
    config: { metric: 'value', label: 'Total Revenue', format: 'currency', trend: '+14.2%', trendDirection: 'up' } as any,
    size: { w: 3, h: 1 },
  },
  {
    id: 'kpi-users',
    chartType: 'kpi',
    title: 'Active Users',
    data: [{ value: 24500 }],
    config: { metric: 'value', label: 'Active Users', format: 'number', trend: '+8.1%', trendDirection: 'up' } as any,
    size: { w: 3, h: 1 },
  },
  {
    id: 'kpi-churn',
    chartType: 'kpi',
    title: 'Churn Rate',
    data: [{ value: 2.4 }],
    config: { metric: 'value', label: 'Churn Rate', format: 'percent', trend: '-0.3%', trendDirection: 'down' } as any,
    size: { w: 3, h: 1 },
  },
  {
    id: 'kpi-aov',
    chartType: 'kpi',
    title: 'Avg Order',
    data: [{ value: 142 }],
    config: { metric: 'value', label: 'Avg Order', format: 'currency', trend: '+12.5%', trendDirection: 'up' } as any,
    size: { w: 3, h: 1 },
  },
];

const MOCK_CHARTS: ChartSpec[] = [
  {
    id: 'chart-revenue',
    chartType: 'line',
    title: 'Revenue Growth Velocity',
    data: MOCK_DATA,
    config: { xAxis: 'name', yAxis: 'revenue', colors: ['#fff'] },
    size: { w: 6, h: 2 },
  },
  {
    id: 'chart-users',
    chartType: 'area',
    title: 'User Acquisition Trends',
    data: MOCK_DATA,
    config: { xAxis: 'name', yAxis: 'users', colors: ['#888'] },
    size: { w: 6, h: 2 },
  },
  {
    id: 'chart-growth',
    chartType: 'bar',
    title: 'Regional Distribution',
    data: MOCK_DATA,
    config: { xAxis: 'name', yAxis: 'growth', colors: ['#fff'] },
    size: { w: 6, h: 2 },
  },
];

interface DashboardProps {
  activeDashboard?: {
    dataset: UploadedDataset;
    charts: ChartSpec[];
  } | null;
}

export function Dashboard({ activeDashboard }: DashboardProps) {
  const isRealData = activeDashboard && activeDashboard.charts.length > 0;
  const kpis = isRealData
    ? activeDashboard.charts.filter((c) => c.chartType === 'kpi')
    : MOCK_KPIS;
  const charts = isRealData
    ? activeDashboard.charts.filter((c) => c.chartType !== 'kpi')
    : MOCK_CHARTS;

  const title = isRealData
    ? activeDashboard.dataset.fileName.replace(/\.csv$/i, '')
    : 'Executive Performance';
  const subtitle = isRealData
    ? `${activeDashboard.dataset.schema.rowCount.toLocaleString()} rows • ${activeDashboard.dataset.schema.columns.length} columns`
    : 'Live data from postgres_production • Updated 2m ago';

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <header className="p-6 border-b border-brand-border flex items-center justify-between sticky top-0 bg-brand-bg/80 backdrop-blur-sm z-10">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
          <p className="text-xs text-zinc-500">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 text-xs hover:bg-zinc-800 transition-colors">
            <Filter className="w-3 h-3" /> Filter
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors">
            <Plus className="w-3 h-3" /> Add Widget
          </button>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* KPI Grid */}
        {kpis.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {kpis.map((kpi) => (
              <div key={kpi.id} className="bg-brand-surface border border-brand-border p-4">
                <ChartRenderer spec={kpi} />
              </div>
            ))}
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {charts.map((chart) => (
            <ChartRenderer key={chart.id} spec={chart} />
          ))}

          {/* AI Insights panel — only for mock dashboard */}
          {!isRealData && (
            <div className="bg-brand-surface border border-brand-border p-4 flex flex-col">
              <div className="border-b border-brand-border pb-4 mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white">AI Generated Insights</h3>
              </div>
              <div className="space-y-4 overflow-y-auto custom-scrollbar">
                {[
                  "Revenue peaked in June with a 21% surge in organic traffic.",
                  "Retention is inversely correlated with high ticket volume in Q1.",
                  "Predicted revenue for July is $7.8k based on current velocity."
                ].map((insight, i) => (
                  <div key={i} className="flex gap-3 items-start group">
                    <div className="w-1 h-1 rounded-full bg-white mt-1.5 shrink-0" />
                    <p className="text-sm text-zinc-400 group-hover:text-white transition-colors">{insight}</p>
                  </div>
                ))}
                <button className="w-full py-2 border border-dashed border-zinc-800 text-[10px] uppercase tracking-widest hover:border-zinc-500 transition-colors mt-4">
                  Ask AI for more insights
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
