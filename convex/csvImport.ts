import Papa from 'papaparse';

type ColumnType = 'string' | 'number' | 'date' | 'boolean';

type ColumnInfo = {
  name: string;
  type: ColumnType;
  nullable: boolean;
  uniqueCount: number;
  sampleValues: unknown[];
  stats?: {
    min?: number;
    max?: number;
    mean?: number;
    median?: number;
  };
};

type DatasetSchema = {
  columns: ColumnInfo[];
  rowCount: number;
  sampleRows: Record<string, unknown>[];
};

export type ParsedCsvImport = {
  data: Record<string, unknown>[];
  schema: DatasetSchema;
  errors: string[];
};

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{4}\/\d{2}\/\d{2}$/,
  /^\d{2}\/\d{2}\/\d{4}$/,
  /^\d{2}-\d{2}-\d{4}$/,
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,
  /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i,
];

export const DATA_ROW_CHUNK_SIZE = 400;

function isDateValue(value: string): boolean {
  if (!value || value.length < 4) return false;
  return DATE_PATTERNS.some((pattern) => pattern.test(value.trim()));
}

function inferColumnType(values: unknown[]): ColumnType {
  const nonNull = values.filter((value) => value !== null && value !== undefined && String(value).trim() !== '');
  if (nonNull.length === 0) return 'string';

  const sample = nonNull.slice(0, 100);
  const boolStrings = new Set(['true', 'false', 'yes', 'no', '0', '1']);
  const boolCount = sample.filter((value) => boolStrings.has(String(value).toLowerCase().trim())).length;
  if (boolCount / sample.length > 0.9) return 'boolean';

  const numCount = sample.filter((value) => {
    const normalized = String(value).trim().replace(/[$,€£%]/g, '');
    return normalized !== '' && !Number.isNaN(Number(normalized));
  }).length;
  if (numCount / sample.length > 0.8) return 'number';

  const dateCount = sample.filter((value) => isDateValue(String(value))).length;
  if (dateCount / sample.length > 0.7) return 'date';

  return 'string';
}

function computeNumericStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((total, value) => total + value, 0);
  const middleIndex = Math.floor(sorted.length / 2);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Math.round((sum / sorted.length) * 100) / 100,
    median:
      sorted.length % 2
        ? sorted[middleIndex]
        : Math.round(((sorted[middleIndex - 1] + sorted[middleIndex]) / 2) * 100) / 100,
  };
}

function toNumber(value: unknown): number | null {
  const normalized = String(value).trim().replace(/[$,€£%]/g, '');
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function analyzeColumn(name: string, values: unknown[]): ColumnInfo {
  const type = inferColumnType(values);
  const nonNull = values.filter((value) => value !== null && value !== undefined && String(value).trim() !== '');
  const uniqueValues = new Set(nonNull.map(String));

  const info: ColumnInfo = {
    name,
    type,
    nullable: nonNull.length < values.length,
    uniqueCount: uniqueValues.size,
    sampleValues: [...uniqueValues].slice(0, 5).map((value) => (
      type === 'number' ? Number(value.replace(/[$,€£%]/g, '')) : value
    )),
  };

  if (type === 'number') {
    const numbers = nonNull.map(toNumber).filter((value): value is number => value !== null);
    if (numbers.length > 0) {
      info.stats = computeNumericStats(numbers);
    }
  }

  return info;
}

function buildDatasetSchema(data: Record<string, unknown>[]): DatasetSchema {
  if (data.length === 0) {
    return {
      columns: [],
      rowCount: 0,
      sampleRows: [],
    };
  }

  const columns = Object.keys(data[0]).map((name) => analyzeColumn(name, data.map((row) => row[name])));
  return {
    columns,
    rowCount: data.length,
    sampleRows: data.slice(0, 10),
  };
}

export async function parseCsvText(csvText: string): Promise<ParsedCsvImport> {
  return await new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete(results) {
        const data = results.data as Record<string, unknown>[];
        const errors = results.errors.map((error) => `Row ${error.row}: ${error.message}`);

        if (data.length === 0) {
          reject(new Error('CSV payload is empty or has no valid rows'));
          return;
        }

        const inferredSchema = buildDatasetSchema(data);
        const typedData = data.map((row) => {
          const typedRow: Record<string, unknown> = {};
          for (const column of inferredSchema.columns) {
            const value = row[column.name];
            if (column.type === 'number' && value !== null && value !== undefined) {
              typedRow[column.name] = toNumber(value) ?? value;
            } else {
              typedRow[column.name] = value;
            }
          }
          return typedRow;
        });

        resolve({
          data: typedData,
          schema: buildDatasetSchema(typedData),
          errors,
        });
      },
      error(error) {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      },
    });
  });
}

export function chunkRows(rows: Record<string, unknown>[]): Record<string, unknown>[][] {
  const chunks: Record<string, unknown>[][] = [];
  for (let index = 0; index < rows.length; index += DATA_ROW_CHUNK_SIZE) {
    chunks.push(rows.slice(index, index + DATA_ROW_CHUNK_SIZE));
  }
  return chunks;
}

export function fileNameToBaseName(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) return 'Imported Dataset';
  return trimmed.replace(/\.[^.]+$/u, '') || 'Imported Dataset';
}
