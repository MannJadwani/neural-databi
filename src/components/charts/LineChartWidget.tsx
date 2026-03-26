import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { WidgetProps } from '../../lib/types';

const DEFAULT_COLORS = ['#ffffff', '#888888', '#555555', '#10b981', '#f43f5e', '#3b82f6'];

export function LineChartWidget({ data, config }: WidgetProps) {
  const xKey = config.xAxis || Object.keys(data[0] || {})[0];
  const yKeys = Array.isArray(config.yAxis)
    ? config.yAxis
    : config.yAxis
      ? [config.yAxis]
      : Object.keys(data[0] || {}).filter((k) => k !== xKey);
  const colors = config.colors || DEFAULT_COLORS;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
        <XAxis dataKey={xKey} stroke="#555" fontSize={10} axisLine={false} tickLine={false} />
        <YAxis stroke="#555" fontSize={10} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#000', border: '1px solid #222', fontSize: '12px' }}
          itemStyle={{ color: '#fff' }}
        />
        {config.showLegend && <Legend />}
        {yKeys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[i % colors.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
