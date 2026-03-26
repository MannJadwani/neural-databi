import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { WidgetProps } from '../../lib/types';

const DEFAULT_COLORS = ['#888888', '#555555', '#ffffff', '#10b981', '#f43f5e', '#3b82f6'];

export function AreaChartWidget({ data, config }: WidgetProps) {
  const xKey = config.xAxis || Object.keys(data[0] || {})[0];
  const yKeys = Array.isArray(config.yAxis)
    ? config.yAxis
    : config.yAxis
      ? [config.yAxis]
      : Object.keys(data[0] || {}).filter((k) => k !== xKey);
  const colors = config.colors || DEFAULT_COLORS;
  const isStacked = (config as any).stacked === true;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
        <XAxis dataKey={xKey} stroke="#555" fontSize={10} axisLine={false} tickLine={false} />
        <YAxis stroke="#555" fontSize={10} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#000', border: '1px solid #222', fontSize: '12px' }}
        />
        {config.showLegend && <Legend />}
        {yKeys.map((key, i) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[i % colors.length]}
            fill={colors[i % colors.length]}
            fillOpacity={0.15}
            stackId={isStacked ? 'stack' : undefined}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
