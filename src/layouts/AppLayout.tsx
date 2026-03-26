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
  const { addDataset } = useApp();
  const navigate = useNavigate();

  return (
    <UploadContext.Provider value={() => setShowUploader(true)}>
      <div className="flex h-screen bg-brand-bg text-slate-400 overflow-hidden">
        <Sidebar onUploadClick={() => setShowUploader(true)} />
        <main className="flex-1 flex flex-col min-w-0">
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
