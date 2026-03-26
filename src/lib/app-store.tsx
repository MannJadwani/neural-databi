import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { UploadedDataset } from '../components/data/DataUploader';
import type { VisualizationSuggestion, ChartSpec } from './types';
import { autoLayout } from './dashboard-store';

// ============================================================
// Types
// ============================================================

export interface DashboardRecord {
  id: string;
  name: string;
  datasetFileName: string;
  charts: ChartSpec[];
  dataset: UploadedDataset;
  createdAt: number;
}

interface AppState {
  datasets: UploadedDataset[];
  dashboards: DashboardRecord[];
  addDataset: (dataset: UploadedDataset) => void;
  removeDataset: (index: number) => void;
  createDashboard: (dataset: UploadedDataset, suggestions: VisualizationSuggestion[]) => string;
  getDashboard: (id: string) => DashboardRecord | undefined;
  renameDashboard: (id: string, name: string) => void;
  deleteDashboard: (id: string) => void;
  duplicateDashboard: (id: string) => string;
  updateDashboardCharts: (id: string, charts: ChartSpec[]) => void;
}

// ============================================================
// Context
// ============================================================

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [datasets, setDatasets] = useState<UploadedDataset[]>([]);
  const [dashboards, setDashboards] = useState<DashboardRecord[]>([]);

  const addDataset = useCallback((dataset: UploadedDataset) => {
    setDatasets((prev) => [dataset, ...prev]);
  }, []);

  const removeDataset = useCallback((index: number) => {
    setDatasets((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const createDashboard = useCallback((dataset: UploadedDataset, suggestions: VisualizationSuggestion[]): string => {
    const id = `dash-${Date.now()}`;
    const kpis = suggestions.filter((s) => s.chartType === 'kpi');
    const charts = suggestions.filter((s) => s.chartType !== 'kpi');

    const kpiSpecs: ChartSpec[] = kpis.map((s, i) => ({
      id: `kpi-${i}-${Date.now()}`,
      chartType: s.chartType,
      title: s.title,
      data: dataset.data,
      config: s.config,
      position: { x: i * 3, y: 0 },
      size: { w: 3, h: 1 },
    }));

    const chartSpecs: ChartSpec[] = charts.map((s, i) => ({
      id: `chart-${i}-${Date.now()}`,
      chartType: s.chartType,
      title: s.title,
      data: s.chartType === 'table' ? dataset.data : dataset.data.slice(0, 500),
      config: s.config,
      size: s.chartType === 'table' ? { w: 12, h: 3 } : { w: 6, h: 2 },
    }));

    const laidOut = autoLayout(chartSpecs);

    const record: DashboardRecord = {
      id,
      name: dataset.fileName.replace(/\.csv$/i, ''),
      datasetFileName: dataset.fileName,
      charts: [...kpiSpecs, ...laidOut],
      dataset,
      createdAt: Date.now(),
    };

    setDashboards((prev) => [record, ...prev]);
    return id;
  }, []);

  const getDashboard = useCallback((id: string) => {
    return dashboards.find((d) => d.id === id);
  }, [dashboards]);

  const renameDashboard = useCallback((id: string, name: string) => {
    setDashboards((prev) => prev.map((d) => d.id === id ? { ...d, name } : d));
  }, []);

  const deleteDashboard = useCallback((id: string) => {
    setDashboards((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const duplicateDashboard = useCallback((id: string): string => {
    const original = dashboards.find((d) => d.id === id);
    if (!original) return '';
    const newId = `dash-${Date.now()}`;
    const copy: DashboardRecord = {
      ...original,
      id: newId,
      name: `${original.name} (copy)`,
      createdAt: Date.now(),
    };
    setDashboards((prev) => [copy, ...prev]);
    return newId;
  }, [dashboards]);

  const updateDashboardCharts = useCallback((id: string, charts: ChartSpec[]) => {
    setDashboards((prev) => prev.map((d) => d.id === id ? { ...d, charts } : d));
  }, []);

  return (
    <AppContext.Provider value={{
      datasets, dashboards,
      addDataset, removeDataset,
      createDashboard, getDashboard, renameDashboard, deleteDashboard, duplicateDashboard, updateDashboardCharts,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
