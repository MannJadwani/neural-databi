import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { widgetToSpec } from '../lib/convex-helpers';
import { ChartRenderer } from '../components/charts';
import { AIInsightsCard } from '../components/dashboard/AIInsightsCard';
import { AIMessageRenderer } from '../components/ai/AIMessageRenderer';
import { useAgent } from '../hooks/useAgent';
import { DashboardProvider } from '../lib/dashboard-store';
import { Loader2, BarChart3, Table2, MessageSquare, Send, ArrowUpDown, Sparkles, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { usePageMeta } from '../hooks/usePageMeta';

const ROW_H = 110;

const COL_SPAN_MAP: Record<number, string> = {
  3: 'col-span-12 md:col-span-3',
  4: 'col-span-12 md:col-span-4',
  5: 'col-span-12 md:col-span-5',
  6: 'col-span-12 md:col-span-6',
  7: 'col-span-12 md:col-span-7',
  8: 'col-span-12 md:col-span-8',
  9: 'col-span-12 md:col-span-9',
  12: 'col-span-12',
};

function getColSpan(w: number): string {
  return COL_SPAN_MAP[w] || `col-span-12 md:col-span-${Math.min(w, 12)}`;
}

type MainTab = 'dashboard' | 'data';

export function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [mainTab, setMainTab] = useState<MainTab>('dashboard');
  const [chatOpen, setChatOpen] = useState(false);

  const dashboard = useQuery(api.dashboards.get, id ? { id: id as Id<'dashboards'> } : 'skip');
  const widgets = useQuery(api.widgets.listByDashboard, dashboard ? { dashboardId: dashboard._id } : 'skip');
  const dataset = useQuery(api.datasets.get, dashboard ? { id: dashboard.datasetId } : 'skip');
  const dataRows = useQuery(api.dataRows.getByDataset, dashboard ? { datasetId: dashboard.datasetId } : 'skip');

  usePageMeta({
    title: dashboard?.name ? `${dashboard.name} — Dashboard` : 'Dashboard Preview',
    description: dashboard?.name
      ? `Interactive AI-generated dashboard: ${dashboard.name}. Explore charts, KPIs, and insights powered by NeuralBi.`
      : 'View this AI-generated interactive dashboard on NeuralBi.',
    ogTitle: dashboard?.name ? `${dashboard.name} — NeuralBi Dashboard` : 'NeuralBi Dashboard',
    ogDescription: 'AI-generated interactive dashboard with charts, KPIs, and data insights. Powered by NeuralBi.',
    ogUrl: id ? `https://neuralbi.io/preview/${id}` : undefined,
    canonical: id ? `https://neuralbi.io/preview/${id}` : undefined,
  });

  const charts = useMemo(() => {
    if (!widgets) return [];
    return widgets.map(widgetToSpec);
  }, [widgets]);

  const kpis = charts.filter((c) => c.chartType === 'kpi');
  const nonKpis = charts.filter((c) => c.chartType !== 'kpi');

  if (dashboard === undefined || widgets === undefined) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-600 animate-spin" />
      </div>
    );
  }

  if (dashboard === null) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center text-zinc-500 text-sm">
        Dashboard not found
      </div>
    );
  }

  return (
    <DashboardProvider>
      <div className="h-screen bg-brand-bg text-slate-400 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-4 py-3 border-b border-brand-border flex items-center justify-between shrink-0 bg-brand-bg/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white flex items-center justify-center rounded-sm">
              <div className="w-3 h-3 bg-black" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">{dashboard.name}</h1>
              <p className="text-[9px] text-zinc-500">
                {dataset ? `${dataset.rowCount.toLocaleString()} rows • ${dataset.schema?.columns?.length || 0} columns` : ''}
                {' • '}NeuralBi
              </p>
            </div>
          </div>

          <div className="flex gap-1">
            {/* Main tabs */}
            {[
              { id: 'dashboard' as MainTab, icon: BarChart3, label: 'Dashboard' },
              { id: 'data' as MainTab, icon: Table2, label: 'Data' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setMainTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
                  mainTab === t.id
                    ? 'bg-white text-black'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white'
                )}
              >
                <t.icon className="w-3 h-3" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}

            <div className="w-px bg-zinc-800 mx-1" />

            {/* Ask AI toggle */}
            <button
              onClick={() => setChatOpen((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
                chatOpen
                  ? 'bg-white text-black'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white'
              )}
            >
              <MessageSquare className="w-3 h-3" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {mainTab === 'dashboard' && (
              <div className="p-3 space-y-2 max-w-[1400px] mx-auto">
                {dashboard.insights && <AIInsightsCard insights={dashboard.insights} />}

                {kpis.length > 0 && (
                  <div className={cn(
                    'grid gap-2',
                    kpis.length === 1 && 'grid-cols-1',
                    kpis.length === 2 && 'grid-cols-2',
                    kpis.length === 3 && 'grid-cols-3',
                    kpis.length >= 4 && 'grid-cols-2 sm:grid-cols-4',
                  )}>
                    {kpis.map((widget) => (
                      <div key={widget.id} className="bg-brand-surface border border-brand-border p-4">
                        <ChartRenderer spec={widget} />
                      </div>
                    ))}
                  </div>
                )}

                {nonKpis.length > 0 && (
                  <div className="grid grid-cols-12 gap-2 auto-rows-min">
                    {nonKpis.map((widget) => {
                      const w = widget.size?.w || 6;
                      const h = widget.size?.h || 3;
                      return (
                        <div key={widget.id} className={getColSpan(w)} style={{ height: h * ROW_H }}>
                          <div className="h-full"><ChartRenderer spec={widget} /></div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {mainTab === 'data' && (
              <DataPreviewTab
                columns={dataset?.schema?.columns || []}
                rows={(dataRows?.flatMap((c: any) => c.rows as Record<string, unknown>[])) || []}
              />
            )}
          </div>

          {/* Chat sidebar — slides in from right */}
          <AnimatePresence>
            {chatOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 380, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="border-l border-brand-border bg-brand-surface shrink-0 overflow-hidden flex flex-col"
              >
                <div className="flex items-center justify-between p-3 border-b border-brand-border shrink-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Ask AI</span>
                  </div>
                  <button onClick={() => setChatOpen(false)} className="p-1 hover:text-white transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <ChatPanel
                  data={(dataRows?.flatMap((c: any) => c.rows as Record<string, unknown>[])) || []}
                  schema={dataset?.schema || null}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <footer className="px-4 py-2 border-t border-brand-border text-center shrink-0">
          <p className="text-[9px] text-zinc-700 uppercase tracking-widest">
            NeuralBi • {new Date(dashboard.createdAt).toLocaleDateString()}
          </p>
        </footer>
      </div>
    </DashboardProvider>
  );
}

// ============================================================
// Data Preview Tab
// ============================================================

function DataPreviewTab({
  columns,
  rows,
}: {
  columns: { name: string; type: string; uniqueCount?: number; stats?: any }[];
  rows: Record<string, unknown>[];
}) {
  const [sortCol, setSortCol] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');
  const colNames = columns.map((c) => c.name);

  const filtered = useMemo(() => {
    let result = rows;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((row) =>
        colNames.some((col) => String(row[col] ?? '').toLowerCase().includes(q))
      );
    }
    if (sortCol) {
      result = [...result].sort((a, b) => {
        const av = a[sortCol], bv = b[sortCol];
        if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
        return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    return result.slice(0, 500);
  }, [rows, search, sortCol, sortDir, colNames]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-brand-border flex items-center gap-3 shrink-0">
        <div className="flex gap-1.5 overflow-x-auto custom-scrollbar flex-1">
          {columns.map((col) => (
            <span key={col.name} className={cn(
              'text-[9px] font-bold uppercase px-1.5 py-0.5 tracking-wider whitespace-nowrap shrink-0',
              col.type === 'number' ? 'bg-blue-500/15 text-blue-400' :
              col.type === 'date' ? 'bg-purple-500/15 text-purple-400' :
              'bg-zinc-500/15 text-zinc-400'
            )}>
              {col.name}
            </span>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-48 bg-brand-bg border border-brand-border px-2 py-1 text-xs text-white focus:outline-none focus:border-zinc-600 shrink-0"
        />
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-zinc-600 text-[9px] font-bold text-left sticky top-0 bg-brand-surface border-b border-brand-border w-12">#</th>
              {colNames.map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="p-2 text-zinc-500 text-[9px] font-bold uppercase tracking-wider text-left sticky top-0 bg-brand-surface border-b border-brand-border cursor-pointer hover:text-white transition-colors whitespace-nowrap"
                >
                  <span className="flex items-center gap-1">
                    {col}
                    <ArrowUpDown className="w-2 h-2" />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-2 text-zinc-700 border-t border-brand-border">{i + 1}</td>
                {colNames.map((col) => (
                  <td key={col} className="p-2 text-zinc-400 border-t border-brand-border whitespace-nowrap">
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-zinc-600 text-xs">
            {search ? 'No matching rows' : 'No data'}
          </div>
        )}
      </div>

      <div className="p-2 border-t border-brand-border text-[9px] text-zinc-600 shrink-0">
        Showing {filtered.length} of {rows.length} rows • {columns.length} columns
      </div>
    </div>
  );
}

// ============================================================
// Chat Panel (sidebar)
// ============================================================

function ChatPanel({
  data,
  schema,
}: {
  data: Record<string, unknown>[];
  schema: any;
}) {
  const { messages, isLoading, sendMessage } = useAgent(data, schema);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  const quickPrompts = schema ? [
    'Summarize the key findings',
    'What are the top trends?',
    'Any anomalies?',
    'What should I focus on?',
  ] : [];

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Sparkles className="w-6 h-6 text-zinc-800 mx-auto mb-2" />
            <p className="text-xs text-zinc-500 mb-1">Ask anything about this data</p>
            <div className="flex flex-wrap gap-1 justify-center mt-3">
              {quickPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-[9px] bg-zinc-900 border border-zinc-800 px-2 py-1 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <AIMessageRenderer key={m.id} message={m} />
        ))}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase text-zinc-500">Nexus Agent</div>
            <div className="bg-zinc-900 border border-zinc-800 p-3">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-brand-border shrink-0">
        <div className="relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about the data..."
            className="w-full bg-black border border-brand-border p-2.5 pr-9 text-sm focus:outline-none focus:border-white transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 hover:text-white transition-colors disabled:opacity-30"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}
