import type { ChartSpec, ChartType, DatasetSchema, ColumnInfo } from './types';
import { preAggregateForSpec } from './chart-data';
import { applyBentoLayout } from './bento-layout';

type Row = Record<string, unknown>;

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'minimax/minimax-m2.7';

/**
 * Sends dataset schema + sample to the AI and gets back a complete dashboard spec.
 */
export async function generateDashboard(
  schema: DatasetSchema,
  data: Row[],
  apiKey: string,
  onStatus?: (status: string) => void,
  userPrompt?: string,
): Promise<DashboardGenerationResult> {
  onStatus?.('Analyzing dataset structure...');

  const columnList = schema.columns.map((c) => {
    let info = `${c.name} (${c.type}, ${c.uniqueCount} unique)`;
    if (c.stats) info += ` [min: ${c.stats.min}, max: ${c.stats.max}, mean: ${c.stats.mean}]`;
    if (c.sampleValues.length > 0) info += ` samples: ${c.sampleValues.slice(0, 3).join(', ')}`;
    return info;
  }).join('\n');

  const sampleJson = JSON.stringify(data.slice(0, 5), null, 2);

  onStatus?.('AI is analyzing your data and designing charts...');

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'NeuralBi',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 10000,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: `You are a senior data analyst creating an executive dashboard. You must deeply understand the DOMAIN of the data — not just plot raw columns, but derive meaningful business insights.

OUTPUT FORMAT: A JSON object with two keys:
{
  "insights": "A 3-5 sentence executive summary of the dataset. Include key findings, notable patterns, anomalies, and actionable recommendations. Be specific with numbers. Write like a business analyst presenting to a CEO.",
  "charts": [ ...array of chart specs... ]
}

No markdown, no code fences. Output ONLY the JSON object.

CHART SPEC FORMAT:
{
  "chartType": "line|bar|area|pie|donut|scatter|horizontal-bar|kpi|table|multi-line|stacked-bar|stacked-area|radar|treemap|funnel|gauge|waterfall|bubble|combo",
  "title": "Business-Meaningful Title",
  "config": {
    "xAxis": "column_name",
    "yAxis": "column_name" OR ["col1", "col2"],
    "aggregation": "sum|avg|count|min|max",
    "colors": ["#hex"],
    "showLegend": true/false,
    "valuePrefix": "$",
    "valueSuffix": "%",
    "limit": 10
  }
}

YOUR APPROACH — Think like an analyst, not a programmer:
1. First, UNDERSTAND THE DOMAIN. Is this sales data? HR data? Scientific data? Financial data? Healthcare? The column names and values tell you the domain.
2. Create 4 KPIs that a decision-maker would care about MOST. Not just raw columns — think about what metrics matter:
   - For sales: Total Revenue, Avg Order Value, Top-selling Product, Conversion Rate
   - For HR: Headcount, Avg Salary, Turnover Rate, Avg Tenure
   - For scientific data: Sample Size, Key Measurement Avg, Range, Significant Count
   - KPI format: {"chartType":"kpi","title":"KPI Name","config":{"metric":"col","label":"Display Name","format":"number|currency|percent","aggregation":"sum|avg|count"}}
3. Create COMPARISON charts — don't just show one metric. Compare:
   - Revenue vs Cost, Actual vs Target, This Period vs Last
   - Use multi-line, combo, or stacked charts for comparisons
4. Create RATIO/DERIVED charts — look for relationships:
   - If there's price and quantity → show Revenue (price × quantity) distribution
   - If there's revenue and orders → show Average Order Value by category
   - If there's success/failure → show Success Rate %
   - If there's date + metric → show Growth Rate / Trend
5. Create DISTRIBUTION charts — understand the spread:
   - How is the data distributed across categories?
   - Are there outliers? Show them.
   - What's the concentration? (Pareto/80-20 analysis)
6. Create CORRELATION charts — find relationships:
   - Which numeric columns move together?
   - Does category X affect metric Y?
7. Include a DATA TABLE at the end.
8. Use EXACT column names from the schema.
9. Vary chart types — use at least 5 different types across your 10-15 charts.
10. Colors: #ffffff, #3b82f6, #10b981, #f59e0b, #f43f5e, #8b5cf6, #06b6d4, #ec4899.
11. Titles should be BUSINESS questions, not technical: "Which items drive the most revenue?" not "item_name by price"`,
        },
        {
          role: 'user',
          content: `Analyze this dataset and create a comprehensive dashboard:

${schema.rowCount} rows, ${schema.columns.length} columns.

COLUMNS:
${columnList}

SAMPLE DATA:
${sampleJson}
${userPrompt ? `\nUSER REQUEST: ${userPrompt}\nPrioritize charts and insights that address this request while still providing a comprehensive dashboard.\n` : ''}
Think about what domain this data represents, what a decision-maker would want to see, and what derived insights (ratios, comparisons, trends) would be most valuable. Output the JSON:`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI API error (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from AI');

  onStatus?.('Parsing AI response and building charts...');

  const { charts: specs, insights } = parseAIResponse(content);
  const hydrated = hydrateCharts(specs, data, schema);

  return { charts: hydrated, insights } as any;
}

export interface DashboardGenerationResult {
  charts: ChartSpec[];
  insights: string | null;
}

function parseAIResponse(content: string): { charts: any[]; insights: string | null } {
  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  // Try to parse as { insights, charts } object first
  try {
    const objStart = cleaned.indexOf('{');
    const objEnd = cleaned.lastIndexOf('}');
    if (objStart !== -1 && objEnd !== -1) {
      const obj = JSON.parse(cleaned.slice(objStart, objEnd + 1));
      if (obj.charts && Array.isArray(obj.charts)) {
        return { charts: obj.charts, insights: obj.insights || null };
      }
    }
  } catch {
    // Fall through to array parsing
  }

  // Fallback: parse as raw array
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('AI did not return valid JSON');

  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    if (!Array.isArray(parsed)) throw new Error('Not an array');
    return { charts: parsed, insights: null };
  } catch (e) {
    throw new Error(`Failed to parse AI JSON: ${e}`);
  }
}

