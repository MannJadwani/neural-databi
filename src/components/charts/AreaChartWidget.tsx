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
import { aggregateForCartesianChart } from '../../lib/chart-data';

const DEFAULT_COLORS = ['#888888', '#555555', '#ffffff', '#10b981', '#f43f5e', '#3b82f6'];

export function AreaChartWidget({ data, config }: WidgetProps) {
  const { data: chartData, xKey, yKeys } = aggregateForCartesianChart(data, config);
  const colors = config.colors || DEFAULT_COLORS;
  const isStacked = (config as any).stacked === true;

  if (!xKey || yKeys.length === 0 || chartData.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-zinc-500">Not enough chartable data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData}>
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
