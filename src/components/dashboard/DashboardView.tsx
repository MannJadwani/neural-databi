import { useEffect, useState, useRef, useMemo } from 'react';
import { useDashboard, useDashboardDispatch } from '../../lib/dashboard-store';
import { initUndoStack } from '../../lib/undoStack';
import { exportAsPNG, exportAsPDF, exportAsCSV } from '../../lib/export';
import { DashboardHeader } from './DashboardHeader';
import { DashboardGrid } from './DashboardGrid';
import { WidgetPropertyPanel } from './WidgetPropertyPanel';
import { WidgetPicker } from './WidgetPicker';
import { ThemePanel } from './ThemePanel';
import { ShareModal } from './ShareModal';
import { AICopilot } from '../AICopilot';
import { LayoutDashboard, Image, FileText, Sheet } from 'lucide-react';
import type { Id } from '../../../convex/_generated/dataModel';
import type { ChartSpec } from '../../lib/types';
import type { UploadedDataset } from '../data/DataUploader';
import toast from 'react-hot-toast';

interface DashboardViewProps {
  activeDashboard: {
    dataset: UploadedDataset;
    charts: ChartSpec[];
    insights?: string | null;
  } | null;
  dashboardId?: string;
}

export function DashboardView({ activeDashboard, dashboardId }: DashboardViewProps) {
  const state = useDashboard();
  const dispatch = useDashboardDispatch();
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Stable ID so we don't re-dispatch on every render
  const dashId = useMemo(() => `dash-${Date.now()}`, [activeDashboard]);
  const initialized = useRef(false);

  // Sync activeDashboard into state — only once per dashboard
  useEffect(() => {
    if (activeDashboard && !initialized.current) {
      initialized.current = true;
      dispatch({
        type: 'SET_DASHBOARD',
        payload: {
          id: dashId,
          name: activeDashboard.dataset.fileName.replace(/\.csv$/i, ''),
          datasetId: '',
          schema: activeDashboard.dataset.schema,
          widgets: activeDashboard.charts,
          insights: activeDashboard.insights || null,
        },
      });
      initUndoStack(activeDashboard.charts);
    }
  }, [activeDashboard, dashId, dispatch]);

  const hasWidgets = state.widgets.length > 0;
  const showPropertyPanel = state.isEditing && state.selectedWidgetId && !showTheme;

  const subtitle = activeDashboard
    ? `${activeDashboard.dataset.schema.rowCount.toLocaleString()} rows • ${activeDashboard.dataset.schema.columns.length} columns`
    : 'Upload a CSV to get started';

  const handleExport = async (type: 'png' | 'pdf' | 'csv') => {
    setShowExportMenu(false);
    if (type === 'csv' && activeDashboard) {
      exportAsCSV(activeDashboard.dataset.data, `${state.name || 'data'}.csv`);
      toast.success('CSV exported');
    } else if (dashboardRef.current) {
      try {
        if (type === 'png') {
          await exportAsPNG(dashboardRef.current, `${state.name || 'dashboard'}.png`);
        } else {
          await exportAsPDF(dashboardRef.current, `${state.name || 'dashboard'}.pdf`);
        }
        toast.success(`${type.toUpperCase()} exported`);
      } catch {
        toast.error('Export failed');
      }
    }
  };

  // Right panel logic
  const renderRightPanel = () => {
    if (showTheme) return <ThemePanel onClose={() => setShowTheme(false)} />;
    if (showPropertyPanel) return <WidgetPropertyPanel />;
    return <AICopilot data={activeDashboard?.dataset.data} dashboardId={dashboardId} />;
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        {hasWidgets ? (
          <>
            <DashboardHeader
              subtitle={subtitle}
              dashboardId={dashboardId}
              onAddWidget={() => setShowWidgetPicker(true)}
              onExport={() => setShowExportMenu((v) => !v)}
              onTheme={() => setShowTheme((v) => !v)}
              onShare={() => setShowShare(true)}
            />

            {/* Export dropdown */}
            {showExportMenu && (
              <div className="absolute right-6 top-16 z-50 bg-zinc-900 border border-zinc-700 shadow-xl">
                <button
                  onClick={() => handleExport('png')}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs hover:bg-zinc-800 transition-colors"
                >
                  <Image className="w-3 h-3" /> Export as PNG
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs hover:bg-zinc-800 transition-colors"
                >
                  <FileText className="w-3 h-3" /> Export as PDF
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs hover:bg-zinc-800 transition-colors"
                >
                  <Sheet className="w-3 h-3" /> Export Data as CSV
                </button>
              </div>
            )}

            <div ref={dashboardRef} className="p-3 max-w-[1200px] mx-auto">
              <DashboardGrid />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center h-full text-center p-8">
            <LayoutDashboard className="w-12 h-12 text-zinc-800 mb-4" />
            <h2 className="text-lg font-bold text-white mb-1">No Dashboard Yet</h2>
            <p className="text-sm text-zinc-500 max-w-sm">
              Upload a CSV file and create a dashboard from the Data Sources panel to see your data come alive.
            </p>
          </div>
        )}
      </div>

      {renderRightPanel()}

      {showWidgetPicker && activeDashboard && (
        <WidgetPicker
          onClose={() => setShowWidgetPicker(false)}
          data={activeDashboard.dataset.data}
        />
      )}

      {showShare && dashboardId && (
        <ShareModal
          dashboardId={dashboardId as Id<'dashboards'>}
          dashboardName={state.name}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
