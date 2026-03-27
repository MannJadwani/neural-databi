import { useState, useRef, useCallback } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import type { DatasetSchema } from '../../lib/types';

interface Props {
  onSend: (message: string) => void;
  onStop: () => void;
  isLoading: boolean;
  schema: DatasetSchema | null;
}

const SUGGESTIONS = [
  'Describe this dataset',
  'Show me the distribution of the main metric',
  'What are the top 10 records?',
  'Create a summary dashboard with key charts',
];

function getSchemaSuggestions(schema: DatasetSchema | null): string[] {
  if (!schema) return SUGGESTIONS;

  const numCols = schema.columns.filter((c) => c.type === 'number');
  const catCols = schema.columns.filter((c) => c.type === 'string' && c.uniqueCount > 1 && c.uniqueCount <= 20);
  const dateCols = schema.columns.filter((c) => c.type === 'date');
  const suggestions: string[] = [];

  suggestions.push(`Describe this dataset`);

  if (numCols.length > 0 && catCols.length > 0) {
    suggestions.push(`Show ${numCols[0].name} by ${catCols[0].name} as a bar chart`);
  }
  if (dateCols.length > 0 && numCols.length > 0) {
    suggestions.push(`Show the trend of ${numCols[0].name} over time`);
  }
  if (numCols.length >= 2) {
    suggestions.push(`Compare ${numCols[0].name} vs ${numCols[1].name}`);
  }
  if (catCols.length > 0) {
    suggestions.push(`What's the distribution of ${catCols[0].name}?`);
  }

  return suggestions.slice(0, 4);
}

export function ChatInput({ onSend, onStop, isLoading, schema }: Props) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestions = getSchemaSuggestions(schema);

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [input, isLoading, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  return (
    <div className="border-t border-brand-border p-4 shrink-0">
      {/* Suggestions (only when empty and not loading) */}
      {!input && !isLoading && (
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => onSend(s)}
              className="px-3 py-1.5 text-xs text-zinc-500 border border-zinc-800 rounded-full hover:border-zinc-600 hover:text-zinc-300 transition-colors cursor-pointer truncate max-w-[250px]"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your data..."
          rows={1}
          className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-zinc-600 transition-colors"
        />
        {isLoading ? (
          <button
            onClick={onStop}
            className="p-3 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <Square className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-3 bg-white rounded-lg text-black disabled:bg-zinc-800 disabled:text-zinc-600 transition-colors cursor-pointer shrink-0 disabled:cursor-not-allowed"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
