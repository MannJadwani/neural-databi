import { cn } from '../../lib/utils';
import type { KPIConfig, WidgetProps } from '../../lib/types';
import { summarizeKPI } from '../../lib/chart-data';

export function KPIWidget({ data, config }: WidgetProps) {
  const kpiConfig = config as KPIConfig;
  const numValue = Math.round(summarizeKPI(data, kpiConfig) * 100) / 100;

  let displayValue: string;
  switch (kpiConfig.format) {
    case 'currency':
      displayValue = numValue >= 1_000_000
        ? `${kpiConfig.valuePrefix || '$'}${(numValue / 1_000_000).toFixed(1)}M`
        : numValue >= 1_000
          ? `${kpiConfig.valuePrefix || '$'}${(numValue / 1_000).toFixed(1)}k`
          : `${kpiConfig.valuePrefix || '$'}${numValue.toLocaleString()}`;
      break;
    case 'percent':
      displayValue = `${numValue}%`;
      break;
    default:
      displayValue = numValue >= 1_000
        ? `${(numValue / 1_000).toFixed(1)}k`
        : numValue.toLocaleString();
  }

  const trend = kpiConfig.trend;
  const isPositive = trend?.startsWith('+');

  return (
    <div className="flex flex-col justify-center h-full">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
        {kpiConfig.label}
      </p>
      <div className="flex items-end justify-between mt-1">
        <span className="text-2xl font-bold text-white tracking-tighter">{displayValue}</span>
        {trend && (
          <span
            className={cn(
              'text-xs font-medium',
              isPositive ? 'text-emerald-500' : 'text-rose-500'
            )}
          >
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
