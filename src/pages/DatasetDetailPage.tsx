import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../lib/app-store';
import { ArrowLeft, FileSpreadsheet, Table2, BarChart3, ArrowRight, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { analyzeSchema } from '../lib/schema-analyzer';
import { cn } from '../lib/utils';
import type { VisualizationSuggestion } from '../lib/types';
import { DatasetInsights } from '../components/data/DatasetInsights';
import toast from 'react-hot-toast';

export function DatasetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { datasets, createDashboard } = useApp();
  const navigate = useNavigate();

  const index = Number(id);
  const dataset = datasets[index];

  if (!dataset) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <p className="text-zinc-500">Dataset not found</p>
        <button onClick={() => navigate('/data')} className="mt-2 text-xs text-white underline">Back</button>
      </div>
    );
  }

  const suggestions = analyzeSchema(dataset.schema);

  const handleCreate = () => {
    const selected = suggestions.filter((s) => s.confidence >= 0.6);
    const dashId = createDashboard(dataset, selected);
    toast.success('Dashboard created');
    navigate(`/dashboard/${dashId}`);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <header className="p-6 border-b border-brand-border sticky top-0 bg-brand-bg/80 backdrop-blur-sm z-10">
        <button onClick={() => navigate('/data')} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors mb-3">
          <ArrowLeft className="w-3 h-3" /> Data Sources
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-zinc-500" />
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">{dataset.fileName}</h1>
              <p className="text-xs text-zinc-500">
                {dataset.schema.rowCount.toLocaleString()} rows • {dataset.schema.columns.length} columns • {(dataset.fileSize / 1024).toFixed(1)}KB
              </p>
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-3 py-2 bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors"
          >
            Create Dashboard <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* AI Insights */}
        <div>
          <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-3 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> Insights
          </h2>
          <DatasetInsights schema={dataset.schema} data={dataset.data} />
        </div>

        {/* Schema */}
        <div>
          <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-3 flex items-center gap-2">
            <Table2 className="w-3.5 h-3.5" /> Schema
          </h2>
          <div className="space-y-1">
            {dataset.schema.columns.map((col) => (
              <div key={col.name} className="flex items-center justify-between p-3 bg-brand-surface border border-brand-border">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'text-[9px] font-bold uppercase px-1.5 py-0.5 tracking-wider',
                    col.type === 'number' ? 'bg-blue-500/20 text-blue-400' :
                    col.type === 'date' ? 'bg-purple-500/20 text-purple-400' :
                    col.type === 'boolean' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-zinc-500/20 text-zinc-400'
                  )}>
                    {col.type}
                  </span>
                  <span className="text-sm text-white">{col.name}</span>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-zinc-500">
                  <span>{col.uniqueCount} unique</span>
                  {col.nullable && <span className="text-amber-600">nullable</span>}
                  {col.stats && <span>{col.stats.min?.toLocaleString()} – {col.stats.max?.toLocaleString()}</span>}
                  <span className="text-zinc-700">
                    {col.sampleValues.slice(0, 3).map(String).join(', ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data preview */}
        <div>
          <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-3 flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5" /> Data Preview
          </h2>
          <div className="bg-brand-surface border border-brand-border overflow-auto custom-scrollbar max-h-[300px]">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  {dataset.schema.columns.map((col) => (
                    <th key={col.name} className="text-left p-2 text-zinc-500 font-bold uppercase tracking-wider text-[10px] sticky top-0 bg-brand-surface border-b border-brand-border whitespace-nowrap">
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataset.schema.sampleRows.map((row, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    {dataset.schema.columns.map((col) => (
                      <td key={col.name} className="p-2 text-zinc-400 border-t border-brand-border whitespace-nowrap">
                        {String(row[col.name] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Suggestions */}
        <div>
          <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-3">
            {suggestions.length} Visualization Suggestions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((s, i) => (
              <div key={i} className="bg-brand-surface border border-brand-border p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-zinc-800 text-zinc-400 tracking-wider">
                    {s.chartType}
                  </span>
                  <span className="text-xs text-white">{s.title}</span>
                  <span className="text-[10px] text-zinc-600 ml-auto">{Math.round(s.confidence * 100)}%</span>
                </div>
                <p className="text-[10px] text-zinc-500">{s.reasoning}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
