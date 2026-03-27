import { Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AIInsightsCardProps {
  insights: string;
}

export function AIInsightsCard({ insights }: AIInsightsCardProps) {
  return (
    <div className="bg-brand-surface border border-brand-border p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-white">AI Insights</h3>
      </div>
      <div className="text-sm text-zinc-300 leading-relaxed ai-insights">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
            ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 text-zinc-400">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 text-zinc-400">{children}</ol>,
            li: ({ children }) => <li className="text-zinc-400 text-sm">{children}</li>,
          }}
        >
          {insights}
        </ReactMarkdown>
      </div>
    </div>
  );
}
