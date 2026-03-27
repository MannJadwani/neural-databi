import type { DatasetSchema } from './types';
import * as qe from './query-engine';

type Row = Record<string, unknown>;

export interface DatasetInsight {
  title: string;
  description: string;
  category: 'overview' | 'trend' | 'distribution' | 'correlation' | 'outlier';
}

export interface AutoAnalysisResult {
  summary: string;
  insights: DatasetInsight[];
  aiInsights: string | null;
  status: 'pending' | 'analyzing' | 'done' | 'error';
}

// ============================================================
// Deterministic analysis (no LLM — runs instantly)
// ============================================================

export function runDeterministicAnalysis(schema: DatasetSchema, data: Row[]): AutoAnalysisResult {
  const insights: DatasetInsight[] = [];

  // Overview
  const numericCols = schema.columns.filter((c) => c.type === 'number');
  const dateCols = schema.columns.filter((c) => c.type === 'date');
  const catCols = schema.columns.filter((c) => c.type === 'string' && c.uniqueCount <= 20);

  insights.push({
    title: 'Dataset Overview',
    description: `${schema.rowCount.toLocaleString()} rows across ${schema.columns.length} columns: ${numericCols.length} numeric, ${dateCols.length} date, ${catCols.length} categorical.`,
    category: 'overview',
  });

  // Numeric column insights
  for (const col of numericCols) {
    if (!col.stats) continue;
    const range = col.stats.max! - col.stats.min!;
    const cv = col.stats.mean ? (Math.sqrt(range) / col.stats.mean) : 0;

    if (cv > 1) {
      insights.push({
        title: `High variance in ${col.name}`,
        description: `"${col.name}" ranges from ${col.stats.min!.toLocaleString()} to ${col.stats.max!.toLocaleString()} (mean: ${col.stats.mean!.toLocaleString()}), suggesting significant variation.`,
        category: 'distribution',
      });
    }

    // Top value detection
    const values = data.map((r) => Number(r[col.name]) || 0);
    const sorted = [...values].sort((a, b) => b - a);
    if (sorted[0] > col.stats.mean! * 3) {
      insights.push({
        title: `Outlier detected in ${col.name}`,
        description: `The maximum value (${sorted[0].toLocaleString()}) is more than 3x the average (${col.stats.mean!.toLocaleString()}).`,
        category: 'outlier',
      });
    }
  }

  // Categorical distribution
  for (const col of catCols) {
    if (col.uniqueCount >= 2 && col.uniqueCount <= 10) {
      const groups = qe.aggregateRows(data, col.name, [{ column: col.name, fn: 'count', alias: 'count' }]);
      const sorted = qe.sortRows(groups, 'count', 'desc');
      const top = sorted[0];
      if (top) {
        insights.push({
          title: `${col.name} distribution`,
          description: `"${top[col.name]}" is the most frequent value with ${top.count} occurrences out of ${col.uniqueCount} categories.`,
          category: 'distribution',
        });
      }
    }
  }

  // Correlation hints (simple: check if two numeric columns trend together)
  if (numericCols.length >= 2) {
    const c1 = numericCols[0];
    const c2 = numericCols[1];
    const v1 = data.map((r) => Number(r[c1.name]) || 0);
    const v2 = data.map((r) => Number(r[c2.name]) || 0);
    const corr = pearsonCorrelation(v1, v2);
    if (Math.abs(corr) > 0.7) {
      insights.push({
        title: `${corr > 0 ? 'Positive' : 'Negative'} correlation`,
        description: `"${c1.name}" and "${c2.name}" show a ${corr > 0 ? 'positive' : 'negative'} correlation (r=${corr.toFixed(2)}).`,
        category: 'correlation',
      });
    }
  }

  const summary = `This dataset contains ${schema.rowCount.toLocaleString()} rows with ${schema.columns.length} columns. ${numericCols.length > 0 ? `Key metrics include ${numericCols.slice(0, 3).map((c) => c.name).join(', ')}.` : ''} ${dateCols.length > 0 ? `Time data available in ${dateCols.map((c) => c.name).join(', ')}.` : ''}`;

  return {
    summary,
    insights,
    aiInsights: null,
    status: 'done',
  };
}

// ============================================================
// AI-powered analysis (calls OpenRouter)
// ============================================================

export async function runAIAnalysis(
  schema: DatasetSchema,
  data: Row[],
  apiKey: string
): Promise<string> {
  const description = qe.describeData(data.slice(0, 100));
  const sampleJson = JSON.stringify(data.slice(0, 5), null, 2);

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
    },
    body: JSON.stringify({
      model: 'minimax/minimax-m2.7',
      max_tokens: 16000,
      messages: [
        {
          role: 'system',
          content: 'You are a data analyst. Analyze the dataset and provide 3-5 key insights. Be specific with numbers. Format as bullet points.',
        },
        {
          role: 'user',
          content: `Analyze this dataset:\n\nSchema:\n${description}\n\nSample rows:\n${sampleJson}\n\nProvide key insights, patterns, and recommended visualizations.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content || 'No insights generated.';
}

// ============================================================
// Helpers
// ============================================================

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}
