import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Wrench, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ChatMessage } from '../../lib/types';
import { ArtifactThumbnail } from './ArtifactThumbnail';

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  selectedArtifactId: string | null;
  onArtifactSelect: (id: string) => void;
}

export function ChatMessageList({ messages, isLoading, selectedArtifactId, onArtifactSelect }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-zinc-900 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-zinc-600" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Chat with your data</h2>
          <p className="text-sm text-zinc-600 leading-relaxed">
            Ask questions, request charts, or explore patterns. The AI can query your dataset
            and create interactive visualizations on the fly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {msg.role === 'user' ? (
              <UserMessage content={msg.content} />
            ) : (
              <AssistantMessage
                message={msg}
                selectedArtifactId={selectedArtifactId}
                onArtifactSelect={onArtifactSelect}
              />
            )}
          </motion.div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-zinc-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-xs">Thinking...</span>
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="bg-white text-black px-4 py-2.5 rounded-2xl rounded-br-sm text-sm max-w-[80%]">
        {content}
      </div>
    </div>
  );
}

function AssistantMessage({
  message,
  selectedArtifactId,
  onArtifactSelect,
}: {
  message: ChatMessage;
  selectedArtifactId: string | null;
  onArtifactSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {/* Tool call indicators */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="space-y-1">
          {message.toolCalls.map((tc, i) => (
            <div key={i} className="flex items-center gap-1.5">
              {tc.status === 'running' ? (
                <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />
              ) : (
                <Wrench className="w-3 h-3 text-emerald-600" />
              )}
              <span className="text-[11px] text-zinc-600">
                {tc.name.replace(/_/g, ' ')}
                {tc.status === 'running' && '...'}
                {tc.status === 'done' && tc.result && (
                  <span className="text-zinc-700"> — {formatResult(tc.result)}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Text content */}
      {message.content && (
        <div className="text-sm ai-message">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="text-zinc-300 mb-2 last:mb-0 leading-relaxed">{children}</p>,
              strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
              em: ({ children }) => <em className="text-zinc-400 italic">{children}</em>,
              ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 text-zinc-300">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 text-zinc-300">{children}</ol>,
              li: ({ children }) => <li className="text-zinc-300">{children}</li>,
              code: ({ children, className }) => {
                if (className?.includes('language-')) {
                  return (
                    <pre className="bg-black border border-zinc-800 p-3 overflow-x-auto mb-2 rounded text-xs">
                      <code className="text-zinc-300">{children}</code>
                    </pre>
                  );
                }
                return <code className="bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-300 rounded">{children}</code>;
              },
              table: ({ children }) => (
                <div className="overflow-x-auto mb-2 border border-zinc-800 rounded">
                  <table className="w-full text-xs border-collapse">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-zinc-900">{children}</thead>,
              th: ({ children }) => <th className="text-left p-2 text-zinc-500 font-bold text-[10px] uppercase border-b border-zinc-800">{children}</th>,
              td: ({ children }) => <td className="p-2 text-zinc-400 border-b border-zinc-800/50">{children}</td>,
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

      {/* Artifact thumbnails */}
      {message.artifacts && message.artifacts.length > 0 && (
        <div className="space-y-2">
          {message.artifacts.map((artifact) => (
            <ArtifactThumbnail
              key={artifact.id}
              artifact={artifact}
              isSelected={selectedArtifactId === artifact.id}
              onSelect={onArtifactSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function formatResult(result: string): string {
  try {
    const parsed = JSON.parse(result);
    if (parsed.error) return parsed.error;
    if (parsed.message) return parsed.message;
    if (parsed.row_count !== undefined) return `${parsed.row_count} rows`;
    return 'Done';
  } catch {
    return result.slice(0, 50);
  }
}
