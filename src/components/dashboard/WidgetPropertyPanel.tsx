import { X } from 'lucide-react';
import { useDashboard, useDashboardDispatch } from '../../lib/dashboard-store';
import type { ChartType, ChartConfig } from '../../lib/types';
import { cn } from '../../lib/utils';

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'line', label: 'Line' },
  { value: 'multi-line', label: 'Multi-Line' },
  { value: 'area', label: 'Area' },
  { value: 'stacked-area', label: 'Stacked Area' },
  { value: 'bar', label: 'Bar' },
  { value: 'horizontal-bar', label: 'Horizontal Bar' },
  { value: 'stacked-bar', label: 'Stacked Bar' },
  { value: 'pie', label: 'Pie' },
  { value: 'donut', label: 'Donut' },
  { value: 'scatter', label: 'Scatter' },
  { value: 'heatmap', label: 'Heatmap' },
  { value: 'kpi', label: 'KPI Card' },
  { value: 'table', label: 'Table' },
];

export function WidgetPropertyPanel() {
  const { widgets, selectedWidgetId, schema } = useDashboard();
  const dispatch = useDashboardDispatch();

  const widget = widgets.find((w) => w.id === selectedWidgetId);
  if (!widget) return null;

  const columns = schema?.columns.map((c) => c.name) || [];
  const numericColumns = schema?.columns.filter((c) => c.type === 'number').map((c) => c.name) || [];

  const updateConfig = (changes: Partial<ChartConfig>) => {
    dispatch({
      type: 'UPDATE_WIDGET',
      payload: {
        id: widget.id,
        changes: { config: { ...widget.config, ...changes } },
      },
    });
  };

  const currentYAxis = Array.isArray(widget.config.yAxis)
    ? widget.config.yAxis
    : widget.config.yAxis
      ? [widget.config.yAxis]
      : [];

  return (
    <div className="w-72 border-l border-brand-border bg-brand-surface flex flex-col shrink-0 h-full">
      {/* Header */}
      <div className="p-4 border-b border-brand-border flex items-center justify-between">
        <h3 className="text-xs font-bold text-white uppercase tracking-widest">Properties</h3>
        <button
          onClick={() => dispatch({ type: 'SELECT_WIDGET', payload: null })}
          className="p-1 hover:text-white transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
        {/* Title */}
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Title</label>
          <input
            value={widget.title}
            onChange={(e) => dispatch({ type: 'UPDATE_WIDGET', payload: { id: widget.id, changes: { title: e.target.value } } })}
            className="w-full bg-brand-bg border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600 transition-colors"
          />
        </div>

        {/* Chart type */}
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Chart Type</label>
          <div className="grid grid-cols-3 gap-1">
            {CHART_TYPES.map((ct) => (
              <button
                key={ct.value}
                onClick={() => dispatch({ type: 'UPDATE_WIDGET', payload: { id: widget.id, changes: { chartType: ct.value } } })}
                className={cn(
                  'px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider border transition-colors',
                  widget.chartType === ct.value
                    ? 'bg-white text-black border-white'
                    : 'bg-brand-bg border-brand-border text-zinc-500 hover:text-white hover:border-zinc-600'
                )}
              >
                {ct.label}
              </button>
            ))}
          </div>
        </div>

        {/* X-Axis */}
        {widget.chartType !== 'kpi' && (
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">X-Axis</label>
            <select
              value={widget.config.xAxis || ''}
              onChange={(e) => updateConfig({ xAxis: e.target.value })}
              className="w-full bg-brand-bg border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600"
            >
              <option value="">Auto</option>
              {columns.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
        )}

        {/* Y-Axis */}
        {widget.chartType !== 'kpi' && widget.chartType !== 'table' && widget.chartType !== 'heatmap' && (
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Y-Axis</label>
            <div className="space-y-1">
              {numericColumns.map((col) => (
                <label key={col} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentYAxis.includes(col)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...currentYAxis, col]
                        : currentYAxis.filter((c) => c !== col);
                      updateConfig({ yAxis: next.length === 1 ? next[0] : next });
                    }}
                    className="accent-white"
                  />
                  <span className="text-xs text-zinc-400">{col}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Visual options */}
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Display</label>
          <div className="space-y-2">
            <label className="flex items-center justify-between px-2 py-1.5 hover:bg-white/5 transition-colors cursor-pointer">
              <span className="text-xs text-zinc-400">Show Legend</span>
              <input
                type="checkbox"
                checked={widget.config.showLegend || false}
                onChange={(e) => updateConfig({ showLegend: e.target.checked })}
                className="accent-white"
              />
            </label>
            <label className="flex items-center justify-between px-2 py-1.5 hover:bg-white/5 transition-colors cursor-pointer">
              <span className="text-xs text-zinc-400">Show Grid</span>
              <input
                type="checkbox"
                checked={widget.config.showGrid !== false}
                onChange={(e) => updateConfig({ showGrid: e.target.checked })}
                className="accent-white"
              />
            </label>
          </div>
        </div>

        {/* Value formatting */}
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Formatting</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[9px] text-zinc-600 block mb-1">Prefix</span>
              <input
                value={widget.config.valuePrefix || ''}
                onChange={(e) => updateConfig({ valuePrefix: e.target.value })}
                placeholder="$"
                className="w-full bg-brand-bg border border-brand-border px-2 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-600"
              />
            </div>
            <div>
              <span className="text-[9px] text-zinc-600 block mb-1">Suffix</span>
              <input
                value={widget.config.valueSuffix || ''}
                onChange={(e) => updateConfig({ valueSuffix: e.target.value })}
                placeholder="%"
                className="w-full bg-brand-bg border border-brand-border px-2 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-600"
              />
            </div>
          </div>
        </div>

        {/* Size */}
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Size (grid units)</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[9px] text-zinc-600 block mb-1">Width (1-12)</span>
              <input
                type="number"
                min={1}
                max={12}
                value={widget.size?.w || 6}
                onChange={(e) => dispatch({ type: 'RESIZE_WIDGET', payload: { id: widget.id, size: { w: Number(e.target.value), h: widget.size?.h || 2 } } })}
                className="w-full bg-brand-bg border border-brand-border px-2 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-600"
              />
            </div>
            <div>
              <span className="text-[9px] text-zinc-600 block mb-1">Height</span>
              <input
                type="number"
                min={1}
                max={8}
                value={widget.size?.h || 2}
                onChange={(e) => dispatch({ type: 'RESIZE_WIDGET', payload: { id: widget.id, size: { w: widget.size?.w || 6, h: Number(e.target.value) } } })}
                className="w-full bg-brand-bg border border-brand-border px-2 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-600"
              />
            </div>
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={() => dispatch({ type: 'REMOVE_WIDGET', payload: widget.id })}
          className="w-full py-2 text-xs font-bold uppercase tracking-widest text-red-400 border border-red-900 hover:bg-red-950 transition-colors"
        >
          Delete Widget
        </button>
      </div>
    </div>
  );
}
