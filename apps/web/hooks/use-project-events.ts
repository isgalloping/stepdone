"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";

export type ProjectEventMessage = {
  id?: string;
  type: string;
  stage?: string;
  message?: string;
  percent?: number;
};

export function useProjectEvents(projectPublicId: string) {
  const [lastEvent, setLastEvent] = useState<ProjectEventMessage | null>(null);
  const [connection, setConnection] = useState<"sse" | "polling" | "offline">(
    "polling",
  );

  useEffect(() => {
    if (!projectPublicId) return;
    let closed = false;
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      const res = await api<{
        latestEvent: {
          publicId: string;
          type: string;
          stage: string;
          message: string;
          percent: number | null;
        } | null;
      }>(`/api/projects/${projectPublicId}/status`);
      if (!res.success || !res.data.latestEvent) return;
      setLastEvent({
        id: res.data.latestEvent.publicId,
        type: res.data.latestEvent.type,
        stage: res.data.latestEvent.stage,
        message: res.data.latestEvent.message,
        percent: res.data.latestEvent.percent ?? undefined,
      });
    };

    const startPolling = () => {
      setConnection("polling");
      if (pollTimer) clearInterval(pollTimer);
      void poll();
      pollTimer = setInterval(() => {
        void poll();
      }, 3000);
    };

    const startSse = () => {
      if (closed) return;
      es?.close();
      es = new EventSource(`/api/projects/${projectPublicId}/events`, {
        withCredentials: true,
      });
      es.onopen = () => {
        if (!closed) setConnection("sse");
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      };
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as ProjectEventMessage;
          setLastEvent(data);
        } catch {
          /* ignore */
        }
      };
      es.onerror = () => {
        es?.close();
        es = null;
        if (closed) return;
        startPolling();
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = setTimeout(() => {
          if (!closed) startSse();
        }, 8000);
      };
    };

    // Prefer polling first for reliability; try SSE as enhancement.
    startPolling();
    startSse();

    return () => {
      closed = true;
      es?.close();
      if (pollTimer) clearInterval(pollTimer);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [projectPublicId]);

  return { lastEvent, connection };
}
