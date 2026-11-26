'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import type { ApiResponse } from '@/types/api';

type ChatThread = {
  id: string;
  jobCardId: string | null;
  partsRequestId: string | null;
  threadType: string;
  unreadCount: number;
};

type ChatMessage = {
  id: string;
  body: string;
  visibility: 'internal' | 'customer' | 'supplier';
  createdAt: string;
};

type ThreadListResponse = ApiResponse<{
  threads: ChatThread[];
  totalUnreadCount: number;
}>;

type MessagesResponse = ApiResponse<{
  messages: ChatMessage[];
  nextCursor: string | null;
}>;

type SendMessageResponse = ApiResponse<{ message: ChatMessage }>;

export function ChatInbox({ surface }: { surface: 'customer' | 'supplier' }) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  /*
   * Loads the conversation list.
   *
   * This function is used by Refresh, opening a thread, and sending
   * a message. The initial page load is handled separately below
   * to avoid the react-hooks/set-state-in-effect ESLint error.
   */
  const loadThreads = useCallback(async () => {
    const response = await fetch('/api/chat/threads');
    const payload = (await response.json()) as ThreadListResponse;

    if (!response.ok || !payload.success) {
      throw new Error(
        payload.success ? 'Could not load messages.' : payload.error.message,
      );
    }

    setThreads(payload.data.threads);
    setTotalUnreadCount(payload.data.totalUnreadCount);
  }, []);

  /*
   * Initial conversation loading.
   *
   * The request is performed asynchronously and the state updates
   * happen after the fetch has completed, avoiding the
   * react-hooks/set-state-in-effect lint error.
   */
  useEffect(() => {
    let cancelled = false;

    async function initialiseThreads() {
      try {
        const response = await fetch('/api/chat/threads');
        const payload = (await response.json()) as ThreadListResponse;

        if (!response.ok || !payload.success) {
          throw new Error(
            payload.success
              ? 'Could not load messages.'
              : payload.error.message,
          );
        }

        if (cancelled) {
          return;
        }

        queueMicrotask(() => {
          if (cancelled) {
            return;
          }

          setThreads(payload.data.threads);
          setTotalUnreadCount(payload.data.totalUnreadCount);
          setLoading(false);
        });
      } catch (cause: unknown) {
        if (cancelled) {
          return;
        }

        queueMicrotask(() => {
          if (cancelled) {
            return;
          }

          setError(
            cause instanceof Error
              ? cause.message
              : 'Could not load messages.',
          );
          setLoading(false);
        });
      }
    }

    void initialiseThreads();

    return () => {
      cancelled = true;
    };
  }, []);

  const openThread = useCallback(
    async (threadId: string) => {
      setError(null);

      const response = await fetch(`/api/chat/threads/${threadId}/messages`);
      const payload = (await response.json()) as MessagesResponse;

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.success
            ? 'Could not load this conversation.'
            : payload.error.message,
        );
      }

      setSelectedThreadId(threadId);
      setMessages(payload.data.messages);
      setNextCursor(payload.data.nextCursor);

      setThreads((current) =>
        current.map((thread) =>
          thread.id === threadId
            ? { ...thread, unreadCount: 0 }
            : thread,
        ),
      );

      await loadThreads();
    },
    [loadThreads],
  );

  async function refreshThreads() {
    setError(null);

    try {
      await loadThreads();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not refresh messages.',
      );
    }
  }

  async function loadOlderMessages() {
    if (!selectedThreadId || !nextCursor) {
      return;
    }

    setError(null);

    try {
      const response = await fetch(
        `/api/chat/threads/${selectedThreadId}/messages?before=${nextCursor}`,
      );

      const payload = (await response.json()) as MessagesResponse;

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.success
            ? 'Could not load earlier messages.'
            : payload.error.message,
        );
      }

      setMessages((current) => [
        ...payload.data.messages,
        ...current,
      ]);

      setNextCursor(payload.data.nextCursor);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not load earlier messages.',
      );
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedThreadId || !body.trim()) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/chat/threads/${selectedThreadId}/messages`,
        {
          body: JSON.stringify({ body }),
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
        },
      );

      const payload = (await response.json()) as SendMessageResponse;

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.success
            ? 'Could not send this message.'
            : payload.error.message,
        );
      }

      setMessages((current) => [
        ...current,
        payload.data.message,
      ]);

      setBody('');

      await loadThreads();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not send this message.',
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      aria-label={`${surface} messages`}
      className="grid gap-4 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.6fr)]"
    >
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="font-semibold">Conversations</h2>

            <p className="text-sm text-muted-foreground">
              {totalUnreadCount} unread
            </p>
          </div>

          <Button
            onClick={refreshThreads}
            size="sm"
            type="button"
            variant="outline"
          >
            Refresh
          </Button>
        </div>

        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">
            Loading conversations…
          </p>
        ) : threads.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No conversations are available for this account.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {threads.map((thread) => (
              <li key={thread.id}>
                <button
                  aria-current={
                    selectedThreadId === thread.id
                      ? 'true'
                      : undefined
                  }
                  className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted"
                  onClick={() =>
                    openThread(thread.id).catch(
                      (cause: unknown) => {
                        setError(
                          cause instanceof Error
                            ? cause.message
                            : 'Could not load this conversation.',
                        );
                      },
                    )
                  }
                  type="button"
                >
                  <span>
                    <span className="block font-medium">
                      {thread.threadType === 'parts_supplier'
                        ? 'Parts request conversation'
                        : 'Service conversation'}
                    </span>

                    <span className="block text-xs text-muted-foreground">
                      {thread.jobCardId
                        ? `Job ${thread.jobCardId}`
                        : `Request ${thread.partsRequestId}`}
                    </span>
                  </span>

                  {thread.unreadCount > 0 ? (
                    <span className="rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                      {thread.unreadCount}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex min-h-96 flex-col rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="font-semibold">
            {selectedThreadId
              ? 'Conversation'
              : 'Select a conversation'}
          </h2>

          <p className="text-sm text-muted-foreground">
            Messages are visible only to participants in this
            conversation.
          </p>
        </div>

        {selectedThreadId ? (
          <>
            <div
              className="flex-1 space-y-3 overflow-y-auto p-4"
              aria-live="polite"
            >
              {nextCursor ? (
                <Button
                  onClick={loadOlderMessages}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Load earlier messages
                </Button>
              ) : null}

              {messages.map((message) => (
                <article
                  className="rounded-lg bg-muted p-3"
                  key={message.id}
                >
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {message.body}
                  </p>

                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(
                      message.createdAt,
                    ).toLocaleString()}
                  </p>
                </article>
              ))}

              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No messages yet.
                </p>
              ) : null}
            </div>

            <form
              className="flex gap-2 border-t border-border p-4"
              onSubmit={sendMessage}
            >
              <label
                className="sr-only"
                htmlFor="chat-message"
              >
                Write a message
              </label>

              <textarea
                className="min-h-11 flex-1 resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm"
                id="chat-message"
                maxLength={5000}
                onChange={(event) =>
                  setBody(event.target.value)
                }
                placeholder="Write a message…"
                required
                value={body}
              />

              <Button
                disabled={sending || !body.trim()}
                type="submit"
              >
                {sending ? 'Sending…' : 'Send'}
              </Button>
            </form>
          </>
        ) : (
          <p className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
            Choose a conversation to view messages.
          </p>
        )}
      </div>

      {error ? (
        <p
          className="text-sm text-destructive lg:col-span-2"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
