import { useNavigate } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { useApp } from '../lib/app-store';
import { useUploadTrigger } from '../layouts/AppLayout';
import { DataSourcesPanel } from '../components/data/DataSourcesPanel';
import toast from 'react-hot-toast';

export function DataSourcesPage() {
  const { datasets, createDashboard } = useApp();
  const navigate = useNavigate();
  const openUpload = useUploadTrigger();

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <header className="p-6 border-b border-brand-border flex items-center justify-between sticky top-0 bg-brand-bg/80 backdrop-blur-sm z-10">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Data Sources</h1>
          <p className="text-xs text-zinc-500">
            {datasets.length} dataset{datasets.length !== 1 ? 's' : ''} uploaded
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
        <DataSourcesPanel
          datasets={datasets}
          onCreateDashboard={(dataset, suggestions) => {
            const id = createDashboard(dataset, suggestions);
            toast.success(`Dashboard created with ${suggestions.length} visualizations`);
            navigate(`/dashboard/${id}`);
          }}
        />
      </div>
    </div>
  );
}
