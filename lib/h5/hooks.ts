"use client";

import { useEffect, useRef } from "react";

interface PollEvent {
  id: string;
  eventType: string;
  metadata: any;
  createdAt: string;
}

export function useReviewPolling(
  enabled: boolean,
  participationId: string | undefined,
  onApproved?: () => void,
  onRejected?: (note: string) => void,
  intervalMs = 30000
) {
  const lastEventId = useRef<string | undefined>(undefined);
  const callbackRefs = useRef({ onApproved, onRejected });
  callbackRefs.current = { onApproved, onRejected };

  useEffect(() => {
    if (!enabled || !participationId) return;

    let active = true;

    async function poll() {
      try {
        const url = `/api/events?participationId=${encodeURIComponent(participationId!)}&limit=10`;
        const res = await fetch(url);
        if (!res.ok || !active) return;

        const data = await res.json();
        const events: PollEvent[] = data.events ?? [];

        // Filter new events since last check
        const newEvents = lastEventId.current
          ? events.filter((e) => e.id !== lastEventId.current && e.createdAt > (events[0]?.createdAt ?? ""))
          : [];

        if (events.length > 0 && !lastEventId.current) {
          // First poll — just record the latest ID, don't trigger callbacks
          lastEventId.current = events[0].id;
          return;
        }

        if (events.length > 0) {
          lastEventId.current = events[0].id;
        }

        for (const event of events) {
          if (event.eventType === "review_approved") {
            callbackRefs.current.onApproved?.();
            break;
          }
          if (event.eventType === "review_rejected") {
            const note = event.metadata?.reviewNote ?? "审核未通过";
            callbackRefs.current.onRejected?.(note);
            break;
          }
        }
      } catch {
        // Poll failures are silent — don't disrupt UX
      }
    }

    poll(); // Immediate first poll
    const interval = setInterval(poll, intervalMs);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [enabled, participationId, intervalMs]);
}
