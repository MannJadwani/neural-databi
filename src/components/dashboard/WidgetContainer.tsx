import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { GripHorizontal, Trash2, Copy, Settings2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDashboard, useDashboardDispatch } from '../../lib/dashboard-store';

const CELL_H = 150; // px per grid row unit
const COLS = 12;

interface WidgetContainerProps {
  id: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
  children: React.ReactNode;
  gridRef: React.RefObject<HTMLDivElement | null>;
}

export function WidgetContainer({ id, position, size, children, gridRef }: WidgetContainerProps) {
  const { isEditing, selectedWidgetId } = useDashboard();
  const dispatch = useDashboardDispatch();
  const isSelected = selectedWidgetId === id;
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, origX: position.x, origY: position.y });
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, origW: size.w, origH: size.h });

  const handleSelect = useCallback(() => {
    if (isEditing) {
      dispatch({ type: 'SELECT_WIDGET', payload: isSelected ? null : id });
    }
  }, [isEditing, isSelected, id, dispatch]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, origX: position.x, origY: position.y };

    const handleMove = (ev: MouseEvent) => {
      if (!gridRef.current) return;
      const gridRect = gridRef.current.getBoundingClientRect();
      const cellW = gridRect.width / COLS;
      const dx = ev.clientX - dragStartRef.current.mouseX;
      const dy = ev.clientY - dragStartRef.current.mouseY;
      const newX = Math.max(0, Math.min(COLS - size.w, Math.round(dragStartRef.current.origX + dx / cellW)));
      const newY = Math.max(0, Math.round(dragStartRef.current.origY + dy / CELL_H));
      dispatch({ type: 'MOVE_WIDGET', payload: { id, position: { x: newX, y: newY } } });
    };

    const handleUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [isEditing, position, size.w, id, dispatch, gridRef]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, origW: size.w, origH: size.h };

    const handleMove = (ev: MouseEvent) => {
      if (!gridRef.current) return;
      const gridRect = gridRef.current.getBoundingClientRect();
      const cellW = gridRect.width / COLS;
      const dx = ev.clientX - resizeStartRef.current.mouseX;
      const dy = ev.clientY - resizeStartRef.current.mouseY;
      const newW = Math.max(2, Math.min(COLS - position.x, Math.round(resizeStartRef.current.origW + dx / cellW)));
      const newH = Math.max(1, Math.round(resizeStartRef.current.origH + dy / CELL_H));
      dispatch({ type: 'RESIZE_WIDGET', payload: { id, size: { w: newW, h: newH } } });
    };

    const handleUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [isEditing, position.x, size, id, dispatch, gridRef]);

  return (
    <motion.div
      layout={!isDragging && !isResizing}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onClick={handleSelect}
      className={cn(
        'relative',
        isEditing && 'cursor-pointer',
        isSelected && 'ring-1 ring-white/30',
        isDragging && 'opacity-80 z-50 shadow-2xl shadow-black/50',
        isResizing && 'z-50',
      )}
      style={{
        gridColumn: `${position.x + 1} / span ${size.w}`,
        gridRow: `${position.y + 1} / span ${size.h}`,
        minHeight: `${size.h * CELL_H}px`,
      }}
    >
      {/* Drag handle */}
      {isEditing && (
        <div
          onMouseDown={handleDragStart}
          className="absolute top-0 left-0 right-0 h-6 z-20 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-b from-black/40 to-transparent"
        >
          <GripHorizontal className="w-4 h-4 text-zinc-500" />
        </div>
      )}

      {/* Widget content */}
      <div className="h-full">{children}</div>

      {/* Resize handle */}
      {isEditing && (
        <div
          onMouseDown={handleResizeStart}
          className="absolute bottom-0 right-0 w-4 h-4 z-20 cursor-se-resize opacity-0 hover:opacity-100 transition-opacity"
        >
          <svg viewBox="0 0 16 16" className="w-full h-full text-zinc-500">
            <path d="M14 14L8 14M14 14L14 8M14 14L6 6" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
      )}

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
