import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
} from 'recharts';
import type { WidgetProps } from '../../lib/types';

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

export function RadarChartWidget({ data, config }: WidgetProps) {
  const keys = Object.keys(data[0] || {});
  const labelKey = config.xAxis || keys.find((k) => typeof data[0]?.[k] === 'string') || keys[0];
  const valueKeys = Array.isArray(config.yAxis)
    ? config.yAxis
    : config.yAxis
      ? [config.yAxis]
      : keys.filter((k) => k !== labelKey && typeof data[0]?.[k] === 'number');
  const colors = config.colors || DEFAULT_COLORS;

  if (!labelKey || valueKeys.length === 0 || data.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-zinc-500">Not enough data for radar</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="#1a1a1a" />
        <PolarAngleAxis dataKey={labelKey} stroke="#555" fontSize={9} />
        <PolarRadiusAxis stroke="#333" fontSize={8} />
        <Tooltip contentStyle={{ background: '#000', border: '1px solid #222', fontSize: '12px' }} />
        {valueKeys.map((key, i) => (
          <Radar
            key={key}
            name={key}
            dataKey={key}
            stroke={colors[i % colors.length]}
            fill={colors[i % colors.length]}
            fillOpacity={0.15}
          />
        ))}
        {config.showLegend && <Legend />}
      </RadarChart>
    </ResponsiveContainer>
  );
}
