"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type {
  CameraViewMode,
  ResolvedOrnament,
} from "@/components/ascii-tree-canvas";
import type { TreeMessage } from "@/lib/messages";
import { createQrMatrix, resolveTreeOrnaments } from "@/lib/qr-tree";
import {
  getCurrentChristmasTrack,
  nextChristmasTrack,
  playOrnamentChime,
  toggleChristmasMusic,
  type ChristmasTrack,
} from "@/lib/sound";
import {
  buildDesignShareUrl,
  OWNER_PROMPT_PRESETS,
  parseHandle,
  saveTreeConfig,
  type TreeConfig,
} from "@/lib/tree-config";
import type { TreeTheme } from "@/lib/tree-themes";

interface UseExperienceControlsOptions {
  isOwnerMode: boolean;
  activeHandle: string;
  handleDraft: string;
  origin: string;
  serverSynced: boolean;
  serverSyncedRef: MutableRefObject<boolean>;
  hydratedRef: MutableRefObject<boolean>;
  copiedTimerRef: MutableRefObject<number | null>;
  configSyncTimerRef: MutableRefObject<number | null>;
  config: TreeConfig;
  setConfig: Dispatch<SetStateAction<TreeConfig>>;
  theme: TreeTheme;
  messages: TreeMessage[];
  publicTotalVisible: number | null;
  activeMessageId: string | null;
  setViewMode: Dispatch<SetStateAction<CameraViewMode>>;
  soundEnabled: boolean;
  showToast: (message: string, variant?: "success" | "info" | "error") => void;
}

