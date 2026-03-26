import Papa from 'papaparse';
import type { ColumnInfo, DatasetSchema } from './types';

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,                    // 2024-01-15
  /^\d{4}\/\d{2}\/\d{2}$/,                  // 2024/01/15
  /^\d{2}\/\d{2}\/\d{4}$/,                  // 01/15/2024
  /^\d{2}-\d{2}-\d{4}$/,                    // 01-15-2024
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,        // ISO datetime
  /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i, // Month names
];

function isDateValue(value: string): boolean {
  if (!value || value.length < 4) return false;
  return DATE_PATTERNS.some((p) => p.test(value.trim()));
}

function inferColumnType(values: unknown[]): 'string' | 'number' | 'date' | 'boolean' {
  const nonNull = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
  if (nonNull.length === 0) return 'string';

  const sample = nonNull.slice(0, 100);

  // Check boolean
  const boolStrings = new Set(['true', 'false', 'yes', 'no', '0', '1']);
  const boolCount = sample.filter((v) => boolStrings.has(String(v).toLowerCase().trim())).length;
  if (boolCount / sample.length > 0.9) return 'boolean';

  // Check number
  const numCount = sample.filter((v) => {
    const s = String(v).trim().replace(/[$,€£%]/g, '');
    return s !== '' && !isNaN(Number(s));
  }).length;
  if (numCount / sample.length > 0.8) return 'number';

  // Check date
  const dateCount = sample.filter((v) => isDateValue(String(v))).length;
  if (dateCount / sample.length > 0.7) return 'date';

  return 'string';
}

function computeNumericStats(values: number[]): { min: number; max: number; mean: number; median: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mid = Math.floor(sorted.length / 2);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Math.round((sum / sorted.length) * 100) / 100,
    median: sorted.length % 2 ? sorted[mid] : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100,
  };
}

function toNumber(value: unknown): number | null {
  const s = String(value).trim().replace(/[$,€£%]/g, '');
  const n = Number(s);
  return isNaN(n) ? null : n;
}

function analyzeColumn(name: string, values: unknown[]): ColumnInfo {
  const type = inferColumnType(values);
  const nonNull = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
  const uniqueValues = new Set(nonNull.map(String));

  const info: ColumnInfo = {
    name,
    type,
    nullable: nonNull.length < values.length,
    uniqueCount: uniqueValues.size,
    sampleValues: [...uniqueValues].slice(0, 5).map((v) => (type === 'number' ? Number(v.replace(/[$,€£%]/g, '')) : v)),
  };

  if (type === 'number') {
    const nums = nonNull.map(toNumber).filter((n): n is number => n !== null);
    if (nums.length > 0) {
      info.stats = computeNumericStats(nums);
    }
  }

  return info;
}

export interface ParseResult {
  data: Record<string, unknown>[];
  schema: DatasetSchema;
  errors: string[];
}

export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete(results) {
        const data = results.data as Record<string, unknown>[];
        const errors = results.errors.map((e) => `Row ${e.row}: ${e.message}`);

        if (data.length === 0) {
          reject(new Error('CSV file is empty or has no valid rows'));
          return;
        }

        const columns = Object.keys(data[0]).map((name) => {
          const values = data.map((row) => row[name]);
          return analyzeColumn(name, values);
        });

        // Convert numeric columns from string to number in the data
        const typedData = data.map((row) => {
          const typed: Record<string, unknown> = {};
          for (const col of columns) {
            const val = row[col.name];
            if (col.type === 'number' && val !== null && val !== undefined) {
              typed[col.name] = toNumber(val) ?? val;
            } else {
              typed[col.name] = val;
            }
          }
          return typed;
        });

        const schema: DatasetSchema = {
          columns,
          rowCount: typedData.length,
          sampleRows: typedData.slice(0, 10),
        };

        resolve({ data: typedData, schema, errors });
      },
      error(err) {
        reject(new Error(`Failed to parse CSV: ${err.message}`));
      },
    });
  });
}
