import { useState } from 'react';
import { FileSpreadsheet, Table2, ChevronRight, Sparkles, Database, ArrowRight } from 'lucide-react';
import type { UploadedDataset } from './DataUploader';
import type { VisualizationSuggestion, ChartSpec } from '../../lib/types';
import { ChartRenderer } from '../charts';
import { cn } from '../../lib/utils';

interface DataSourcesPanelProps {
  datasets: UploadedDataset[];
  onCreateDashboard: (dataset: UploadedDataset, selectedSuggestions: VisualizationSuggestion[]) => void;
}

function SchemaView({ dataset }: { dataset: UploadedDataset }) {
  return (
    <div className="space-y-2">
      {dataset.schema.columns.map((col) => (
        <div key={col.name} className="flex items-center justify-between p-2 bg-brand-bg border border-brand-border">
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-[9px] font-bold uppercase px-1.5 py-0.5 tracking-wider',
              col.type === 'number' ? 'bg-blue-500/20 text-blue-400' :
              col.type === 'date' ? 'bg-purple-500/20 text-purple-400' :
              col.type === 'boolean' ? 'bg-amber-500/20 text-amber-400' :
              'bg-zinc-500/20 text-zinc-400'
            )}>
              {col.type}
            </span>
            <span className="text-xs text-white">{col.name}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-zinc-500">
            <span>{col.uniqueCount} unique</span>
            {col.nullable && <span className="text-amber-600">nullable</span>}
            {col.stats && (
              <span>
                {col.stats.min?.toLocaleString()} – {col.stats.max?.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SuggestionPreview({ suggestion, dataset }: { suggestion: VisualizationSuggestion; dataset: UploadedDataset }) {
  const spec: ChartSpec = {
    id: `preview-${suggestion.chartType}-${suggestion.title}`,
    chartType: suggestion.chartType,
    title: suggestion.title,
    data: dataset.data.slice(0, 50),
    config: suggestion.config,
    size: { w: 6, h: 2 },
  };

  return (
    <div className="min-h-[200px]">
      <ChartRenderer spec={spec} />
    </div>
  );
}

function DatasetCard({
  dataset,
  onCreateDashboard,
}: {
  dataset: UploadedDataset;
  onCreateDashboard: (dataset: UploadedDataset, selected: VisualizationSuggestion[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<'schema' | 'suggestions'>('suggestions');
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(dataset.suggestions.filter((s) => s.confidence >= 0.7).map((_, i) => i))
  );

  const toggleSuggestion = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectedSuggestions = dataset.suggestions.filter((_, i) => selected.has(i));

  return (
    <div className="bg-brand-surface border border-brand-border">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
      >
        <FileSpreadsheet className="w-4 h-4 text-zinc-500 shrink-0" />
        <div className="flex-1 text-left min-w-0">
          <p className="text-xs font-bold text-white truncate">{dataset.fileName}</p>
          <p className="text-[10px] text-zinc-500">
            {dataset.schema.rowCount.toLocaleString()} rows • {dataset.schema.columns.length} columns • {(dataset.fileSize / 1024).toFixed(1)}KB
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase px-2 py-1 bg-emerald-500/20 text-emerald-400 tracking-wider">
            Ready
          </span>
          <ChevronRight className={cn('w-3 h-3 text-zinc-500 transition-transform', expanded && 'rotate-90')} />
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-brand-border">
          {/* Tabs */}
          <div className="flex border-b border-brand-border">
            <button
              onClick={() => setTab('suggestions')}
              className={cn(
                'flex-1 px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors',
                tab === 'suggestions' ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Sparkles className="w-3 h-3" /> Suggestions ({dataset.suggestions.length})
              </span>
            </button>
            <button
              onClick={() => setTab('schema')}
              className={cn(
                'flex-1 px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors',
                tab === 'schema' ? 'text-white border-b-2 border-white' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Table2 className="w-3 h-3" /> Schema
              </span>
            </button>
          </div>

          <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
            {tab === 'schema' && <SchemaView dataset={dataset} />}

            {tab === 'suggestions' && (
              <>
                {dataset.suggestions.map((s, i) => (
                  <div key={i} className="border border-brand-border">
                    <button
                      onClick={() => toggleSuggestion(i)}
                      className={cn(
                        'w-full p-3 flex items-start gap-3 text-left transition-colors',
                        selected.has(i) ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                      )}
                    >
                      <div className={cn(
                        'w-4 h-4 border flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                        selected.has(i) ? 'border-white bg-white' : 'border-zinc-700'
                      )}>
                        {selected.has(i) && <span className="text-black text-[10px] font-bold">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-zinc-800 text-zinc-400 tracking-wider">
                            {s.chartType}
                          </span>
                          <span className="text-xs text-white">{s.title}</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1">{s.reasoning}</p>
                      </div>
                      <span className="text-[10px] text-zinc-600 shrink-0">
                        {Math.round(s.confidence * 100)}%
                      </span>
                    </button>

                    {/* Preview */}
                    {selected.has(i) && s.chartType !== 'kpi' && s.chartType !== 'table' && (
                      <div className="border-t border-brand-border">
                        <SuggestionPreview suggestion={s} dataset={dataset} />
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Create Dashboard button */}
          <div className="p-4 border-t border-brand-border">
            <button
              onClick={() => onCreateDashboard(dataset, selectedSuggestions)}
              disabled={selectedSuggestions.length === 0}
              className={cn(
                'w-full py-2.5 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors',
                selectedSuggestions.length > 0
                  ? 'bg-white text-black hover:bg-zinc-200'
                  : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
              )}
            >
              Create Dashboard ({selectedSuggestions.length} charts)
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DataSourcesPanel({ datasets, onCreateDashboard }: DataSourcesPanelProps) {
  if (datasets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Database className="w-8 h-8 text-zinc-700 mb-3" />
        <p className="text-sm text-zinc-500">No data sources yet</p>
        <p className="text-xs text-zinc-600 mt-1">Upload a CSV file to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {datasets.map((ds, i) => (
        <DatasetCard key={i} dataset={ds} onCreateDashboard={onCreateDashboard} />
      ))}
    </div>
  );
}
