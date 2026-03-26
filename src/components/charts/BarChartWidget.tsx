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

const DEFAULT_COLORS = ['#ffffff', '#888888', '#555555', '#10b981', '#f43f5e', '#3b82f6'];

export function BarChartWidget({ data, config }: WidgetProps) {
  const isHorizontal = (config as any).horizontal === true;
  const xKey = config.xAxis || Object.keys(data[0] || {})[0];
  const yKeys = Array.isArray(config.yAxis)
    ? config.yAxis
    : config.yAxis
      ? [config.yAxis]
      : Object.keys(data[0] || {}).filter((k) => k !== xKey);
  const colors = config.colors || DEFAULT_COLORS;
  const isStacked = (config as any).stacked === true;

  if (isHorizontal) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical">
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
      <BarChart data={data}>
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
