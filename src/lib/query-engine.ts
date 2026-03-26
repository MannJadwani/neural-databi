// Client-side data query engine
// Operates on in-memory arrays — no SQL, no DB connection needed

type Row = Record<string, unknown>;
type AggFn = 'sum' | 'avg' | 'count' | 'min' | 'max';

export function filterRows(
  data: Row[],
  conditions: { column: string; operator: string; value: unknown }[]
): Row[] {
  return data.filter((row) =>
    conditions.every((cond) => {
      const val = row[cond.column];
      const target = cond.value;
      switch (cond.operator) {
        case 'eq': return val === target;
        case 'neq': return val !== target;
        case 'gt': return Number(val) > Number(target);
        case 'gte': return Number(val) >= Number(target);
        case 'lt': return Number(val) < Number(target);
        case 'lte': return Number(val) <= Number(target);
        case 'contains': return String(val).toLowerCase().includes(String(target).toLowerCase());
        case 'startsWith': return String(val).toLowerCase().startsWith(String(target).toLowerCase());
        default: return true;
      }
    })
  );
}

export function sortRows(data: Row[], column: string, order: 'asc' | 'desc' = 'asc'): Row[] {
  return [...data].sort((a, b) => {
    const av = a[column];
    const bv = b[column];
    if (typeof av === 'number' && typeof bv === 'number') {
      return order === 'asc' ? av - bv : bv - av;
    }
    const cmp = String(av).localeCompare(String(bv));
    return order === 'asc' ? cmp : -cmp;
  });
}

export function topN(data: Row[], column: string, n: number, order: 'desc' | 'asc' = 'desc'): Row[] {
  return sortRows(data, column, order).slice(0, n);
}

export function aggregateRows(
  data: Row[],
  groupBy: string,
  metrics: { column: string; fn: AggFn; alias?: string }[]
): Row[] {
  const groups = new Map<string, Row[]>();
  for (const row of data) {
    const key = String(row[groupBy] ?? '');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const result: Row[] = [];
  for (const [key, rows] of groups) {
    const agg: Row = { [groupBy]: key };
    for (const m of metrics) {
      const values = rows.map((r) => Number(r[m.column]) || 0);
      const name = m.alias || `${m.fn}_${m.column}`;
      switch (m.fn) {
        case 'sum': agg[name] = values.reduce((a, b) => a + b, 0); break;
        case 'avg': agg[name] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0; break;
        case 'count': agg[name] = values.length; break;
        case 'min': agg[name] = Math.min(...values); break;
        case 'max': agg[name] = Math.max(...values); break;
      }
      // Round to 2 decimals
      if (typeof agg[name] === 'number') agg[name] = Math.round((agg[name] as number) * 100) / 100;
    }
    result.push(agg);
  }
  return result;
}

export function computeColumn(data: Row[], expression: string, alias: string): Row[] {
  // Simple expression parser: supports column references and basic math
  // e.g., "revenue / users" or "price * quantity"
  return data.map((row) => {
    try {
      // Replace column names with values
      let expr = expression;
      for (const [key, val] of Object.entries(row)) {
        expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), String(Number(val) || 0));
      }
      const result = Function(`"use strict"; return (${expr})`)();
      return { ...row, [alias]: Math.round(Number(result) * 100) / 100 };
    } catch {
      return { ...row, [alias]: 0 };
    }
  });
}

export function sampleRows(data: Row[], n: number): Row[] {
  if (data.length <= n) return data;
  const step = Math.floor(data.length / n);
  return Array.from({ length: n }, (_, i) => data[i * step]);
}

export function describeData(data: Row[], columns?: string[]): string {
  if (data.length === 0) return 'Empty dataset';
  const cols = columns || Object.keys(data[0]);
  const lines: string[] = [`${data.length} rows, ${cols.length} columns`];

  for (const col of cols) {
    const values = data.map((r) => r[col]).filter((v) => v != null);
    const nums = values.map(Number).filter((n) => !isNaN(n));
    if (nums.length > values.length * 0.8) {
      const sum = nums.reduce((a, b) => a + b, 0);
      lines.push(`  ${col}: numeric, min=${Math.min(...nums)}, max=${Math.max(...nums)}, avg=${(sum / nums.length).toFixed(2)}`);
    } else {
      const unique = new Set(values.map(String));
      lines.push(`  ${col}: ${unique.size} unique values, sample: ${[...unique].slice(0, 3).join(', ')}`);
    }
  }
  return lines.join('\n');
}
