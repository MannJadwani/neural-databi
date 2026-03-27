import { useState, createContext, useContext } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { DataUploader } from '../components/data/DataUploader';
import { useApp } from '../lib/app-store';
import toast from 'react-hot-toast';

const UploadContext = createContext<() => void>(() => {});
export function useUploadTrigger() { return useContext(UploadContext); }

export function AppLayout() {
  const [showUploader, setShowUploader] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { addDataset } = useApp();
  const navigate = useNavigate();

  return (
    <UploadContext.Provider value={() => setShowUploader(true)}>
      <div className="flex h-screen bg-brand-bg text-slate-400 overflow-hidden">
        <Sidebar
          onUploadClick={() => setShowUploader(true)}
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 flex flex-col min-w-0">
          {/* Mobile top bar */}
          <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-brand-border bg-brand-surface shrink-0">
            <button onClick={() => setSidebarOpen(true)} className="p-1 text-zinc-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <span className="text-sm font-bold text-white tracking-tight">NeuralBi</span>
          </div>

          <div className="flex-1 flex overflow-hidden">
            <Outlet />
          </div>
        </main>

        {showUploader && (
          <DataUploader
            onUploadComplete={(dataset) => {
              addDataset(dataset);
              setShowUploader(false);
              toast.success(`Uploaded ${dataset.fileName} — ${dataset.schema.rowCount} rows, ${dataset.schema.columns.length} columns`);
              navigate('/data');
            }}
            onClose={() => setShowUploader(false)}
          />
        )}
      </div>
    </UploadContext.Provider>
  );
}
