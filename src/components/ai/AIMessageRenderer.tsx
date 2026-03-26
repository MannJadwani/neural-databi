import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Wrench, Loader2 } from 'lucide-react';
import type { AgentMessage } from '../../hooks/useAgent';
import { cn } from '../../lib/utils';

interface AIMessageRendererProps {
  message: AgentMessage;
}

export function AIMessageRenderer({ message }: AIMessageRendererProps) {
  if (message.role === 'user') {
    return (
      <div className="space-y-1 text-right">
        <div className="text-[10px] uppercase text-zinc-500">You</div>
        <div className="bg-white text-black p-3 text-sm inline-block text-left">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase text-zinc-500">Nexus Agent</div>

      {/* Tool call indicators */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="space-y-1 mb-1.5">
          {message.toolCalls.map((tc, i) => (
            <div key={i} className="flex items-center gap-1.5">
              {tc.status === 'running' ? (
                <Loader2 className="w-2.5 h-2.5 animate-spin text-zinc-500" />
              ) : (
                <Wrench className="w-2.5 h-2.5 text-emerald-600" />
              )}
              <span className={cn(
                'text-[10px]',
                tc.status === 'running' ? 'text-zinc-500' : 'text-zinc-600'
              )}>
                {formatToolName(tc.name)}
                {tc.status === 'running' ? '...' : ''}
                {tc.status === 'done' && tc.result && (
                  <span className="text-zinc-700"> — {formatToolResult(tc.result)}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Message content with markdown */}
      {message.content && (
        <div className="bg-zinc-900 border border-zinc-800 p-3 text-sm ai-message">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="text-zinc-300 mb-2 last:mb-0 leading-relaxed">{children}</p>,
              strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>,
              em: ({ children }) => <em className="text-zinc-400 italic">{children}</em>,
              ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 text-zinc-300">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 text-zinc-300">{children}</ol>,
              li: ({ children }) => <li className="text-zinc-300 text-sm">{children}</li>,
              code: ({ children, className }) => {
                const isBlock = className?.includes('language-');
                if (isBlock) {
                  return (
                    <pre className="bg-black border border-zinc-800 p-2 overflow-x-auto mb-2 text-xs">
                      <code className="text-zinc-300">{children}</code>
                    </pre>
                  );
                }
                return <code className="bg-zinc-800 px-1 py-0.5 text-xs text-zinc-300">{children}</code>;
              },
              table: ({ children }) => (
                <div className="overflow-x-auto mb-2">
                  <table className="w-full text-xs border-collapse border border-zinc-800">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-zinc-900">{children}</thead>,
              th: ({ children }) => <th className="text-left p-1.5 text-zinc-500 font-bold text-[10px] uppercase border border-zinc-800">{children}</th>,
              td: ({ children }) => <td className="p-1.5 text-zinc-400 border border-zinc-800">{children}</td>,
              h1: ({ children }) => <h1 className="text-white font-bold text-base mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-white font-bold text-sm mb-1.5">{children}</h2>,
              h3: ({ children }) => <h3 className="text-white font-bold text-xs mb-1">{children}</h3>,
              a: ({ children, href }) => <a href={href} className="text-blue-400 underline" target="_blank" rel="noreferrer">{children}</a>,
              blockquote: ({ children }) => <blockquote className="border-l-2 border-zinc-700 pl-3 text-zinc-500 italic mb-2">{children}</blockquote>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

function formatToolName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatToolResult(result: string): string {
  try {
    const parsed = JSON.parse(result);
    if (parsed.error) return parsed.error;
    if (parsed.message) return parsed.message;
    if (parsed.row_count !== undefined) return `${parsed.row_count} rows`;
    if (parsed.summary) return parsed.summary;
    return 'Done';
  } catch {
    return result.slice(0, 50);
  }
}
