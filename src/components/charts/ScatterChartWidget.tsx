import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { WidgetProps } from '../../lib/types';
import { prepareScatterData } from '../../lib/chart-data';

export function ScatterChartWidget({ data, config }: WidgetProps) {
  const { data: chartData, xKey, yKey } = prepareScatterData(data, config);
  const color = config.colors?.[0] || '#ffffff';

  if (!xKey || !yKey || chartData.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-zinc-500">Not enough chartable data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
        <XAxis
          dataKey={xKey}
          name={xKey}
          stroke="#555"
          fontSize={10}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          dataKey={yKey as string}
          name={yKey as string}
          stroke="#555"
          fontSize={10}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: '#000', border: '1px solid #222', fontSize: '12px' }}
          itemStyle={{ color: '#fff' }}
          cursor={{ strokeDasharray: '3 3', stroke: '#555' }}
        />
        {config.showLegend && <Legend />}
        <Scatter data={chartData} fill={color} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
