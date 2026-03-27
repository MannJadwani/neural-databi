import { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useApp } from '../lib/app-store';
import { useChatAgent } from '../hooks/useChatAgent';
import { ChatHeader } from '../components/chat/ChatHeader';
import { ChatMessageList } from '../components/chat/ChatMessageList';
import { ChatInput } from '../components/chat/ChatInput';
import { ArtifactPanel } from '../components/chat/ArtifactPanel';
import type { DatasetSchema, ChatArtifact } from '../lib/types';
import type { Id } from '../../convex/_generated/dataModel';

export function ChatPage() {
  const { datasetId: paramDatasetId } = useParams<{ datasetId: string }>();
  const navigate = useNavigate();
  const { datasets } = useApp();

  // If no dataset in URL, use the first available
  const selectedDatasetId = paramDatasetId || (datasets && datasets.length > 0 ? datasets[0]._id : null);

  const dataset = useQuery(
    api.datasets.get,
    selectedDatasetId ? { id: selectedDatasetId as Id<'datasets'> } : 'skip'
  );

  const dataChunks = useQuery(
    api.dataRows.getByDataset,
    selectedDatasetId ? { datasetId: selectedDatasetId as Id<'datasets'> } : 'skip'
  );

  const data = useMemo(() => {
    if (!dataChunks) return [];
    return dataChunks.flatMap((c: any) => c.rows as Record<string, unknown>[]);
  }, [dataChunks]);

  const schema = (dataset?.schema as DatasetSchema) || null;

  const {
    messages,
    artifacts,
    isLoading,
    selectedArtifact,
    sendMessage,
    stop,
    clearChat,
    selectArtifact,
    loadMessages,
  } = useChatAgent(data, schema);

  // ── Persistence ──────────────────────────────────────────
  const createConversation = useMutation(api.chatConversations.create);
  const saveMessages = useMutation(api.chatConversations.saveMessages);
  const removeConversation = useMutation(api.chatConversations.remove);

  const existingConversations = useQuery(
    api.chatConversations.listByDataset,
    selectedDatasetId ? { datasetId: selectedDatasetId as Id<'datasets'> } : 'skip'
  );

  const [conversationId, setConversationId] = useState<Id<'chatConversations'> | null>(null);
  const loadedRef = useRef(false);

  // Load existing conversation when dataset changes
  useEffect(() => {
    if (!existingConversations || loadedRef.current) return;
    if (existingConversations.length > 0) {
      const latest = existingConversations[0];
      setConversationId(latest._id);
      const savedMsgs = latest.messages as any[];
      if (savedMsgs.length > 0) {
        // Extract artifacts from messages
        const allArtifacts: ChatArtifact[] = [];
        for (const m of savedMsgs) {
          if (m.artifacts) allArtifacts.push(...m.artifacts);
        }
        loadMessages(savedMsgs, allArtifacts);
      }
    }
    loadedRef.current = true;
  }, [existingConversations, loadMessages]);

  // Reset load flag when dataset changes
  useEffect(() => {
    loadedRef.current = false;
    setConversationId(null);
  }, [selectedDatasetId]);

  // Auto-save messages after each turn
  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    if (isLoading || messages.length === 0 || messages.length === prevMsgCountRef.current) return;
    prevMsgCountRef.current = messages.length;

    const save = async () => {
      try {
        let cId = conversationId;
        if (!cId && selectedDatasetId) {
          cId = await createConversation({ datasetId: selectedDatasetId as Id<'datasets'> });
          setConversationId(cId);
        }
        if (cId) {
          // Serialize messages (strip large data from artifacts for storage)
          const serialized = messages.map((m) => ({
            ...m,
            artifacts: m.artifacts?.map((a) => ({
              ...a,
              spec: {
                ...a.spec,
                data: a.spec.data?.slice(0, 200), // Cap stored data
              },
            })),
          }));
          const firstUserMsg = messages.find((m) => m.role === 'user');
          await saveMessages({
            id: cId,
            messages: serialized,
            title: firstUserMsg?.content.slice(0, 80),
          });
        }
      } catch (err) {
        console.error('Failed to save conversation:', err);
      }
    };
    save();
  }, [messages, isLoading, conversationId, selectedDatasetId, createConversation, saveMessages]);

  const handleDatasetChange = (id: string) => {
    clearChat();
    prevMsgCountRef.current = 0;
    navigate(`/chat/${id}`);
  };

  const handleClear = useCallback(async () => {
    clearChat();
    prevMsgCountRef.current = 0;
    if (conversationId) {
      try {
        await removeConversation({ id: conversationId });
      } catch {}
      setConversationId(null);
    }
  }, [clearChat, conversationId, removeConversation]);

  // Loading state
  if (datasets === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center bg-brand-bg">
        <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-brand-bg">
      {/* Conversation panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatHeader
          datasets={(datasets || []) as any}
          selectedDatasetId={selectedDatasetId}
          onDatasetChange={handleDatasetChange}
          onClear={handleClear}
          hasMessages={messages.length > 0}
        />

        {selectedDatasetId && data.length > 0 ? (
          <>
            <ChatMessageList
              messages={messages}
              isLoading={isLoading}
              selectedArtifactId={selectedArtifact?.id || null}
              onArtifactSelect={selectArtifact}
            />
            <ChatInput
              onSend={sendMessage}
              onStop={stop}
              isLoading={isLoading}
              schema={schema}
            />
          </>
        ) : selectedDatasetId && !dataChunks ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <p className="text-sm text-zinc-500 mb-1">Select a dataset to start chatting</p>
              <p className="text-xs text-zinc-700">Upload a CSV on the home page first</p>
            </div>
          </div>
        )}
      </div>

      {/* Artifact detail panel */}
      <AnimatePresence>
        {selectedArtifact && (
          <ArtifactPanel
            artifact={selectedArtifact}
            onClose={() => selectArtifact(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
