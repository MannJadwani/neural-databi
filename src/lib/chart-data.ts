import type { ChartConfig, ChartType, KPIConfig } from './types';

type Row = Record<string, unknown>;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function toFiniteNumber(value: unknown): number | null {
  if (isFiniteNumber(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sortDimensionValues(values: string[]): string[] {
  if (values.every((value) => !Number.isNaN(Date.parse(value)))) {
    return [...values].sort((a, b) => Date.parse(a) - Date.parse(b));
  }
  if (values.every((value) => value.trim() !== '' && !Number.isNaN(Number(value)))) {
    return [...values].sort((a, b) => Number(a) - Number(b));
  }
  return values;
}

export function resolveXAxis(data: Row[], config: ChartConfig): string | undefined {
  if (config.xAxis) return config.xAxis;
  const firstRow = data[0] || {};
  const keys = Object.keys(firstRow);
  return keys.find((key) => !isFiniteNumber(firstRow[key])) || keys[0];
}

export function resolveYAxes(data: Row[], config: ChartConfig, xKey?: string): string[] {
  const requested = Array.isArray(config.yAxis)
    ? config.yAxis
    : config.yAxis
      ? [config.yAxis]
      : [];

  const firstRow = data[0] || {};
  const fallback = Object.keys(firstRow).filter((key) => key !== xKey && isFiniteNumber(firstRow[key]));
  const candidates = requested.length > 0 ? requested : fallback;

  return candidates.filter((key) =>
    data.some((row) => toFiniteNumber(row[key]) !== null)
  );
}

export function aggregateForCartesianChart(
  data: Row[],
  config: ChartConfig
): { data: Row[]; xKey?: string; yKeys: string[] } {
  const xKey = resolveXAxis(data, config);
  if (!xKey) return { data: [], yKeys: [] };

  const requestedYKeys = resolveYAxes(data, config, xKey);
  const yKeys = requestedYKeys.length > 0 ? requestedYKeys : ['count'];
  const buckets = new Map<string, { sums: Record<string, number>; counts: Record<string, number> }>();

  for (const row of data) {
    const rawLabel = row[xKey];
    if (rawLabel === null || rawLabel === undefined || rawLabel === '') continue;
    const label = String(rawLabel);
    const bucket = buckets.get(label) || { sums: {}, counts: {} };

    if (requestedYKeys.length === 0) {
      bucket.sums.count = (bucket.sums.count || 0) + 1;
    } else {
      for (const key of requestedYKeys) {
        const value = toFiniteNumber(row[key]);
        if (value === null) continue;
        bucket.sums[key] = (bucket.sums[key] || 0) + value;
        bucket.counts[key] = (bucket.counts[key] || 0) + 1;
      }
    }

    buckets.set(label, bucket);
  }

  const orderedLabels = sortDimensionValues([...buckets.keys()]);
  const aggregation = config.aggregation || 'sum';
  const aggregated = orderedLabels.map((label) => {
    const bucket = buckets.get(label)!;
    const entry: Row = { [xKey]: label };
    for (const key of yKeys) {
      const sum = bucket.sums[key] || 0;
      if (aggregation === 'avg' && requestedYKeys.length > 0) {
        const count = bucket.counts[key] || 1;
        entry[key] = Math.round((sum / count) * 100) / 100;
      } else {
        entry[key] = Math.round(sum * 100) / 100;
      }
    }
    return entry;
  });

  return { data: aggregated, xKey, yKeys };
}

export function aggregateForPieChart(
  data: Row[],
  config: ChartConfig
): { data: Row[]; nameKey?: string; valueKey: string } {
  const { data: aggregated, xKey, yKeys } = aggregateForCartesianChart(data, config);
  const valueKey = yKeys[0] || 'count';
  const limited = [...aggregated]
    .sort((a, b) => Number(b[valueKey] || 0) - Number(a[valueKey] || 0))
    .slice(0, Math.max(8, config.limit || 8));

  return { data: limited, nameKey: xKey, valueKey };
}

export function prepareHeatmapData(
  data: Row[],
  config: ChartConfig
): { data: Row[]; labelKey?: string; numericKeys: string[] } {
  const labelKey = resolveXAxis(data, config);
  if (!labelKey) return { data: [], numericKeys: [] };

  const numericKeys = resolveYAxes(data, { ...config, yAxis: undefined }, labelKey).slice(0, 6);
  const { data: aggregated } = aggregateForCartesianChart(data, {
    ...config,
    xAxis: labelKey,
    yAxis: numericKeys,
    aggregation: config.aggregation || 'avg',
  });

  return {
    data: aggregated.slice(0, config.limit || 20),
    labelKey,
    numericKeys,
  };
}

export function prepareScatterData(
  data: Row[],
  config: ChartConfig
): { data: Row[]; xKey?: string; yKey?: string } {
  const firstRow = data[0] || {};
  const numericKeys = Object.keys(firstRow).filter((key) => data.some((row) => toFiniteNumber(row[key]) !== null));
  const xKey = config.xAxis || numericKeys[0];
  const yKey = Array.isArray(config.yAxis) ? config.yAxis[0] : config.yAxis || numericKeys.find((key) => key !== xKey);

  if (!xKey || !yKey) return { data: [], xKey, yKey };

  return {
    xKey,
    yKey,
    data: data
      .map((row) => ({
        ...row,
        [xKey]: toFiniteNumber(row[xKey]),
        [yKey]: toFiniteNumber(row[yKey]),
      }))
      .filter((row) => isFiniteNumber(row[xKey]) && isFiniteNumber(row[yKey])),
  };
}

export function summarizeKPI(data: Row[], config: KPIConfig): number {
  const metric = config.metric || resolveYAxes(data, {}, undefined)[0];
  if (!metric) return data.length;

  const values = data.map((row) => toFiniteNumber(row[metric])).filter((value): value is number => value !== null);
  if (values.length === 0) return data.length;

  switch (config.aggregation) {
    case 'avg':
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    case 'count':
      return values.length;
    default:
      return values.reduce((sum, value) => sum + value, 0);
  }
}

export function shouldAggregate(chartType: ChartType): boolean {
  return ['line', 'multi-line', 'area', 'stacked-area', 'bar', 'horizontal-bar', 'stacked-bar', 'pie', 'donut', 'heatmap', 'radar', 'radial-bar', 'treemap', 'funnel', 'waterfall', 'combo'].includes(chartType);
}

/**
 * Pre-aggregate data for a chart spec at creation time so widgets don't
 * have to process the full dataset on every render.
 */
export function preAggregateForSpec(
  allData: Row[],
  chartType: ChartType,
  config: ChartConfig
): Row[] {
  if (chartType === 'kpi') {
    // KPIs only need summary — compute a single-row result
    const kpiConf = config as KPIConfig;
    const value = summarizeKPI(allData, kpiConf);
    return [{ [kpiConf.metric || 'value']: Math.round(value * 100) / 100 }];
  }

  if (chartType === 'table') {
    return allData.slice(0, 200);
  }

  if (chartType === 'scatter' || chartType === 'bubble') {
    const { data } = prepareScatterData(allData, config);
    return data.slice(0, 500);
  }

  if (chartType === 'heatmap') {
    const { data } = prepareHeatmapData(allData, config);
    return data;
  }

  if (['pie', 'donut'].includes(chartType)) {
    const { data } = aggregateForPieChart(allData, config);
    return data;
  }

  // Radar, radial-bar, funnel, treemap — aggregate like pie (categorical + value)
  if (['radar', 'radial-bar', 'funnel', 'treemap'].includes(chartType)) {
    const { data } = aggregateForCartesianChart(allData, config);
    return data.slice(0, 20);
  }

  // Waterfall — keep ordered, limited
  if (chartType === 'waterfall') {
    const { data } = aggregateForCartesianChart(allData, config);
    return data.slice(0, 20);
  }

  // All other cartesian charts (line, bar, area, combo, etc.)
  if (shouldAggregate(chartType)) {
    const { data } = aggregateForCartesianChart(allData, config);
    return data;
  }

  return allData.slice(0, 200);
}
