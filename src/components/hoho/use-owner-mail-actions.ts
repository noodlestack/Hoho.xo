"use client";

import {
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { ResolvedOrnament } from "@/components/ascii-tree-canvas";
import {
  saveStoredMessages,
  type ReportReason,
  type TreeMessage,
} from "@/lib/messages";
import { playOrnamentChime } from "@/lib/sound";
import { ORNAMENT_TYPES } from "@/lib/tree-themes";

interface UseOwnerMailActionsOptions {
  isOwnerMode: boolean;
  activeHandle: string;
  messages: TreeMessage[];
  prompt: string;
  soundEnabled: boolean;
  serverSyncedRef: MutableRefObject<boolean>;
  setMessages: Dispatch<SetStateAction<TreeMessage[]>>;
  setActiveMessageId: Dispatch<SetStateAction<string | null>>;
  seedKnownMessages: (next: TreeMessage[]) => void;
  showToast: (message: string, variant?: "success" | "info" | "error") => void;
}

/** Provides owner note actions: open/read, delete, report, star, reply, mark all read, and keepsake export. */
export function useOwnerMailActions({
  isOwnerMode,
  activeHandle,
  messages,
  prompt,
  soundEnabled,
  serverSyncedRef,
  setMessages,
  setActiveMessageId,
  seedKnownMessages,
  showToast,
}: UseOwnerMailActionsOptions) {
  const persistMessagesLocal = useCallback(
    (updater: (prev: TreeMessage[]) => TreeMessage[]) => {
      setMessages((prev) => {
        const next = updater(prev);
        if (isOwnerMode) saveStoredMessages(next, activeHandle);
        return next;
      });
    },
    [activeHandle, isOwnerMode, setMessages],
  );

  const patchOwnerMessage = useCallback(
    (id: string, method: "PATCH" | "DELETE", body?: object) => {
      if (!serverSyncedRef.current) return;
      void fetch(
        `/api/trees/${encodeURIComponent(activeHandle)}/messages/${encodeURIComponent(id)}`,
        {
          method,
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          ...(body ? { body: JSON.stringify(body) } : {}),
        },
      ).catch(() => {});
    },
    [activeHandle, serverSyncedRef],
  );

  const handleOpenMessage = useCallback(
    (target: TreeMessage) => {
      if (!isOwnerMode) return;
      if (soundEnabled) playOrnamentChime("open");
      setActiveMessageId(target.id);
      if (target.readAt === null) {
        const nowIso = new Date().toISOString();
        persistMessagesLocal((prev) =>
          prev.map((m) => (m.id === target.id ? { ...m, readAt: nowIso } : m)),
        );
        patchOwnerMessage(target.id, "PATCH", { action: "read" });
      }
    },
    [
      isOwnerMode,
      patchOwnerMessage,
      persistMessagesLocal,
      setActiveMessageId,
      soundEnabled,
    ],
  );

  const handleSelectOrnament = useCallback(
    (ornament: ResolvedOrnament) => {
      if (!isOwnerMode) {
        showToast(
          `Private ornament for @${activeHandle} — only the owner can unwrap it`,
        );
        return;
      }
      handleOpenMessage(ornament);
    },
    [activeHandle, handleOpenMessage, isOwnerMode, showToast],
  );

  const handleDeleteMessage = useCallback(
    (id: string) => {
      persistMessagesLocal((prev) => prev.filter((m) => m.id !== id));
      setActiveMessageId(null);
      patchOwnerMessage(id, "DELETE");
      showToast("Note removed from tree and Mail");
    },
    [patchOwnerMessage, persistMessagesLocal, setActiveMessageId, showToast],
  );

  const handleReportMessage = useCallback(
    (id: string, reason: ReportReason) => {
      const nowIso = new Date().toISOString();
      persistMessagesLocal((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                status: "reported",
                reportReason: reason,
                readAt: m.readAt ?? nowIso,
              }
            : m,
        ),
      );
      setActiveMessageId(null);
      patchOwnerMessage(id, "PATCH", { action: "report", reason });
      showToast("Ornament hidden and saved in Reported Mail");
    },
    [patchOwnerMessage, persistMessagesLocal, setActiveMessageId, showToast],
  );

  const handleToggleStarMessage = useCallback(
    (id: string, starred: boolean) => {
      persistMessagesLocal((prev) =>
        prev.map((m) => (m.id === id ? { ...m, starred } : m)),
      );
      patchOwnerMessage(id, "PATCH", { action: "star", starred });
      showToast(starred ? "Starred note" : "Removed star", "info");
    },
    [patchOwnerMessage, persistMessagesLocal, showToast],
  );

  const handleMarkMessageReplied = useCallback(
    (id: string) => {
      const nowIso = new Date().toISOString();
      persistMessagesLocal((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                repliedAt: m.repliedAt ?? nowIso,
                readAt: m.readAt ?? nowIso,
              }
            : m,
        ),
      );
      patchOwnerMessage(id, "PATCH", { action: "reply" });
    },
    [patchOwnerMessage, persistMessagesLocal],
  );

  const handleMarkAllRead = useCallback(async () => {
    if (!messages.some((m) => m.status === "visible" && !m.readAt)) return;
    const nowIso = new Date().toISOString();
    persistMessagesLocal((prev) =>
      prev.map((m) =>
        m.status === "visible" && !m.readAt ? { ...m, readAt: nowIso } : m,
      ),
    );
    if (soundEnabled) playOrnamentChime("click");
    showToast("Marked all notes as read");
    if (serverSyncedRef.current) {
      try {
        const res = await fetch(
          `/api/trees/${encodeURIComponent(activeHandle)}/mail`,
          {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "mark_all_read" }),
          },
        );
        if (res.ok) {
          const data = (await res.json()) as {
            ok?: boolean;
            messages?: TreeMessage[];
          };
          if (data.ok && Array.isArray(data.messages)) {
            seedKnownMessages(data.messages);
            setMessages(data.messages);
            saveStoredMessages(data.messages, activeHandle);
          }
        }
      } catch {
        // Optimistic read state already applied locally
      }
    }
  }, [
    activeHandle,
    messages,
    persistMessagesLocal,
    seedKnownMessages,
    serverSyncedRef,
    setMessages,
    showToast,
    soundEnabled,
  ]);

  const handleExportKeepsake = useCallback(() => {
    const visible = messages.filter((m) => m.status === "visible");
    if (visible.length === 0) return;
    const header = [
      `Hoho.xo Keepsake Archive — @${activeHandle}`,
      `Prompt: ${prompt}`,
      `Exported: ${new Date().toLocaleString()}`,
      `Total notes: ${visible.length}`,
      "=".repeat(48),
      "",
    ].join("\n");
    const entries = visible
      .map((m, idx) => {
        const typeName = ORNAMENT_TYPES[m.ornamentType]?.name ?? "Ornament";
        return `#${idx + 1} · ${typeName} · ${new Date(m.createdAt).toLocaleString()}\n${m.body}\n`;
      })
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([header + entries], { type: "text/plain;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `hoho-${activeHandle}-keepsake.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Downloaded keepsake .txt archive");
  }, [activeHandle, messages, prompt, showToast]);

  return {
    handleOpenMessage,
    handleSelectOrnament,
    handleDeleteMessage,
    handleReportMessage,
    handleToggleStarMessage,
    handleMarkMessageReplied,
    handleMarkAllRead,
    handleExportKeepsake,
  };
}
