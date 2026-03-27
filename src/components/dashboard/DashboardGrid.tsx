import { useRef, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { useDashboard, useDashboardDispatch } from '../../lib/dashboard-store';
import { ChartRenderer } from '../charts';
import { AIInsightsCard } from './AIInsightsCard';
import { GripHorizontal, Trash2, Copy } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ChartSpec } from '../../lib/types';

const ROW_H = 110;

const COL_SPAN_MAP: Record<number, string> = {
  3: 'col-span-12 sm:col-span-6 md:col-span-3',
  4: 'col-span-12 sm:col-span-6 md:col-span-4',
  5: 'col-span-12 sm:col-span-6 md:col-span-5',
  6: 'col-span-12 sm:col-span-12 md:col-span-6',
  7: 'col-span-12 md:col-span-7',
  8: 'col-span-12 md:col-span-8',
  9: 'col-span-12 md:col-span-9',
  12: 'col-span-12',
};

function getColSpan(w: number): string {
  return COL_SPAN_MAP[w] || `col-span-12 md:col-span-${Math.min(w, 12)}`;
}

// ============================================================
// Sortable Widget
// ============================================================

function SortableWidget({ widget, isEditing }: { widget: ChartSpec; isEditing: boolean }) {
  const dispatch = useDashboardDispatch();
  const { selectedWidgetId } = useDashboard();
  const isSelected = selectedWidgetId === widget.id;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id, disabled: !isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    height: (widget.size?.h || 3) * ROW_H,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        getColSpan(widget.size?.w || 6),
        'relative group',
        isSelected && isEditing && 'ring-1 ring-white/30',
      )}
      onClick={() => isEditing && dispatch({ type: 'SELECT_WIDGET', payload: isSelected ? null : widget.id })}
    >
      {/* Drag handle — only in edit mode */}
      {isEditing && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-0 left-0 right-0 h-8 z-20 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-black/60 to-transparent"
        >
          <GripHorizontal className="w-4 h-4 text-zinc-400" />
        </div>
      )}

      {/* Action buttons */}
      {isEditing && isSelected && (
        <div className="absolute top-1 right-1 flex gap-1 z-30">
          <button
            onClick={(e) => { e.stopPropagation(); dispatch({ type: 'DUPLICATE_WIDGET', payload: widget.id }); }}
            className="p-1 bg-zinc-900/90 border border-zinc-700 hover:bg-zinc-800 transition-colors"
          >
            <Copy className="w-3 h-3 text-zinc-300" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); dispatch({ type: 'REMOVE_WIDGET', payload: widget.id }); }}
            className="p-1 bg-zinc-900/90 border border-red-900 hover:bg-red-950 transition-colors"
          >
            <Trash2 className="w-3 h-3 text-red-400" />
          </button>
        </div>
      )}

      <div className="h-full">
        <ChartRenderer spec={widget} />
      </div>
    </div>
  );
}

// ============================================================
// Dashboard Grid
// ============================================================

export function DashboardGrid() {
  const { widgets, isEditing, insights } = useDashboard();
  const dispatch = useDashboardDispatch();
  const [activeId, setActiveId] = useState<string | null>(null);

  const kpis = widgets.filter((w) => w.chartType === 'kpi');
  const charts = widgets.filter((w) => w.chartType !== 'kpi');
  const chartIds = charts.map((c) => c.id);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const activeWidget = activeId ? charts.find((c) => c.id === activeId) : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Reorder widgets
    const oldIndex = charts.findIndex((c) => c.id === active.id);
    const newIndex = charts.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...widgets];
    const kpiCount = kpis.length;

    // Find the actual indices in the full widgets array
    const actualOld = kpiCount + oldIndex;
    const actualNew = kpiCount + newIndex;

    const [moved] = reordered.splice(actualOld, 1);
    reordered.splice(actualNew, 0, moved);

    dispatch({ type: 'SET_WIDGETS', payload: reordered });
  }, [charts, widgets, kpis.length, dispatch]);

  return (
    <div className="space-y-2">
      {/* AI Insights */}
      {insights && <AIInsightsCard insights={insights} />}

      {/* KPIs */}
      {kpis.length > 0 && (
        <div className={cn(
          'grid gap-2',
          kpis.length === 1 && 'grid-cols-1',
          kpis.length === 2 && 'grid-cols-2',
          kpis.length === 3 && 'grid-cols-3',
          kpis.length >= 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        )}>
          {kpis.map((widget) => (
            <div key={widget.id} className="bg-brand-surface border border-brand-border p-4">
              <ChartRenderer spec={widget} />
            </div>
          ))}
        </div>
      )}

      {/* Charts — drag and drop in edit mode */}
      {charts.length > 0 && (
        isEditing ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={chartIds} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-12 gap-2 auto-rows-min">
                {charts.map((widget) => (
                  <SortableWidget key={widget.id} widget={widget} isEditing={true} />
                ))}
              </div>
            </SortableContext>

            {/* Drag overlay — shows the chart being dragged */}
            <DragOverlay>
              {activeWidget && (
                <div
                  className="opacity-80 shadow-2xl shadow-black/50 pointer-events-none"
                  style={{ height: (activeWidget.size?.h || 3) * ROW_H, width: 400 }}
                >
                  <ChartRenderer spec={activeWidget} />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="grid grid-cols-12 gap-2 auto-rows-min">
            {charts.map((widget) => (
              <div
                key={widget.id}
                className={getColSpan(widget.size?.w || 6)}
                style={{ height: (widget.size?.h || 3) * ROW_H }}
              >
                <div className="h-full">
                  <ChartRenderer spec={widget} />
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {widgets.length === 0 && (
        <div className="text-center py-12 text-zinc-600 text-sm">
          No charts yet. Use the AI Copilot to create visualizations.
        </div>
      )}
    </div>
  );
}
