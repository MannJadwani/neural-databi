import type { WidgetProps } from '../../lib/types';
import { prepareHeatmapData } from '../../lib/chart-data';

function getHeatColor(value: number, min: number, max: number): string {
  const normalized = max === min ? 0.5 : (value - min) / (max - min);
  const intensity = Math.round(normalized * 255);
  return `rgb(${intensity}, ${intensity}, ${intensity})`;
}

export function HeatmapWidget({ data, config }: WidgetProps) {
  const { data: chartData, labelKey, numericKeys } = prepareHeatmapData(data, config);

  if (!labelKey || numericKeys.length === 0 || chartData.length === 0) {
    return <div className="flex h-full items-center justify-center text-xs text-zinc-500">Not enough chartable data</div>;
  }

  const allValues = chartData.flatMap((row) => numericKeys.map((k) => Number(row[k]) || 0));
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);

  return (
    <div className="w-full h-full overflow-auto custom-scrollbar">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="text-left p-2 text-zinc-500 font-bold uppercase tracking-wider text-[10px] sticky left-0 bg-brand-surface">
              {labelKey}
            </th>
            {numericKeys.map((key) => (
              <th
                key={key}
                className="p-2 text-zinc-500 font-bold uppercase tracking-wider text-[10px] text-center"
              >
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chartData.map((row, i) => (
            <tr key={i}>
              <td className="p-2 text-zinc-400 sticky left-0 bg-brand-surface border-t border-brand-border">
                {String(row[labelKey])}
              </td>
              {numericKeys.map((key) => {
                const val = Number(row[key]) || 0;
                return (
                  <td
                    key={key}
                    className="p-2 text-center border-t border-brand-border"
                    style={{ backgroundColor: getHeatColor(val, min, max), color: val > (min + max) / 2 ? '#000' : '#fff' }}
                  >
                    {config.valuePrefix || ''}{val.toLocaleString()}{config.valueSuffix || ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
