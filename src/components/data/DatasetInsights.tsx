import { useState, useEffect } from 'react';
import { Sparkles, Loader2, TrendingUp, BarChart3, GitBranch, AlertTriangle, Info } from 'lucide-react';
import type { AutoAnalysisResult, DatasetInsight } from '../../lib/auto-analyze';
import { runDeterministicAnalysis, runAIAnalysis } from '../../lib/auto-analyze';
import type { DatasetSchema } from '../../lib/types';
import { cn } from '../../lib/utils';

type Row = Record<string, unknown>;

const CATEGORY_ICONS: Record<string, typeof Info> = {
  overview: Info,
  trend: TrendingUp,
  distribution: BarChart3,
  correlation: GitBranch,
  outlier: AlertTriangle,
};

const CATEGORY_COLORS: Record<string, string> = {
  overview: 'text-blue-400 bg-blue-500/10',
  trend: 'text-emerald-400 bg-emerald-500/10',
  distribution: 'text-purple-400 bg-purple-500/10',
  correlation: 'text-amber-400 bg-amber-500/10',
  outlier: 'text-rose-400 bg-rose-500/10',
};

interface DatasetInsightsProps {
  schema: DatasetSchema;
  data: Row[];
}

export function DatasetInsights({ schema, data }: DatasetInsightsProps) {
  const [analysis, setAnalysis] = useState<AutoAnalysisResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const result = runDeterministicAnalysis(schema, data);
    setAnalysis(result);

    // Try AI analysis if key is available
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (apiKey) {
      setAiLoading(true);
      runAIAnalysis(schema, data, apiKey)
        .then((aiInsights) => {
          setAnalysis((prev) => prev ? { ...prev, aiInsights } : prev);
        })
        .catch(() => {})
        .finally(() => setAiLoading(false));
    }
  }, [schema, data]);

  if (!analysis) return null;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-brand-surface border border-brand-border p-4">
        <p className="text-sm text-zinc-300">{analysis.summary}</p>
      </div>

      {/* Deterministic insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {analysis.insights.map((insight, i) => {
          const Icon = CATEGORY_ICONS[insight.category] || Info;
          const color = CATEGORY_COLORS[insight.category] || 'text-zinc-400 bg-zinc-500/10';
          return (
            <div key={i} className="bg-brand-surface border border-brand-border p-3 flex gap-3">
              <div className={cn('w-7 h-7 flex items-center justify-center shrink-0', color)}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white mb-0.5">{insight.title}</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">{insight.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI insights */}
      {(aiLoading || analysis.aiInsights) && (
        <div className="bg-brand-surface border border-brand-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <h3 className="text-xs font-bold text-white uppercase tracking-widest">AI Analysis</h3>
            {aiLoading && <Loader2 className="w-3 h-3 text-zinc-500 animate-spin" />}
          </div>
          {analysis.aiInsights ? (
            <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{analysis.aiInsights}</p>
          ) : (
            <p className="text-xs text-zinc-600">Analyzing with AI...</p>
          )}
        </div>
      )}
    </div>
  );
}
