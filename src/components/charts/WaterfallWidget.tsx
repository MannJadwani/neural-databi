import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import type { WidgetProps } from '../../lib/types';

export function WaterfallWidget({ data, config }: WidgetProps) {
  const keys = Object.keys(data[0] || {});
  const labelKey = config.xAxis || keys.find((k) => typeof data[0]?.[k] === 'string') || keys[0];
  const valueKey = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis || keys.find((k) => k !== labelKey && typeof data[0]?.[k] === 'number');

  if (!labelKey || !valueKey || data.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-zinc-500">Not enough data</div>;
  }

  // Build waterfall data: each bar shows the delta, positioned on top of the running total
  let running = 0;
  const waterfallData = data.slice(0, 20).map((row) => {
    const val = Number(row[valueKey]) || 0;
    const start = running;
    running += val;
    return {
      name: String(row[labelKey]),
      value: val,
      base: val >= 0 ? start : running,
      absValue: Math.abs(val),
    };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={waterfallData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
        <XAxis dataKey="name" stroke="#555" fontSize={9} axisLine={false} tickLine={false} />
        <YAxis stroke="#555" fontSize={10} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#000', border: '1px solid #222', fontSize: '12px' }}
          itemStyle={{ color: '#fff' }}
          formatter={(value: any, name: string) => {
            if (name === 'base') return [null, null];
            return [Number(value).toLocaleString(), 'Value'];
          }}
        />
        <ReferenceLine y={0} stroke="#333" />
        <Bar dataKey="base" stackId="waterfall" fill="transparent" />
        <Bar dataKey="absValue" stackId="waterfall">
          {waterfallData.map((entry, i) => (
            <Cell key={i} fill={entry.value >= 0 ? '#10b981' : '#f43f5e'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
