import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { ArrowLeft, ArrowRight, Database, EyeOff, FileSpreadsheet, Filter, GitBranch, PencilLine, Plus, Search, Sigma, Table2, Wand2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../lib/app-store';
import { analyzeSchema } from '../lib/schema-analyzer';
import { DatasetInsights } from '../components/data/DatasetInsights';
import { applyPrepSteps, summarizePrepStep } from '../lib/data-prep';
import { preAggregateForSpec } from '../lib/chart-data';
import { applyBentoLayout } from '../lib/bento-layout';
import type { ChartSpec, ColumnInfo, DatasetPrepStep, SavedDatasetView, VisualizationSuggestion } from '../lib/types';
import { cn } from '../lib/utils';

type Row = Record<string, unknown>;
type WorkspaceTab = 'overview' | 'prepare' | 'explore' | 'views';
type SortDirection = 'asc' | 'desc';
type DraftPrepStep =
  | Omit<Extract<DatasetPrepStep, { type: 'rename_column' }>, 'id'>
  | Omit<Extract<DatasetPrepStep, { type: 'cast_column' }>, 'id'>
  | Omit<Extract<DatasetPrepStep, { type: 'hide_column' }>, 'id'>
  | Omit<Extract<DatasetPrepStep, { type: 'fill_nulls' }>, 'id'>
  | Omit<Extract<DatasetPrepStep, { type: 'drop_null_rows' }>, 'id'>
  | Omit<Extract<DatasetPrepStep, { type: 'derive_column' }>, 'id'>;

const TAB_LABELS: { id: WorkspaceTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'prepare', label: 'Prepare' },
  { id: 'explore', label: 'Explore' },
  { id: 'views', label: 'Saved Views' },
];

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getSavedViewsKey(datasetId: string) {
  return `neuralbi.savedViews.${datasetId}`;
}

function materializeSuggestions(data: Row[], suggestions: VisualizationSuggestion[]): ChartSpec[] {
  const specs = suggestions.map((suggestion, index) => ({
    id: `prepared-chart-${index}-${Date.now()}`,
    chartType: suggestion.chartType,
    title: suggestion.title,
    data: preAggregateForSpec(data, suggestion.chartType, suggestion.config),
    config: suggestion.config,
    size: suggestion.chartType === 'kpi'
      ? { w: 3, h: 1 }
      : suggestion.chartType === 'table'
        ? { w: 12, h: 4 }
        : { w: 6, h: 3 },
  }));

  return applyBentoLayout(specs);
}

function countDuplicateRows(rows: Row[]) {
  const seen = new Set<string>();
  let duplicates = 0;
  for (const row of rows) {
    const key = JSON.stringify(row);
    if (seen.has(key)) duplicates += 1;
    else seen.add(key);
  }
  return duplicates;
}

function countNullCells(rows: Row[]) {
  let count = 0;
  for (const row of rows) {
    for (const value of Object.values(row)) {
      if (value === null || value === undefined || String(value).trim() === '') count += 1;
    }
  }
  return count;
}

function sortRows(rows: Row[], column: string, direction: SortDirection) {
  return [...rows].sort((a, b) => {
    const left = a[column];
    const right = b[column];

    if (typeof left === 'number' && typeof right === 'number') {
      return direction === 'asc' ? left - right : right - left;
    }

    const comparison = String(left ?? '').localeCompare(String(right ?? ''));
    return direction === 'asc' ? comparison : -comparison;
  });
}

