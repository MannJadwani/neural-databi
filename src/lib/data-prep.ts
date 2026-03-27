import { buildDatasetSchema } from './csv-parser';
import { computeColumn } from './query-engine';
import type { ColumnInfo, DatasetPrepStep, PreparedDataset } from './types';

type Row = Record<string, unknown>;

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === '';
}

function castValue(value: unknown, asType: ColumnInfo['type']): unknown {
  if (isBlank(value)) return null;

  switch (asType) {
    case 'number': {
      const normalized = String(value).trim().replace(/[$,€£%]/g, '');
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : value;
    }
    case 'boolean': {
      const normalized = String(value).trim().toLowerCase();
      if (['true', 'yes', '1'].includes(normalized)) return true;
      if (['false', 'no', '0'].includes(normalized)) return false;
      return value;
    }
    case 'date': {
      const parsed = new Date(String(value));
      return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
    }
    default:
      return String(value).trim();
  }
}

function renameColumn(row: Row, from: string, to: string): Row {
  if (!(from in row) || from === to) return row;

  const next: Row = {};
  for (const [key, value] of Object.entries(row)) {
    next[key === from ? to : key] = value;
  }
  return next;
}

export function applyPrepSteps(baseRows: Row[], steps: DatasetPrepStep[]): PreparedDataset {
  let rows = baseRows.map((row) => ({ ...row }));
  const hiddenColumns = new Set<string>();

  for (const step of steps) {
    switch (step.type) {
      case 'rename_column': {
        rows = rows.map((row) => renameColumn(row, step.column, step.newName));
        if (hiddenColumns.delete(step.column)) hiddenColumns.add(step.newName);
        break;
      }
      case 'cast_column': {
        rows = rows.map((row) => ({
          ...row,
          [step.column]: castValue(row[step.column], step.asType),
        }));
        break;
      }
      case 'hide_column': {
        hiddenColumns.add(step.column);
        break;
      }
      case 'fill_nulls': {
        rows = rows.map((row) => (
          isBlank(row[step.column])
            ? { ...row, [step.column]: step.value }
            : row
        ));
        break;
      }
      case 'drop_null_rows': {
        rows = rows.filter((row) => !isBlank(row[step.column]));
        break;
      }
      case 'derive_column': {
        rows = computeColumn(rows, step.expression, step.name);
        hiddenColumns.delete(step.name);
        break;
      }
    }
  }

  const visibleRows = rows.map((row) => {
    const next: Row = {};
    for (const [key, value] of Object.entries(row)) {
      if (!hiddenColumns.has(key)) next[key] = value;
    }
    return next;
  });

  return {
    rows: visibleRows,
    schema: buildDatasetSchema(visibleRows),
    steps,
    hiddenColumns: [...hiddenColumns],
  };
}

export function summarizePrepStep(step: DatasetPrepStep): string {
  switch (step.type) {
    case 'rename_column':
      return `Rename ${step.column} to ${step.newName}`;
    case 'cast_column':
      return `Cast ${step.column} as ${step.asType}`;
    case 'hide_column':
      return `Hide ${step.column}`;
    case 'fill_nulls':
      return `Fill nulls in ${step.column} with ${step.value}`;
    case 'drop_null_rows':
      return `Drop rows with nulls in ${step.column}`;
    case 'derive_column':
      return `Create ${step.name} using ${step.expression}`;
  }
}
