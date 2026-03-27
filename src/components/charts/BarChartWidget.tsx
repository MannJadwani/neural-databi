import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { WidgetProps } from '../../lib/types';
import { aggregateForCartesianChart } from '../../lib/chart-data';

const DEFAULT_COLORS = ['#ffffff', '#888888', '#555555', '#10b981', '#f43f5e', '#3b82f6'];

export function BarChartWidget({ data, config }: WidgetProps) {
  const isHorizontal = (config as any).horizontal === true;
  const { data: chartData, xKey, yKeys } = aggregateForCartesianChart(data, config);
  const colors = config.colors || DEFAULT_COLORS;
  const isStacked = (config as any).stacked === true;

  if (!xKey || yKeys.length === 0 || chartData.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-zinc-500">Not enough chartable data</div>;
  }

  if (isHorizontal) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" horizontal={false} />
          <XAxis type="number" stroke="#555" fontSize={10} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey={xKey}
            stroke="#555"
            fontSize={10}
            axisLine={false}
            tickLine={false}
            width={80}
          />
          <Tooltip
            contentStyle={{ background: '#000', border: '1px solid #222', fontSize: '12px' }}
            itemStyle={{ color: '#fff' }}
          />
          {config.showLegend && <Legend />}
          {yKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[i % colors.length]}
              stackId={isStacked ? 'stack' : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
        <XAxis dataKey={xKey} stroke="#555" fontSize={10} axisLine={false} tickLine={false} />
        <YAxis stroke="#555" fontSize={10} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#000', border: '1px solid #222', fontSize: '12px' }}
          itemStyle={{ color: '#fff' }}
        />
        {config.showLegend && <Legend />}
        {yKeys.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            fill={colors[i % colors.length]}
            stackId={isStacked ? 'stack' : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