function hydrateCharts(specs: any[], allData: Row[], schema: DatasetSchema): ChartSpec[] {
  const colNames = new Set(schema.columns.map((c) => c.name));
  const results: ChartSpec[] = [];
  let kpiIndex = 0;
  let chartIndex = 0;

  for (const raw of specs) {
    try {
      const chartType = raw.chartType as ChartType;
      const config = raw.config || {};

      // Fix column references
      if (config.xAxis && !colNames.has(config.xAxis)) {
        const match = schema.columns.find((c) => c.name.toLowerCase() === config.xAxis.toLowerCase());
        if (match) config.xAxis = match.name;
        else continue;
      }

      const id = chartType === 'kpi'
        ? `kpi-${kpiIndex++}-${Date.now()}`
        : `chart-${chartIndex++}-${Date.now()}`;

      const finalConfig = chartType === 'kpi'
        ? {
            ...config,
            metric: config.metric || (Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis),
            label: config.label || raw.title,
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

      // Pre-aggregate so widgets don't process full dataset on every render
      const chartData = preAggregateForSpec(allData, chartType, finalConfig);

      if (chartType === 'kpi') {
        results.push({
          id,
          chartType,
          title: raw.title || 'KPI',
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
        title: raw.title || `Chart ${chartIndex}`,
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

/**
 * Comprehensive fallback — no AI, but generates a full dashboard.
 * All data is pre-aggregated so widgets don't re-process on every render.
 */
export function generateDashboardFallback(schema: DatasetSchema, data: Row[]): DashboardGenerationResult {
  const specs: { chartType: ChartType; title: string; config: any; size: { w: number; h: number }; isKpi?: boolean }[] = [];
  const numericCols = schema.columns.filter((c) => c.type === 'number');
  const dateCols = schema.columns.filter((c) => c.type === 'date');
  const catCols = schema.columns.filter((c) => c.type === 'string' && c.uniqueCount > 1 && c.uniqueCount <= 20);

  const prettify = (s: string) => s.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // KPIs
  numericCols.slice(0, 4).forEach((col) => {
    const isMoney = /revenue|sales|price|cost|amount|income|profit|salary|budget/i.test(col.name);
    specs.push({
      chartType: 'kpi', title: prettify(col.name), isKpi: true,
      config: { metric: col.name, label: prettify(col.name), format: isMoney ? 'currency' : 'number', aggregation: isMoney ? 'sum' : 'avg' },
      size: { w: 3, h: 1 },
    });
  });
  if (numericCols.length < 4) {
    specs.push({
      chartType: 'kpi', title: 'Total Records', isKpi: true,
      config: { metric: schema.columns[0].name, label: 'Total Records', format: 'number', aggregation: 'count' },
      size: { w: 3, h: 1 },
    });
  }

  // Date trends
  if (dateCols.length > 0) {
    const d = dateCols[0].name;
    specs.push({ chartType: 'line', title: `Records Over ${prettify(d)}`, config: { xAxis: d, aggregation: 'count', colors: ['#ffffff'] }, size: { w: 6, h: 2 } });
    if (numericCols.length > 0)
      specs.push({ chartType: 'area', title: `Avg ${prettify(numericCols[0].name)} Over Time`, config: { xAxis: d, yAxis: numericCols[0].name, aggregation: 'avg', colors: ['#10b981'] }, size: { w: 6, h: 2 } });
    if (numericCols.length >= 2)
      specs.push({ chartType: 'multi-line', title: `Metric Trends Over ${prettify(d)}`, config: { xAxis: d, yAxis: numericCols.slice(0, 3).map((c) => c.name), aggregation: 'avg', showLegend: true, colors: ['#3b82f6', '#f59e0b', '#f43f5e'] }, size: { w: 12, h: 2 } });
  }

  // Categorical
  for (const cat of catCols.slice(0, 2)) {
    specs.push({ chartType: 'bar', title: `Count by ${prettify(cat.name)}`, config: { xAxis: cat.name, aggregation: 'count', colors: ['#3b82f6'] }, size: { w: 6, h: 2 } });
    if (numericCols.length > 0)
      specs.push({ chartType: 'horizontal-bar', title: `Avg ${prettify(numericCols[0].name)} by ${prettify(cat.name)}`, config: { xAxis: cat.name, yAxis: numericCols[0].name, aggregation: 'avg', colors: ['#f59e0b'] }, size: { w: 6, h: 2 } });
  }

  // Pie / Donut
  const pieCat = catCols.find((c) => c.uniqueCount <= 8) || catCols[0];
  if (pieCat) {
    specs.push({ chartType: 'pie', title: `${prettify(pieCat.name)} Distribution`, config: { xAxis: pieCat.name, aggregation: 'count', colors: ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899', '#ffffff'] }, size: { w: 6, h: 2 } });
    if (numericCols.length > 0)
      specs.push({ chartType: 'donut', title: `${prettify(numericCols[0].name)} by ${prettify(pieCat.name)}`, config: { xAxis: pieCat.name, yAxis: numericCols[0].name, aggregation: 'sum', colors: ['#06b6d4', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#3b82f6'] }, size: { w: 6, h: 2 } });
  }

  // Scatter
  if (numericCols.length >= 2)
    specs.push({ chartType: 'scatter', title: `${prettify(numericCols[0].name)} vs ${prettify(numericCols[1].name)}`, config: { xAxis: numericCols[0].name, yAxis: numericCols[1].name, colors: ['#8b5cf6'] }, size: { w: 6, h: 2 } });

  // Heatmap
  if (catCols.length > 0 && numericCols.length >= 2)
    specs.push({ chartType: 'heatmap', title: `Metrics Heatmap by ${prettify(catCols[0].name)}`, config: { xAxis: catCols[0].name, yAxis: numericCols.slice(0, 4).map((c) => c.name), aggregation: 'avg' }, size: { w: 12, h: 2 } });

  // Stacked bar
  if (catCols.length > 0 && numericCols.length >= 2)
    specs.push({ chartType: 'stacked-bar', title: `${prettify(catCols[0].name)} Breakdown`, config: { xAxis: catCols[0].name, yAxis: numericCols.slice(0, 3).map((c) => c.name), aggregation: 'avg', showLegend: true, colors: ['#3b82f6', '#10b981', '#f43f5e'] }, size: { w: 12, h: 2 } });

  // Radar — compare metrics across categories
  if (catCols.length > 0 && numericCols.length >= 2)
    specs.push({ chartType: 'radar', title: `${prettify(catCols[0].name)} Radar`, config: { xAxis: catCols[0].name, yAxis: numericCols.slice(0, 4).map((c) => c.name), aggregation: 'avg', showLegend: true, colors: ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e'] }, size: { w: 6, h: 2 } });

  // Treemap — proportional view
  if (catCols.length > 0 && numericCols.length > 0)
    specs.push({ chartType: 'treemap', title: `${prettify(numericCols[0].name)} Treemap`, config: { xAxis: catCols[0].name, yAxis: numericCols[0].name, aggregation: 'sum' }, size: { w: 6, h: 2 } });

  // Funnel
  if (catCols.length > 0)
    specs.push({ chartType: 'funnel', title: `${prettify(catCols[0].name)} Funnel`, config: { xAxis: catCols[0].name, aggregation: 'count', colors: ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899'] }, size: { w: 6, h: 2 } });

  // Gauge — for a key metric
  if (numericCols.length > 0)
    specs.push({ chartType: 'gauge', title: `${prettify(numericCols[0].name)} Gauge`, config: { metric: numericCols[0].name, label: prettify(numericCols[0].name) } as any, size: { w: 6, h: 2 } });

  // Combo chart — bar + line
  if (catCols.length > 0 && numericCols.length >= 2)
    specs.push({ chartType: 'combo', title: `${prettify(catCols[0].name)} Combo`, config: { xAxis: catCols[0].name, yAxis: numericCols.slice(0, 2).map((c) => c.name), aggregation: 'avg', showLegend: true, colors: ['#3b82f6', '#f43f5e'] }, size: { w: 12, h: 2 } });

  // Bubble — 3 numeric dimensions
  if (numericCols.length >= 3)
    specs.push({ chartType: 'bubble', title: `${prettify(numericCols[0].name)} / ${prettify(numericCols[1].name)} / ${prettify(numericCols[2].name)}`, config: { xAxis: numericCols[0].name, yAxis: [numericCols[1].name, numericCols[2].name], colors: ['#06b6d4'] }, size: { w: 6, h: 2 } });

  // Waterfall
  if (catCols.length > 0 && numericCols.length > 0)
    specs.push({ chartType: 'waterfall', title: `${prettify(numericCols[0].name)} Waterfall`, config: { xAxis: catCols[0].name, yAxis: numericCols[0].name, aggregation: 'sum' }, size: { w: 12, h: 2 } });

  // Table
  specs.push({ chartType: 'table', title: 'Data Explorer', config: { limit: 100 }, size: { w: 12, h: 3 } });

  // === Pre-aggregate and build final ChartSpec[] ===
  const results: ChartSpec[] = [];
  let kpiIdx = 0;
  let chartIdx = 0;

  for (const s of specs) {
    const preAgg = preAggregateForSpec(data, s.chartType, s.config);
    const id = s.isKpi ? `kpi-${kpiIdx}-${Date.now()}` : `chart-${chartIdx}-${Date.now()}`;

    results.push({
      id,
      chartType: s.chartType,
      title: s.title,
      data: preAgg,
      config: s.config,
      position: s.isKpi ? { x: (kpiIdx % 4) * 3, y: 0 } : undefined as any,
      size: s.size,
    });

    if (s.isKpi) kpiIdx++; else chartIdx++;
  }

  return { charts: applyBentoLayout(results), insights: null };
}
