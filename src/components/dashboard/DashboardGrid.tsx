import { useRef } from 'react';
import { useDashboard } from '../../lib/dashboard-store';
import { ChartRenderer } from '../charts';
import { WidgetContainer } from './WidgetContainer';

const CELL_H = 150;
const COLS = 12;

export function DashboardGrid() {
  const { widgets, isEditing } = useDashboard();
  const gridRef = useRef<HTMLDivElement>(null);

  // Calculate grid rows needed
  const maxRow = widgets.reduce((max, w) => {
    const bottom = (w.position?.y || 0) + (w.size?.h || 2);
    return Math.max(max, bottom);
  }, 0);

  // Separate KPIs (row height 1) from charts
  const kpis = widgets.filter((w) => w.chartType === 'kpi');
  const charts = widgets.filter((w) => w.chartType !== 'kpi');

  return (
    <div className="space-y-6">
      {/* KPI row */}
      {kpis.length > 0 && (
        <div
          ref={kpis.length > 0 && charts.length === 0 ? gridRef : undefined}
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          }}
        >
          {kpis.map((widget) => {
            const pos = widget.position || { x: 0, y: 0 };
            const size = widget.size || { w: 3, h: 1 };
            return (
              <div
                key={widget.id}
                className="bg-brand-surface border border-brand-border p-4"
                style={{
                  gridColumn: `${pos.x + 1} / span ${size.w}`,
                }}
              >
                <ChartRenderer spec={widget} />
              </div>
            );
          })}
        </div>
      )}

      {/* Charts grid */}
      {charts.length > 0 && (
        <div
          ref={gridRef}
          className="grid gap-6 relative"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridAutoRows: `${CELL_H}px`,
          }}
        >
          {/* Grid lines in edit mode */}
          {isEditing && (
            <div
              className="absolute inset-0 pointer-events-none z-0"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
                `,
                backgroundSize: `calc(100% / ${COLS}) ${CELL_H}px`,
              }}
            />
          )}

          {charts.map((widget) => {
            const pos = widget.position || { x: 0, y: 0 };
            const size = widget.size || { w: 6, h: 2 };
            return (
              <WidgetContainer
                key={widget.id}
                id={widget.id}
                position={pos}
                size={size}
                gridRef={gridRef}
              >
                <ChartRenderer spec={widget} />
              </WidgetContainer>
            );
          })}
        </div>
      )}
    </div>
  );
}
