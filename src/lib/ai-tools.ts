import type { ChartConfig, ChartSpec, ChartType, DatasetSchema } from './types';
import type { DashboardAction } from './dashboard-store';
import { preAggregateForSpec } from './chart-data';
import { findNextPosition } from './bento-layout';
import * as qe from './query-engine';

type Row = Record<string, unknown>;

// ============================================================
// Tool definitions (OpenAI function calling format)
// ============================================================

export const TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'query_data',
      description: 'Query and transform the uploaded dataset. Use this to filter, sort, aggregate, or compute derived columns before creating charts or answering questions.',
      parameters: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['filter', 'aggregate', 'sort', 'top_n', 'compute', 'describe'],
            description: 'The operation to perform',
          },
          filter_conditions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                column: { type: 'string' },
                operator: { type: 'string', enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'startsWith'] },
                value: {},
              },
              required: ['column', 'operator', 'value'],
            },
            description: 'For filter operation: conditions to apply',
          },
          group_by: { type: 'string', description: 'For aggregate: column to group by' },
          metrics: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                column: { type: 'string' },
                fn: { type: 'string', enum: ['sum', 'avg', 'count', 'min', 'max'] },
                alias: { type: 'string' },
              },
              required: ['column', 'fn'],
            },
            description: 'For aggregate: metrics to compute',
          },
          sort_column: { type: 'string' },
          sort_order: { type: 'string', enum: ['asc', 'desc'] },
          limit: { type: 'number', description: 'For top_n: number of rows to return' },
          expression: { type: 'string', description: 'For compute: math expression using column names (e.g. "revenue / users")' },
          alias: { type: 'string', description: 'For compute: name for the new column' },
        },
        required: ['operation'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_chart',
      description: 'Create a new chart widget and add it to the dashboard. Call query_data first if you need to transform the data.',
      parameters: {
        type: 'object',
        properties: {
          chart_type: {
            type: 'string',
            enum: ['line', 'area', 'bar', 'horizontal-bar', 'pie', 'donut', 'scatter', 'heatmap', 'kpi', 'table', 'multi-line', 'stacked-bar', 'stacked-area', 'radar', 'radial-bar', 'treemap', 'funnel', 'gauge', 'waterfall', 'bubble', 'combo'],
          },
          title: { type: 'string', description: 'Chart title' },
          x_axis: { type: 'string', description: 'Column for x-axis' },
          y_axis: {
            oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
            description: 'Column(s) for y-axis',
          },
          colors: { type: 'array', items: { type: 'string' }, description: 'Hex colors for series' },
          show_legend: { type: 'boolean' },
          value_prefix: { type: 'string', description: 'e.g. "$"' },
          value_suffix: { type: 'string', description: 'e.g. "%"' },
          width: { type: 'number', description: 'Width in grid units (1-12), default 6' },
          height: { type: 'number', description: 'Height in grid units, default 2' },
        },
        required: ['chart_type', 'title'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'modify_chart',
      description: 'Modify an existing chart on the dashboard. Use get the widget ID from the current dashboard state.',
      parameters: {
        type: 'object',
        properties: {
          widget_id: { type: 'string', description: 'ID of the widget to modify' },
          chart_type: { type: 'string', enum: ['line', 'area', 'bar', 'horizontal-bar', 'pie', 'donut', 'scatter', 'heatmap', 'kpi', 'table', 'multi-line', 'stacked-bar', 'stacked-area', 'radar', 'radial-bar', 'treemap', 'funnel', 'gauge', 'waterfall', 'bubble', 'combo'] },
          title: { type: 'string' },
          x_axis: { type: 'string' },
          y_axis: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
          colors: { type: 'array', items: { type: 'string' } },
          show_legend: { type: 'boolean' },
        },
        required: ['widget_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'remove_chart',
      description: 'Remove a chart widget from the dashboard.',
      parameters: {
        type: 'object',
        properties: {
          widget_id: { type: 'string', description: 'ID of the widget to remove' },
        },
        required: ['widget_id'],
      },
    },
  },
];

// ============================================================
// Tool executor
// ============================================================

export interface ToolContext {
  data: Row[];
  schema: DatasetSchema;
  widgets: ChartSpec[];
  dispatch: (action: DashboardAction) => void;
  // Convex mutations for persistence
  addWidgetToDb?: (spec: ChartSpec) => Promise<void>;
  updateWidgetInDb?: (widgetId: string, changes: Partial<ChartSpec>) => Promise<void>;
  removeWidgetFromDb?: (widgetId: string) => Promise<void>;
}

// Transient query result storage — tools that query data store results here
// so create_chart can reference the latest query output
let lastQueryResult: Row[] | null = null;

export async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<string> {
  switch (toolName) {
    case 'query_data':
      return executeQueryData(args, ctx);
    case 'create_chart':
      return await executeCreateChart(args, ctx);
    case 'modify_chart':
      return await executeModifyChart(args, ctx);
    case 'remove_chart':
      return await executeRemoveChart(args, ctx);
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

function executeQueryData(args: Record<string, unknown>, ctx: ToolContext): string {
  let result = [...ctx.data];
  const op = args.operation as string;

  try {
    switch (op) {
      case 'filter':
        result = qe.filterRows(result, (args.filter_conditions as any[]) || []);
        break;
      case 'aggregate':
        result = qe.aggregateRows(
          result,
          args.group_by as string,
          (args.metrics as any[]) || []
        );
        if (args.sort_column) {
          result = qe.sortRows(result, args.sort_column as string, (args.sort_order as 'asc' | 'desc') || 'desc');
        }
        break;
      case 'sort':
        result = qe.sortRows(result, args.sort_column as string, (args.sort_order as 'asc' | 'desc') || 'asc');
        break;
      case 'top_n':
        result = qe.topN(result, args.sort_column as string, (args.limit as number) || 10, (args.sort_order as 'desc' | 'asc') || 'desc');
        break;
      case 'compute':
        result = qe.computeColumn(result, args.expression as string, (args.alias as string) || 'computed');
        break;
      case 'describe':
        return qe.describeData(result);
    }

    if (args.limit && op !== 'top_n') {
      result = result.slice(0, args.limit as number);
    }

    lastQueryResult = result;

    return JSON.stringify({
      row_count: result.length,
      columns: Object.keys(result[0] || {}),
      sample: result.slice(0, 5),
      summary: `Returned ${result.length} rows`,
    });
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
}

async function executeCreateChart(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const chartType = args.chart_type as ChartType;
  const id = `ai-chart-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const config: ChartConfig & { metric?: string; label?: string; format?: string } = {
    xAxis: args.x_axis as string | undefined,
    yAxis: args.y_axis as string | string[] | undefined,
    colors: args.colors as string[] | undefined,
    showLegend: args.show_legend as boolean | undefined,
    valuePrefix: args.value_prefix as string | undefined,
    valueSuffix: args.value_suffix as string | undefined,
    aggregation: (args.aggregation as ChartConfig['aggregation']) || 'sum',
    metric: args.metric as string | undefined,
    label: args.label as string || args.title as string,
    format: args.format as string || 'number',
  };

  // Use lastQueryResult if available, otherwise use full dataset
  const sourceData = lastQueryResult || ctx.data;

  // Pre-aggregate so the chart renders efficiently
  const chartData = preAggregateForSpec(sourceData, chartType, config);

  const size = {
    w: chartType === 'kpi' ? 3 : chartType === 'table' ? 12 : (args.width as number) || 6,
    h: chartType === 'kpi' ? 1 : (args.height as number) || 3,
  };

  const spec: ChartSpec = {
    id,
    chartType,
    title: args.title as string,
    data: chartData,
    config: config as any,
    size,
    position: findNextPosition(ctx.widgets, size),
  };

  // Persist to Convex DB if available, also update local state
  if (ctx.addWidgetToDb) {
    try {
      await ctx.addWidgetToDb(spec);
    } catch (e) {
      console.error('Failed to persist widget:', e);
    }
  }
  ctx.dispatch({ type: 'ADD_WIDGET', payload: spec });
  lastQueryResult = null;

  return JSON.stringify({
    success: true,
    widget_id: id,
    message: `Created ${chartType} chart: "${args.title}"`,
  });
}

async function executeModifyChart(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const widgetId = args.widget_id as string;
  const widget = ctx.widgets.find((w) => w.id === widgetId);
  if (!widget) {
    return JSON.stringify({ error: `Widget "${widgetId}" not found. Available widgets: ${ctx.widgets.map(w => `${w.id} ("${w.title}")`).join(', ')}` });
  }

  const changes: Partial<ChartSpec> = {};
  const newType = (args.chart_type as ChartType) || widget.chartType;
  if (args.chart_type) changes.chartType = newType;
  if (args.title) changes.title = args.title as string;

  const newConfig = { ...widget.config };
  if (args.x_axis) newConfig.xAxis = args.x_axis as string;
  if (args.y_axis) newConfig.yAxis = args.y_axis as string | string[];
  if (args.colors) newConfig.colors = args.colors as string[];
  if (args.show_legend !== undefined) newConfig.showLegend = args.show_legend as boolean;

  if (args.x_axis || args.y_axis || args.colors || args.show_legend !== undefined) {
    changes.config = newConfig;
  }

  // Re-aggregate if data or config changed
  if (lastQueryResult || args.x_axis || args.y_axis || args.chart_type) {
    const sourceData = lastQueryResult || ctx.data;
    changes.data = preAggregateForSpec(sourceData, newType, changes.config || widget.config);
    lastQueryResult = null;
  }

  if (ctx.updateWidgetInDb) {
    try { await ctx.updateWidgetInDb(widgetId, changes); } catch (e) { console.error('Failed to update widget:', e); }
  }
  ctx.dispatch({ type: 'UPDATE_WIDGET', payload: { id: widgetId, changes } });

  return JSON.stringify({
    success: true,
    message: `Updated widget "${widget.title}"`,
  });
}

async function executeRemoveChart(args: Record<string, unknown>, ctx: ToolContext): Promise<string> {
  const widgetId = args.widget_id as string;
  const widget = ctx.widgets.find((w) => w.id === widgetId);
  if (!widget) {
    return JSON.stringify({ error: `Widget "${widgetId}" not found` });
  }

  if (ctx.removeWidgetFromDb) {
    try { await ctx.removeWidgetFromDb(widgetId); } catch (e) { console.error('Failed to remove widget:', e); }
  }
  ctx.dispatch({ type: 'REMOVE_WIDGET', payload: widgetId });

  return JSON.stringify({
    success: true,
    message: `Removed widget "${widget.title}"`,
  });
}

// ============================================================
// System prompt builder
// ============================================================

export function buildSystemPrompt(schema: DatasetSchema | null, widgets: ChartSpec[]): string {
  const schemaDesc = schema
    ? schema.columns.map((c) => {
        let desc = `  - ${c.name} (${c.type})`;
        if (c.stats) desc += ` [min: ${c.stats.min}, max: ${c.stats.max}, avg: ${c.stats.mean}]`;
        if (c.uniqueCount <= 20) desc += ` [${c.uniqueCount} unique values]`;
        return desc;
      }).join('\n')
    : '  No dataset loaded';

  const widgetDesc = widgets.length > 0
    ? widgets.map((w) => `  - id="${w.id}" type=${w.chartType} title="${w.title}"`).join('\n')
    : '  No widgets on the dashboard';

  return `You are an AI data analyst embedded in a business intelligence dashboard called NeuralBi.

DATASET SCHEMA:
${schemaDesc}

CURRENT DASHBOARD WIDGETS:
${widgetDesc}

AVAILABLE CHART TYPES: line, area, bar, horizontal-bar, pie, donut, scatter, heatmap, kpi, table, multi-line, stacked-bar, stacked-area, radar, radial-bar, treemap, funnel, gauge, waterfall, bubble, combo

INSTRUCTIONS:
- When asked to create a visualization, first use query_data to prepare the right data subset, then use create_chart.
- When asked a data question, use query_data to compute the answer, then explain clearly.
- When asked to modify a chart, use modify_chart with the widget_id from the dashboard state.
- When asked to remove a chart, use remove_chart.
- Always reference specific column names from the schema.
- Be conversational, precise, and proactive about suggesting useful visualizations.
- If a request is ambiguous, ask for clarification rather than guessing.
- Keep responses concise but informative.`;
}