export function DatasetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const datasetId = id as Id<'datasets'> | undefined;
  const navigate = useNavigate();
  const { createDashboardFromCharts } = useApp();

  const dataset = useQuery(api.datasets.get, datasetId ? { id: datasetId } : 'skip');
  const rowChunks = useQuery(api.dataRows.getByDataset, datasetId ? { datasetId } : 'skip');

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [steps, setSteps] = useState<DatasetPrepStep[]>([]);
  const [savedViews, setSavedViews] = useState<SavedDatasetView[]>([]);
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const [renameColumn, setRenameColumn] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [castColumn, setCastColumn] = useState('');
  const [castType, setCastType] = useState<ColumnInfo['type']>('string');
  const [hideColumn, setHideColumn] = useState('');
  const [fillColumn, setFillColumn] = useState('');
  const [fillValue, setFillValue] = useState('');
  const [dropNullColumn, setDropNullColumn] = useState('');
  const [derivedName, setDerivedName] = useState('');
  const [derivedExpression, setDerivedExpression] = useState('');
  const [viewName, setViewName] = useState('');

  const rawRows = useMemo(
    () => (rowChunks || []).flatMap((chunk: { rows: Row[] }) => chunk.rows || []),
    [rowChunks]
  );

  const prepared = useMemo(() => applyPrepSteps(rawRows, steps), [rawRows, steps]);
  const suggestions = useMemo(() => analyzeSchema(prepared.schema).slice(0, 8), [prepared.schema]);

  const exploredRows = useMemo(() => {
    let rows = prepared.rows;

    if (search.trim()) {
      const query = search.trim().toLowerCase();
      rows = rows.filter((row) =>
        Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(query))
      );
    }

    if (sortColumn) {
      rows = sortRows(rows, sortColumn, sortDirection);
    }

    return rows;
  }, [prepared.rows, search, sortColumn, sortDirection]);

  useEffect(() => {
    if (!datasetId) return;
    try {
      const raw = localStorage.getItem(getSavedViewsKey(datasetId));
      setSavedViews(raw ? JSON.parse(raw) : []);
    } catch {
      setSavedViews([]);
    }
    setSteps([]);
    setSearch('');
    setSortColumn('');
    setSortDirection('asc');
  }, [datasetId]);

  const qualitySummary = useMemo(() => ({
    duplicateRows: countDuplicateRows(rawRows),
    nullCells: countNullCells(rawRows),
    preparedRows: prepared.rows.length,
  }), [rawRows, prepared.rows.length]);

  const visibleColumns = prepared.schema.columns.map((column) => column.name);

  const appendStep = (step: DraftPrepStep) => {
    setSteps((current) => [...current, { ...step, id: createLocalId(step.type) }]);
  };

  const saveCurrentView = () => {
    if (!datasetId) return;

    const nextView: SavedDatasetView = {
      id: createLocalId('view'),
      name: viewName.trim() || `View ${savedViews.length + 1}`,
      steps,
      search,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const nextViews = [nextView, ...savedViews];
    setSavedViews(nextViews);
    localStorage.setItem(getSavedViewsKey(datasetId), JSON.stringify(nextViews));
    setViewName('');
    toast.success(`Saved ${nextView.name}`);
  };

  const applySavedView = (view: SavedDatasetView) => {
    setSteps(view.steps);
    setSearch(view.search || '');
    setActiveTab('explore');
    toast.success(`Loaded ${view.name}`);
  };

  const removeSavedView = (viewId: string) => {
    if (!datasetId) return;
    const nextViews = savedViews.filter((view) => view.id !== viewId);
    setSavedViews(nextViews);
    localStorage.setItem(getSavedViewsKey(datasetId), JSON.stringify(nextViews));
  };

  const createDashboard = async () => {
    if (!datasetId || !dataset) return;
    if (prepared.rows.length === 0) {
      toast.error('This prepared view has no rows to chart.');
      return;
    }

    const selectedSuggestions = suggestions.filter((suggestion) => suggestion.confidence >= 0.6);
    if (selectedSuggestions.length === 0) {
      toast.error('No strong chart suggestions are available for this prepared view yet.');
      return;
    }

    const charts = materializeSuggestions(prepared.rows, selectedSuggestions);
    const name = `${dataset.name} workspace`;
    const dashboardId = await createDashboardFromCharts(datasetId, name, charts);
    toast.success('Starter dashboard created from current prepared view');
    navigate(`/dashboard/${dashboardId}`);
  };

  if (dataset === undefined || rowChunks === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-sm text-zinc-500">
        Loading dataset workspace...
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <p className="text-zinc-500">Dataset not found</p>
        <button onClick={() => navigate('/data')} className="mt-2 text-xs text-white underline">Back</button>
      </div>
    );
  }

  const rawSchema = dataset.schema;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <header className="p-6 border-b border-brand-border sticky top-0 bg-brand-bg/85 backdrop-blur-sm z-10 space-y-4">
        <button onClick={() => navigate('/data')} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft className="w-3 h-3" /> Data Sources
        </button>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <FileSpreadsheet className="w-5 h-5 text-zinc-500 mt-1 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white tracking-tight truncate">{dataset.fileName}</h1>
              <p className="text-xs text-zinc-500 mt-1">
                {rawRows.length.toLocaleString()} rows • {rawSchema?.columns?.length || 0} columns • {(dataset.fileSize / 1024).toFixed(1)}KB
              </p>
              <p className="text-[11px] text-zinc-600 mt-2 max-w-2xl">
                Profile the raw dataset, apply prep steps, explore the cleaned rows, then turn the current view into a dashboard.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={saveCurrentView}
              className="px-3 py-2 border border-brand-border text-xs font-bold text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors"
            >
              Save View
            </button>
            <button
              onClick={createDashboard}
              className="flex items-center gap-2 px-3 py-2 bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors"
            >
              Create Dashboard <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {TAB_LABELS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border transition-colors',
                activeTab === tab.id
                  ? 'bg-white text-black border-white'
                  : 'text-zinc-500 border-brand-border hover:text-white hover:border-zinc-600'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="p-6 space-y-6">
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <MetricCard label="Raw rows" value={rawRows.length.toLocaleString()} icon={Database} />
              <MetricCard label="Visible columns" value={prepared.schema.columns.length.toString()} icon={Table2} />
              <MetricCard label="Null cells" value={qualitySummary.nullCells.toLocaleString()} icon={Filter} />
              <MetricCard label="Duplicate rows" value={qualitySummary.duplicateRows.toLocaleString()} icon={GitBranch} />
            </div>

            <DatasetInsights schema={prepared.schema} data={prepared.rows} />

            <section>
              <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Suggested next visuals</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {suggestions.map((suggestion) => (
                  <div key={`${suggestion.chartType}-${suggestion.title}`} className="bg-brand-surface border border-brand-border p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-zinc-800 text-zinc-400 tracking-wider">
                        {suggestion.chartType}
                      </span>
                      <span className="text-sm text-white">{suggestion.title}</span>
                      <span className="ml-auto text-[10px] text-zinc-600">{Math.round(suggestion.confidence * 100)}%</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">{suggestion.reasoning}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {activeTab === 'prepare' && (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <PrepCard title="Rename column" icon={PencilLine}>
                <select value={renameColumn} onChange={(e) => setRenameColumn(e.target.value)} className="w-full bg-brand-bg border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600">
                  <option value="">Select column</option>
                  {visibleColumns.map((column) => <option key={column} value={column}>{column}</option>)}
                </select>
                <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="New column name" className="w-full bg-brand-bg border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600" />
                <ActionButton
                  disabled={!renameColumn || !renameValue.trim()}
                  onClick={() => {
                    appendStep({ type: 'rename_column', column: renameColumn, newName: renameValue.trim() });
                    setRenameColumn('');
                    setRenameValue('');
                  }}
                >
                  Add rename step
                </ActionButton>
              </PrepCard>

              <PrepCard title="Fix column type" icon={Wand2}>
                <select value={castColumn} onChange={(e) => setCastColumn(e.target.value)} className="w-full bg-brand-bg border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600">
                  <option value="">Select column</option>
                  {visibleColumns.map((column) => <option key={column} value={column}>{column}</option>)}
                </select>
                <select value={castType} onChange={(e) => setCastType(e.target.value as ColumnInfo['type'])} className="w-full bg-brand-bg border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600">
                  <option value="string">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="boolean">Boolean</option>
                </select>
                <ActionButton
                  disabled={!castColumn}
                  onClick={() => {
                    appendStep({ type: 'cast_column', column: castColumn, asType: castType });
                    setCastColumn('');
                  }}
                >
                  Add cast step
                </ActionButton>
              </PrepCard>

              <PrepCard title="Null handling" icon={Filter}>
                <select value={fillColumn} onChange={(e) => setFillColumn(e.target.value)} className="w-full bg-brand-bg border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600">
                  <option value="">Select column to fill</option>
                  {visibleColumns.map((column) => <option key={column} value={column}>{column}</option>)}
                </select>
                <input value={fillValue} onChange={(e) => setFillValue(e.target.value)} placeholder="Replacement value" className="w-full bg-brand-bg border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600" />
                <ActionButton
                  disabled={!fillColumn || !fillValue.trim()}
                  onClick={() => {
                    appendStep({ type: 'fill_nulls', column: fillColumn, value: fillValue });
                    setFillColumn('');
                    setFillValue('');
                  }}
                >
                  Fill nulls
                </ActionButton>
                <div className="h-px bg-brand-border my-1" />
                <select value={dropNullColumn} onChange={(e) => setDropNullColumn(e.target.value)} className="w-full bg-brand-bg border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600">
                  <option value="">Select column to require</option>
                  {visibleColumns.map((column) => <option key={column} value={column}>{column}</option>)}
                </select>
                <ActionButton
                  disabled={!dropNullColumn}
                  onClick={() => {
                    appendStep({ type: 'drop_null_rows', column: dropNullColumn });
                    setDropNullColumn('');
                  }}
                >
                  Drop rows with nulls
                </ActionButton>
              </PrepCard>

              <PrepCard title="Derived field" icon={Sigma}>
                <input value={derivedName} onChange={(e) => setDerivedName(e.target.value)} placeholder="New field name" className="w-full bg-brand-bg border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600" />
                <input value={derivedExpression} onChange={(e) => setDerivedExpression(e.target.value)} placeholder="price * quantity" className="w-full bg-brand-bg border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600" />
                <ActionButton
                  disabled={!derivedName.trim() || !derivedExpression.trim()}
                  onClick={() => {
                    appendStep({ type: 'derive_column', name: derivedName.trim(), expression: derivedExpression.trim() });
                    setDerivedName('');
                    setDerivedExpression('');
                  }}
                >
                  Create derived field
                </ActionButton>
              </PrepCard>

              <PrepCard title="Hide column" icon={EyeOff}>
                <select value={hideColumn} onChange={(e) => setHideColumn(e.target.value)} className="w-full bg-brand-bg border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600">
                  <option value="">Select column</option>
                  {visibleColumns.map((column) => <option key={column} value={column}>{column}</option>)}
                </select>
                <ActionButton
                  disabled={!hideColumn}
                  onClick={() => {
                    appendStep({ type: 'hide_column', column: hideColumn });
                    setHideColumn('');
                  }}
                >
                  Hide column from this view
                </ActionButton>
              </PrepCard>
            </div>

            <section className="bg-brand-surface border border-brand-border p-4">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div>
                  <h2 className="text-xs font-bold text-white uppercase tracking-widest">Prep pipeline</h2>
                  <p className="text-[11px] text-zinc-600 mt-1">Each step is applied in order. Raw data stays untouched.</p>
                </div>
                {steps.length > 0 && (
                  <button
                    onClick={() => setSteps([])}
                    className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                  >
                    Clear pipeline
                  </button>
                )}
              </div>

              {steps.length === 0 ? (
                <p className="text-sm text-zinc-500">No prep steps yet. Start by renaming, casting, filtering nulls, or deriving a field.</p>
              ) : (
                <div className="space-y-2">
                  {steps.map((step, index) => (
                    <div key={step.id} className="flex items-center justify-between gap-3 p-3 border border-brand-border bg-brand-bg">
                      <div>
                        <p className="text-xs text-white">{index + 1}. {summarizePrepStep(step)}</p>
                        <p className="text-[10px] text-zinc-600 mt-1">Applied to the current prepared view immediately.</p>
                      </div>
                      <button
                        onClick={() => setSteps((current) => current.filter((item) => item.id !== step.id))}
                        className="p-1 text-zinc-600 hover:text-white transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === 'explore' && (
          <>
            <section className="bg-brand-surface border border-brand-border p-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xs font-bold text-white uppercase tracking-widest">Explore prepared rows</h2>
                  <p className="text-[11px] text-zinc-600 mt-1">
                    {exploredRows.length.toLocaleString()} rows in the active view • {prepared.schema.columns.length} visible columns
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search current view"
                      className="bg-brand-bg border border-brand-border pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600 w-64"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {prepared.schema.columns.map((column) => (
                  <span key={column.name} className="px-2 py-1 text-[10px] uppercase tracking-widest border border-brand-border text-zinc-500">
                    {column.name}
                  </span>
                ))}
              </div>

              <div className="overflow-auto custom-scrollbar max-h-[520px] border border-brand-border">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      {prepared.schema.columns.map((column) => (
                        <th
                          key={column.name}
                          onClick={() => {
                            if (sortColumn === column.name) {
                              setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortColumn(column.name);
                              setSortDirection('asc');
                            }
                          }}
                          className="text-left p-2 text-zinc-500 font-bold uppercase tracking-wider text-[10px] sticky top-0 bg-brand-surface border-b border-brand-border whitespace-nowrap cursor-pointer hover:text-white"
                        >
                          {column.name}
                          {sortColumn === column.name && (
                            <span className="ml-1 text-[9px] text-zinc-700">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {exploredRows.slice(0, 200).map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-white/5">
                        {prepared.schema.columns.map((column) => (
                          <td key={column.name} className="p-2 text-zinc-400 border-t border-brand-border whitespace-nowrap">
                            {String(row[column.name] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {exploredRows.length > 200 && (
                <p className="text-[11px] text-zinc-600 mt-3">Showing the first 200 rows of the current prepared view.</p>
              )}
            </section>
          </>
        )}

        {activeTab === 'views' && (
          <>
            <section className="bg-brand-surface border border-brand-border p-4">
              <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Save current view</h2>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  placeholder="Q1 revenue prep"
                  className="flex-1 bg-brand-bg border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600"
                />
                <button onClick={saveCurrentView} className="px-3 py-2 bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors">
                  Save Current View
                </button>
              </div>
              <p className="text-[11px] text-zinc-600 mt-3">A saved view keeps your prep pipeline and search state so you can reuse it later.</p>
            </section>

            <section>
              <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-3">Saved views</h2>
              {savedViews.length === 0 ? (
                <div className="border border-dashed border-brand-border p-8 text-center text-sm text-zinc-500">
                  No saved views yet. Save your current prep pipeline to reuse it.
                </div>
              ) : (
                <div className="space-y-3">
                  {savedViews.map((view) => (
                    <div key={view.id} className="bg-brand-surface border border-brand-border p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <p className="text-sm text-white font-semibold">{view.name}</p>
                        <p className="text-[11px] text-zinc-600 mt-1">
                          {view.steps.length} prep step{view.steps.length !== 1 ? 's' : ''}
                          {view.search ? ` • search: ${view.search}` : ''}
                        </p>
                        {view.steps.length > 0 && (
                          <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
                            {view.steps.slice(0, 2).map(summarizePrepStep).join(' • ')}
                            {view.steps.length > 2 ? ` • +${view.steps.length - 2} more` : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => applySavedView(view)}
                          className="px-3 py-2 border border-brand-border text-xs font-bold text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors"
                        >
                          Apply View
                        </button>
                        <button
                          onClick={() => removeSavedView(view.id)}
                          className="px-3 py-2 border border-red-950 text-xs font-bold text-red-400 hover:bg-red-950/50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Database }) {
  return (
    <div className="bg-brand-surface border border-brand-border p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-zinc-500" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</p>
      </div>
      <p className="text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function PrepCard({ title, icon: Icon, children }: { title: string; icon: typeof Plus; children: React.ReactNode }) {
  return (
    <section className="bg-brand-surface border border-brand-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-zinc-500" />
        <h2 className="text-xs font-bold text-white uppercase tracking-widest">{title}</h2>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function ActionButton({ disabled, onClick, children }: { disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="w-full py-2 text-xs font-bold uppercase tracking-widest bg-white text-black hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}
