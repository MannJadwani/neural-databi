import { useNavigate } from 'react-router-dom';
import { Database, FileSpreadsheet, ArrowRight, Upload } from 'lucide-react';
import { useApp } from '../lib/app-store';
import { useUploadTrigger } from '../layouts/AppLayout';

export function DataSourcesPage() {
  const { datasets } = useApp();
  const navigate = useNavigate();
  const openUpload = useUploadTrigger();

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <header className="p-6 border-b border-brand-border flex items-center justify-between sticky top-0 bg-brand-bg/80 backdrop-blur-sm z-10">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Data Sources</h1>
          <p className="text-xs text-zinc-500">
            {(datasets || []).length} dataset{(datasets || []).length !== 1 ? 's' : ''} uploaded
          </p>
        </div>
        <button
          onClick={openUpload}
          className="flex items-center gap-2 px-3 py-2 bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors"
        >
          <Upload className="w-3 h-3" /> Upload CSV
        </button>
      </header>

      <div className="p-6">
        {!datasets || datasets.length === 0 ? (
          <div className="border border-dashed border-brand-border p-10 text-center">
            <Database className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">No datasets yet</p>
            <p className="text-xs text-zinc-600 mt-1">Upload a CSV to start profiling and preparing your data.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {datasets.map((dataset) => (
              <button
                key={dataset._id}
                onClick={() => navigate(`/data/${dataset._id}`)}
                className="text-left bg-brand-surface border border-brand-border p-5 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <FileSpreadsheet className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{dataset.fileName}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {dataset.rowCount.toLocaleString()} rows • {(dataset.schema?.columns?.length || 0)} columns
                      </p>
                      <p className="text-[11px] text-zinc-600 mt-3 leading-relaxed">
                        Open this dataset to profile quality, prepare columns, explore rows, and save reusable views.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-600 shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
