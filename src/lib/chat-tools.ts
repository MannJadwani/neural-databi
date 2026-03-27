/**
 * Chat-specific AI tool definitions and execution.
 * Unlike ai-tools.ts (which dispatches to a dashboard), these return
 * ChartSpec artifacts that get rendered inline in the chat.
 */
import type { ChartSpec, ChartType, ChatArtifact, DatasetSchema } from './types';
import { preAggregateForSpec } from './chart-data';
import * as qe from './query-engine';

type Row = Record<string, unknown>;

// ============================================================
// Tool definitions (same schema as dashboard tools, tweaked descriptions)
// ============================================================

export const CHAT_TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'query_data',
      description: 'Query and transform the dataset. Use this to filter, sort, aggregate, or compute derived columns before creating charts or answering questions.',
      parameters: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['filter', 'aggregate', 'sort', 'top_n', 'compute', 'describe'],
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
          },
          group_by: { type: 'string' },
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
          },
          sort_column: { type: 'string' },
          sort_order: { type: 'string', enum: ['asc', 'desc'] },
          limit: { type: 'number' },
          expression: { type: 'string' },
          alias: { type: 'string' },
        },
        required: ['operation'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_chart',
      description: 'Create a chart artifact that will be shown inline in the conversation. Call query_data first if you need to transform the data.',
      parameters: {
        type: 'object',
        properties: {
          chart_type: {
            type: 'string',
            enum: ['line', 'area', 'bar', 'horizontal-bar', 'pie', 'donut', 'scatter', 'heatmap', 'kpi', 'table', 'multi-line', 'stacked-bar', 'stacked-area', 'radar', 'radial-bar', 'treemap', 'funnel', 'gauge', 'waterfall', 'bubble', 'combo'],
          },
          title: { type: 'string' },
          x_axis: { type: 'string' },
          y_axis: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
          aggregation: { type: 'string', enum: ['sum', 'avg', 'count', 'min', 'max'] },
          colors: { type: 'array', items: { type: 'string' } },
          show_legend: { type: 'boolean' },
          value_prefix: { type: 'string' },
          value_suffix: { type: 'string' },
          metric: { type: 'string', description: 'For KPI: the column to aggregate' },
          label: { type: 'string', description: 'For KPI: display label' },
          format: { type: 'string', enum: ['number', 'currency', 'percent'], description: 'For KPI: number format' },
        },
        required: ['chart_type', 'title'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'modify_chart',
      description: 'Modify an existing chart artifact in the conversation.',
      parameters: {
        type: 'object',
        properties: {
          artifact_id: { type: 'string', description: 'ID of the artifact to modify' },
          chart_type: { type: 'string', enum: ['line', 'area', 'bar', 'horizontal-bar', 'pie', 'donut', 'scatter', 'heatmap', 'kpi', 'table', 'multi-line', 'stacked-bar', 'stacked-area', 'radar', 'radial-bar', 'treemap', 'funnel', 'gauge', 'waterfall', 'bubble', 'combo'] },
          title: { type: 'string' },
          x_axis: { type: 'string' },
          y_axis: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
          colors: { type: 'array', items: { type: 'string' } },
          show_legend: { type: 'boolean' },
        },
        required: ['artifact_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'remove_chart',
      description: 'Remove a chart artifact from the conversation.',
      parameters: {
        type: 'object',
        properties: {
          artifact_id: { type: 'string', description: 'ID of the artifact to remove' },
        },
        required: ['artifact_id'],
      },
    },
  },
];

// ============================================================
// Tool context and executor
// ============================================================

export interface ChatToolContext {
  data: Row[];
  schema: DatasetSchema;
  artifacts: ChatArtifact[];
}

// Each chat session has its own query result buffer
let lastQueryResult: Row[] | null = null;

export function resetQueryResult() {
  lastQueryResult = null;
}

export interface ChatToolResult {
  message: string;
  artifact?: ChatArtifact;      // New artifact produced by create_chart
  updatedArtifact?: ChatArtifact; // Modified artifact
  removedArtifactId?: string;
}

export function executeChatToolCall(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ChatToolContext,
): ChatToolResult {
  switch (toolName) {
    case 'query_data':
      return { message: executeQueryData(args, ctx) };
    case 'create_chart':
      return executeCreateChart(args, ctx);
    case 'modify_chart':
      return executeModifyChart(args, ctx);
    case 'remove_chart':
      return executeRemoveChart(args, ctx);
    default:
      return { message: JSON.stringify({ error: `Unknown tool: ${toolName}` }) };
  }
}

function executeQueryData(args: Record<string, unknown>, ctx: ChatToolContext): string {
  let result = [...ctx.data];
  const op = args.operation as string;

  try {
    switch (op) {
      case 'filter':
        result = qe.filterRows(result, (args.filter_conditions as any[]) || []);
        break;
      case 'aggregate':
        result = qe.aggregateRows(result, args.group_by as string, (args.metrics as any[]) || []);
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

function executeCreateChart(args: Record<string, unknown>, ctx: ChatToolContext): ChatToolResult {
  const chartType = args.chart_type as ChartType;
  const id = `artifact-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const config: any = {
    xAxis: args.x_axis as string | undefined,
    yAxis: args.y_axis as string | string[] | undefined,
    colors: args.colors as string[] | undefined,
    showLegend: args.show_legend as boolean | undefined,
    valuePrefix: args.value_prefix as string | undefined,
    valueSuffix: args.value_suffix as string | undefined,
    aggregation: (args.aggregation as string) || 'sum',
  };

  // KPI-specific
  if (chartType === 'kpi') {
    config.metric = args.metric as string || (Array.isArray(args.y_axis) ? (args.y_axis as string[])[0] : args.y_axis as string);
    config.label = args.label as string || args.title as string;
    config.format = args.format as string || 'number';
  }

  const sourceData = lastQueryResult || ctx.data;
  const chartData = preAggregateForSpec(sourceData, chartType, config);

  const spec: ChartSpec = {
    id,
    chartType,
    title: args.title as string,
    data: chartData,
    config,
    size: { w: 6, h: 3 },
  };

  lastQueryResult = null;

  const artifact: ChatArtifact = { id, type: 'chart', spec };

  return {
    message: JSON.stringify({
      success: true,
      artifact_id: id,
      message: `Created ${chartType} chart: "${args.title}"`,
    }),
    artifact,
  };
}

function executeModifyChart(args: Record<string, unknown>, ctx: ChatToolContext): ChatToolResult {
  const artifactId = args.artifact_id as string;
  const existing = ctx.artifacts.find((a) => a.id === artifactId);
  if (!existing) {
    return {
      message: JSON.stringify({
        error: `Artifact "${artifactId}" not found. Available: ${ctx.artifacts.map((a) => `${a.id} ("${a.spec.title}")`).join(', ')}`,
      }),
    };
  }

  const spec = { ...existing.spec };
  const newType = (args.chart_type as ChartType) || spec.chartType;
  if (args.chart_type) spec.chartType = newType;
  if (args.title) spec.title = args.title as string;

  const newConfig = { ...spec.config };
  if (args.x_axis) newConfig.xAxis = args.x_axis as string;
  if (args.y_axis) newConfig.yAxis = args.y_axis as string | string[];
  if (args.colors) newConfig.colors = args.colors as string[];
  if (args.show_legend !== undefined) newConfig.showLegend = args.show_legend as boolean;

  spec.config = newConfig;

  if (lastQueryResult || args.x_axis || args.y_axis || args.chart_type) {
    const sourceData = lastQueryResult || ctx.data;
    spec.data = preAggregateForSpec(sourceData, newType, newConfig);
    lastQueryResult = null;
  }

  const updatedArtifact: ChatArtifact = { id: artifactId, type: 'chart', spec };

  return {
    message: JSON.stringify({ success: true, message: `Updated chart "${spec.title}"` }),
    updatedArtifact,
  };
}

function executeRemoveChart(args: Record<string, unknown>, ctx: ChatToolContext): ChatToolResult {
  const artifactId = args.artifact_id as string;
  const existing = ctx.artifacts.find((a) => a.id === artifactId);
  if (!existing) {
    return { message: JSON.stringify({ error: `Artifact "${artifactId}" not found` }) };
  }
  return {
    message: JSON.stringify({ success: true, message: `Removed chart "${existing.spec.title}"` }),
    removedArtifactId: artifactId,
  };
}

// ============================================================
// System prompt for chat context
// ============================================================

export function buildChatSystemPrompt(schema: DatasetSchema | null, artifacts: ChatArtifact[]): string {
  const schemaDesc = schema
    ? schema.columns.map((c) => {
        let desc = `  - ${c.name} (${c.type})`;
        if (c.stats) desc += ` [min: ${c.stats.min}, max: ${c.stats.max}, avg: ${c.stats.mean}]`;
        if (c.uniqueCount <= 20) desc += ` [${c.uniqueCount} unique values]`;
        return desc;
      }).join('\n')
    : '  No dataset loaded';

  const artifactDesc = artifacts.length > 0
    ? artifacts.map((a) => `  - artifact_id="${a.id}" type=${a.spec.chartType} title="${a.spec.title}"`).join('\n')
    : '  No charts created yet';

  return `You are an AI data analyst in NeuralBi, a business intelligence platform. You are chatting with the user about their dataset.

DATASET SCHEMA (${schema?.rowCount ?? 0} rows):
${schemaDesc}

CHART ARTIFACTS IN CONVERSATION:
${artifactDesc}

AVAILABLE CHART TYPES: line, area, bar, horizontal-bar, pie, donut, scatter, heatmap, kpi, table, multi-line, stacked-bar, stacked-area, radar, radial-bar, treemap, funnel, gauge, waterfall, bubble, combo

INSTRUCTIONS:
- When asked to create a chart/visualization, first use query_data to prepare data if needed, then use create_chart. The chart will appear inline in the conversation.
- When asked a data question, use query_data to compute the answer, then explain clearly with specific numbers.
- When asked to modify an existing chart, use modify_chart with the artifact_id.
- When asked to remove a chart, use remove_chart with the artifact_id.
- Always reference exact column names from the schema.
- Be conversational, precise, and proactive. Suggest interesting patterns you notice.
- If a request is ambiguous, ask for clarification.
- Keep responses concise but informative. Use numbers and specifics.`;
}
