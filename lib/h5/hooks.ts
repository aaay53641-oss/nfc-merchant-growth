"use client";

import { useEffect, useRef } from "react";

// ─── Review Polling ──────────────────────────────────────

export function useReviewPolling(
  enabled: boolean,
  participationId: string | undefined,
  onApproved?: (taskId?: string) => void,
  onRejected?: (note: string, taskId?: string) => void,
  intervalMs = 30000
) {
  const lastEventId = useRef<string | undefined>(undefined);
  const cb = useRef({ onApproved, onRejected });
  cb.current = { onApproved, onRejected };

  useEffect(() => {
    if (!enabled || !participationId) return;
    let active = true;

    async function poll() {
      try {
        const res = await fetch(`/api/events?participationId=${encodeURIComponent(participationId!)}&limit=10`);
        if (!res.ok || !active) return;
        const data = await res.json();
        const events: Array<{ id: string; eventType: string; metadata: Record<string, unknown> | null; createdAt: string }> = data.events ?? [];

        if (!events.length) return;

        if (!lastEventId.current) {
          lastEventId.current = events[0].id;
          return;
        }

        const lastSeenIndex = events.findIndex((event) => event.id === lastEventId.current);
        const freshEvents = lastSeenIndex >= 0 ? events.slice(0, lastSeenIndex) : events;
        lastEventId.current = events[0].id;

        for (const e of freshEvents.reverse()) {
          if (e.eventType === "review_approved") {
            cb.current.onApproved?.(typeof e.metadata?.taskId === 'string' ? e.metadata.taskId : undefined);
            break;
          }
          if (e.eventType === "review_rejected") {
            cb.current.onRejected?.(typeof e.metadata?.reviewNote === 'string' ? e.metadata.reviewNote : "审核未通过", typeof e.metadata?.taskId === 'string' ? e.metadata.taskId : undefined);
            break;
          }
        }
      } catch { /* silent */ }
    }

    poll();
    const interval = setInterval(poll, intervalMs);
    return () => { active = false; clearInterval(interval); };
  }, [enabled, participationId, intervalMs]);
}

// ─── Page View Tracking ────────────────────────────────

export function usePageView(
  page: "campaign_home" | "tasks" | "ai_copy" | "submit" | "rewards" | "alliance",
  campaignId?: string,
  participationId?: string
) {
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current || !campaignId) return;
    logged.current = true;

    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "page_view",
        campaignId,
        metadata: {
          page,
          campaignId,
          participationId: participationId ?? null,
          referrer: typeof document !== "undefined" ? document.referrer : null,
        },
      }),
    }).catch(() => { /* silent */ });
  }, [page, campaignId, participationId]);
}
