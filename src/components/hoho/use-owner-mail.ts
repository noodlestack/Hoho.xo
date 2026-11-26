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
    lastMailSummaryRef.current = null;
  }, []);

  const refreshOwnerMail = useCallback(
    async (targetHandle: string) => {
      if (!isOwnerMode || !parseHandle(targetHandle)) return;
      try {
        const res = await fetch(
          `/api/trees/${encodeURIComponent(targetHandle)}/mail`,
          {
            cache: "no-store",
            credentials: "same-origin",
          },
        );
        if (!res.ok) return;
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
            const latest = newlyArrived[newlyArrived.length - 1];
            setLatestDroppedId(latest.id);
            if (dropTimerRef.current) {
              window.clearTimeout(dropTimerRef.current);
            }
            dropTimerRef.current = window.setTimeout(() => {
              setLatestDroppedId(null);
            }, 2400);
            if (soundEnabledRef.current) {
              playOrnamentChime("drop");
            }
            showToast(
              newlyArrived.length === 1
                ? "New anonymous ornament arrived!"
                : `${newlyArrived.length} new anonymous ornaments arrived!`,
            );
          }
        }
      } catch {
        // Offline/transient error ignored cleanly
      }
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
    async (targetHandle: string) => {
      if (!isOwnerMode || !parseHandle(targetHandle)) return;
      try {
        const res = await fetch(
          `/api/trees/${encodeURIComponent(targetHandle)}/mail?summary=1`,
          {
            cache: "no-store",
            credentials: "same-origin",
          },
        );
        if (!res.ok) return;
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
          }
        }
      } catch {
        // Offline/transient error ignored cleanly
      }
    },
    [isOwnerMode, refreshOwnerMail],
  );

  useEffect(() => {
    const onFocus = () => {
      if (isOwnerMode && serverSyncedRef.current) {
        void refreshOwnerMail(activeHandleRef.current);
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [activeHandleRef, isOwnerMode, refreshOwnerMail, serverSyncedRef]);

  useEffect(() => {
    if (!isOwnerMode || !serverSynced) return;
    const intervalId = window.setInterval(() => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      ) {
        void pollOwnerMailSummary(activeHandleRef.current);
      }
    }, 12_000);
    return () => window.clearInterval(intervalId);
  }, [activeHandleRef, isOwnerMode, serverSynced, pollOwnerMailSummary]);

  return {
    seedKnownMessages,
    resetMailTracking,
    refreshOwnerMail,
  };
}
