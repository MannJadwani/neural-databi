import { X, Check } from 'lucide-react';
import { useDashboard, useDashboardDispatch } from '../../lib/dashboard-store';
import { cn } from '../../lib/utils';

export interface DashboardTheme {
  name: string;
  colors: string[];
}

export const THEMES: DashboardTheme[] = [
  { name: 'Monochrome', colors: ['#ffffff', '#888888', '#555555', '#333333', '#aaaaaa', '#666666'] },
  { name: 'Corporate', colors: ['#3b82f6', '#1e40af', '#60a5fa', '#93c5fd', '#2563eb', '#1d4ed8'] },
  { name: 'Vibrant', colors: ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'] },
  { name: 'Pastel', colors: ['#fda4af', '#93c5fd', '#86efac', '#fde68a', '#c4b5fd', '#f9a8d4'] },
  { name: 'Earth', colors: ['#d97706', '#92400e', '#b45309', '#78350f', '#a16207', '#854d0e'] },
  { name: 'Ocean', colors: ['#06b6d4', '#0891b2', '#22d3ee', '#67e8f9', '#0e7490', '#155e75'] },
];

interface ThemePanelProps {
  onClose: () => void;
}

export function ThemePanel({ onClose }: ThemePanelProps) {
  const { widgets } = useDashboard();
  const dispatch = useDashboardDispatch();

  // Detect current theme by checking first chart's colors
  const currentColors = widgets.find((w) => w.chartType !== 'kpi')?.config.colors;

  const applyTheme = (theme: DashboardTheme) => {
    // Apply colors to all non-KPI widgets
    for (const widget of widgets) {
      if (widget.chartType === 'kpi') continue;
      dispatch({
        type: 'UPDATE_WIDGET',
        payload: {
          id: widget.id,
          changes: {
            config: { ...widget.config, colors: theme.colors },
          },
        },
      });
    }
  };

  return (
    <div className="w-72 border-l border-brand-border bg-brand-surface flex flex-col shrink-0 h-full">
      <div className="p-4 border-b border-brand-border flex items-center justify-between">
        <h3 className="text-xs font-bold text-white uppercase tracking-widest">Dashboard Theme</h3>
        <button onClick={onClose} className="p-1 hover:text-white transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
        {THEMES.map((theme) => {
          const isActive = currentColors && JSON.stringify(currentColors) === JSON.stringify(theme.colors);
          return (
            <button
              key={theme.name}
              onClick={() => applyTheme(theme)}
              className={cn(
                'w-full p-3 border transition-colors text-left',
                isActive ? 'border-white bg-white/5' : 'border-brand-border hover:border-zinc-600'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white">{theme.name}</span>
                {isActive && <Check className="w-3 h-3 text-emerald-500" />}
              </div>
              <div className="flex gap-1">
                {theme.colors.map((color, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 border border-brand-border"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
