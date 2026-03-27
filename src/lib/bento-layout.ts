import type { ChartSpec, ChartType } from './types';

const COLS = 12;

/**
 * Find the next available position in the grid given existing widgets.
 */
export function findNextPosition(
  existingWidgets: ChartSpec[],
  newSize: { w: number; h: number }
): { x: number; y: number } {
  const grid: boolean[][] = [];

  function occupy(x: number, y: number, w: number, h: number) {
    for (let row = y; row < y + h; row++) {
      if (!grid[row]) grid[row] = new Array(COLS).fill(false);
      for (let col = x; col < x + w; col++) {
        grid[row][col] = true;
      }
    }
  }

  function isOccupied(x: number, y: number, w: number, h: number): boolean {
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) {
        if (grid[row]?.[col]) return true;
      }
    }
    return false;
  }

  for (const w of existingWidgets) {
    if (w.position && w.size) {
      occupy(w.position.x, w.position.y, w.size.w, w.size.h);
    }
  }

  for (let y = 0; y < 200; y++) {
    for (let x = 0; x <= COLS - newSize.w; x++) {
      if (!isOccupied(x, y, newSize.w, newSize.h)) {
        return { x, y };
      }
    }
  }
  return { x: 0, y: 0 };
}

/**
 * Bento row patterns — predefined arrangements that always sum to 12.
 * Each pattern is an array of column widths.
 * We cycle through these to create visual rhythm.
 */
const ROW_PATTERNS: number[][] = [
  [8, 4],       // hero + sidebar
  [4, 4, 4],    // three equal
  [6, 6],       // two halves
  [5, 7],       // asymmetric
  [4, 8],       // sidebar + hero (reversed)
  [3, 3, 6],    // two small + one wide
  [7, 5],       // asymmetric alt
  [12],         // full width
  [6, 3, 3],    // one wide + two small
  [4, 4, 4],    // three equal again
];

/**
 * Assigns visual-hierarchy-aware sizes and positions.
 */
export function applyBentoLayout(charts: ChartSpec[]): ChartSpec[] {
  const kpis = charts.filter((c) => c.chartType === 'kpi');
  const nonKpis = charts.filter((c) => c.chartType !== 'kpi');

  // KPIs: top row
  const laidOutKpis = kpis.map((kpi, i) => ({
    ...kpi,
    position: { x: (i % 4) * 3, y: 0 },
    size: { w: 3, h: 1 },
  }));

  // Assign charts to rows using patterns
  const result: ChartSpec[] = [];
  let chartIdx = 0;
  let patternIdx = 0;
  let y = kpis.length > 0 ? 1 : 0;

  // Full-width chart types that should always be 12 cols
  const forceFullWidth = new Set<ChartType>(['table', 'heatmap']);

  while (chartIdx < nonKpis.length) {
    const chart = nonKpis[chartIdx];

    // Force full-width for certain types
    if (forceFullWidth.has(chart.chartType)) {
      result.push({
        ...chart,
        position: { x: 0, y },
        size: { w: 12, h: 4 },
      });
      chartIdx++;
      y += 4;
      continue;
    }

    // Pick a row pattern
    const pattern = ROW_PATTERNS[patternIdx % ROW_PATTERNS.length];
    patternIdx++;

    // How many charts left?
    const chartsLeft = nonKpis.length - chartIdx;

    // If only 1 chart left, give it full width
    if (chartsLeft === 1) {
      result.push({
        ...chart,
        position: { x: 0, y },
        size: { w: 12, h: 3 },
      });
      chartIdx++;
      y += 3;
      continue;
    }

    // Fill the pattern with available charts
    let x = 0;
    const rowHeight = getRowHeight(nonKpis[chartIdx]?.chartType);
    const slotsToFill = Math.min(pattern.length, chartsLeft);

    // If we have fewer charts than pattern slots, merge the remaining width
    const actualPattern = slotsToFill < pattern.length
      ? mergePattern(pattern, slotsToFill)
      : pattern;

    for (let i = 0; i < actualPattern.length && chartIdx < nonKpis.length; i++) {
      const w = actualPattern[i];
      result.push({
        ...nonKpis[chartIdx],
        position: { x, y },
        size: { w, h: rowHeight },
      });
      x += w;
      chartIdx++;
    }

    y += rowHeight;
  }

  return [...laidOutKpis, ...result];
}

function getRowHeight(chartType: ChartType): number {
  if (chartType === 'funnel' || chartType === 'radar') return 4;
  if (chartType === 'table' || chartType === 'heatmap') return 4;
  return 3;
}

/**
 * Merge a pattern when we don't have enough charts to fill all slots.
 * E.g., pattern [4,4,4] with 2 charts → [4,8]
 */
function mergePattern(pattern: number[], count: number): number[] {
  if (count >= pattern.length) return pattern;
  const result = pattern.slice(0, count);
  // Add remaining width to the last slot
  const used = result.reduce((a, b) => a + b, 0);
  result[result.length - 1] += (12 - used);
  return result;
}
