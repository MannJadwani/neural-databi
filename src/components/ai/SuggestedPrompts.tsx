import { useMemo } from 'react';
import type { DatasetSchema, ChartSpec } from '../../lib/types';

interface SuggestedPromptsProps {
  schema: DatasetSchema | null;
  widgets: ChartSpec[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function SuggestedPrompts({ schema, widgets, onSelect, disabled }: SuggestedPromptsProps) {
  const prompts = useMemo(() => {
    if (!schema) return ['Upload a CSV to get started'];

    const results: string[] = [];
    const numericCols = schema.columns.filter((c) => c.type === 'number');
    const dateCols = schema.columns.filter((c) => c.type === 'date');
    const catCols = schema.columns.filter((c) => c.type === 'string' && c.uniqueCount <= 15);

    // Based on current dashboard state
    if (widgets.length === 0) {
      results.push('Create a dashboard overview');
      results.push('What are the key metrics?');
    }

    // Based on schema
    if (dateCols.length > 0 && numericCols.length > 0) {
      results.push(`Show ${numericCols[0].name} trend over ${dateCols[0].name}`);
    }

    if (catCols.length > 0 && numericCols.length > 0) {
      results.push(`Compare ${numericCols[0].name} by ${catCols[0].name}`);
    }

    if (numericCols.length >= 2) {
      results.push(`How does ${numericCols[0].name} correlate with ${numericCols[1].name}?`);
    }

    if (catCols.length > 0) {
      results.push(`Show top ${catCols[0].name} categories`);
    }

    // General prompts
    if (widgets.length > 0) {
      results.push('What patterns do you see?');
      results.push('Add a summary table');
    }

    results.push('Summarize this dataset');

    return results.slice(0, 4);
  }, [schema, widgets]);

  return (
    <div className="flex flex-wrap gap-1.5">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          onClick={() => !disabled && onSelect(prompt)}
          disabled={disabled || !schema}
          className="text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-1 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
