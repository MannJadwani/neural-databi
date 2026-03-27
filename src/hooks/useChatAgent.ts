/**
 * Chat agent hook — like useAgent but produces artifacts instead of dashboard widgets.
 * Decoupled from DashboardProvider; works standalone on any dataset.
 */
import { useState, useCallback, useRef } from 'react';
import { useConvexAuth, useMutation } from 'convex/react';
import type { ChatMessage, ChatArtifact, DatasetSchema } from '../lib/types';
import { useWorkOSAuth } from '../lib/auth-helpers';
import { api } from '../../convex/_generated/api';
import {
  CHAT_TOOL_DEFINITIONS,
  executeChatToolCall,
  buildChatSystemPrompt,
  resetQueryResult,
  type ChatToolContext,
} from '../lib/chat-tools';

type Row = Record<string, unknown>;

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

interface ToolCallParsed {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

interface APIResponse {
  content: string | null;
  toolCalls: ToolCallParsed[] | null;
}

export function useChatAgent(data: Row[], schema: DatasetSchema | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [artifacts, setArtifacts] = useState<ChatArtifact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const consumeCredits = useMutation(api.billing.consumeCredits);
  const { user, accessToken } = useWorkOSAuth();
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const workosConfigured = !!import.meta.env.VITE_WORKOS_CLIENT_ID;
  const abortRef = useRef<AbortController | null>(null);
  const artifactsRef = useRef(artifacts);
  artifactsRef.current = artifacts;

  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  const selectedArtifact = artifacts.find((a) => a.id === selectedArtifactId) || null;

  const selectArtifact = useCallback((id: string | null) => {
    setSelectedArtifactId(id);
  }, []);

  const sendMessage = useCallback(async (userInput: string) => {
    if (!userInput.trim() || isLoading) return;
    if (!apiKey) {
      setMessages((prev) => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'OpenRouter API key not configured. Add `VITE_OPENROUTER_API_KEY` to your `.env.local` file.',
        timestamp: Date.now(),
      }]);
      return;
    }

    if (workosConfigured && user && accessToken && isConvexAuthenticated) {
      try {
        await consumeCredits({
          feature: 'dataset_chat_message',
          units: 1,
        });
      } catch (err) {
        setMessages((prev) => [...prev, {
          id: `credits-${Date.now()}`,
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Not enough credits.',
          timestamp: Date.now(),
        }]);
        return;
      }
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userInput,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    resetQueryResult();

    const assistantId = `ai-${Date.now()}`;
    const pendingArtifacts: ChatArtifact[] = [];

    try {
      const systemPrompt = buildChatSystemPrompt(schema, artifactsRef.current);
      const apiMessages: OpenAIMessage[] = [
        { role: 'system', content: systemPrompt },
      ];

      // Add recent conversation history
      const allMsgs = [...messages.slice(-20), userMsg];
      for (const m of allMsgs) {
        if (m.role === 'user') {
          apiMessages.push({ role: 'user', content: m.content });
        } else if (m.role === 'assistant' && m.content) {
          apiMessages.push({ role: 'assistant', content: m.content });
        }
      }

      // Show placeholder
      setMessages((prev) => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        toolCalls: [],
        timestamp: Date.now(),
      }]);

      let response = await callWithRetry(apiKey, apiMessages);
      let rounds = 0;

      while (response.toolCalls && response.toolCalls.length > 0 && rounds < MAX_TOOL_ROUNDS) {
        rounds++;

        apiMessages.push({
          role: 'assistant',
          content: response.content || null,
          tool_calls: response.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: JSON.stringify(tc.args) },
          })),
        });

        for (const tc of response.toolCalls) {
          // Show tool running
          setMessages((prev) => prev.map((m) =>
            m.id === assistantId
              ? { ...m, toolCalls: [...(m.toolCalls || []), { name: tc.name, status: 'running' as const }] }
              : m
          ));

          const ctx: ChatToolContext = {
            data,
            schema: schema!,
            artifacts: [...artifactsRef.current, ...pendingArtifacts],
          };

          let result: string;
          try {
            const toolResult = executeChatToolCall(tc.name, tc.args, ctx);
            result = toolResult.message;

            if (toolResult.artifact) {
              pendingArtifacts.push(toolResult.artifact);
              setArtifacts((prev) => [...prev, toolResult.artifact!]);
              setSelectedArtifactId(toolResult.artifact.id);
            }
            if (toolResult.updatedArtifact) {
              const updated = toolResult.updatedArtifact;
              setArtifacts((prev) => prev.map((a) => a.id === updated.id ? updated : a));
            }
            if (toolResult.removedArtifactId) {
              const removedId = toolResult.removedArtifactId;
              setArtifacts((prev) => prev.filter((a) => a.id !== removedId));
              if (selectedArtifactId === removedId) setSelectedArtifactId(null);
            }
          } catch (err) {
            result = JSON.stringify({ error: `Tool failed: ${err instanceof Error ? err.message : String(err)}` });
          }

          // Mark tool done
          setMessages((prev) => prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  toolCalls: (m.toolCalls || []).map((t) =>
                    t.name === tc.name && t.status === 'running' ? { ...t, status: 'done' as const, result } : t
                  ),
                }
              : m
          ));

          apiMessages.push({ role: 'tool', content: result, tool_call_id: tc.id });
        }

        response = await callWithRetry(apiKey, apiMessages);
      }

      // Final assistant message with artifacts attached
      const finalContent = response.content || (rounds > 0 ? 'Done!' : '');
      setMessages((prev) => prev.map((m) =>
        m.id === assistantId
          ? { ...m, content: finalContent, artifacts: pendingArtifacts.length > 0 ? [...pendingArtifacts] : undefined }
          : m
      ));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Something went wrong';
      setMessages((prev) => prev.map((m) =>
        m.id === assistantId ? { ...m, content: `Error: ${errorMsg}` } : m
      ));
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, isLoading, messages, schema, data, selectedArtifactId, consumeCredits, workosConfigured, user, accessToken, isConvexAuthenticated]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setArtifacts([]);
    setSelectedArtifactId(null);
    resetQueryResult();
  }, []);

  const loadMessages = useCallback((saved: ChatMessage[], savedArtifacts?: ChatArtifact[]) => {
    setMessages(saved);
    if (savedArtifacts) setArtifacts(savedArtifacts);
  }, []);

  return {
    messages,
    artifacts,
    isLoading,
    selectedArtifact,
    sendMessage,
    stop,
    clearChat,
    selectArtifact,
    loadMessages,
  };
}

// ============================================================
// API call with retry
// ============================================================

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
      tools: CHAT_TOOL_DEFINITIONS,
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

  let toolCalls: ToolCallParsed[] | null = null;
  if (msg.tool_calls && msg.tool_calls.length > 0) {
    toolCalls = msg.tool_calls.map((tc: any) => {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(tc.function.arguments || '{}'); } catch { args = {}; }
      return { id: tc.id, name: tc.function.name, args };
    });
  }

  return { content: msg.content, toolCalls };
}
