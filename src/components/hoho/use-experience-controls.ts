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
import { getSiteOriginString } from "@/lib/site-origin";
import {
  getCurrentChristmasTrack,
  getPlaylistSnapshot,
  nextChristmasTrack,
  playOrnamentChime,
  subscribePlaylist,
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

/** Manages derived tree/QR URLs, ornament counters, clipboard/QR downloads, config persistence, and playlist state. */
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
  const [musicPlaying, setMusicPlaying] = useState<boolean>(
    () => getPlaylistSnapshot().playing,
  );
  const [currentTrack, setCurrentTrack] = useState<ChristmasTrack>(() =>
    getCurrentChristmasTrack(),
  );

  useEffect(() => {
    return subscribePlaylist((snap) => {
      setMusicPlaying(snap.playing);
      setCurrentTrack(snap.track);
    });
  }, []);

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
      }, 240);
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

  const resolvedOrigin = useMemo(() => {
    if (origin) return origin.replace(/\/$/, "");
    if (typeof window !== "undefined" && window.location.origin) {
      return window.location.origin.replace(/\/$/, "");
    }
    return getSiteOriginString();
  }, [origin]);

  const effectiveHandle = useMemo(
    () => parseHandle(activeHandle) ?? parseHandle(handleDraft) ?? "",
    [activeHandle, handleDraft],
  );

  // Always generates a full absolute URL redirecting straight to /t/<handle> (never a relative path)
  const shareUrl = useMemo(() => {
    if (!effectiveHandle) {
      return `${resolvedOrigin}/`;
    }
    if (isOwnerMode && serverSynced) {
      return `${resolvedOrigin}/t/${effectiveHandle}`;
    }
    if (!isOwnerMode) {
      return `${resolvedOrigin}/t/${effectiveHandle}`;
    }
    return buildDesignShareUrl(resolvedOrigin, effectiveHandle, config, {
      short: false,
    });
  }, [resolvedOrigin, effectiveHandle, config, isOwnerMode, serverSynced]);

  const visitorRelativeHref = useMemo(() => {
    if (!effectiveHandle) return "/";
    try {
      const parsed = new URL(shareUrl);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return `/t/${effectiveHandle}`;
    }
  }, [effectiveHandle, shareUrl]);

  const qrMatrix = useMemo(() => createQrMatrix(shareUrl), [shareUrl]);

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
    const clean = config.displayName.trim() || effectiveHandle;
    return clean.charAt(0).toUpperCase() || "H";
  }, [effectiveHandle, config.avatar, config.displayName]);

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
    if (!effectiveHandle) {
      showToast(
        "Create or log in to your tree first so your link directs friends to you!",
        "info",
      );
      return;
    }
    void handleCopyText(shareUrl, `Link for @${effectiveHandle}`).then(
      (copied) => {
        if (!copied) return;
        setCopiedLink(true);
        if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = window.setTimeout(() => {
          setCopiedLink(false);
        }, 1200);
      },
    );
  }, [copiedTimerRef, effectiveHandle, handleCopyText, shareUrl, showToast]);

  const handleDownloadQr = useCallback(async () => {
    if (!effectiveHandle) {
      showToast(
        "Create or log in to your tree first so your QR redirects to your inbox!",
        "info",
      );
      return;
    }
    const { downloadThemedQrPng } = await import("@/lib/share-card");
    const ok = await downloadThemedQrPng(shareUrl, theme, effectiveHandle);
    showToast(
      ok
        ? `Saved Ultra-HD QR PNG for @${effectiveHandle}`
        : "Could not export QR image",
      ok ? "success" : "error",
    );
  }, [effectiveHandle, shareUrl, showToast, theme]);

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
    showToast(`Now queued: ${next.title}`);
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
    effectiveHandle,
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
