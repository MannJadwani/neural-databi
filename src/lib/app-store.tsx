import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { ChartSpec, DatasetSchema } from './types';
import type { UploadedDataset } from '../components/data/DataUploader';
import { chunkRows, specToWidgetFields, widgetToSpec } from './convex-helpers';

// ============================================================
// Types
// ============================================================

export interface DashboardRecord {
  id: string;
  _id: Id<'dashboards'>;
  name: string;
  datasetId: Id<'datasets'>;
  createdAt: number;
}

interface AppState {
  // Reactive queries
  datasets: any[] | undefined;
  dashboards: any[] | undefined;
  isLoading: boolean;

  // Mutations
  uploadDataset: (dataset: UploadedDataset) => Promise<Id<'datasets'>>;
  createDashboardFromCharts: (datasetId: Id<'datasets'>, name: string, charts: ChartSpec[], insights?: string | null) => Promise<Id<'dashboards'>>;
  getDashboardWidgets: (dashboardId: Id<'dashboards'>) => ChartSpec[] | undefined;
  deleteDashboard: (id: Id<'dashboards'>) => Promise<void>;
  renameDashboard: (id: Id<'dashboards'>, name: string) => Promise<void>;

  // Widget mutations
  addWidget: (dashboardId: Id<'dashboards'>, spec: ChartSpec) => Promise<void>;
  updateWidget: (widgetId: Id<'widgets'>, changes: Partial<ChartSpec>) => Promise<void>;
  removeWidget: (widgetId: Id<'widgets'>) => Promise<void>;

  // Data access
  getDatasetRows: (datasetId: Id<'datasets'>) => Record<string, unknown>[] | undefined;
}

// ============================================================
// Context
// ============================================================

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  // Reactive queries
  const datasets = useQuery(api.datasets.list);
  const dashboards = useQuery(api.dashboards.list);

  // Mutations
  const createDatasetMut = useMutation(api.datasets.create);
  const updateDatasetSchema = useMutation(api.datasets.updateSchema);
  const insertChunk = useMutation(api.dataRows.insertChunk);
  const createDashboardMut = useMutation(api.dashboards.create);
  const createWidgetsBatch = useMutation(api.widgets.createBatch);
  const deleteDashboardMut = useMutation(api.dashboards.remove);
  const updateDashboardMut = useMutation(api.dashboards.update);
  const createWidgetMut = useMutation(api.widgets.create);
  const updateWidgetMut = useMutation(api.widgets.update);
  const removeWidgetMut = useMutation(api.widgets.remove);

  const isLoading = datasets === undefined || dashboards === undefined;

  // Upload dataset: create record, store rows in chunks
  const uploadDataset = useCallback(async (dataset: UploadedDataset): Promise<Id<'datasets'>> => {
    // Create dataset record
    const datasetId = await createDatasetMut({
      name: dataset.fileName.replace(/\.csv$/i, ''),
      fileName: dataset.fileName,
      fileSize: dataset.fileSize,
      rowCount: dataset.schema.rowCount,
      status: 'parsing',
    });

    // Store rows in chunks
    const chunks = chunkRows(dataset.data);
    for (let i = 0; i < chunks.length; i++) {
      await insertChunk({
        datasetId,
        chunkIndex: i,
        rows: chunks[i],
      });
    }

    // Update with schema and mark ready
    await updateDatasetSchema({
      id: datasetId,
      schema: dataset.schema,
      rowCount: dataset.schema.rowCount,
    });

    return datasetId;
  }, [createDatasetMut, insertChunk, updateDatasetSchema]);

  // Create dashboard with pre-built charts
  const createDashboardFromCharts = useCallback(async (
    datasetId: Id<'datasets'>,
    name: string,
    charts: ChartSpec[],
    insights?: string | null
  ): Promise<Id<'dashboards'>> => {
    const dashboardId = await createDashboardMut({ name, datasetId, insights: insights || undefined });

    // Batch create widgets in chunks to stay under Convex argument size limits
    const widgetFields = charts.map((spec) => specToWidgetFields(spec, dashboardId));
    const CHUNK_SIZE = 5;
    for (let i = 0; i < widgetFields.length; i += CHUNK_SIZE) {
      await createWidgetsBatch({ widgets: widgetFields.slice(i, i + CHUNK_SIZE) });
    }

    return dashboardId;
  }, [createDashboardMut, createWidgetsBatch]);

  // These are just wrappers — actual widget data comes from DashboardViewPage via useQuery
  const getDashboardWidgets = useCallback((_dashboardId: Id<'dashboards'>): ChartSpec[] | undefined => {
    // This is handled by the DashboardViewPage which calls useQuery directly
    return undefined;
  }, []);

  const getDatasetRows = useCallback((_datasetId: Id<'datasets'>): Record<string, unknown>[] | undefined => {
    // Handled by components that need it via useQuery
    return undefined;
  }, []);

  const deleteDashboard = useCallback(async (id: Id<'dashboards'>) => {
    await deleteDashboardMut({ id });
  }, [deleteDashboardMut]);

  const renameDashboard = useCallback(async (id: Id<'dashboards'>, name: string) => {
    await updateDashboardMut({ id, name });
  }, [updateDashboardMut]);

  const addWidget = useCallback(async (dashboardId: Id<'dashboards'>, spec: ChartSpec) => {
    await createWidgetMut({
      dashboardId,
      chartType: spec.chartType,
      title: spec.title,
      config: spec.config,
      chartData: spec.data,
      position: spec.position || { x: 0, y: 0 },
      size: spec.size || { w: 6, h: 2 },
    });
  }, [createWidgetMut]);

  const updateWidget = useCallback(async (widgetId: Id<'widgets'>, changes: Partial<ChartSpec>) => {
    const update: any = {};
    if (changes.chartType) update.chartType = changes.chartType;
    if (changes.title) update.title = changes.title;
    if (changes.config) update.config = changes.config;
    if (changes.data) update.chartData = changes.data;
    if (changes.position) update.position = changes.position;
    if (changes.size) update.size = changes.size;
    await updateWidgetMut({ id: widgetId, ...update });
  }, [updateWidgetMut]);

  const removeWidget = useCallback(async (widgetId: Id<'widgets'>) => {
    await removeWidgetMut({ id: widgetId });
  }, [removeWidgetMut]);

  return (
    <AppContext.Provider value={{
      datasets, dashboards, isLoading,
      uploadDataset, createDashboardFromCharts, getDashboardWidgets, getDatasetRows,
      deleteDashboard, renameDashboard,
      addWidget, updateWidget, removeWidget,
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
