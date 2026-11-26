import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { saveStoredMessages, type TreeMessage } from "@/lib/messages";
import { playOrnamentChime } from "@/lib/sound";
import { parseHandle } from "@/lib/tree-config";

const BACKOFF_STEPS_MS = [12_000, 20_000, 35_000, 60_000] as const;

export interface UseOwnerMailOptions {
  isOwnerMode: boolean;
  serverSynced: boolean;
  activeHandleRef: RefObject<string>;
  serverSyncedRef: RefObject<boolean>;
  soundEnabledRef: RefObject<boolean>;
  dropTimerRef: RefObject<number | null>;
  setMessages: Dispatch<SetStateAction<TreeMessage[]>>;
  setLatestDroppedId: Dispatch<SetStateAction<string | null>>;
  showToast: (message: string, variant?: "success" | "info" | "error") => void;
}

export function useOwnerMail({
  isOwnerMode,
  serverSynced,
  activeHandleRef,
  serverSyncedRef,
  soundEnabledRef,
  dropTimerRef,
  setMessages,
  setLatestDroppedId,
  showToast,
}: UseOwnerMailOptions) {
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const mailSeededRef = useRef<boolean>(false);
  const backoffIdxRef = useRef<number>(0);
  const lastMailSummaryRef = useRef<{
    unreadCount: number;
    latestSeq: number;
  } | null>(null);

  const seedKnownMessages = useCallback((list: TreeMessage[]) => {
    knownMessageIdsRef.current = new Set(list.map((m) => m.id));
    mailSeededRef.current = true;
    let unreadCount = 0;
    let latestSeq = 0;
    for (const m of list) {
      if (m.seq > latestSeq) latestSeq = m.seq;
      if (m.status === "visible" && m.readAt === null) unreadCount += 1;
    }
    lastMailSummaryRef.current = { unreadCount, latestSeq };
  }, []);

  const resetMailTracking = useCallback(() => {
    mailSeededRef.current = false;
    backoffIdxRef.current = 0;
    lastMailSummaryRef.current = null;
  }, []);

  const refreshOwnerMail = useCallback(
    async (targetHandle: string) => {
      if (!isOwnerMode || !parseHandle(targetHandle)) return false;
      try {
        const res = await fetch(
          `/api/trees/${encodeURIComponent(targetHandle)}/mail`,
          {
            cache: "no-store",
            credentials: "same-origin",
          },
        );
        if (!res.ok) return false;
        const data = (await res.json()) as {
          ok?: boolean;
          messages?: TreeMessage[];
        };
        if (data.ok && Array.isArray(data.messages)) {
          const isSameHandle = targetHandle === activeHandleRef.current;
          const prevKnown = knownMessageIdsRef.current;
          const newlyArrived =
            mailSeededRef.current && isSameHandle
              ? data.messages.filter(
                  (m) => m.status === "visible" && !prevKnown.has(m.id),
                )
              : [];

          seedKnownMessages(data.messages);
          setMessages(data.messages);
          saveStoredMessages(data.messages, targetHandle);

          if (newlyArrived.length > 0) {
            backoffIdxRef.current = 0;
            const latest = newlyArrived[newlyArrived.length - 1];
            setLatestDroppedId(latest.id);
            if (dropTimerRef.current) {
              window.clearTimeout(dropTimerRef.current);
            }
            dropTimerRef.current = window.setTimeout(() => {
              setLatestDroppedId(null);
            }, 3400);
            if (soundEnabledRef.current) {
              playOrnamentChime("drop");
            }
            showToast(
              newlyArrived.length === 1
                ? "New anonymous ornament arrived!"
                : `${newlyArrived.length} new anonymous ornaments arrived!`,
            );
          }
          return true;
        }
      } catch {
        // Offline/transient error ignored cleanly
      }
      return false;
    },
    [
      activeHandleRef,
      dropTimerRef,
      isOwnerMode,
      seedKnownMessages,
      setLatestDroppedId,
      setMessages,
      showToast,
      soundEnabledRef,
    ],
  );

  const pollOwnerMailSummary = useCallback(
    async (
      targetHandle: string,
    ): Promise<"changed" | "unchanged" | "error"> => {
      if (!isOwnerMode || !parseHandle(targetHandle)) return "unchanged";
      try {
        const res = await fetch(
          `/api/trees/${encodeURIComponent(targetHandle)}/mail?summary=1`,
          {
            cache: "no-store",
            credentials: "same-origin",
          },
        );
        if (!res.ok) return "error";
        const data = (await res.json()) as {
          ok?: boolean;
          unreadCount?: number;
          latestSeq?: number;
        };
        if (
          data.ok &&
          typeof data.unreadCount === "number" &&
          typeof data.latestSeq === "number"
        ) {
          const prev = lastMailSummaryRef.current;
          if (
            !prev ||
            prev.unreadCount !== data.unreadCount ||
            prev.latestSeq !== data.latestSeq
          ) {
            await refreshOwnerMail(targetHandle);
            return "changed";
          }
          return "unchanged";
        }
      } catch {
        // Offline/transient error ignored cleanly
      }
      return "error";
    },
    [isOwnerMode, refreshOwnerMail],
  );

  useEffect(() => {
    if (!isOwnerMode || !serverSynced) return;
    let cancelled = false;
    let timerId: number | null = null;

    const clearScheduled = () => {
      if (timerId !== null) {
        window.clearTimeout(timerId);
        timerId = null;
      }
    };

    const scheduleNext = () => {
      if (
        cancelled ||
        (typeof document !== "undefined" &&
          document.visibilityState === "hidden")
      ) {
        return;
      }
      clearScheduled();
      const delay = BACKOFF_STEPS_MS[backoffIdxRef.current] ?? 60_000;
      timerId = window.setTimeout(async () => {
        if (cancelled) return;
        if (
          typeof document !== "undefined" &&
          document.visibilityState !== "visible"
        ) {
          return;
        }
        const outcome = await pollOwnerMailSummary(activeHandleRef.current);
        if (cancelled) return;
        if (outcome === "changed") {
          backoffIdxRef.current = 0;
        } else {
          backoffIdxRef.current = Math.min(
            BACKOFF_STEPS_MS.length - 1,
            backoffIdxRef.current + 1,
          );
        }
        scheduleNext();
      }, delay);
    };

    const handleResume = () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        clearScheduled();
        return;
      }
      backoffIdxRef.current = 0;
      clearScheduled();
      if (serverSyncedRef.current) {
        void pollOwnerMailSummary(activeHandleRef.current).finally(() => {
          if (!cancelled) scheduleNext();
        });
      }
    };

    window.addEventListener("focus", handleResume);
    document.addEventListener("visibilitychange", handleResume);
    scheduleNext();

    return () => {
      cancelled = true;
      clearScheduled();
      window.removeEventListener("focus", handleResume);
      document.removeEventListener("visibilitychange", handleResume);
    };
  }, [
    activeHandleRef,
    isOwnerMode,
    pollOwnerMailSummary,
    serverSynced,
    serverSyncedRef,
  ]);

  return {
    seedKnownMessages,
    resetMailTracking,
    refreshOwnerMail,
  };
}