/** Manages derived tree/QR URLs, ornament counters, clipboard/QR downloads, config persistence, and music controls. */
export function useExperienceControls({
  isOwnerMode,
  activeHandle,
  handleDraft,
  origin,
  serverSynced,
  serverSyncedRef,
  hydratedRef,
  copiedTimerRef,
  configSyncTimerRef,
  config,
  setConfig,
  theme,
  messages,
  publicTotalVisible,
  activeMessageId,
  setViewMode,
  soundEnabled,
  showToast,
}: UseExperienceControlsOptions) {
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [ownerPromptIdx, setOwnerPromptIdx] = useState<number>(0);
  const [musicPlaying, setMusicPlaying] = useState<boolean>(false);
  const [currentTrack, setCurrentTrack] = useState<ChristmasTrack>(() =>
    getCurrentChristmasTrack(),
  );

  const scheduleServerConfigSync = useCallback(
    (targetHandle: string, nextConfig: TreeConfig) => {
      if (!isOwnerMode || !serverSyncedRef.current) return;
      if (configSyncTimerRef.current) {
        window.clearTimeout(configSyncTimerRef.current);
      }
      configSyncTimerRef.current = window.setTimeout(() => {
        void fetch(`/api/trees/${encodeURIComponent(targetHandle)}`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextConfig),
        }).catch(() => {});
      }, 320);
    },
    [configSyncTimerRef, isOwnerMode, serverSyncedRef],
  );

  const updateConfig = useCallback(
    (patch: Partial<TreeConfig>) => {
      setConfig((prev) => {
        const next: TreeConfig = { ...prev, ...patch, handle: activeHandle };
        if (isOwnerMode && hydratedRef.current && parseHandle(activeHandle)) {
          saveTreeConfig(activeHandle, next);
          scheduleServerConfigSync(activeHandle, next);
        }
        return next;
      });
    },
    [
      activeHandle,
      hydratedRef,
      isOwnerMode,
      scheduleServerConfigSync,
      setConfig,
    ],
  );

  const shareUrl = useMemo(() => {
    const clean = parseHandle(activeHandle);
    if (!origin) return clean ? `/t/${clean}` : "/";
    if (!clean) return origin;
    if (isOwnerMode && serverSynced) return `${origin}/t/${clean}`;
    return buildDesignShareUrl(origin, clean, config, { short: false });
  }, [origin, activeHandle, config, isOwnerMode, serverSynced]);

  const visitorRelativeHref = useMemo(() => {
    const clean = parseHandle(activeHandle);
    if (!clean) return "/";
    try {
      const parsed = new URL(shareUrl);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return `/t/${clean}`;
    }
  }, [activeHandle, shareUrl]);

  const qrMatrix = useMemo(
    () => createQrMatrix(shareUrl || origin),
    [origin, shareUrl],
  );

  const resolvedOrnaments: ResolvedOrnament[] = useMemo(
    () => resolveTreeOrnaments(messages),
    [messages],
  );
  const activeOrnamentIds = useMemo(
    () => new Set(resolvedOrnaments.map((o) => o.id)),
    [resolvedOrnaments],
  );
  const visibleCount = useMemo(
    () =>
      !isOwnerMode && publicTotalVisible !== null
        ? publicTotalVisible
        : messages.filter((m) => m.status === "visible").length,
    [isOwnerMode, messages, publicTotalVisible],
  );
  const unreadCount = useMemo(
    () =>
      messages.filter((m) => m.status === "visible" && m.readAt === null)
        .length,
    [messages],
  );
  const prevUnreadCountRef = useRef(unreadCount);
  const [unreadTickSeq, setUnreadTickSeq] = useState(0);

  useEffect(() => {
    if (unreadCount > prevUnreadCountRef.current) {
      queueMicrotask(() => setUnreadTickSeq((s) => s + 1));
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  const newestUnread = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].status === "visible" && messages[i].readAt === null) {
        return messages[i];
      }
    }
    return null;
  }, [messages]);

  const activeMessage = useMemo(
    () => messages.find((m) => m.id === activeMessageId) ?? null,
    [messages, activeMessageId],
  );

  const avatarGlyph = useMemo(() => {
    if (config.avatar) return config.avatar;
    const clean = config.displayName.trim() || activeHandle;
    return clean.charAt(0).toUpperCase() || "H";
  }, [activeHandle, config.avatar, config.displayName]);

  const handleCopyText = useCallback(
    async (text: string, label: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text);
        showToast(`${label} copied`);
        return true;
      } catch {
        showToast("Copy failed — select and copy manually", "error");
        return false;
      }
    },
    [showToast],
  );

  const handleCopyLink = useCallback(() => {
    void handleCopyText(shareUrl, "Bio link").then((copied) => {
      if (!copied) return;
      setCopiedLink(true);
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = window.setTimeout(() => {
        setCopiedLink(false);
      }, 1200);
    });
  }, [copiedTimerRef, handleCopyText, shareUrl]);

  const handleDownloadQr = useCallback(async () => {
    const { downloadThemedQrPng } = await import("@/lib/share-card");
    const ok = await downloadThemedQrPng(shareUrl, theme, activeHandle);
    showToast(
      ok ? `Saved ${theme.label} QR PNG` : "Could not export QR image",
      ok ? "success" : "error",
    );
  }, [activeHandle, shareUrl, showToast, theme]);

  const handleCycleOwnerPrompt = useCallback(() => {
    const nextIdx = (ownerPromptIdx + 1) % OWNER_PROMPT_PRESETS.length;
    setOwnerPromptIdx(nextIdx);
    updateConfig({ prompt: OWNER_PROMPT_PRESETS[nextIdx] });
  }, [ownerPromptIdx, updateConfig]);

  const changeViewMode = useCallback(
    (next: CameraViewMode | ((prev: CameraViewMode) => CameraViewMode)) => {
      setViewMode((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        if (resolved !== prev && soundEnabled) {
          playOrnamentChime(resolved === "qr" ? "qr" : "click");
        }
        return resolved;
      });
    },
    [setViewMode, soundEnabled],
  );

  const handleToggleMusic = useCallback(() => {
    const playing = toggleChristmasMusic();
    const active = getCurrentChristmasTrack();
    setMusicPlaying(playing);
    setCurrentTrack(active);
    showToast(playing ? `Playing: ${active.title}` : "Christmas music paused");
  }, [showToast]);

  const handleNextTrack = useCallback(() => {
    const next = nextChristmasTrack();
    setCurrentTrack(next);
    showToast(`Carol: ${next.title}`);
  }, [showToast]);

  const pendingHandleSlug = parseHandle(handleDraft);
  const hasPendingHandleChange =
    handleDraft.trim().length > 0 && pendingHandleSlug !== activeHandle;
  const hasInvalidHandleDraft =
    handleDraft.trim().length > 0 && pendingHandleSlug === null;

  return {
    copiedLink,
    musicPlaying,
    currentTrack,
    updateConfig,
    shareUrl,
    visitorRelativeHref,
    qrMatrix,
    resolvedOrnaments,
    activeOrnamentIds,
    visibleCount,
    unreadCount,
    unreadTickSeq,
    newestUnread,
    activeMessage,
    avatarGlyph,
    handleCopyText,
    handleCopyLink,
    handleDownloadQr,
    handleCycleOwnerPrompt,
    changeViewMode,
    handleToggleMusic,
    handleNextTrack,
    pendingHandleSlug,
    hasPendingHandleChange,
    hasInvalidHandleDraft,
  };
}
