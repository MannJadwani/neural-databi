// ============================================================
// ChartSpec — the core contract between AI agent and rendering
// ============================================================

export type ChartType =
  | 'line'
  | 'area'
  | 'bar'
  | 'horizontal-bar'
  | 'pie'
  | 'donut'
  | 'scatter'
  | 'heatmap'
  | 'kpi'
  | 'table'
  | 'multi-line'
  | 'stacked-bar'
  | 'stacked-area';

export interface ChartConfig {
  xAxis?: string;
  yAxis?: string | string[];
  groupBy?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  valuePrefix?: string;
  valueSuffix?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface KPIConfig extends ChartConfig {
  metric: string;
  label: string;
  comparisonMetric?: string;
  format?: 'number' | 'currency' | 'percent';
  trend?: string;
  trendDirection?: 'up' | 'down';
}

export interface ChartSpec {
  id: string;
  chartType: ChartType;
  title: string;
  data: Record<string, unknown>[];
  config: ChartConfig;
  position?: { x: number; y: number };
  size?: { w: number; h: number };
}

// ============================================================
// Dataset schema types
// ============================================================

export interface ColumnInfo {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  nullable: boolean;
  uniqueCount: number;
  sampleValues: unknown[];
  stats?: {
    min?: number;
    max?: number;
    mean?: number;
    median?: number;
  };
}

export interface DatasetSchema {
  columns: ColumnInfo[];
  rowCount: number;
  sampleRows: Record<string, unknown>[];
}

// ============================================================
// Dashboard types
// ============================================================

export interface DashboardState {
  id: string;
  name: string;
  datasetId: string;
  widgets: ChartSpec[];
  selectedWidgetId: string | null;
  isEditing: boolean;
}

// ============================================================
// Visualization suggestions (from schema analyzer)
// ============================================================

export interface VisualizationSuggestion {
  chartType: ChartType;
  title: string;
  reasoning: string;
  config: ChartConfig;
  confidence: number;
}

// ============================================================
// Widget component props
// ============================================================

export interface WidgetProps {
  data: Record<string, unknown>[];
  config: ChartConfig;
}
