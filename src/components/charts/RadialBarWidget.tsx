import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend,
  Tooltip,
} from 'recharts';
import type { WidgetProps } from '../../lib/types';

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899'];

export function RadialBarWidget({ data, config }: WidgetProps) {
  const keys = Object.keys(data[0] || {});
  const nameKey = config.xAxis || keys.find((k) => typeof data[0]?.[k] === 'string') || keys[0];
  const valueKey = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis || keys.find((k) => k !== nameKey && typeof data[0]?.[k] === 'number');
  const colors = config.colors || DEFAULT_COLORS;

  if (!nameKey || !valueKey || data.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-zinc-500">Not enough data</div>;
  }

  const colored = data.slice(0, 8).map((row, i) => ({
    ...row,
    fill: colors[i % colors.length],
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadialBarChart innerRadius="20%" outerRadius="90%" data={colored} startAngle={180} endAngle={0}>
        <RadialBar
          dataKey={valueKey as string}
          label={{ position: 'insideStart', fill: '#fff', fontSize: 9 }}
          background={{ fill: '#111' }}
        />
        <Tooltip contentStyle={{ background: '#000', border: '1px solid #222', fontSize: '12px' }} />
        {config.showLegend && <Legend iconSize={8} formatter={(value) => <span className="text-xs text-zinc-400">{value}</span>} />}
      </RadialBarChart>
    </ResponsiveContainer>
  );
}
