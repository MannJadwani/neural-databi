import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import type { WidgetProps } from '../../lib/types';
import { aggregateForPieChart } from '../../lib/chart-data';

const DEFAULT_COLORS = ['#ffffff', '#888888', '#555555', '#333333', '#10b981', '#f43f5e', '#3b82f6', '#eab308'];

export function PieChartWidget({ data, config }: WidgetProps) {
  const { data: chartData, nameKey, valueKey } = aggregateForPieChart(data, config);
  const colors = config.colors || DEFAULT_COLORS;
  const isDonut = (config as any).donut === true;

  if (!nameKey || chartData.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-zinc-500">Not enough chartable data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          dataKey={valueKey as string}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          outerRadius="80%"
          innerRadius={isDonut ? '50%' : 0}
          stroke="#1a1a1a"
          strokeWidth={2}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={{ stroke: '#555' }}
          fontSize={10}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#000', border: '1px solid #222', fontSize: '12px' }}
          itemStyle={{ color: '#fff' }}
        />
        {config.showLegend && <Legend />}
      </PieChart>
    </ResponsiveContainer>
  );
}
