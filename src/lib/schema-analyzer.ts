import type { ChartType, DatasetSchema, ColumnInfo, VisualizationSuggestion } from './types';

function getColumnsByType(schema: DatasetSchema, type: ColumnInfo['type']): ColumnInfo[] {
  return schema.columns.filter((c) => c.type === type);
}

function isLowCardinality(col: ColumnInfo, threshold = 15): boolean {
  return col.uniqueCount <= threshold;
}

const KPI_KEYWORDS = [
  'revenue', 'sales', 'total', 'count', 'profit', 'cost', 'amount',
  'income', 'expense', 'price', 'quantity', 'balance', 'budget',
];

function isKPICandidate(col: ColumnInfo): boolean {
  const lower = col.name.toLowerCase();
  return KPI_KEYWORDS.some((kw) => lower.includes(kw));
}

export function analyzeSchema(schema: DatasetSchema): VisualizationSuggestion[] {
  const suggestions: VisualizationSuggestion[] = [];
  const dateColumns = getColumnsByType(schema, 'date');
  const numericColumns = getColumnsByType(schema, 'number');
  const stringColumns = getColumnsByType(schema, 'string');
  const categoricalColumns = stringColumns.filter((c) => isLowCardinality(c));

  // KPI cards for important single metrics
  for (const num of numericColumns) {
    if (isKPICandidate(num)) {
      suggestions.push({
        chartType: 'kpi',
        title: num.name.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        reasoning: `"${num.name}" looks like a key metric (range: ${num.stats?.min?.toLocaleString()} – ${num.stats?.max?.toLocaleString()})`,
        config: {
          metric: num.name,
          label: num.name.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          format: 'number',
          aggregation: 'sum',
        } as any,
        confidence: 0.85,
      });
    }
  }

  // Date + numeric → line chart
  if (dateColumns.length > 0) {
    const dateCol = dateColumns[0];

    suggestions.push({
      chartType: 'line',
      title: `Records over ${dateCol.name}`,
      reasoning: `Count of records grouped by "${dateCol.name}"`,
      config: { xAxis: dateCol.name, aggregation: 'count' },
      confidence: 0.92,
    });

    if (numericColumns.length === 1) {
      suggestions.push({
        chartType: 'line',
        title: `Average ${numericColumns[0].name} over ${dateCol.name}`,
        reasoning: `Time series average: "${dateCol.name}" (date) × "${numericColumns[0].name}" (numeric)`,
        config: { xAxis: dateCol.name, yAxis: numericColumns[0].name, aggregation: 'avg' },
        confidence: 0.82,
      });
    } else if (numericColumns.length > 1) {
      // Multi-line for multiple numeric columns
      suggestions.push({
        chartType: 'multi-line',
        title: `Average trends over ${dateCol.name}`,
        reasoning: `Time series averages with ${numericColumns.length} metrics over "${dateCol.name}"`,
        config: { xAxis: dateCol.name, yAxis: numericColumns.slice(0, 4).map((c) => c.name), showLegend: true, aggregation: 'avg' },
        confidence: 0.78,
      });
    }

    // Area chart variant
    if (numericColumns.length > 0) {
      suggestions.push({
        chartType: 'area',
        title: `Average ${numericColumns[0].name} trend`,
        reasoning: `Area view of average "${numericColumns[0].name}" over "${dateCol.name}"`,
        config: { xAxis: dateCol.name, yAxis: numericColumns[0].name, aggregation: 'avg' },
        confidence: 0.7,
      });
    }
  }

  // Categorical counts → bar chart
  for (const cat of categoricalColumns) {
    suggestions.push({
      chartType: 'bar',
      title: `Count by ${cat.name}`,
      reasoning: `Frequency distribution across "${cat.name}" (${cat.uniqueCount} categories)`,
      config: { xAxis: cat.name, aggregation: 'count' },
      confidence: 0.88,
    });
  }

  // Categorical + numeric → bar chart
  for (const cat of categoricalColumns) {
    for (const num of numericColumns.slice(0, 2)) {
      suggestions.push({
        chartType: 'bar',
        title: `${num.name} by ${cat.name}`,
        reasoning: `Categorical breakdown: "${cat.name}" (${cat.uniqueCount} categories) × "${num.name}"`,
        config: { xAxis: cat.name, yAxis: num.name, aggregation: 'avg' },
        confidence: 0.76,
      });
    }
  }

  // Low cardinality categorical + numeric → pie chart
  for (const cat of categoricalColumns.filter((c) => isLowCardinality(c, 8))) {
    suggestions.push({
      chartType: 'pie',
      title: `${cat.name} distribution`,
      reasoning: `Proportional count view: "${cat.name}" has only ${cat.uniqueCount} categories`,
      config: { xAxis: cat.name, aggregation: 'count' },
      confidence: 0.8,
    });
    if (numericColumns.length > 0) {
      suggestions.push({
        chartType: 'donut',
        title: `Average ${numericColumns[0].name} by ${cat.name}`,
        reasoning: `Proportional view of average "${numericColumns[0].name}" across "${cat.name}"`,
        config: { xAxis: cat.name, yAxis: numericColumns[0].name, aggregation: 'avg' },
        confidence: 0.68,
      });
    }
    break;
  }

  // 2 numeric columns → scatter
  if (numericColumns.length >= 2) {
    suggestions.push({
      chartType: 'scatter',
      title: `${numericColumns[0].name} vs ${numericColumns[1].name}`,
      reasoning: `Correlation analysis between two numeric columns`,
      config: { xAxis: numericColumns[0].name, yAxis: numericColumns[1].name },
      confidence: 0.65,
    });
  }

  // Heatmap if there are 3+ numeric columns
  if (numericColumns.length >= 3 && (categoricalColumns.length > 0 || dateColumns.length > 0)) {
    const labelCol = categoricalColumns[0] || dateColumns[0];
    suggestions.push({
      chartType: 'heatmap',
      title: `Metrics heatmap by ${labelCol.name}`,
      reasoning: `${numericColumns.length} numeric columns can be compared as a heatmap across "${labelCol.name}"`,
      config: { xAxis: labelCol.name },
      confidence: 0.6,
    });
  }

  // Table view (always)
  suggestions.push({
    chartType: 'table',
    title: 'Data Table',
    reasoning: `Full data view with ${schema.columns.length} columns and ${schema.rowCount} rows`,
    config: { limit: 100 },
    confidence: 0.5,
  });

  // Sort by confidence descending
  suggestions.sort((a, b) => b.confidence - a.confidence);

  return suggestions;
}
