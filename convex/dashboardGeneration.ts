import { applyBentoLayout } from '../src/lib/bento-layout';
import { preAggregateForSpec } from '../src/lib/chart-data';
import type { ChartSpec, ChartType, DatasetSchema } from '../src/lib/types';
import { generateDashboardFallback } from '../src/lib/ai-dashboard-generator';

type Row = Record<string, unknown>;

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'minimax/minimax-m2.7';

export type GeneratedDashboard = {
  charts: ChartSpec[];
  insights: string | null;
  mode: 'ai' | 'fallback';
};

export async function generateDashboardForImport(args: {
  schema: DatasetSchema;
  data: Row[];
  prompt?: string;
  referer: string;
}): Promise<GeneratedDashboard> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) {
    const fallback = generateDashboardFallback(args.schema, args.data);
    return { ...fallback, mode: 'fallback' };
  }

  try {
    const aiResult = await generateWithAi({
      schema: args.schema,
      data: args.data,
      apiKey,
      prompt: args.prompt,
      referer: args.referer,
    });
    return { ...aiResult, mode: 'ai' };
  } catch {
    const fallback = generateDashboardFallback(args.schema, args.data);
    return { ...fallback, mode: 'fallback' };
  }
}

async function generateWithAi(args: {
  schema: DatasetSchema;
  data: Row[];
  apiKey: string;
  prompt?: string;
  referer: string;
}): Promise<{ charts: ChartSpec[]; insights: string | null }> {
  const columnList = args.schema.columns
    .map((column) => {
      let info = `${column.name} (${column.type}, ${column.uniqueCount} unique)`;
      if (column.stats) {
        info += ` [min: ${column.stats.min}, max: ${column.stats.max}, mean: ${column.stats.mean}]`;
      }
      if (column.sampleValues.length > 0) {
        info += ` samples: ${column.sampleValues.slice(0, 3).join(', ')}`;
      }
      return info;
    })
    .join('\n');

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${args.apiKey}`,
      'HTTP-Referer': args.referer,
      'X-Title': 'NeuralBi Import API',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 10000,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: `You are a senior data analyst creating an executive dashboard. You must deeply understand the DOMAIN of the data and produce a dashboard that highlights meaningful business insights.\n\nOUTPUT FORMAT: A JSON object with two keys: {\n  "insights": "A 3-5 sentence executive summary with specific findings.",\n  "charts": [ ...chart specs... ]\n}\n\nNo markdown, no code fences. Output ONLY valid JSON.\n\nCHART SPEC FORMAT:\n{\n  "chartType": "line|bar|area|pie|donut|scatter|horizontal-bar|kpi|table|multi-line|stacked-bar|stacked-area|radar|treemap|funnel|gauge|waterfall|bubble|combo",\n  "title": "Business-meaningful title",\n  "config": {\n    "xAxis": "column_name",\n    "yAxis": "column_name" OR ["col1", "col2"],\n    "aggregation": "sum|avg|count|min|max",\n    "colors": ["#hex"],\n    "showLegend": true,\n    "valuePrefix": "$",\n    "valueSuffix": "%",\n    "limit": 10\n  }\n}\n\nUse exact column names. Include 4 KPIs, a mix of chart types, and a data table.`,
        },
        {
          role: 'user',
          content: `Analyze this dataset and create a comprehensive dashboard.\n\n${args.schema.rowCount} rows, ${args.schema.columns.length} columns.\n\nCOLUMNS:\n${columnList}\n\nSAMPLE DATA:\n${JSON.stringify(args.data.slice(0, 5), null, 2)}${args.prompt ? `\n\nUSER REQUEST: ${args.prompt}` : ''}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI API error (${response.status}): ${body.slice(0, 200)}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from AI');

  const parsed = parseAiResponse(content);
  return {
    insights: parsed.insights,
    charts: hydrateCharts(parsed.charts, args.data, args.schema),
  };
}

function parseAiResponse(content: string): { charts: any[]; insights: string | null } {
  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    const objectStart = cleaned.indexOf('{');
    const objectEnd = cleaned.lastIndexOf('}');
    if (objectStart !== -1 && objectEnd !== -1) {
      const parsed = JSON.parse(cleaned.slice(objectStart, objectEnd + 1));
      if (Array.isArray(parsed.charts)) {
        return { charts: parsed.charts, insights: parsed.insights || null };
      }
    }
  } catch {
    // Fall through to array parsing.
  }

  const arrayStart = cleaned.indexOf('[');
  const arrayEnd = cleaned.lastIndexOf(']');
  if (arrayStart === -1 || arrayEnd === -1) {
    throw new Error('AI did not return valid JSON');
  }

  const parsed = JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1));
  if (!Array.isArray(parsed)) {
    throw new Error('AI did not return a chart array');
  }
  return { charts: parsed, insights: null };
}

function hydrateCharts(specs: any[], data: Row[], schema: DatasetSchema): ChartSpec[] {
  const columnNames = new Set(schema.columns.map((column) => column.name));
  const results: ChartSpec[] = [];
  let kpiIndex = 0;
  let chartIndex = 0;

  for (const rawSpec of specs) {
    try {
      const chartType = rawSpec.chartType as ChartType;
      const config = rawSpec.config || {};

      if (config.xAxis && !columnNames.has(config.xAxis)) {
        const match = schema.columns.find((column) => column.name.toLowerCase() === String(config.xAxis).toLowerCase());
        if (!match) continue;
        config.xAxis = match.name;
      }

      const id = chartType === 'kpi'
        ? `kpi-${kpiIndex++}-${Date.now()}`
        : `chart-${chartIndex++}-${Date.now()}`;

      const finalConfig = chartType === 'kpi'
        ? {
            ...config,
            metric: config.metric || (Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis),
            label: config.label || rawSpec.title,
            format: config.format || 'number',
          }
        : {
            xAxis: config.xAxis,
            yAxis: config.yAxis,
            aggregation: config.aggregation || 'sum',
            colors: config.colors || ['#ffffff', '#3b82f6', '#10b981', '#f59e0b'],
            showLegend: config.showLegend ?? (Array.isArray(config.yAxis) && config.yAxis.length > 1),
            valuePrefix: config.valuePrefix,
            valueSuffix: config.valueSuffix,
            limit: config.limit,
          };

      const chartData = preAggregateForSpec(data, chartType, finalConfig);

      if (chartType === 'kpi') {
        results.push({
          id,
          chartType,
          title: rawSpec.title || 'KPI',
          data: chartData,
          config: finalConfig,
          position: { x: ((kpiIndex - 1) % 4) * 3, y: 0 },
          size: { w: 3, h: 1 },
        });
        continue;
      }

      results.push({
        id,
        chartType,
        title: rawSpec.title || `Chart ${chartIndex}`,
        data: chartData,
        config: finalConfig,
        size: chartType === 'table' ? { w: 12, h: 3 } : { w: 6, h: 2 },
      });
    } catch {
      continue;
    }
  }

  return applyBentoLayout(results);
}
