import { Trash2, Database, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface Dataset {
  _id: string;
  name: string;
  fileName: string;
  rowCount: number;
  schema?: { columns: { name: string }[] };
}

interface Props {
  datasets: Dataset[];
  selectedDatasetId: string | null;
  onDatasetChange: (id: string) => void;
  onClear: () => void;
  hasMessages: boolean;
}

export function ChatHeader({ datasets, selectedDatasetId, onDatasetChange, onClear, hasMessages }: Props) {
  const [open, setOpen] = useState(false);
  const selected = datasets.find((d) => d._id === selectedDatasetId);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-sm font-bold text-white shrink-0">Chat</h1>

        {/* Dataset selector */}
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs border border-zinc-800 rounded-lg hover:border-zinc-600 transition-colors cursor-pointer max-w-[280px]"
          >
            <Database className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span className="text-zinc-300 truncate">
              {selected ? selected.fileName : 'Select a dataset'}
            </span>
            <ChevronDown className="w-3 h-3 text-zinc-600 shrink-0" />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div className="absolute left-0 top-full mt-1 w-[calc(100vw-2rem)] sm:w-72 max-w-72 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 py-1 max-h-64 overflow-y-auto custom-scrollbar">
                {datasets.length > 0 ? (
                  datasets.map((d) => (
                    <button
                      key={d._id}
                      onClick={() => { onDatasetChange(d._id); setOpen(false); }}
                      className={`w-full px-3 py-2.5 text-left flex items-center gap-3 hover:bg-white/5 transition-colors cursor-pointer ${
                        d._id === selectedDatasetId ? 'bg-white/5' : ''
                      }`}
                    >
                      <Database className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-200 truncate">{d.fileName}</p>
                        <p className="text-[10px] text-zinc-600">
                          {d.rowCount.toLocaleString()} rows &middot; {d.schema?.columns?.length || 0} columns
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-3 text-xs text-zinc-600 text-center">No datasets uploaded yet</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Dataset info badge */}
        {selected && (
          <span className="text-[10px] text-zinc-600 hidden sm:inline">
            {selected.rowCount.toLocaleString()} rows &middot; {selected.schema?.columns?.length || 0} cols
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {hasMessages && (
          <button
            onClick={onClear}
            className="p-2 text-zinc-600 hover:text-zinc-300 transition-colors cursor-pointer"
            title="Clear conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
