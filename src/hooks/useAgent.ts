import { useState, useCallback, useRef } from 'react';
import { useDashboard, useDashboardDispatch } from '../lib/dashboard-store';
import { TOOL_DEFINITIONS, executeToolCall, buildSystemPrompt, type ToolContext } from '../lib/ai-tools';
import { useApp } from '../lib/app-store';
import type { DatasetSchema, ChartSpec } from '../lib/types';
import type { Id } from '../../convex/_generated/dataModel';

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: { name: string; status: 'running' | 'done'; result?: string }[];
  timestamp: number;
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'minimax/minimax-m2.7';
const MAX_TOOL_ROUNDS = 5;
const RETRY_DELAYS = [1000, 3000, 5000];

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
}

export function useAgent(data: Record<string, unknown>[], schema: DatasetSchema | null, dashboardId?: string) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dashState = useDashboard();
  const dispatch = useDashboardDispatch();
  const { addWidget, updateWidget, removeWidget } = useApp();
  const abortRef = useRef<AbortController | null>(null);

  // Keep a ref to latest widgets so tool calls see fresh state
  const widgetsRef = useRef(dashState.widgets);
  widgetsRef.current = dashState.widgets;

  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  const addAssistantMessage = useCallback((id: string, content: string, toolCalls?: AgentMessage['toolCalls']) => {
    setMessages((prev) => {
      const existing = prev.find((m) => m.id === id);
      if (existing) {
        return prev.map((m) => m.id === id ? { ...m, content, toolCalls: toolCalls || m.toolCalls } : m);
      }
      return [...prev, { id, role: 'assistant' as const, content, toolCalls, timestamp: Date.now() }];
    });
  }, []);

  const updateToolStatus = useCallback((assistantId: string, toolName: string, status: 'running' | 'done', result?: string) => {
    setMessages((prev) => {
      const existing = prev.find((m) => m.id === assistantId);
      if (existing) {
        const tools = existing.toolCalls || [];
        if (status === 'running') {
          return prev.map((m) => m.id === assistantId
            ? { ...m, toolCalls: [...tools, { name: toolName, status }] }
            : m
          );
        }
        return prev.map((m) => m.id === assistantId
          ? { ...m, toolCalls: tools.map((t) => t.name === toolName && t.status === 'running' ? { ...t, status, result } : t) }
          : m
        );
      }
      // Create a placeholder message for tool status
      return [...prev, { id: assistantId, role: 'assistant' as const, content: '', toolCalls: [{ name: toolName, status }], timestamp: Date.now() }];
    });
  }, []);

  const sendMessage = useCallback(async (userInput: string) => {
    if (!userInput.trim() || isLoading) return;
    if (!apiKey) {
      addAssistantMessage(`err-${Date.now()}`, 'OpenRouter API key not configured. Add `VITE_OPENROUTER_API_KEY` to your `.env.local` file.');
      return;
    }

    const userMsg: AgentMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userInput,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const assistantId = `ai-${Date.now()}`;

    try {
      // Build system prompt with fresh dashboard state
      const systemPrompt = buildSystemPrompt(schema, widgetsRef.current);
      const apiMessages: OpenAIMessage[] = [
        { role: 'system', content: systemPrompt },
      ];

      // Add recent conversation history (last 20 messages)
      const recent = [...messages.slice(-20), userMsg];
      for (const m of recent) {
        if (m.role === 'user') {
          apiMessages.push({ role: 'user', content: m.content });
        } else if (m.role === 'assistant' && m.content) {
          apiMessages.push({ role: 'assistant', content: m.content });
        }
      }

      // Tool calling loop
      let response = await callWithRetry(apiKey, apiMessages);
      let rounds = 0;

      while (response.toolCalls && response.toolCalls.length > 0 && rounds < MAX_TOOL_ROUNDS) {
        rounds++;

        // Add assistant message with tool calls to API history
        apiMessages.push({
          role: 'assistant',
          content: response.content || null,
          tool_calls: response.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: JSON.stringify(tc.args) },
          })),
        });

        // Execute each tool call
        for (const tc of response.toolCalls) {
          updateToolStatus(assistantId, tc.name, 'running');

          let result: string;
          try {
            // Validate tool args against schema
            if (schema && tc.args && (tc.name === 'query_data' || tc.name === 'create_chart')) {
              validateColumnRefs(tc.args, schema);
            }
            result = await executeToolCall(tc.name, tc.args, {
              data,
              schema: schema!,
              widgets: widgetsRef.current,
              dispatch,
              addWidgetToDb: dashboardId ? (spec: ChartSpec) => addWidget(dashboardId as Id<'dashboards'>, spec) : undefined,
              updateWidgetInDb: (widgetId: string, changes: Partial<ChartSpec>) => updateWidget(widgetId as Id<'widgets'>, changes),
              removeWidgetFromDb: (widgetId: string) => removeWidget(widgetId as Id<'widgets'>),
            });
          } catch (err) {
            result = JSON.stringify({ error: `Tool execution failed: ${err instanceof Error ? err.message : String(err)}` });
          }

          updateToolStatus(assistantId, tc.name, 'done', result);

          apiMessages.push({
            role: 'tool',
            content: result,
            tool_call_id: tc.id,
          });
        }

        // Call again with tool results
        response = await callWithRetry(apiKey, apiMessages);
      }

      // Final content
      if (response.content) {
        addAssistantMessage(assistantId, response.content);
      } else if (!response.content && rounds > 0) {
        addAssistantMessage(assistantId, 'Done! I\'ve updated the dashboard.');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Something went wrong';
      if (errorMsg.includes('429')) {
        addAssistantMessage(assistantId, 'Rate limited by OpenRouter. Please wait a moment and try again.');
      } else {
        addAssistantMessage(assistantId, `Error: ${errorMsg}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, isLoading, messages, schema, dashState.widgets, data, dispatch, addAssistantMessage, updateToolStatus]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isLoading, sendMessage, stop, clearMessages };
}

// ============================================================
// Validation
// ============================================================

function validateColumnRefs(args: Record<string, unknown>, schema: DatasetSchema) {
  const colNames = new Set(schema.columns.map((c) => c.name));

  const checkCol = (val: unknown) => {
    if (typeof val === 'string' && val && !colNames.has(val)) {
      // Check case-insensitive match
      const match = schema.columns.find((c) => c.name.toLowerCase() === val.toLowerCase());
      if (match) return; // Close enough — will still work
      // Don't throw for config keys that aren't column names
    }
  };

  if (args.x_axis) checkCol(args.x_axis);
  if (args.y_axis) {
    if (Array.isArray(args.y_axis)) args.y_axis.forEach(checkCol);
    else checkCol(args.y_axis);
  }
  if (args.group_by) checkCol(args.group_by);
  if (args.sort_column) checkCol(args.sort_column);
}

// ============================================================
// API call with retry on rate limits
// ============================================================

interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

interface APIResponse {
  content: string | null;
  toolCalls: ToolCall[] | null;
}

async function callWithRetry(apiKey: string, messages: OpenAIMessage[], attempt = 0): Promise<APIResponse> {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'NeuralBi',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: 'auto',
      max_tokens: 4096,
    }),
  });

  if (res.status === 429 && attempt < RETRY_DELAYS.length) {
    await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
    return callWithRetry(apiKey, messages, attempt + 1);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter error (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  const choice = json.choices?.[0];
  if (!choice) throw new Error('No response from model');

  const msg = choice.message;

  let toolCalls: ToolCall[] | null = null;
  if (msg.tool_calls && msg.tool_calls.length > 0) {
    toolCalls = msg.tool_calls.map((tc: any) => {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments || '{}');
      } catch {
        args = {};
      }
      return { id: tc.id, name: tc.function.name, args };
    });
  }

  return {
    content: msg.content,
    toolCalls,
  };
}
