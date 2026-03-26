import { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import type { WidgetProps } from '../../lib/types';

export function TableWidget({ data, config }: WidgetProps) {
  const columns = Object.keys(data[0] || {});
  const [sortCol, setSortCol] = useState(config.sortBy || '');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(config.sortOrder || 'asc');

  const sorted = [...data].sort((a, b) => {
    if (!sortCol) return 0;
    const av = a[sortCol];
    const bv = b[sortCol];
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortDir === 'asc' ? av - bv : bv - av;
    }
    return sortDir === 'asc'
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });

  const limited = config.limit ? sorted.slice(0, config.limit) : sorted;

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  return (
    <div className="w-full h-full overflow-auto custom-scrollbar">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                onClick={() => handleSort(col)}
                className="text-left p-2 text-zinc-500 font-bold uppercase tracking-wider text-[10px] cursor-pointer hover:text-white transition-colors sticky top-0 bg-brand-surface border-b border-brand-border"
              >
                <span className="flex items-center gap-1">
                  {col}
                  <ArrowUpDown className="w-2.5 h-2.5" />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {limited.map((row, i) => (
            <tr key={i} className="hover:bg-white/5 transition-colors">
              {columns.map((col) => (
                <td key={col} className="p-2 text-zinc-400 border-t border-brand-border">
                  {config.valuePrefix && typeof row[col] === 'number' ? config.valuePrefix : ''}
                  {typeof row[col] === 'number' ? Number(row[col]).toLocaleString() : String(row[col] ?? '')}
                  {config.valueSuffix && typeof row[col] === 'number' ? config.valueSuffix : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
