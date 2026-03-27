import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { WidgetProps } from '../../lib/types';

const DEFAULT_COLORS = ['#3b82f6', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6'];

export function ComboChartWidget({ data, config }: WidgetProps) {
  const keys = Object.keys(data[0] || {});
  const xKey = config.xAxis || keys.find((k) => typeof data[0]?.[k] === 'string') || keys[0];
  const yKeys = Array.isArray(config.yAxis)
    ? config.yAxis
    : config.yAxis
      ? [config.yAxis]
      : keys.filter((k) => k !== xKey && typeof data[0]?.[k] === 'number');
  const colors = config.colors || DEFAULT_COLORS;

  if (!xKey || yKeys.length === 0 || data.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-zinc-500">Not enough data</div>;
  }

  // First half of y-keys as bars, second half as lines
  const barKeys = yKeys.slice(0, Math.ceil(yKeys.length / 2));
  const lineKeys = yKeys.slice(Math.ceil(yKeys.length / 2));
  // If only 1 key, show as bar
  if (lineKeys.length === 0 && barKeys.length === 1) {
    // Just render as bar — but keep combo visual
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
        <XAxis dataKey={xKey} stroke="#555" fontSize={10} axisLine={false} tickLine={false} />
        <YAxis stroke="#555" fontSize={10} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#000', border: '1px solid #222', fontSize: '12px' }}
          itemStyle={{ color: '#fff' }}
        />
        {(config.showLegend || yKeys.length > 1) && <Legend />}
        {barKeys.map((key, i) => (
          <Bar key={key} dataKey={key} fill={colors[i % colors.length]} fillOpacity={0.8} />
        ))}
        {lineKeys.map((key, i) => (
          <Line key={key} type="monotone" dataKey={key} stroke={colors[(barKeys.length + i) % colors.length]} strokeWidth={2} dot={false} />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
