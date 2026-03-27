import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { DashboardView } from '../components/dashboard/DashboardView';
import { DashboardProvider } from '../lib/dashboard-store';
import { widgetToSpec } from '../lib/convex-helpers';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useMemo } from 'react';

export function DashboardViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Load dashboard, widgets, and dataset from Convex
  const dashboard = useQuery(api.dashboards.get, id ? { id: id as Id<'dashboards'> } : 'skip');
  const widgets = useQuery(
    api.widgets.listByDashboard,
    dashboard ? { dashboardId: dashboard._id } : 'skip'
  );
  const dataset = useQuery(
    api.datasets.get,
    dashboard ? { id: dashboard.datasetId } : 'skip'
  );
  const dataRows = useQuery(
    api.dataRows.getByDataset,
    dashboard ? { datasetId: dashboard.datasetId } : 'skip'
  );

  // Convert DB widgets to ChartSpec[]
  const charts = useMemo(() => {
    if (!widgets) return [];
    return widgets.map(widgetToSpec);
  }, [widgets]);

  // Build the activeDashboard prop
  const activeDashboard = useMemo(() => {
    if (!dashboard || !dataset || !dataRows) return null;
    return {
      dataset: {
        fileName: dataset.fileName,
        fileSize: dataset.fileSize,
        data: dataRows.flatMap((c: any) => c.rows as Record<string, unknown>[]),
        schema: dataset.schema,
        suggestions: [],
        parseErrors: [],
      },
      charts,
      insights: dashboard.insights || null,
    };
  }, [dashboard, dataset, dataRows, charts]);

  // Loading state
  if (dashboard === undefined || widgets === undefined) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-600 animate-spin mb-3" />
        <p className="text-sm text-zinc-500">Loading dashboard...</p>
      </div>
    );
  }

  // Not found
  if (dashboard === null) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <AlertCircle className="w-10 h-10 text-zinc-700 mb-3" />
        <h2 className="text-lg font-bold text-white mb-1">Dashboard Not Found</h2>
        <p className="text-sm text-zinc-500 mb-4">This dashboard may have been deleted.</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <DashboardProvider>
      <DashboardView
        activeDashboard={activeDashboard}
        dashboardId={dashboard._id}
      />
    </DashboardProvider>
  );
}
