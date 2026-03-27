import { useState } from 'react';
import { X, BarChart3, LineChart, PieChart, Table2, TrendingUp, ScatterChart as ScatterIcon, Grid3x3, Hash, Radar, CircleDot, TreePine, Filter, Gauge, GitCommitVertical, Circle, Layers } from 'lucide-react';
import { useDashboard, useDashboardDispatch } from '../../lib/dashboard-store';
import type { ChartType } from '../../lib/types';
import { cn } from '../../lib/utils';

interface WidgetPickerProps {
  onClose: () => void;
  data: Record<string, unknown>[];
}

const CHART_OPTIONS: { type: ChartType; label: string; icon: typeof BarChart3; description: string }[] = [
  { type: 'line', label: 'Line', icon: LineChart, description: 'Trends over time' },
  { type: 'multi-line', label: 'Multi-Line', icon: LineChart, description: 'Compare multiple series' },
  { type: 'area', label: 'Area', icon: TrendingUp, description: 'Volume over time' },
  { type: 'bar', label: 'Bar', icon: BarChart3, description: 'Compare categories' },
  { type: 'horizontal-bar', label: 'H-Bar', icon: BarChart3, description: 'Horizontal comparison' },
  { type: 'stacked-bar', label: 'Stacked Bar', icon: BarChart3, description: 'Part-to-whole by category' },
  { type: 'pie', label: 'Pie', icon: PieChart, description: 'Proportions' },
  { type: 'donut', label: 'Donut', icon: PieChart, description: 'Proportions with center' },
  { type: 'scatter', label: 'Scatter', icon: ScatterIcon, description: 'Correlation between metrics' },
  { type: 'heatmap', label: 'Heatmap', icon: Grid3x3, description: 'Matrix of values' },
  { type: 'radar', label: 'Radar', icon: Radar, description: 'Multi-axis comparison' },
  { type: 'radial-bar', label: 'Radial Bar', icon: CircleDot, description: 'Circular progress bars' },
  { type: 'treemap', label: 'Treemap', icon: TreePine, description: 'Proportional area blocks' },
  { type: 'funnel', label: 'Funnel', icon: Filter, description: 'Pipeline / conversion' },
  { type: 'gauge', label: 'Gauge', icon: Gauge, description: 'Target vs actual' },
  { type: 'waterfall', label: 'Waterfall', icon: GitCommitVertical, description: 'Cumulative changes' },
  { type: 'bubble', label: 'Bubble', icon: Circle, description: '3D scatter (x, y, size)' },
  { type: 'combo', label: 'Combo', icon: Layers, description: 'Bar + Line overlay' },
  { type: 'kpi', label: 'KPI Card', icon: Hash, description: 'Single metric highlight' },
  { type: 'table', label: 'Table', icon: Table2, description: 'Raw data view' },
];

export function WidgetPicker({ onClose, data }: WidgetPickerProps) {
  const { schema } = useDashboard();
  const dispatch = useDashboardDispatch();
  const [step, setStep] = useState<'type' | 'config'>('type');
  const [selectedType, setSelectedType] = useState<ChartType | null>(null);
  const [title, setTitle] = useState('');
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState<string[]>([]);

  const columns = schema?.columns || [];
  const numericCols = columns.filter((c) => c.type === 'number');

  const handleCreate = () => {
    if (!selectedType) return;

    const id = `manual-${Date.now()}`;
    const chartData = selectedType === 'table' ? data : data.slice(0, 500);

    dispatch({
      type: 'ADD_WIDGET',
      payload: {
        id,
        chartType: selectedType,
        title: title || `New ${selectedType} chart`,
        data: chartData,
        config: {
          xAxis: xAxis || undefined,
          yAxis: yAxis.length === 1 ? yAxis[0] : yAxis.length > 1 ? yAxis : undefined,
          showLegend: yAxis.length > 1,
        },
        size: selectedType === 'kpi' ? { w: 3, h: 1 } : selectedType === 'table' ? { w: 12, h: 3 } : { w: 6, h: 2 },
      },
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-brand-surface border border-brand-border w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brand-border">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">
            {step === 'type' ? 'Choose Chart Type' : 'Configure Widget'}
          </h2>
          <button onClick={onClose} className="p-1 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {step === 'type' && (
            <div className="grid grid-cols-3 gap-3">
              {CHART_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => {
                    setSelectedType(opt.type);
                    setTitle(`New ${opt.label} Chart`);
                    setStep('config');
                  }}
                  className={cn(
                    'p-4 border border-brand-border hover:border-zinc-600 transition-colors text-left group',
                    selectedType === opt.type && 'border-white bg-white/5'
                  )}
                >
                  <opt.icon className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors mb-2" />
                  <p className="text-xs font-bold text-white">{opt.label}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{opt.description}</p>
                </button>
              ))}
            </div>
          )}

          {step === 'config' && selectedType && (
            <div className="space-y-4 max-w-md">
              {/* Title */}
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600"
                />
              </div>

              {/* X-Axis */}
              {selectedType !== 'kpi' && (
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">X-Axis / Label Column</label>
                  <select
                    value={xAxis}
                    onChange={(e) => setXAxis(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="">Auto-detect</option>
                    {columns.map((c) => (
                      <option key={c.name} value={c.name}>{c.name} ({c.type})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Y-Axis */}
              {selectedType !== 'table' && selectedType !== 'heatmap' && (
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
                    {selectedType === 'kpi' ? 'Metric' : 'Y-Axis / Value Column(s)'}
                  </label>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                    {numericCols.map((c) => (
                      <label key={c.name} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 cursor-pointer">
                        <input
                          type={selectedType === 'kpi' || selectedType === 'pie' || selectedType === 'donut' ? 'radio' : 'checkbox'}
                          name="yaxis"
                          checked={yAxis.includes(c.name)}
                          onChange={(e) => {
                            if (selectedType === 'kpi' || selectedType === 'pie' || selectedType === 'donut') {
                              setYAxis([c.name]);
                            } else if (e.target.checked) {
                              setYAxis([...yAxis, c.name]);
                            } else {
                              setYAxis(yAxis.filter((y) => y !== c.name));
                            }
                          }}
                          className="accent-white"
                        />
                        <span className="text-xs text-zinc-400">{c.name}</span>
                        {c.stats && (
                          <span className="text-[9px] text-zinc-600 ml-auto">
                            {c.stats.min?.toLocaleString()} – {c.stats.max?.toLocaleString()}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-brand-border flex items-center justify-between">
          {step === 'config' && (
            <button
              onClick={() => setStep('type')}
              className="text-xs text-zinc-500 hover:text-white transition-colors"
            >
              Back
            </button>
          )}
          <div className="ml-auto">
            {step === 'config' && (
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors"
              >
                Add to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
