import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { WidgetProps } from '../../lib/types';
import type { KPIConfig } from '../../lib/types';

export function GaugeWidget({ data, config }: WidgetProps) {
  const kpiConf = config as KPIConfig;
  const metric = kpiConf.metric || Object.keys(data[0] || {})[0];
  const values = data.map((r) => Number(r[metric]) || 0).filter((v) => v !== 0);

  if (values.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-zinc-500">No data</div>;
  }

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const max = Math.max(...values);
  const pct = max > 0 ? Math.min((avg / max) * 100, 100) : 0;

  const gaugeData = [
    { value: pct },
    { value: 100 - pct },
  ];

  const color = pct > 70 ? '#10b981' : pct > 40 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <ResponsiveContainer width="100%" height="70%">
        <PieChart>
          <Pie
            data={gaugeData}
            startAngle={200}
            endAngle={-20}
            innerRadius="65%"
            outerRadius="85%"
            dataKey="value"
            stroke="none"
          >
            <Cell fill={color} />
            <Cell fill="#1a1a1a" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="text-center -mt-8">
        <span className="text-2xl font-bold text-white">{Math.round(avg).toLocaleString()}</span>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
          {kpiConf.label || metric} ({Math.round(pct)}%)
        </p>
      </div>
    </div>
  );
}
