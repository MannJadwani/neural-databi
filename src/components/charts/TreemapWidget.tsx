import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';
import type { WidgetProps } from '../../lib/types';

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899', '#ffffff'];

function CustomContent({ x, y, width, height, name, value, index }: any) {
  const colors = DEFAULT_COLORS;
  if (width < 30 || height < 20) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={colors[index % colors.length]} fillOpacity={0.8} stroke="#050505" strokeWidth={2} />
      {width > 50 && height > 30 && (
        <>
          <text x={x + 6} y={y + 16} fill="#fff" fontSize={10} fontWeight="bold">{String(name).slice(0, Math.floor(width / 7))}</text>
          <text x={x + 6} y={y + 30} fill="rgba(255,255,255,0.6)" fontSize={9}>{Number(value).toLocaleString()}</text>
        </>
      )}
    </g>
  );
}

export function TreemapWidget({ data, config }: WidgetProps) {
  const keys = Object.keys(data[0] || {});
  const nameKey = config.xAxis || keys.find((k) => typeof data[0]?.[k] === 'string') || keys[0];
  const valueKey = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis || keys.find((k) => k !== nameKey && typeof data[0]?.[k] === 'number');

  if (!nameKey || !valueKey || data.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-zinc-500">Not enough data</div>;
  }

  const treemapData = data.slice(0, 30).map((row) => ({
    name: String(row[nameKey]),
    value: Math.abs(Number(row[valueKey]) || 0),
  })).filter((d) => d.value > 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap
        data={treemapData}
        dataKey="value"
        nameKey="name"
        content={<CustomContent />}
      >
        <Tooltip contentStyle={{ background: '#000', border: '1px solid #222', fontSize: '12px' }} itemStyle={{ color: '#fff' }} />
      </Treemap>
    </ResponsiveContainer>
  );
}
