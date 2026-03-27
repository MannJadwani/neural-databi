import type { ChartSpec } from './types';
import type { Id } from '../../convex/_generated/dataModel';

const CHUNK_SIZE = 400; // rows per chunk (stay under 1MB Convex doc limit)

/**
 * Split data rows into chunks for Convex storage
 */
export function chunkRows(data: Record<string, unknown>[]): Record<string, unknown>[][] {
  const chunks: Record<string, unknown>[][] = [];
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    chunks.push(data.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
}

/**
 * Convert a ChartSpec to widget DB fields (strip the `data` field out, put in `chartData`)
 */
export function specToWidgetFields(
  spec: ChartSpec,
  dashboardId: Id<'dashboards'>
) {
  return {
    dashboardId,
    chartType: spec.chartType,
    title: spec.title,
    config: spec.config,
    chartData: spec.data, // pre-aggregated data stored directly
    position: spec.position || { x: 0, y: 0 },
    size: spec.size || { w: 6, h: 2 },
  };
}

/**
 * Convert a widget DB record back to a ChartSpec
 */
export function widgetToSpec(widget: {
  _id: any;
  chartType: string;
  title: string;
  config: any;
  chartData: any;
  position: { x: number; y: number };
  size: { w: number; h: number };
}): ChartSpec {
  return {
    id: widget._id,
    chartType: widget.chartType as ChartSpec['chartType'],
    title: widget.title,
    data: widget.chartData || [],
    config: widget.config || {},
    position: widget.position,
    size: widget.size,
  };
}
