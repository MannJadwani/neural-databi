import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { GripHorizontal, Trash2, Copy, Settings2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDashboard, useDashboardDispatch } from '../../lib/dashboard-store';

interface WidgetContainerProps {
  id: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
  children: React.ReactNode;
  gridRef: React.RefObject<HTMLDivElement | null>;
}

export function WidgetContainer({ id, children }: WidgetContainerProps) {
  const { isEditing, selectedWidgetId } = useDashboard();
  const dispatch = useDashboardDispatch();
  const isSelected = selectedWidgetId === id;

  const handleSelect = useCallback(() => {
    if (isEditing) {
      dispatch({ type: 'SELECT_WIDGET', payload: isSelected ? null : id });
    }
  }, [isEditing, isSelected, id, dispatch]);

  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onClick={handleSelect}
      className={cn(
        'relative h-full',
        isEditing && 'cursor-pointer',
        isSelected && 'ring-1 ring-white/30',
      )}
    >
      {/* Drag handle */}
      {isEditing && (
        <div className="absolute top-0 left-0 right-0 h-6 z-20 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-b from-black/40 to-transparent">
          <GripHorizontal className="w-4 h-4 text-zinc-500" />
        </div>
      )}

      {/* Widget content */}
      <div className="h-full">{children}</div>

      {/* Action bar when selected */}
      {isEditing && isSelected && (
        <div className="absolute -top-8 right-0 flex gap-1 z-30">
          <button
            onClick={(e) => { e.stopPropagation(); dispatch({ type: 'DUPLICATE_WIDGET', payload: id }); }}
            className="p-1.5 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 transition-colors"
            title="Duplicate"
          >
            <Copy className="w-3 h-3 text-zinc-300" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SELECT_WIDGET', payload: id }); }}
            className="p-1.5 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 transition-colors"
            title="Settings"
          >
            <Settings2 className="w-3 h-3 text-zinc-300" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); dispatch({ type: 'REMOVE_WIDGET', payload: id }); }}
            className="p-1.5 bg-zinc-900 border border-red-900 hover:bg-red-950 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3 h-3 text-red-400" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
