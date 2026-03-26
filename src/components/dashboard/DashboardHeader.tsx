import { useState, useEffect, useCallback } from 'react';
import { Filter, Plus, Pencil, Eye, Check, Undo2, Redo2, Download, Palette } from 'lucide-react';
import { useDashboard, useDashboardDispatch } from '../../lib/dashboard-store';
import { undo, redo, canUndo, canRedo, pushState } from '../../lib/undoStack';
import { cn } from '../../lib/utils';

interface DashboardHeaderProps {
  subtitle: string;
  onAddWidget?: () => void;
  onExport?: () => void;
  onTheme?: () => void;
}

export function DashboardHeader({ subtitle, onAddWidget, onExport, onTheme }: DashboardHeaderProps) {
  const { name, isEditing, widgets } = useDashboard();
  const dispatch = useDashboardDispatch();
  const [isRenaming, setIsRenaming] = useState(false);
  const [editName, setEditName] = useState(name);
  const [, forceUpdate] = useState(0);

  // Push state to undo stack when widgets change in edit mode
  useEffect(() => {
    if (isEditing) pushState(widgets);
  }, [widgets, isEditing]);

  const handleUndo = useCallback(() => {
    const prev = undo();
    if (prev) {
      dispatch({ type: 'SET_WIDGETS', payload: prev });
      forceUpdate((n) => n + 1);
    }
  }, [dispatch]);

  const handleRedo = useCallback(() => {
    const next = redo();
    if (next) {
      dispatch({ type: 'SET_WIDGETS', payload: next });
      forceUpdate((n) => n + 1);
    }
  }, [dispatch]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isEditing) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isEditing, handleUndo, handleRedo]);

  const handleRename = () => {
    if (editName.trim()) {
      dispatch({ type: 'RENAME', payload: editName.trim() });
    }
    setIsRenaming(false);
  };

  return (
    <header className="p-6 border-b border-brand-border flex items-center justify-between sticky top-0 bg-brand-bg/80 backdrop-blur-sm z-10">
      <div>
        {isRenaming ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              onBlur={handleRename}
              className="text-xl font-bold text-white tracking-tight bg-transparent border-b border-white focus:outline-none"
            />
            <button onClick={handleRename} className="p-1 text-emerald-500">
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <h1
            className={cn("text-xl font-bold text-white tracking-tight", isEditing && "cursor-pointer hover:underline underline-offset-4 decoration-zinc-700")}
            onClick={() => isEditing && (setEditName(name), setIsRenaming(true))}
          >
            {name}
          </h1>
        )}
        <p className="text-xs text-zinc-500">{subtitle}</p>
      </div>
      <div className="flex gap-2">
        {/* Undo/Redo in edit mode */}
        {isEditing && (
          <>
            <button
              onClick={handleUndo}
              disabled={!canUndo()}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors disabled:opacity-30"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo()}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors disabled:opacity-30"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <div className="w-px bg-zinc-800" />
          </>
        )}

        {/* Theme button */}
        {isEditing && onTheme && (
          <button
            onClick={onTheme}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 text-xs hover:bg-zinc-800 transition-colors"
          >
            <Palette className="w-3 h-3" /> Theme
          </button>
        )}

        {/* Edit / View toggle */}
        <button
          onClick={() => dispatch({ type: 'TOGGLE_EDITING' })}
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-xs font-bold transition-colors border',
            isEditing
              ? 'bg-white text-black border-white hover:bg-zinc-200'
              : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'
          )}
        >
          {isEditing ? <><Eye className="w-3 h-3" /> View Mode</> : <><Pencil className="w-3 h-3" /> Edit</>}
        </button>

        {isEditing && (
          <button
            onClick={onAddWidget}
            className="flex items-center gap-2 px-3 py-2 bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add Widget
          </button>
        )}

        {!isEditing && (
          <>
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 text-xs hover:bg-zinc-800 transition-colors"
            >
              <Download className="w-3 h-3" /> Export
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 text-xs hover:bg-zinc-800 transition-colors">
              <Filter className="w-3 h-3" /> Filter
            </button>
          </>
        )}
      </div>
    </header>
  );
}
