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

export function ScatterChartWidget({ data, config }: WidgetProps) {
  const keys = Object.keys(data[0] || {});
  const xKey = config.xAxis || keys[0];
  const yKey = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis || keys[1];
  const color = config.colors?.[0] || '#ffffff';

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
        <Scatter data={data} fill={color} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
