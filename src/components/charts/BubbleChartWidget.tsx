import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ZAxis,
} from 'recharts';
import type { WidgetProps } from '../../lib/types';

export function BubbleChartWidget({ data, config }: WidgetProps) {
  const keys = Object.keys(data[0] || {});
  const numericKeys = keys.filter((k) => typeof data[0]?.[k] === 'number');
  const xKey = config.xAxis || numericKeys[0];
  const yKeys = Array.isArray(config.yAxis) ? config.yAxis : config.yAxis ? [config.yAxis] : [];
  const yKey = yKeys[0] || numericKeys.find((k) => k !== xKey);
  const zKey = yKeys[1] || numericKeys.find((k) => k !== xKey && k !== yKey);
  const color = config.colors?.[0] || '#3b82f6';

  if (!xKey || !yKey || data.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-zinc-500">Need 2+ numeric columns</div>;
  }

  const bubbleData = data.slice(0, 200).map((row) => ({
    x: Number(row[xKey]) || 0,
    y: Number(row[yKey]) || 0,
    z: zKey ? Math.abs(Number(row[zKey]) || 1) : 10,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
        <XAxis dataKey="x" name={xKey} stroke="#555" fontSize={10} axisLine={false} tickLine={false} />
        <YAxis dataKey="y" name={yKey as string} stroke="#555" fontSize={10} axisLine={false} tickLine={false} />
        <ZAxis dataKey="z" range={[20, 400]} name={zKey || 'size'} />
        <Tooltip
          contentStyle={{ background: '#000', border: '1px solid #222', fontSize: '12px' }}
          itemStyle={{ color: '#fff' }}
          cursor={{ strokeDasharray: '3 3', stroke: '#555' }}
        />
        <Scatter data={bubbleData} fill={color} fillOpacity={0.6} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
