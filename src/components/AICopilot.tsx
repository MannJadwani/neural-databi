import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Square, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAgent } from '../hooks/useAgent';
import { useDashboard } from '../lib/dashboard-store';
import { SuggestedPrompts } from './ai/SuggestedPrompts';
import { AIMessageRenderer } from './ai/AIMessageRenderer';

interface AICopilotProps {
  data?: Record<string, unknown>[];
  dashboardId?: string;
}

export function AICopilot({ data, dashboardId }: AICopilotProps) {
  const { schema, widgets } = useDashboard();
  const { messages, isLoading, sendMessage, stop, clearMessages } = useAgent(data || [], schema, dashboardId);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasData = !!schema && (data?.length || 0) > 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <div className="w-80 border-l border-brand-border bg-brand-surface flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-brand-border flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-white" />
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider">AI Copilot</h2>
        <div className="ml-auto flex items-center gap-1">
          {isLoading && <Loader2 className="w-3 h-3 text-zinc-400 animate-spin" />}
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="p-1 hover:text-white transition-colors"
              title="Clear conversation"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Sparkles className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
            <p className="text-xs text-zinc-500 leading-relaxed">
              {hasData
                ? `Dataset loaded: ${schema!.rowCount.toLocaleString()} rows, ${schema!.columns.length} columns. Ask me to create charts, analyze patterns, or modify the dashboard.`
                : 'Upload a CSV and create a dashboard to start chatting with your data.'}
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <AIMessageRenderer message={m} />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase text-zinc-500">Nexus Agent</div>
            <div className="bg-zinc-900 border border-zinc-800 p-3">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-brand-border space-y-3">
        <SuggestedPrompts
          schema={schema}
          widgets={widgets}
          onSelect={(prompt) => sendMessage(prompt)}
          disabled={!hasData || isLoading}
        />

        <div className="relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={hasData ? 'Ask about your data...' : 'Upload data first...'}
            disabled={!hasData}
            className="w-full bg-black border border-brand-border p-3 pr-10 text-sm focus:outline-none focus:border-white transition-colors disabled:opacity-50"
          />
          <button
            onClick={isLoading ? stop : handleSend}
            disabled={!hasData}
            className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-white transition-colors disabled:opacity-30"
          >
            {isLoading ? <Square className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
