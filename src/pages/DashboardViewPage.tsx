import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../lib/app-store';
import { DashboardView } from '../components/dashboard/DashboardView';
import { DashboardProvider } from '../lib/dashboard-store';
import { AlertCircle } from 'lucide-react';

export function DashboardViewPage() {
  const { id } = useParams<{ id: string }>();
  const { getDashboard } = useApp();
  const navigate = useNavigate();

  const dashboard = id ? getDashboard(id) : undefined;

  if (!dashboard) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <AlertCircle className="w-10 h-10 text-zinc-700 mb-3" />
        <h2 className="text-lg font-bold text-white mb-1">Dashboard Not Found</h2>
        <p className="text-sm text-zinc-500 mb-4">This dashboard may have been deleted.</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors"
        >
          Back to Dashboards
        </button>
      </div>
    );
  }

  return (
    <DashboardProvider>
      <DashboardView
        activeDashboard={{
          dataset: dashboard.dataset,
          charts: dashboard.charts,
        }}
      />
    </DashboardProvider>
  );
}
