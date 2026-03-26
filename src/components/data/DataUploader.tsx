import { useState, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { parseCSV, type ParseResult } from '../../lib/csv-parser';
import { analyzeSchema } from '../../lib/schema-analyzer';
import type { VisualizationSuggestion, DatasetSchema } from '../../lib/types';

type UploadStatus = 'idle' | 'parsing' | 'analyzing' | 'ready' | 'error';

export interface UploadedDataset {
  fileName: string;
  fileSize: number;
  data: Record<string, unknown>[];
  schema: DatasetSchema;
  suggestions: VisualizationSuggestion[];
  parseErrors: string[];
}

interface DataUploaderProps {
  onUploadComplete: (dataset: UploadedDataset) => void;
  onClose: () => void;
}

export function DataUploader({ onUploadComplete, onClose }: DataUploaderProps) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file');
      setStatus('error');
      return;
    }

    setFileName(file.name);
    setError('');
    setStatus('parsing');

    try {
      const result: ParseResult = await parseCSV(file);

      setStatus('analyzing');

      // Small delay so user sees the analyzing state
      await new Promise((r) => setTimeout(r, 300));

      const suggestions = analyzeSchema(result.schema);

      setStatus('ready');

      onUploadComplete({
        fileName: file.name,
        fileSize: file.size,
        data: result.data,
        schema: result.schema,
        suggestions,
        parseErrors: result.errors,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
      setStatus('error');
    }
  }, [onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const statusConfig = {
    idle: { icon: Upload, text: 'Drop your CSV file here', color: 'text-zinc-500' },
    parsing: { icon: Loader2, text: `Parsing ${fileName}...`, color: 'text-white' },
    analyzing: { icon: Loader2, text: 'Analyzing schema...', color: 'text-white' },
    ready: { icon: CheckCircle2, text: 'Upload complete!', color: 'text-emerald-500' },
    error: { icon: AlertCircle, text: error, color: 'text-rose-500' },
  };

  const current = statusConfig[status];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-brand-surface border border-brand-border w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brand-border">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">Upload Data Source</h2>
          <button onClick={onClose} className="p-1 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drop zone */}
        <div className="p-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => status === 'idle' || status === 'error' ? fileInputRef.current?.click() : null}
            className={`
              border-2 border-dashed p-12 flex flex-col items-center gap-4 transition-all cursor-pointer
              ${dragOver ? 'border-white bg-white/5' : 'border-zinc-800 hover:border-zinc-600'}
              ${status === 'error' ? 'border-rose-900' : ''}
            `}
          >
            <Icon className={`w-8 h-8 ${current.color} ${status === 'parsing' || status === 'analyzing' ? 'animate-spin' : ''}`} />
            <div className="text-center">
              <p className={`text-sm ${current.color}`}>{current.text}</p>
              {status === 'idle' && (
                <p className="text-xs text-zinc-600 mt-1">or click to browse files</p>
              )}
              {status === 'error' && (
                <p className="text-xs text-zinc-600 mt-1">Click to try again</p>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* File info */}
          {fileName && status !== 'idle' && status !== 'error' && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-brand-bg border border-brand-border">
              <FileSpreadsheet className="w-4 h-4 text-zinc-500" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">{fileName}</p>
              </div>
              {status === 'ready' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            </div>
          )}
        </div>

        {/* Supported formats */}
        <div className="px-6 pb-6">
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
            Supported: CSV files with headers
          </p>
        </div>
      </div>
    </div>
  );
}
