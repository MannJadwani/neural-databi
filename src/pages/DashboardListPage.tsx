import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Plus, MoreHorizontal, Trash2, Clock, Loader2 } from 'lucide-react';
import { useApp } from '../lib/app-store';
import { useState } from 'react';

export function DashboardListPage() {
  const { dashboards, isLoading, deleteDashboard } = useApp();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
      </div>
    );
  }

  const dashList = dashboards || [];

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <header className="px-4 py-3 md:p-6 border-b border-brand-border flex items-center justify-between sticky top-0 bg-brand-bg/80 backdrop-blur-sm z-10">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Dashboards</h1>
          <p className="text-xs text-zinc-500">
            {dashList.length} dashboard{dashList.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-3 py-2 bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors"
        >
          <Plus className="w-3 h-3" /> New Dashboard
        </button>
      </header>

      <div className="p-4 md:p-6">
        {dashList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <LayoutDashboard className="w-12 h-12 text-zinc-800 mb-4" />
            <h2 className="text-lg font-bold text-white mb-1">No Dashboards Yet</h2>
            <p className="text-sm text-zinc-500 max-w-sm mb-6">
              Upload a CSV file and create your first dashboard to visualize your data.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors"
            >
              Get Started
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashList.map((d: any) => (
              <div
                key={d._id}
                className="bg-brand-surface border border-brand-border hover:border-zinc-700 transition-colors cursor-pointer group relative"
                onClick={() => navigate(`/dashboard/${d._id}`)}
              >
                <div className="h-32 p-4 flex items-center justify-center border-b border-brand-border bg-brand-bg/50">
                  <LayoutDashboard className="w-8 h-8 text-zinc-800" />
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white truncate pr-2">{d.name}</h3>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(menuOpen === d._id ? null : d._id);
                        }}
                        className="p-2 hover:text-white transition-colors md:opacity-0 md:group-hover:opacity-100"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {menuOpen === d._id && (
                        <div className="absolute right-0 top-8 bg-zinc-900 border border-zinc-700 z-50 min-w-[140px] shadow-xl">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteDashboard(d._id);
                              setMenuOpen(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-zinc-800 transition-colors text-left text-red-400"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-zinc-600">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
