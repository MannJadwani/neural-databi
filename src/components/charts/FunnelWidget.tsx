import type { WidgetProps } from '../../lib/types';

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899'];

export function FunnelWidget({ data, config }: WidgetProps) {
  const keys = Object.keys(data[0] || {});
  const nameKey = config.xAxis || keys.find((k) => typeof data[0]?.[k] === 'string') || keys[0];
  const valueKey = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis || keys.find((k) => k !== nameKey && typeof data[0]?.[k] === 'number');
  const colors = config.colors || DEFAULT_COLORS;

  if (!nameKey || !valueKey || data.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-zinc-500">Not enough data</div>;
  }

  const sorted = [...data].sort((a, b) => Number(b[valueKey]) - Number(a[valueKey])).slice(0, 10);
  const maxVal = Number(sorted[0]?.[valueKey]) || 1;

  return (
    <div className="flex flex-col justify-center items-center h-full gap-1 px-4 py-2">
      {sorted.map((row, i) => {
        const val = Number(row[valueKey]) || 0;
        const pct = (val / maxVal) * 100;
        const widthPct = Math.max(20, pct);
        return (
          <div key={i} className="flex items-center gap-3 w-full" style={{ maxWidth: '100%' }}>
            <div
              className="h-8 flex items-center justify-between px-3 transition-all shrink-0"
              style={{
                width: `${widthPct}%`,
                backgroundColor: colors[i % colors.length],
                margin: '0 auto',
              }}
            >
              <span className="text-[10px] font-bold text-white truncate">{String(row[nameKey])}</span>
              <span className="text-[10px] text-white/80 ml-2 shrink-0">
                {config.valuePrefix || ''}{val.toLocaleString()}{config.valueSuffix || ''}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
