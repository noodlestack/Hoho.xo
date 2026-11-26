"use client";

import {
  Bell,
  BellOff,
  Check,
  Copy,
  Dices,
  Download,
  ExternalLink,
  HelpCircle,
  KeyRound,
  Mail,
  Music,
  QrCode,
  RotateCcw,
  Share2,
  SkipForward,
  Sparkles,
  TreePine,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Drawer } from "vaul";
import { gsap, SplitText, useGSAP } from "@/lib/gsap-init";
import {
  AsciiTreeCanvas,
  type CameraViewMode,
  type ResolvedOrnament,
} from "@/components/ascii-tree-canvas";
import {
  formatDisplayShareUrl,
  getKeyboardShortcuts,
  readVisitorDraft,
  writeVisitorDraft,
  type PublicTreeApiResponse,
  type StudioTab,
} from "@/components/hoho/experience-helpers";
import { useKeyboardShortcuts } from "@/components/hoho/use-keyboard-shortcuts";
import { useOwnerMail } from "@/components/hoho/use-owner-mail";
import { useOwnerSession } from "@/components/hoho/use-owner-session";
import {
  classifyMessage,
  loadStoredMessages,
  saveStoredMessages,
  type ReportReason,
  type TreeMessage,
} from "@/lib/messages";
import { getDefaultCrisisResource } from "@/lib/crisis-resources";
import {
  createQrMatrix,
  resolveTreeOrnaments,
  SLOT_COUNT,
} from "@/lib/qr-tree";
import type { PublicTreeData } from "@/lib/server-store";
import {
  getCurrentChristmasTrack,
  nextChristmasTrack,
  playOrnamentChime,
  stopChristmasMusic,
  toggleChristmasMusic,
  type ChristmasTrack,
} from "@/lib/sound";
import {
  buildDesignShareUrl,
  defaultTreeConfig,
  loadActiveOwnerHandle,
  loadTreeConfig,
  OWNER_PROMPT_PRESETS,
  parseDesignFromSearchParams,
  parseHandle,
  saveTreeConfig,
  TREE_AVATARS,
  TREE_SCENERIES,
  TREE_SHAPES,
  TREE_TOPPERS,
  VISITOR_IDEA_PROMPTS,
  type TreeConfig,
} from "@/lib/tree-config";
import {
  ORNAMENT_COLORS,
  ORNAMENT_TYPES,
  TREE_THEME_LIST,
  TREE_THEMES,
} from "@/lib/tree-themes";

const MailDrawer = dynamic(
  () => import("@/components/mail-drawer").then((m) => m.MailDrawer),
  { ssr: false },
);

const MessageCardSheet = dynamic(
  () =>
    import("@/components/message-card-sheet").then((m) => m.MessageCardSheet),
  { ssr: false },
);

const InviteStorySheet = dynamic(
  () =>
    import("@/components/invite-story-sheet").then((m) => m.InviteStorySheet),
  { ssr: false },
);

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";

const VISITOR_SNAP_POINTS = [0.28, 0.55, 0.92] as const;
const VISITOR_SNAP_KEY = "hoho:visitor-sheet-snap";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type ExperienceMode = "owner" | "visitor";

interface HohoExperienceProps {
  mode: ExperienceMode;
  initialHandle?: string;
  initialPublicTree?: PublicTreeData;
}

export function HohoExperience({
  mode,
  initialHandle,
  initialPublicTree,
}: HohoExperienceProps) {
  const isOwnerMode = mode === "owner";
  const initialSafeHandle = initialHandle
    ? (parseHandle(initialHandle) ?? "")
    : "";
  const initialVisitorTree =
    !isOwnerMode && initialPublicTree ? initialPublicTree : null;

  const [activeHandle, setActiveHandle] = useState<string>(initialSafeHandle);
  const [config, setConfig] = useState<TreeConfig>(() =>
    initialVisitorTree
      ? initialVisitorTree.config
      : defaultTreeConfig(initialSafeHandle),
  );
  const [messages, setMessages] = useState<TreeMessage[]>(() =>
    initialVisitorTree
      ? initialVisitorTree.ornaments.map((o) => ({ ...o, body: "" }))
      : [],
  );
  const [publicTotalVisible, setPublicTotalVisible] = useState<number | null>(
    () => (initialVisitorTree ? initialVisitorTree.totalVisible : null),
  );
  const [origin, setOrigin] = useState<string>("");
  const [viewMode, setViewMode] = useState<CameraViewMode>("tree");
  const [zoom, setZoom] = useState<number>(1);
  const [studioTab, setStudioTab] = useState<StudioTab>("share");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [musicPlaying, setMusicPlaying] = useState<boolean>(false);
  const [currentTrack, setCurrentTrack] = useState<ChristmasTrack>(() =>
    getCurrentChristmasTrack(),
  );
  const [daysToChristmas, setDaysToChristmas] = useState<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [staticMode, setStaticMode] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const [serverSynced, setServerSynced] = useState<boolean>(() =>
    Boolean(initialVisitorTree),
  );

  const [mailOpen, setMailOpen] = useState<boolean>(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [latestDroppedId, setLatestDroppedId] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [inviteSheetOpen, setInviteSheetOpen] = useState<boolean>(false);
  const [pushSubscribed, setPushSubscribed] = useState<boolean>(false);
  const [pushBusy, setPushBusy] = useState<boolean>(false);
  const [iosNeedsStandalone, setIosNeedsStandalone] = useState<boolean>(false);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState<boolean>(false);
  const [visitorSnap, setVisitorSnap] = useState<number | string | null>(0.55);
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0);

  const [noteBody, setNoteBody] = useState<string>("");
  const [honeypot, setHoneypot] = useState<string>("");
  const [selectedOrnament, setSelectedOrnament] = useState<number | null>(null);
  const [submittingNote, setSubmittingNote] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>("");
  const [visitorSentOrnament, setVisitorSentOrnament] =
    useState<TreeMessage | null>(null);
  const [flyingOrnament, setFlyingOrnament] = useState<{
    glyph: string;
    color: string;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
  } | null>(null);
  const [ownerPromptIdx, setOwnerPromptIdx] = useState<number>(0);
  const [visitorIdeaIdx, setVisitorIdeaIdx] = useState<number>(0);

  const copiedTimerRef = useRef<number | null>(null);
  const dropTimerRef = useRef<number | null>(null);
  const composeSubmitKeyRef = useRef<string | null>(null);
  const configSyncTimerRef = useRef<number | null>(null);
  const shortcutsWrapRef = useRef<HTMLDivElement | null>(null);
  const visitorCardRef = useRef<HTMLElement | null>(null);
  const visitorInputRef = useRef<HTMLTextAreaElement | null>(null);
  const visitorSubmitBtnRef = useRef<HTMLButtonElement | null>(null);
  const flyingOrnamentRef = useRef<HTMLDivElement | null>(null);
  const hydratedRef = useRef<boolean>(false);
  const activeHandleRef = useRef<string>(initialSafeHandle);
  const serverSyncedRef = useRef<boolean>(Boolean(initialVisitorTree));
  const soundEnabledRef = useRef<boolean>(true);

  useEffect(() => {
    activeHandleRef.current = activeHandle;
    serverSyncedRef.current = serverSynced;
    soundEnabledRef.current = soundEnabled;
  }, [activeHandle, serverSynced, soundEnabled]);

  const showToast = useCallback(
    (message: string, variant: "success" | "info" | "error" = "success") => {
      if (variant === "error") {
        toast.error(message);
      } else if (variant === "info") {
        toast.info(message);
      } else {
        toast.success(message);
      }
    },
    [],
  );

  const { seedKnownMessages, resetMailTracking, refreshOwnerMail } =
    useOwnerMail({
      isOwnerMode,
      serverSynced,
      activeHandleRef,
      serverSyncedRef,
      soundEnabledRef,
      dropTimerRef,
      setMessages,
      setLatestDroppedId,
      showToast,
    });

  const {
    handleDraft,
    setHandleDraft,
    ownerKey,
    setOwnerKey,
    unlockDraft,
    setUnlockDraft,
    ownerClaimError,
    claimOrSyncOwner,
    commitHandleChange,
    handleUnlockWithKey,
  } = useOwnerSession({
    isOwnerMode,
    initialSafeHandle,
    activeHandle,
    setActiveHandle,
    config,
    setConfig,
    setMessages,
    setServerSynced,
    seedKnownMessages,
    resetMailTracking,
    showToast,
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateReduced = () => setReducedMotion(mq.matches);
    queueMicrotask(updateReduced);
    mq.addEventListener("change", updateReduced);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    let cancelled = false;

    void (async () => {
      if (cancelled) return;
      setOrigin(window.location.origin);
      setStaticMode(
        new URLSearchParams(window.location.search).get("static") === "1",
      );
      setIsOnline(navigator.onLine);
      if (VAPID_PUBLIC_KEY) {
        const ua = window.navigator.userAgent || "";
        const isIos = /iPad|iPhone|iPod/i.test(ua);
        const isStandalone =
          window.matchMedia("(display-mode: standalone)").matches ||
          Boolean((window.navigator as { standalone?: boolean }).standalone);
        setIosNeedsStandalone(isIos && !isStandalone);
      }

      const nowDate = new Date();
      const year = nowDate.getFullYear();
      let targetXmas = new Date(year, 11, 25);
      const todayMidnight = new Date(
        year,
        nowDate.getMonth(),
        nowDate.getDate(),
      );
      if (todayMidnight.getTime() > targetXmas.getTime()) {
        targetXmas = new Date(year + 1, 11, 25);
      }
      setDaysToChristmas(
        Math.round(
          (targetXmas.getTime() - todayMidnight.getTime()) / 86_400_000,
        ),
      );

      const resolvedHandle = isOwnerMode
        ? (loadActiveOwnerHandle() ?? "")
        : (parseHandle(initialHandle ?? "") ?? "");

      setActiveHandle(resolvedHandle);
      setHandleDraft(resolvedHandle);

      if (isOwnerMode) {
        if (!resolvedHandle) {
          setStudioTab("prompt");
          setConfig(defaultTreeConfig(""));
          setMessages([]);
          setServerSynced(false);
          hydratedRef.current = true;
          return;
        }
        const storedConfig = loadTreeConfig(resolvedHandle);
        setOwnerKey("");
        setConfig(storedConfig);
        const initialStored = loadStoredMessages(resolvedHandle);
        seedKnownMessages(initialStored);
        setMessages(initialStored);
        hydratedRef.current = true;
        await claimOrSyncOwner(resolvedHandle, undefined, storedConfig);
      } else if (resolvedHandle) {
        const storedConfig = loadTreeConfig(resolvedHandle);
        const savedDraft = readVisitorDraft(resolvedHandle);
        if (savedDraft) {
          setNoteBody((prev) => prev || savedDraft);
        }

        const searchParams = new URLSearchParams(window.location.search);
        let baseConfig = initialPublicTree?.config ?? storedConfig;
        try {
          const res = await fetch(
            `/api/trees/${encodeURIComponent(resolvedHandle)}`,
            { cache: "no-store" },
          );
          if (res.ok) {
            const pub = (await res.json()) as PublicTreeApiResponse;
            if (!cancelled && pub.ok && pub.config) {
              baseConfig = pub.config;
              setServerSynced(true);
              if (Array.isArray(pub.ornaments)) {
                setMessages(
                  pub.ornaments.map((o) => ({
                    ...o,
                    body: "",
                  })),
                );
              }
              if (typeof pub.totalVisible === "number") {
                setPublicTotalVisible(pub.totalVisible);
              }
            }
          }
        } catch {
          // Fall back cleanly to SSR initialPublicTree / URL query params
        }

        if (!cancelled) {
          setConfig(parseDesignFromSearchParams(searchParams, baseConfig));
          hydratedRef.current = true;
        }
      }
    })();

    return () => {
      cancelled = true;
      stopChristmasMusic();
      mq.removeEventListener("change", updateReduced);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
      if (dropTimerRef.current) window.clearTimeout(dropTimerRef.current);
      if (configSyncTimerRef.current) {
        window.clearTimeout(configSyncTimerRef.current);
      }
    };
  }, [
    claimOrSyncOwner,
    initialHandle,
    initialPublicTree,
    isOwnerMode,
    seedKnownMessages,
    setHandleDraft,
    setOwnerKey,
  ]);

  useEffect(() => {
    if (!shortcutsOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (
        shortcutsWrapRef.current &&
        !shortcutsWrapRef.current.contains(event.target as Node)
      ) {
        setShortcutsOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShortcutsOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [shortcutsOpen]);

  useKeyboardShortcuts({
    isOwnerMode,
    setViewMode,
    setMailOpen,
    setShortcutsOpen,
    visitorCardRef,
    visitorInputRef,
  });

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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(nextConfig),
        }).catch(() => {});
      }, 320);
    },
    [isOwnerMode],
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
    [activeHandle, isOwnerMode, scheduleServerConfigSync],
  );

  const theme = TREE_THEMES[config.themeId] ?? TREE_THEMES.fairy;
  const effectiveOrigin = origin;

  const shareUrl = useMemo(() => {
    const clean = parseHandle(activeHandle);
    if (!effectiveOrigin) {
      return clean ? `/t/${clean}` : "/";
    }
    if (!clean) {
      return effectiveOrigin;
    }
    if (isOwnerMode && serverSynced) {
      return `${effectiveOrigin}/t/${clean}`;
    }
    return buildDesignShareUrl(effectiveOrigin, clean, config, {
      short: false,
    });
  }, [effectiveOrigin, activeHandle, config, isOwnerMode, serverSynced]);

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
    () => createQrMatrix(shareUrl || effectiveOrigin),
    [effectiveOrigin, shareUrl],
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
      const m = messages[i];
      if (m.status === "visible" && m.readAt === null) return m;
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

  useGSAP(
    () => {
      const card = visitorCardRef.current;
      if (!card) return;

      if (reducedMotion || staticMode) {
        gsap.set(card, { clearProps: "transform,opacity" });
        return;
      }

      const tl = gsap.timeline();
      tl.from(card, {
        y: 24,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        clearProps: "transform,opacity",
      });

      const directChildren = Array.from(card.children);
      if (directChildren.length > 0) {
        tl.from(
          directChildren,
          {
            y: 12,
            opacity: 0,
            duration: 0.45,
            stagger: 0.05,
            ease: "power3.out",
            clearProps: "transform,opacity",
          },
          0.08,
        );
      }

      const promptEl = card.querySelector<HTMLElement>(".bio-prompt-text");
      let split: SplitText | null = null;
      if (promptEl && promptEl.textContent?.trim()) {
        try {
          split = SplitText.create(promptEl, { type: "lines", aria: "none" });
          if (split.lines.length > 0) {
            tl.from(
              split.lines,
              {
                y: 14,
                opacity: 0,
                duration: 0.5,
                stagger: 0.08,
                ease: "expo.out",
                clearProps: "transform,opacity",
                onComplete: () => {
                  split?.revert();
                },
              },
              0.14,
            );
          }
        } catch {
          split = null;
        }
      }

      const statEls = card.querySelectorAll<HTMLElement>("[data-count-value]");
      statEls.forEach((el) => {
        const targetVal = Number(el.dataset.countValue ?? "0");
        if (Number.isFinite(targetVal) && targetVal > 0) {
          const counter = { val: 0 };
          tl.to(
            counter,
            {
              val: targetVal,
              duration: 0.5,
              ease: "power1.out",
              snap: { val: 1 },
              onUpdate: () => {
                el.textContent = String(Math.round(counter.val));
              },
              onComplete: () => {
                el.textContent = String(targetVal);
              },
            },
            0.22,
          );
        }
      });

      const skip = () => {
        if (tl.progress() < 1) {
          tl.progress(1);
          split?.revert();
        }
      };
      window.addEventListener("pointerdown", skip, {
        once: true,
        passive: true,
      });
      window.addEventListener("keydown", skip, { once: true, passive: true });

      return () => {
        window.removeEventListener("pointerdown", skip);
        window.removeEventListener("keydown", skip);
        split?.revert();
      };
    },
    { scope: visitorCardRef, dependencies: [reducedMotion] },
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mobileMq = window.matchMedia("(max-width: 767px)");
    const syncMobile = () => setIsMobileViewport(mobileMq.matches);
    queueMicrotask(syncMobile);
    mobileMq.addEventListener("change", syncMobile);
    return () => mobileMq.removeEventListener("change", syncMobile);
  }, []);

  useEffect(() => {
    if (isOwnerMode || typeof window === "undefined") return;
    try {
      const saved = window.sessionStorage.getItem(VISITOR_SNAP_KEY);
      const parsed = saved ? Number(saved) : Number.NaN;
      if (parsed === 0.28 || parsed === 0.55 || parsed === 0.92) {
        queueMicrotask(() => setVisitorSnap(parsed));
      }
    } catch {
      // Ignore storage access restrictions
    }
  }, [isOwnerMode]);

  useEffect(() => {
    if (isOwnerMode || !isMobileViewport || typeof window === "undefined") {
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;
    const syncKeyboard = () => {
      const inset = Math.max(
        0,
        Math.round(window.innerHeight - vv.height - vv.offsetTop),
      );
      setKeyboardOffset(inset > 60 ? inset : 0);
    };
    syncKeyboard();
    vv.addEventListener("resize", syncKeyboard);
    vv.addEventListener("scroll", syncKeyboard);
    return () => {
      vv.removeEventListener("resize", syncKeyboard);
      vv.removeEventListener("scroll", syncKeyboard);
    };
  }, [isMobileViewport, isOwnerMode]);

  const handleVisitorSnapChange = useCallback(
    (nextSnap: number | string | null) => {
      setVisitorSnap(nextSnap);
      if (typeof window !== "undefined" && typeof nextSnap === "number") {
        try {
          window.sessionStorage.setItem(VISITOR_SNAP_KEY, String(nextSnap));
        } catch {
          // Ignore storage quota errors
        }
      }
    },
    [],
  );

  useEffect(() => {
    const el = flyingOrnamentRef.current;
    if (!flyingOrnament || !el || reducedMotion) return;

    const midX = (flyingOrnament.fromX + flyingOrnament.toX) * 0.5;
    const midY = Math.min(flyingOrnament.fromY, flyingOrnament.toY) - 64;

    const tween = gsap
      .timeline({
        onComplete: () => setFlyingOrnament(null),
      })
      .fromTo(
        el,
        {
          x: flyingOrnament.fromX,
          y: flyingOrnament.fromY,
          scale: 0.9,
          opacity: 1,
        },
        {
          x: midX,
          y: midY,
          scale: 1.45,
          opacity: 1,
          duration: 0.55,
          ease: "power2.out",
        },
      )
      .to(el, {
        x: flyingOrnament.toX,
        y: flyingOrnament.toY,
        scale: 1.05,
        opacity: 0.15,
        duration: 0.55,
        ease: "power3.inOut",
      });

    return () => {
      tween.kill();
    };
  }, [flyingOrnament, reducedMotion]);

  const persistMessagesLocal = useCallback(
    (updater: (prev: TreeMessage[]) => TreeMessage[]) => {
      setMessages((prev) => {
        const next = updater(prev);
        if (isOwnerMode) {
          saveStoredMessages(next, activeHandle);
        }
        return next;
      });
    },
    [activeHandle, isOwnerMode],
  );

  const handleOpenMessage = useCallback(
    (target: TreeMessage) => {
      if (!isOwnerMode) return;
      if (soundEnabled) {
        playOrnamentChime("open");
      }
      setActiveMessageId(target.id);
      if (target.readAt === null) {
        const nowIso = new Date().toISOString();
        persistMessagesLocal((prev) =>
          prev.map((m) => (m.id === target.id ? { ...m, readAt: nowIso } : m)),
        );
        if (serverSyncedRef.current) {
          void fetch(
            `/api/trees/${encodeURIComponent(activeHandle)}/messages/${encodeURIComponent(target.id)}`,
            {
              method: "PATCH",
              credentials: "same-origin",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ action: "read" }),
            },
          ).catch(() => {});
        }
      }
    },
    [activeHandle, isOwnerMode, persistMessagesLocal, soundEnabled],
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
      if (serverSyncedRef.current) {
        void fetch(
          `/api/trees/${encodeURIComponent(activeHandle)}/messages/${encodeURIComponent(id)}`,
          {
            method: "DELETE",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
            },
          },
        ).catch(() => {});
      }
      showToast("Note removed from tree and Mail");
    },
    [activeHandle, persistMessagesLocal, showToast],
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
      if (serverSyncedRef.current) {
        void fetch(
          `/api/trees/${encodeURIComponent(activeHandle)}/messages/${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ action: "report", reason }),
          },
        ).catch(() => {});
      }
      showToast("Ornament hidden and saved in Reported Mail");
    },
    [activeHandle, persistMessagesLocal, showToast],
  );

  const handleMarkAllRead = useCallback(async () => {
    const hasUnread = messages.some((m) => m.status === "visible" && !m.readAt);
    if (!hasUnread) return;
    const nowIso = new Date().toISOString();
    persistMessagesLocal((prev) =>
      prev.map((m) =>
        m.status === "visible" && !m.readAt ? { ...m, readAt: nowIso } : m,
      ),
    );
    if (soundEnabled) {
      playOrnamentChime("click");
    }
    showToast("Marked all notes as read");
    if (serverSyncedRef.current) {
      try {
        const res = await fetch(
          `/api/trees/${encodeURIComponent(activeHandle)}/mail`,
          {
            method: "PATCH",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
            },
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
    showToast,
    soundEnabled,
  ]);

  const handleExportKeepsake = useCallback(() => {
    const visible = messages.filter((m) => m.status === "visible");
    if (visible.length === 0) return;

    const header = [
      `Hoho.xo Keepsake Archive — @${activeHandle}`,
      `Prompt: ${config.prompt}`,
      `Exported: ${new Date().toLocaleString()}`,
      `Total notes: ${visible.length}`,
      "=".repeat(48),
      "",
    ].join("\n");

    const entries = visible
      .map((m, idx) => {
        const typeName = ORNAMENT_TYPES[m.ornamentType]?.name ?? "Ornament";
        const ts = new Date(m.createdAt).toLocaleString();
        return `#${idx + 1} · ${typeName} · ${ts}\n${m.body}\n`;
      })
      .join("\n");

    const blob = new Blob([header + entries], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `hoho-${activeHandle}-keepsake.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Downloaded keepsake .txt archive");
  }, [activeHandle, config.prompt, messages, showToast]);

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
      if (copiedTimerRef.current) {
        window.clearTimeout(copiedTimerRef.current);
      }
      copiedTimerRef.current = window.setTimeout(() => {
        setCopiedLink(false);
      }, 1200);
    });
  }, [handleCopyText, shareUrl]);

  const handleDownloadQr = useCallback(async () => {
    const { downloadThemedQrPng } = await import("@/lib/share-card");
    const ok = await downloadThemedQrPng(shareUrl, theme, activeHandle);
    showToast(
      ok ? `Saved ${theme.label} QR PNG` : "Could not export QR image",
      ok ? "success" : "error",
    );
  }, [activeHandle, shareUrl, showToast, theme]);

  const handleTogglePush = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY || pushBusy) return;
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      typeof Notification === "undefined"
    ) {
      showToast("Push notifications require a modern browser.", "info");
      return;
    }

    setPushBusy(true);
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();

      if (pushSubscribed && existing) {
        await fetch(`/api/trees/${encodeURIComponent(activeHandle)}/push`, {
          method: "DELETE",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        await existing.unsubscribe();
        setPushSubscribed(false);
        showToast("Turned off push alerts for this device", "info");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        showToast("Notification permission was not granted.", "info");
        return;
      }

      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        showToast("Browser push subscription incomplete.", "error");
        return;
      }

      const res = await fetch(
        `/api/trees/${encodeURIComponent(activeHandle)}/push`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          }),
        },
      );
      if (!res.ok) {
        showToast("Could not enable push notifications right now.", "error");
        return;
      }
      setPushSubscribed(true);
      showToast("Push alerts enabled for new ornaments!");
    } catch {
      showToast("Push setup unavailable in this browser context.", "info");
    } finally {
      setPushBusy(false);
    }
  }, [activeHandle, pushBusy, pushSubscribed, showToast]);

  const handleCycleOwnerPrompt = useCallback(() => {
    const nextIdx = (ownerPromptIdx + 1) % OWNER_PROMPT_PRESETS.length;
    setOwnerPromptIdx(nextIdx);
    updateConfig({ prompt: OWNER_PROMPT_PRESETS[nextIdx] });
  }, [ownerPromptIdx, updateConfig]);

  const handleVisitorDice = useCallback(() => {
    const nextIdx = (visitorIdeaIdx + 1) % VISITOR_IDEA_PROMPTS.length;
    const pickedPrompt = VISITOR_IDEA_PROMPTS[nextIdx];
    setVisitorIdeaIdx(nextIdx);
    setNoteBody(pickedPrompt);
    writeVisitorDraft(activeHandle, pickedPrompt);
    composeSubmitKeyRef.current = null;
    setSubmitError("");
    if (soundEnabled) playOrnamentChime("click");
    visitorInputRef.current?.focus();
  }, [activeHandle, soundEnabled, visitorIdeaIdx]);

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
    [soundEnabled],
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

  const handleVisitorSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (submittingNote) return;

      if (config.pauseInbox) {
        setSubmitError(`@${activeHandle} paused new ornaments for now.`);
        return;
      }

      const verdict = classifyMessage(noteBody, config.mutedWords);
      if (verdict.decision === "reject") {
        setSubmitError(verdict.reason ?? "Please adjust your message.");
        return;
      }

      setSubmittingNote(true);
      setSubmitError("");

      const submitKey =
        composeSubmitKeyRef.current ??
        (typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
      composeSubmitKeyRef.current = submitKey;

      try {
        const res = await fetch(
          `/api/trees/${encodeURIComponent(activeHandle)}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": submitKey,
            },
            body: JSON.stringify({
              body: noteBody,
              ornamentType: selectedOrnament,
              website: honeypot,
            }),
          },
        );

        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          ignored?: boolean;
          ornament?: TreeMessage;
          totalVisible?: number;
          selfHarmNotice?: boolean;
          error?: string;
        };

        if (res.status === 403) {
          composeSubmitKeyRef.current = null;
          setConfig((prev) => ({ ...prev, pauseInbox: true }));
          setSubmitError(
            data.error ?? `@${activeHandle} paused new anonymous notes.`,
          );
          return;
        }

        if (!res.ok || !data.ok) {
          if (res.status >= 400 && res.status < 500) {
            composeSubmitKeyRef.current = null;
          }
          setSubmitError(data.error ?? "Could not hang ornament right now.");
          return;
        }

        composeSubmitKeyRef.current = null;
        if (data.selfHarmNotice) {
          const support = getDefaultCrisisResource();
          toast.info("If things feel heavy right now, you are not alone.", {
            duration: 12_000,
            action: {
              label: "Find support",
              onClick: () => {
                if (support.url) {
                  window.open(support.url, "_blank", "noopener,noreferrer");
                  return;
                }
                if (support.tel) {
                  window.location.href = `tel:${support.tel}`;
                  return;
                }
                toast.info(support.label, {
                  description: support.guidance,
                  duration: 15_000,
                });
              },
            },
          });
        }

        if (data.ornament) {
          const placed = { ...data.ornament, body: "" };
          setMessages((prev) => [...prev, placed]);
          setVisitorSentOrnament(placed);
          setLatestDroppedId(placed.id);

          if (!reducedMotion && typeof window !== "undefined") {
            const btnRect =
              visitorSubmitBtnRef.current?.getBoundingClientRect();
            const canvasRect = document
              .querySelector(".tree-canvas")
              ?.getBoundingClientRect();
            if (btnRect && canvasRect) {
              const glyphMeta =
                ORNAMENT_TYPES[placed.ornamentType] ?? ORNAMENT_TYPES[0];
              const glyphColor =
                ORNAMENT_COLORS[placed.colorIdx % ORNAMENT_COLORS.length] ??
                "#F5C451";
              setFlyingOrnament({
                glyph: glyphMeta.glyph,
                color: glyphColor,
                fromX: btnRect.left + btnRect.width / 2,
                fromY: btnRect.top + btnRect.height / 2,
                toX: canvasRect.left + canvasRect.width / 2,
                toY: canvasRect.top + canvasRect.height * 0.34,
              });
            }
          }
        }
        if (typeof data.totalVisible === "number") {
          setPublicTotalVisible(data.totalVisible);
        }

        setNoteBody("");
        writeVisitorDraft(activeHandle, "");
        setSelectedOrnament(null);

        if (viewMode === "qr") {
          setViewMode("tree");
        }
        if (soundEnabled) {
          playOrnamentChime("drop");
        }
        if (!reducedMotion) {
          if (typeof navigator !== "undefined") {
            navigator.vibrate?.(12);
          }
          void import("canvas-confetti")
            .then(({ default: confetti }) =>
              confetti({
                particleCount: 48,
                spread: 64,
                origin: { y: 0.72 },
                colors: [theme.swatch, theme.star, theme.foliage[3], "#F5C451"],
                disableForReducedMotion: true,
              }),
            )
            .catch(() => {});
        }

        if (dropTimerRef.current) window.clearTimeout(dropTimerRef.current);
        dropTimerRef.current = window.setTimeout(() => {
          setLatestDroppedId(null);
        }, 3400);
      } catch {
        setSubmitError("Connection error — please try sending again.");
      } finally {
        setSubmittingNote(false);
      }
    },
    [
      activeHandle,
      config.mutedWords,
      config.pauseInbox,
      honeypot,
      noteBody,
      reducedMotion,
      selectedOrnament,
      soundEnabled,
      submittingNote,
      theme.foliage,
      theme.star,
      theme.swatch,
      viewMode,
    ],
  );

  const sentOrnamentMeta = visitorSentOrnament
    ? (ORNAMENT_TYPES[visitorSentOrnament.ornamentType] ?? ORNAMENT_TYPES[0])
    : null;
  const sentOrnamentColor = visitorSentOrnament
    ? (ORNAMENT_COLORS[visitorSentOrnament.colorIdx] ?? ORNAMENT_COLORS[0])
    : theme.swatch;

  const pendingHandleSlug = parseHandle(handleDraft);
  const hasPendingHandleChange =
    handleDraft.trim().length > 0 && pendingHandleSlug !== activeHandle;
  const hasInvalidHandleDraft =
    handleDraft.trim().length > 0 && pendingHandleSlug === null;

  const musicBtn = (
    <button
      type="button"
      className={`audio-pill-btn ${musicPlaying ? "is-playing" : ""}`}
      aria-pressed={musicPlaying}
      aria-label={
        musicPlaying
          ? `Pause ${currentTrack.title}`
          : "Play Christmas music box"
      }
      title={
        musicPlaying
          ? `Playing: ${currentTrack.title}`
          : "Play Christmas music box"
      }
      onClick={handleToggleMusic}
    >
      <Music size={15} strokeWidth={2.2} aria-hidden="true" />
    </button>
  );

  const mailNavBtn = (
    <button
      type="button"
      className="pill-nav-btn"
      onClick={() => {
        setMailOpen(true);
        if (serverSyncedRef.current) {
          void refreshOwnerMail(activeHandle);
        }
      }}
    >
      <Mail size={14} strokeWidth={2} aria-hidden="true" />
      <span>Mail ({messages.length})</span>
      {unreadCount > 0 ? (
        <span
          key={unreadTickSeq}
          className={`unread-pill${unreadTickSeq > 0 ? "is-ticking" : ""}`}
        >
          {unreadCount} new
        </span>
      ) : null}
    </button>
  );

  return (
    <div
      className={`hoho-app${
        !isOwnerMode && isMobileViewport ? "is-visitor-mobile" : ""
      }${
        !isOwnerMode && isMobileViewport && visitorSnap === 0.28
          ? "is-visitor-peek"
          : ""
      }`}
      style={{ "--accent": theme.swatch } as React.CSSProperties}
    >
      <div className="stage-shell">
        <header className="stage-header">
          <Link href="/" className="brand">
            <span className="brand-star" aria-hidden="true">
              <Sparkles size={15} strokeWidth={2.2} />
            </span>
            <span>
              Hoho.<span className="brand-accent">xo</span>
            </span>
          </Link>

          <div className="view-tabs" role="group" aria-label="Canvas mode">
            <button
              type="button"
              className="view-tab"
              aria-pressed={viewMode === "tree"}
              onClick={() => changeViewMode("tree")}
            >
              Tree
            </button>
            <button
              type="button"
              className="view-tab"
              aria-pressed={viewMode === "top"}
              onClick={() => changeViewMode("top")}
            >
              Top
            </button>
            <button
              type="button"
              className="view-tab"
              aria-pressed={viewMode === "qr"}
              onClick={() => changeViewMode("qr")}
            >
              QR Code
            </button>
          </div>

          <div className="stage-header-actions">
            {musicBtn}
            {isOwnerMode ? (
              <>
                <Link
                  href={visitorRelativeHref}
                  className="pill-nav-btn"
                  data-hide-mobile="true"
                >
                  <span>Visitor</span>
                  <ExternalLink
                    size={13}
                    strokeWidth={2.2}
                    aria-hidden="true"
                  />
                </Link>
                {mailNavBtn}
              </>
            ) : (
              <Link href="/" className="make-tree-link">
                <span>Make yours</span>
                <Sparkles size={14} strokeWidth={2.2} aria-hidden="true" />
              </Link>
            )}
          </div>
        </header>

        <main className="stage-container">
          <AsciiTreeCanvas
            handle={activeHandle}
            qrValue={shareUrl}
            matrix={qrMatrix}
            theme={theme}
            topper={config.topper}
            shape={config.shape}
            scenery={config.scenery}
            zoom={zoom}
            viewMode={viewMode}
            showSnow={config.showSnow}
            showGarland={config.showGarland}
            showOrnaments={config.showOrnaments}
            ornaments={resolvedOrnaments}
            latestDroppedId={latestDroppedId}
            reducedMotion={reducedMotion || staticMode}
            staticMode={staticMode}
            isOwnerMode={isOwnerMode}
            onSelectOrnament={handleSelectOrnament}
            onToggleQrView={() =>
              changeViewMode((prev) => (prev === "qr" ? "tree" : "qr"))
            }
            onZoomChange={setZoom}
          />
        </main>

        <div className="stage-footer">
          <div className="stage-footer-left">
            {viewMode !== "qr" ? (
              <div
                className="stage-controls"
                role="group"
                aria-label="Tree zoom"
              >
                <button
                  type="button"
                  className="stage-zoom-btn"
                  aria-label="Zoom out tree"
                  title="Zoom out"
                  onClick={() =>
                    setZoom((z) =>
                      Math.max(0.72, Number((z - 0.12).toFixed(2))),
                    )
                  }
                >
                  <ZoomOut size={15} strokeWidth={2.1} aria-hidden="true" />
                </button>
                <span className="stage-zoom-pct" aria-hidden="true">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  className="stage-zoom-btn"
                  aria-label="Zoom in tree"
                  title="Zoom in"
                  onClick={() =>
                    setZoom((z) =>
                      Math.min(1.45, Number((z + 0.12).toFixed(2))),
                    )
                  }
                >
                  <ZoomIn size={15} strokeWidth={2.1} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="stage-zoom-btn"
                  aria-label="Reset zoom"
                  title="Reset view"
                  onClick={() => setZoom(1)}
                >
                  <RotateCcw size={14} strokeWidth={2.1} aria-hidden="true" />
                </button>
              </div>
            ) : null}

            <div
              ref={shortcutsWrapRef}
              className="shortcuts-wrap"
              data-hide-mobile="true"
            >
              <button
                type="button"
                className="shortcuts-btn"
                aria-label="Keyboard shortcuts"
                title="Keyboard shortcuts (?)"
                aria-expanded={shortcutsOpen}
                onClick={() => setShortcutsOpen((prev) => !prev)}
              >
                <HelpCircle size={14} strokeWidth={2} aria-hidden="true" />
              </button>
              {shortcutsOpen ? (
                <div
                  className="shortcuts-popover"
                  role="dialog"
                  aria-label="Keyboard shortcuts"
                >
                  <p className="shortcuts-title">Shortcuts</p>
                  <div className="shortcuts-grid">
                    {getKeyboardShortcuts(isOwnerMode).map((item) => (
                      <Fragment key={item.key}>
                        <kbd>{item.key}</kbd>
                        <span>{item.label}</span>
                      </Fragment>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="stage-footer-center">
            {viewMode === "qr" ? (
              <button
                type="button"
                className="qr-download-pill"
                onClick={() => void handleDownloadQr()}
              >
                <Download size={14} strokeWidth={2.1} aria-hidden="true" />
                <span>Save {theme.label} QR PNG</span>
              </button>
            ) : (
              <button
                type="button"
                className="hint-pill"
                onClick={() =>
                  changeViewMode((prev) => (prev === "qr" ? "tree" : "qr"))
                }
              >
                <QrCode size={14} strokeWidth={2} aria-hidden="true" />
                <span>Tap tree for QR</span>
              </button>
            )}
          </div>

          {isOwnerMode &&
          resolvedOrnaments.length > 0 &&
          config.showOrnaments &&
          viewMode !== "qr" ? (
            <div
              className="ornament-dock-bar"
              aria-label="Recent tree ornaments"
            >
              <span className="ornament-dock-label">
                On tree ({resolvedOrnaments.length}/{SLOT_COUNT})
              </span>
              <div className="ornament-chip-row">
                {resolvedOrnaments.slice(0, 18).map((item) => {
                  const styleMeta =
                    ORNAMENT_TYPES[item.ornamentType] ?? ORNAMENT_TYPES[0];
                  const color =
                    ORNAMENT_COLORS[item.colorIdx] ?? ORNAMENT_COLORS[0];
                  const isUnread = item.readAt === null;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`ornament-chip ${isUnread ? "is-unread" : ""}`}
                      onClick={() => handleOpenMessage(item)}
                    >
                      {isUnread ? (
                        <span
                          className="ornament-chip-dot"
                          aria-hidden="true"
                        />
                      ) : null}
                      <span style={{ color }} aria-hidden="true">
                        {styleMeta.glyph}
                      </span>
                      <span>#{item.seq}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <span aria-hidden="true" />
          )}
        </div>
      </div>

      <div className="sidebar-shell">
        <div className="sidebar-topbar">
          {musicBtn}
          {isOwnerMode ? (
            <>
              <Link href={visitorRelativeHref} className="pill-nav-btn">
                <span>Visitor</span>
                <ExternalLink size={13} strokeWidth={2.2} aria-hidden="true" />
              </Link>
              {mailNavBtn}
            </>
          ) : (
            <Link href="/" className="make-tree-link">
              <span>Make yours</span>
              <Sparkles size={14} strokeWidth={2.2} aria-hidden="true" />
            </Link>
          )}
        </div>

        <aside
          ref={visitorCardRef}
          className="social-card"
          aria-label={
            isOwnerMode
              ? "Owner tree creator hub"
              : `Send an anonymous note to @${activeHandle}`
          }
        >
          {!isOnline ? (
            <div className="offline-pill" role="status">
              Offline — changes will sync when reconnected
            </div>
          ) : null}
          {isOwnerMode ? (
            <>
              <div
                className="studio-tabs"
                role="tablist"
                aria-label="Creator studio sections"
              >
                <span
                  className="studio-tabs-indicator"
                  aria-hidden="true"
                  style={{
                    transform: `translateX(${
                      (studioTab === "share"
                        ? 0
                        : studioTab === "style"
                          ? 1
                          : 2) * 100
                    }%)`,
                  }}
                />
                <button
                  type="button"
                  role="tab"
                  aria-selected={studioTab === "share"}
                  className="studio-tab"
                  onClick={() => setStudioTab("share")}
                >
                  Share
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={studioTab === "style"}
                  className="studio-tab"
                  onClick={() => setStudioTab("style")}
                >
                  Style
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={studioTab === "prompt"}
                  className="studio-tab"
                  onClick={() => setStudioTab("prompt")}
                >
                  Prompt
                </button>
              </div>

              {ownerClaimError ? (
                <div className="error-box" role="alert">
                  <span>{ownerClaimError}</span>
                  {studioTab !== "prompt" ? (
                    <button
                      type="button"
                      className="dice-btn mt-2"
                      onClick={() => setStudioTab("prompt")}
                    >
                      Open Handle &amp; Access Key →
                    </button>
                  ) : null}
                </div>
              ) : null}

              {studioTab === "share" ? (
                <>
                  <div className="bio-profile-flat">
                    <div className="bio-identity-row">
                      <div className="avatar-ring" aria-hidden="true">
                        {avatarGlyph}
                      </div>
                      <div className="bio-identity-text">
                        <p className="bio-name">
                          {config.displayName || `@${activeHandle}`}
                        </p>
                        <p className="bio-handle-line">
                          <span>@{activeHandle}</span>
                          <span>·</span>
                          <span
                            className={`status-dot ${
                              config.pauseInbox ? "is-paused" : ""
                            }`}
                            aria-hidden="true"
                          />
                          <span>
                            {config.pauseInbox ? "Paused" : "Accepting notes"}
                          </span>
                        </p>
                      </div>
                    </div>
                    <p className="bio-prompt-text">{config.prompt}</p>
                    {daysToChristmas !== null ? (
                      <span className="countdown-pill">
                        🎄{" "}
                        {daysToChristmas === 0
                          ? "Merry Christmas!"
                          : `${daysToChristmas} ${daysToChristmas === 1 ? "day" : "days"} to Christmas`}
                      </span>
                    ) : null}
                  </div>

                  <div className="share-row-wrap">
                    <span className="section-label">
                      Your bio link (
                      {serverSynced ? "short QR ready" : "portable link"})
                    </span>
                    <div className="share-link-pill">
                      <span className="share-link-display" title={shareUrl}>
                        {formatDisplayShareUrl(shareUrl)}
                      </span>
                      <button
                        type="button"
                        className={`share-copy-icon-btn ${copiedLink ? "is-copied" : ""}`}
                        aria-label={
                          copiedLink ? "Copied bio link" : "Copy bio link"
                        }
                        onClick={handleCopyLink}
                      >
                        <span
                          className={`copy-glyph ${
                            copiedLink ? "is-hidden" : "is-visible"
                          }`}
                          aria-hidden="true"
                        >
                          <Copy size={14} strokeWidth={2} />
                        </span>
                        <span
                          className={`copy-glyph ${
                            copiedLink ? "is-visible" : "is-hidden"
                          }`}
                          aria-hidden="true"
                        >
                          <Check size={14} strokeWidth={2.2} />
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="share-cta-stack">
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() => {
                        setMobileSheetOpen(false);
                        setInviteSheetOpen(true);
                      }}
                    >
                      <Share2 size={15} strokeWidth={2} aria-hidden="true" />
                      <span>Share to Story</span>
                    </button>
                    <div className="share-secondary-row">
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() =>
                          changeViewMode((prev) =>
                            prev === "qr" ? "tree" : "qr",
                          )
                        }
                      >
                        {viewMode === "qr" ? (
                          <>
                            <TreePine
                              size={15}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                            <span>Show Tree</span>
                          </>
                        ) : (
                          <>
                            <QrCode
                              size={15}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                            <span>Show QR</span>
                          </>
                        )}
                      </button>
                      <Link
                        href={visitorRelativeHref}
                        className="secondary-btn"
                      >
                        <span>Preview</span>
                        <ExternalLink
                          size={14}
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      </Link>
                    </div>
                    {VAPID_PUBLIC_KEY ? (
                      <>
                        <button
                          type="button"
                          className="secondary-btn"
                          aria-pressed={pushSubscribed}
                          disabled={pushBusy}
                          onClick={() => void handleTogglePush()}
                        >
                          {pushSubscribed ? (
                            <>
                              <Bell
                                size={14}
                                strokeWidth={2}
                                aria-hidden="true"
                              />
                              <span>Notify me: On</span>
                            </>
                          ) : (
                            <>
                              <BellOff
                                size={14}
                                strokeWidth={2}
                                aria-hidden="true"
                              />
                              <span>Notify me</span>
                            </>
                          )}
                        </button>
                        {iosNeedsStandalone ? (
                          <p className="tree-meta-line">
                            On iPhone, add Hoho.xo to your Home Screen first to
                            enable Web Push.
                          </p>
                        ) : null}
                      </>
                    ) : null}
                  </div>

                  {unreadCount > 0 && newestUnread ? (
                    <button
                      type="button"
                      className="unread-spotlight-btn"
                      onClick={() => handleOpenMessage(newestUnread)}
                    >
                      <Mail size={14} strokeWidth={2.1} aria-hidden="true" />
                      <span>Unwrap newest unread ({unreadCount})</span>
                    </button>
                  ) : null}

                  {messages.length === 0 ? (
                    <p className="share-empty-state">
                      Your tree is bare. Share your link and it fills up.
                    </p>
                  ) : (
                    <div className="share-stats-row">
                      <div className="share-stat-cell">
                        <span
                          className="share-stat-value"
                          data-count-value={visibleCount}
                        >
                          {visibleCount}
                        </span>
                        <span className="share-stat-label">On tree</span>
                      </div>
                      <div className="share-stat-cell">
                        <span
                          className="share-stat-value"
                          data-count-value={messages.length}
                        >
                          {messages.length}
                        </span>
                        <span className="share-stat-label">Total</span>
                      </div>
                      <div className="share-stat-cell">
                        <span className="share-stat-value">
                          {unreadCount > 0 ? (
                            <span
                              className="unread-stat-dot"
                              aria-hidden="true"
                            />
                          ) : null}
                          <span data-count-value={unreadCount}>
                            {unreadCount}
                          </span>
                        </span>
                        <span className="share-stat-label">Unread</span>
                      </div>
                    </div>
                  )}
                </>
              ) : null}

              {studioTab === "style" ? (
                <div className="edit-stack">
                  <div>
                    <span className="section-label">
                      Color theme ({TREE_THEME_LIST.length})
                    </span>
                    <div
                      className="theme-grid"
                      role="group"
                      aria-label="Tree color theme"
                    >
                      {TREE_THEME_LIST.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="theme-swatch-btn"
                          aria-pressed={config.themeId === item.id}
                          onClick={() => updateConfig({ themeId: item.id })}
                        >
                          <span
                            className="theme-dot"
                            style={{ backgroundColor: item.swatch }}
                            aria-hidden="true"
                          />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="section-label">
                      Apex topper ({TREE_TOPPERS.length})
                    </span>
                    <div
                      className="topper-grid"
                      role="group"
                      aria-label="Tree topper"
                    >
                      {TREE_TOPPERS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="topper-btn"
                          aria-pressed={config.topper === item.id}
                          onClick={() => updateConfig({ topper: item.id })}
                        >
                          <span className="topper-glyph" aria-hidden="true">
                            {item.glyph}
                          </span>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="section-label">
                      Tree silhouette ({TREE_SHAPES.length})
                    </span>
                    <div
                      className="shape-grid"
                      role="group"
                      aria-label="Tree silhouette"
                    >
                      {TREE_SHAPES.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="shape-btn"
                          aria-pressed={config.shape === item.id}
                          onClick={() => updateConfig({ shape: item.id })}
                        >
                          <strong>{item.label}</strong>
                          <span>{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="section-label">
                      Winter scenery ({TREE_SCENERIES.length})
                    </span>
                    <div
                      className="scenery-grid"
                      role="group"
                      aria-label="Winter scenery"
                    >
                      {TREE_SCENERIES.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="shape-btn"
                          aria-pressed={config.scenery === item.id}
                          onClick={() => updateConfig({ scenery: item.id })}
                        >
                          <strong>{item.label}</strong>
                          <span>{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="section-label">
                      Christmas Music Box · {currentTrack.title}
                    </span>
                    <div className="music-box-controls">
                      <button
                        type="button"
                        className="secondary-btn"
                        aria-pressed={musicPlaying}
                        onClick={handleToggleMusic}
                      >
                        <Music size={14} strokeWidth={2} aria-hidden="true" />
                        <span>
                          {musicPlaying ? "Pause Carol" : "Play Carol"}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={handleNextTrack}
                      >
                        <SkipForward
                          size={14}
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                        <span>Next Carol</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="section-label">Canvas effects</span>
                    <div className="toggle-grid">
                      <label className="switch-label">
                        <span>Atmosphere</span>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={config.showSnow}
                          onChange={(event) =>
                            updateConfig({ showSnow: event.target.checked })
                          }
                        />
                        <span className="switch-track" aria-hidden="true" />
                      </label>
                      <label className="switch-label">
                        <span>Lights</span>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={config.showGarland}
                          onChange={(event) =>
                            updateConfig({ showGarland: event.target.checked })
                          }
                        />
                        <span className="switch-track" aria-hidden="true" />
                      </label>
                      <label className="switch-label">
                        <span>Ornaments</span>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={config.showOrnaments}
                          onChange={(event) =>
                            updateConfig({
                              showOrnaments: event.target.checked,
                            })
                          }
                        />
                        <span className="switch-track" aria-hidden="true" />
                      </label>
                      <label className="switch-label">
                        <span>Chimes</span>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={soundEnabled}
                          onChange={(event) =>
                            setSoundEnabled(event.target.checked)
                          }
                        />
                        <span className="switch-track" aria-hidden="true" />
                      </label>
                    </div>
                  </div>
                </div>
              ) : null}

              {studioTab === "prompt" ? (
                <div className="edit-stack">
                  <div>
                    <span className="section-label">Avatar emblem</span>
                    <div
                      className="avatar-picker-row"
                      role="group"
                      aria-label="Avatar emblem"
                    >
                      {TREE_AVATARS.map((item) => (
                        <button
                          key={item.id || "initial"}
                          type="button"
                          className="avatar-choice-btn"
                          aria-label={item.label}
                          title={item.label}
                          aria-pressed={config.avatar === item.id}
                          onClick={() => updateConfig({ avatar: item.id })}
                        >
                          {item.id ||
                            config.displayName.trim()[0]?.toUpperCase() ||
                            "A"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="edit-field">
                    <label
                      htmlFor="owner-handle-input"
                      className="section-label"
                    >
                      {activeHandle
                        ? `Tree handle (/t/${activeHandle})`
                        : "Choose your tree handle (/t/...)"}
                    </label>
                    <div className="url-row">
                      <input
                        id="owner-handle-input"
                        type="text"
                        className="social-input is-mono"
                        placeholder="e.g. santa_2026"
                        maxLength={21}
                        value={handleDraft}
                        onChange={(event) => setHandleDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void commitHandleChange(handleDraft);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => void commitHandleChange(handleDraft)}
                      >
                        Set
                      </button>
                    </div>
                    {hasInvalidHandleDraft ? (
                      <p className="handle-pending-hint">
                        Handles use 3–20 letters, numbers, or underscores.
                      </p>
                    ) : hasPendingHandleChange && pendingHandleSlug ? (
                      <p className="handle-pending-hint">
                        Click Set to switch to @{pendingHandleSlug}
                      </p>
                    ) : null}
                  </div>

                  <div className="edit-field">
                    <label htmlFor="owner-name-input" className="section-label">
                      Display name
                    </label>
                    <input
                      id="owner-name-input"
                      type="text"
                      className="social-input"
                      maxLength={28}
                      value={config.displayName}
                      onChange={(event) =>
                        updateConfig({ displayName: event.target.value })
                      }
                    />
                  </div>

                  <div className="edit-field">
                    <div className="prompt-header-row">
                      <label
                        htmlFor="owner-prompt-input"
                        className="section-label"
                      >
                        Bio question prompt
                      </label>
                      <button
                        type="button"
                        className="dice-btn"
                        onClick={handleCycleOwnerPrompt}
                      >
                        <Dices size={14} strokeWidth={2} aria-hidden="true" />
                        <span>Prompt</span>
                      </button>
                    </div>
                    <textarea
                      id="owner-prompt-input"
                      className="edit-textarea"
                      maxLength={140}
                      value={config.prompt}
                      onChange={(event) =>
                        updateConfig({ prompt: event.target.value })
                      }
                    />
                  </div>

                  <div className="edit-field">
                    <label
                      htmlFor="owner-muted-words"
                      className="section-label"
                    >
                      Hidden word filter (comma-separated)
                    </label>
                    <input
                      id="owner-muted-words"
                      type="text"
                      className="social-input"
                      maxLength={200}
                      placeholder="e.g. spoiler, ex-name"
                      value={config.mutedWords}
                      onChange={(event) =>
                        updateConfig({ mutedWords: event.target.value })
                      }
                    />
                  </div>

                  <div className="toggle-grid">
                    <label className="switch-label">
                      <span>Pause inbox</span>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={config.pauseInbox}
                        onChange={(event) =>
                          updateConfig({ pauseInbox: event.target.checked })
                        }
                      />
                      <span className="switch-track" aria-hidden="true" />
                    </label>
                    <label className="switch-label">
                      <span>Wrap Dec 25</span>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={config.christmasLock}
                        onChange={(event) =>
                          updateConfig({ christmasLock: event.target.checked })
                        }
                      />
                      <span className="switch-track" aria-hidden="true" />
                    </label>
                  </div>

                  <div className="key-box">
                    <div className="prompt-header-row">
                      <span className="section-label m-0">
                        Owner Access Key
                      </span>
                      {ownerKey ? (
                        <button
                          type="button"
                          className="dice-btn"
                          onClick={() =>
                            void handleCopyText(ownerKey, "Owner Access Key")
                          }
                        >
                          <Copy size={13} strokeWidth={2} aria-hidden="true" />
                          <span>Copy Key</span>
                        </button>
                      ) : null}
                    </div>
                    <p className="tree-meta-line">
                      {ownerKey
                        ? "Save this now, it can't be shown again. Your session is protected by an HttpOnly cookie."
                        : "Enter the Owner Access Key for an existing handle to unlock Mail here."}
                    </p>
                    <form className="url-row" onSubmit={handleUnlockWithKey}>
                      <label htmlFor="owner-unlock-key" className="sr-only">
                        Owner Access Key
                      </label>
                      <input
                        id="owner-unlock-key"
                        type="password"
                        className="social-input is-mono"
                        placeholder="Paste key to unlock..."
                        value={unlockDraft}
                        onChange={(event) => setUnlockDraft(event.target.value)}
                      />
                      <button type="submit" className="secondary-btn">
                        <KeyRound
                          size={14}
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                        <span>Unlock</span>
                      </button>
                    </form>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="bio-hero-card">
                <div className="bio-identity-row">
                  <div className="avatar-ring" aria-hidden="true">
                    {avatarGlyph}
                  </div>
                  <div className="bio-identity-text">
                    <p className="bio-name">
                      {config.displayName || `@${activeHandle}`}
                    </p>
                    <p className="bio-handle-line">
                      <span>@{activeHandle}</span>
                      <span>·</span>
                      <span>{theme.label}</span>
                      <span>·</span>
                      <span
                        className={`status-dot ${
                          config.pauseInbox ? "is-paused" : ""
                        }`}
                        aria-hidden="true"
                      />
                      <span>{config.pauseInbox ? "Paused" : "Active"}</span>
                    </p>
                  </div>
                </div>
                <p className="bio-prompt-text">{config.prompt}</p>
                {daysToChristmas !== null ? (
                  <span className="countdown-pill">
                    🎄{" "}
                    {daysToChristmas === 0
                      ? "Merry Christmas!"
                      : `${daysToChristmas} ${daysToChristmas === 1 ? "day" : "days"} to Christmas`}
                  </span>
                ) : null}
              </div>

              <p className="tree-meta-line">
                {visibleCount} {visibleCount === 1 ? "ornament" : "ornaments"}{" "}
                hanging on @{activeHandle}&apos;s tree
              </p>

              {config.pauseInbox ? (
                <div className="paused-banner">
                  <strong>Inbox paused</strong>
                  <span>
                    @{activeHandle} has paused new anonymous notes right now.
                  </span>
                  <Link href="/" className="make-tree-link">
                    Make your own tree →
                  </Link>
                </div>
              ) : visitorSentOrnament ? (
                <div className="celebrate-box">
                  <div
                    className="avatar-ring"
                    style={{
                      margin: "0 auto",
                      color: sentOrnamentColor,
                      borderColor: sentOrnamentColor,
                    }}
                    aria-hidden="true"
                  >
                    {sentOrnamentMeta?.glyph ?? "*"}
                  </div>
                  <p className="celebrate-title">
                    Ornament hung on @{activeHandle}&apos;s tree!
                  </p>
                  <p className="anonymity-note">
                    Sent anonymously as a {sentOrnamentMeta?.name ?? "Bauble"}.
                    Only @{activeHandle} can unwrap it in Mail.
                  </p>
                  <Link href="/" className="primary-btn celebrate-hero-cta">
                    <span>Get your own tree →</span>
                  </Link>
                  <button
                    type="button"
                    className="secondary-btn celebrate-again-btn"
                    onClick={() => {
                      setVisitorSentOrnament(null);
                      window.setTimeout(
                        () => visitorInputRef.current?.focus(),
                        60,
                      );
                    }}
                  >
                    Send another
                  </button>
                </div>
              ) : (
                <form className="compose-box" onSubmit={handleVisitorSubmit}>
                  <input
                    type="text"
                    name="website"
                    value={honeypot}
                    onChange={(event) => setHoneypot(event.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="honeypot-field"
                  />
                  <label htmlFor="visitor-note-input" className="sr-only">
                    Send an anonymous note
                  </label>
                  <div className="compose-textarea-wrap">
                    <textarea
                      id="visitor-note-input"
                      ref={visitorInputRef}
                      className="compose-textarea"
                      placeholder="Send an anonymous note to hang on this tree..."
                      maxLength={500}
                      value={noteBody}
                      onChange={(event) => {
                        const nextVal = event.target.value;
                        setNoteBody(nextVal);
                        writeVisitorDraft(activeHandle, nextVal);
                        composeSubmitKeyRef.current = null;
                        if (submitError) setSubmitError("");
                      }}
                      onKeyDown={(event) => {
                        if (
                          (event.ctrlKey || event.metaKey) &&
                          event.key === "Enter" &&
                          noteBody.trim().length > 0 &&
                          !submittingNote
                        ) {
                          event.preventDefault();
                          event.currentTarget.form?.requestSubmit();
                        }
                      }}
                    />
                    <div className="compose-corner-bar">
                      <button
                        type="button"
                        className="dice-btn"
                        onClick={handleVisitorDice}
                      >
                        <Dices size={14} strokeWidth={2} aria-hidden="true" />
                        <span>Idea</span>
                      </button>
                      <span
                        className={`char-counter${
                          noteBody.length >= 500
                            ? "is-limit"
                            : noteBody.length >= 450
                              ? "is-warn"
                              : ""
                        }`}
                      >
                        {noteBody.length}/500
                      </span>
                    </div>
                  </div>
                  <div className="compose-progress-track" aria-hidden="true">
                    <div
                      className={`compose-progress-fill ${
                        noteBody.length >= 450 ? "is-near-limit" : ""
                      }`}
                      style={{
                        width: `${Math.min(100, (noteBody.length / 500) * 100)}%`,
                      }}
                    />
                  </div>

                  <div>
                    <span className="section-label">
                      Pick an ornament ({ORNAMENT_TYPES.length} styles)
                    </span>
                    <div
                      className="ornament-strip"
                      role="group"
                      aria-label="Choose ornament style"
                    >
                      <button
                        type="button"
                        className="ornament-pill is-picker-tile"
                        aria-pressed={selectedOrnament === null}
                        onClick={() => setSelectedOrnament(null)}
                      >
                        {selectedOrnament === null ? (
                          <span
                            className="ornament-check-badge"
                            aria-hidden="true"
                          >
                            ✓
                          </span>
                        ) : null}
                        <span
                          className="ornament-pill-glyph"
                          aria-hidden="true"
                        >
                          ✨
                        </span>
                        <span>Surprise</span>
                      </button>
                      {ORNAMENT_TYPES.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="ornament-pill is-picker-tile"
                          aria-pressed={selectedOrnament === item.id}
                          onClick={() => setSelectedOrnament(item.id)}
                        >
                          {selectedOrnament === item.id ? (
                            <span
                              className="ornament-check-badge"
                              aria-hidden="true"
                            >
                              ✓
                            </span>
                          ) : null}
                          <span
                            className="ornament-pill-glyph"
                            aria-hidden="true"
                          >
                            {item.glyph}
                          </span>
                          <span>{item.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {submitError ? (
                    <div className="error-box" role="alert">
                      {submitError}
                    </div>
                  ) : null}

                  <button
                    ref={visitorSubmitBtnRef}
                    type="submit"
                    className="primary-btn"
                    disabled={noteBody.trim().length === 0 || submittingNote}
                  >
                    {submittingNote
                      ? "Hanging ornament..."
                      : "Send anonymous note"}
                  </button>

                  <p className="anonymity-note">
                    100% anonymous · No sign-in · Private to @{activeHandle}
                  </p>
                </form>
              )}
            </>
          )}

          <footer className="panel-footer">
            <span className="credit-badge">
              made by <strong>noodlestack</strong> · <span>Hoho.xo</span>
            </span>
            <span className="inline-flex items-center gap-2 text-[11px] opacity-75">
              <Link href="/privacy" className="hover:underline">
                Privacy
              </Link>
              <span aria-hidden="true">·</span>
              <Link href="/terms" className="hover:underline">
                Terms
              </Link>
            </span>
          </footer>
        </aside>
      </div>

      {isMobileViewport && isOwnerMode ? (
        <>
          <button
            type="button"
            className="mobile-sheet-trigger"
            aria-haspopup="dialog"
            aria-expanded={mobileSheetOpen}
            onClick={() => setMobileSheetOpen(true)}
          >
            <Sparkles size={15} strokeWidth={2.2} aria-hidden="true" />
            <span>Studio</span>
          </button>
          <Drawer.Root open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <Drawer.Portal>
              <Drawer.Overlay className="drawer-backdrop" />
              <Drawer.Content
                className="sheet-panel vaul-sheet-panel mobile-panel-drawer"
                aria-label="Owner tree creator hub"
              >
                <div className="vaul-drag-handle" aria-hidden="true" />
                <Drawer.Title className="sr-only">Creator Studio</Drawer.Title>
                <div className="mobile-drawer-scroll">
                  {!isOnline ? (
                    <div className="offline-pill" role="status">
                      Offline — changes will sync when reconnected
                    </div>
                  ) : null}
                  <>
                    <div
                      className="studio-tabs"
                      role="tablist"
                      aria-label="Creator studio sections"
                    >
                      <span
                        className="studio-tabs-indicator"
                        aria-hidden="true"
                        style={{
                          transform: `translateX(${
                            (studioTab === "share"
                              ? 0
                              : studioTab === "style"
                                ? 1
                                : 2) * 100
                          }%)`,
                        }}
                      />
                      <button
                        type="button"
                        role="tab"
                        aria-selected={studioTab === "share"}
                        className="studio-tab"
                        onClick={() => setStudioTab("share")}
                      >
                        Share
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={studioTab === "style"}
                        className="studio-tab"
                        onClick={() => setStudioTab("style")}
                      >
                        Style
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={studioTab === "prompt"}
                        className="studio-tab"
                        onClick={() => setStudioTab("prompt")}
                      >
                        Prompt
                      </button>
                    </div>

                    {studioTab === "share" ? (
                      <div className="edit-stack">
                        <div className="bio-profile-flat">
                          <div className="bio-identity-row">
                            <div className="avatar-ring" aria-hidden="true">
                              {avatarGlyph}
                            </div>
                            <div className="bio-identity-text">
                              <p className="bio-name">
                                {config.displayName || `@${activeHandle}`}
                              </p>
                              <p className="bio-handle-line">
                                <span>@{activeHandle}</span>
                                <span>·</span>
                                <span
                                  className={`status-dot ${
                                    config.pauseInbox ? "is-paused" : ""
                                  }`}
                                  aria-hidden="true"
                                />
                                <span>
                                  {config.pauseInbox
                                    ? "Paused"
                                    : "Accepting notes"}
                                </span>
                              </p>
                            </div>
                          </div>
                          <p className="bio-prompt-text">{config.prompt}</p>
                        </div>

                        <div className="share-cta-stack">
                          <button
                            type="button"
                            className="primary-btn"
                            onClick={() => {
                              setMobileSheetOpen(false);
                              setInviteSheetOpen(true);
                            }}
                          >
                            <Share2
                              size={15}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                            <span>Share to Story</span>
                          </button>
                          <div className="share-secondary-row">
                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={handleCopyLink}
                            >
                              <Copy
                                size={14}
                                strokeWidth={2}
                                aria-hidden="true"
                              />
                              <span>{copiedLink ? "Copied" : "Copy Link"}</span>
                            </button>
                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={() => {
                                setMobileSheetOpen(false);
                                setMailOpen(true);
                              }}
                            >
                              <Mail
                                size={14}
                                strokeWidth={2}
                                aria-hidden="true"
                              />
                              <span>Mail ({messages.length})</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : studioTab === "style" ? (
                      <div className="edit-stack">
                        <div>
                          <span className="section-label">
                            Color theme ({TREE_THEME_LIST.length})
                          </span>
                          <div
                            className="theme-grid"
                            role="group"
                            aria-label="Tree color theme"
                          >
                            {TREE_THEME_LIST.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                className="theme-swatch-btn"
                                aria-pressed={config.themeId === item.id}
                                onClick={() =>
                                  updateConfig({ themeId: item.id })
                                }
                              >
                                <span
                                  className="theme-swatch-dot"
                                  style={{ background: item.swatch }}
                                  aria-hidden="true"
                                />
                                <span>{item.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="edit-stack">
                        <label
                          htmlFor="mobile-owner-handle"
                          className="section-label"
                        >
                          Public handle
                        </label>
                        <div className="url-row">
                          <input
                            id="mobile-owner-handle"
                            type="text"
                            className="social-input is-mono"
                            value={handleDraft}
                            maxLength={20}
                            onChange={(event) =>
                              setHandleDraft(event.target.value)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void commitHandleChange(handleDraft);
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => void commitHandleChange(handleDraft)}
                          >
                            Save
                          </button>
                        </div>
                        <label
                          htmlFor="mobile-owner-prompt"
                          className="section-label"
                        >
                          Prompt question
                        </label>
                        <input
                          id="mobile-owner-prompt"
                          type="text"
                          className="social-input"
                          maxLength={120}
                          value={config.prompt}
                          onChange={(event) =>
                            updateConfig({ prompt: event.target.value })
                          }
                        />
                      </div>
                    )}
                  </>
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        </>
      ) : null}

      {isMobileViewport && !isOwnerMode ? (
        <Drawer.Root
          open
          modal={false}
          dismissible={false}
          snapPoints={[...VISITOR_SNAP_POINTS]}
          activeSnapPoint={visitorSnap}
          setActiveSnapPoint={handleVisitorSnapChange}
        >
          <Drawer.Portal>
            <Drawer.Content
              className="sheet-panel vaul-sheet-panel visitor-mobile-sheet"
              aria-label={`Send an anonymous note to @${activeHandle}`}
              style={
                keyboardOffset > 0
                  ? { paddingBottom: `${keyboardOffset + 16}px` }
                  : undefined
              }
            >
              <div className="visitor-sheet-topbar">
                <span className="visitor-mini-preview">
                  <span
                    style={{
                      color:
                        selectedOrnament !== null
                          ? (ORNAMENT_COLORS[
                              selectedOrnament % ORNAMENT_COLORS.length
                            ] ?? theme.swatch)
                          : theme.swatch,
                      fontWeight: 700,
                    }}
                    aria-hidden="true"
                  >
                    {selectedOrnament !== null
                      ? (ORNAMENT_TYPES[selectedOrnament]?.glyph ?? "*")
                      : "✨"}
                  </span>
                  <span>
                    {selectedOrnament !== null
                      ? (ORNAMENT_TYPES[selectedOrnament]?.name ?? "Ornament")
                      : "Surprise"}
                  </span>
                </span>
                <div className="vaul-drag-handle" aria-hidden="true" />
                <div
                  className="visitor-snap-pills"
                  role="group"
                  aria-label="Composer sheet height"
                >
                  <button
                    type="button"
                    className="visitor-snap-btn"
                    aria-pressed={visitorSnap === 0.28}
                    onClick={() => handleVisitorSnapChange(0.28)}
                  >
                    Peek
                  </button>
                  <button
                    type="button"
                    className="visitor-snap-btn"
                    aria-pressed={visitorSnap === 0.55}
                    onClick={() => handleVisitorSnapChange(0.55)}
                  >
                    Half
                  </button>
                  <button
                    type="button"
                    className="visitor-snap-btn"
                    aria-pressed={visitorSnap === 0.92}
                    onClick={() => handleVisitorSnapChange(0.92)}
                  >
                    Full
                  </button>
                </div>
              </div>
              <Drawer.Title className="sr-only">
                Send anonymous note to @{activeHandle}
              </Drawer.Title>
              <div className="mobile-drawer-scroll">
                {!isOnline ? (
                  <div className="offline-pill" role="status">
                    Offline — changes will sync when reconnected
                  </div>
                ) : null}
                {config.pauseInbox ? (
                  <div className="paused-banner">
                    <strong>Inbox paused</strong>
                    <span>
                      @{activeHandle} has paused new anonymous notes right now.
                    </span>
                    <Link href="/" className="make-tree-link">
                      Make your own tree →
                    </Link>
                  </div>
                ) : visitorSentOrnament ? (
                  <div className="celebrate-box">
                    <div
                      className="avatar-ring"
                      style={{
                        margin: "0 auto",
                        color: sentOrnamentColor,
                        borderColor: sentOrnamentColor,
                      }}
                      aria-hidden="true"
                    >
                      {sentOrnamentMeta?.glyph ?? "*"}
                    </div>
                    <p className="celebrate-title">
                      Ornament hung on @{activeHandle}&apos;s tree!
                    </p>
                    <p className="anonymity-note">
                      Sent anonymously as a {sentOrnamentMeta?.name ?? "Bauble"}
                      . Only @{activeHandle} can unwrap it in Mail.
                    </p>
                    <Link href="/" className="primary-btn celebrate-hero-cta">
                      <span>Get your own tree →</span>
                    </Link>
                    <button
                      type="button"
                      className="secondary-btn celebrate-again-btn"
                      onClick={() => setVisitorSentOrnament(null)}
                    >
                      Send another
                    </button>
                  </div>
                ) : (
                  <form className="compose-box" onSubmit={handleVisitorSubmit}>
                    <input
                      type="text"
                      name="website"
                      value={honeypot}
                      onChange={(event) => setHoneypot(event.target.value)}
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                      className="honeypot-field"
                    />
                    <div className="compose-textarea-wrap">
                      <label htmlFor="mobile-visitor-note" className="sr-only">
                        Send an anonymous note
                      </label>
                      <textarea
                        id="mobile-visitor-note"
                        className="compose-textarea visitor-mobile-textarea"
                        placeholder={config.prompt}
                        maxLength={500}
                        value={noteBody}
                        onChange={(event) => {
                          const nextVal = event.target.value;
                          setNoteBody(nextVal);
                          writeVisitorDraft(activeHandle, nextVal);
                          composeSubmitKeyRef.current = null;
                          if (submitError) setSubmitError("");
                        }}
                      />
                      <div className="compose-corner-bar">
                        <button
                          type="button"
                          className="dice-btn"
                          onClick={handleVisitorDice}
                        >
                          <Dices size={14} strokeWidth={2} aria-hidden="true" />
                          <span>Idea</span>
                        </button>
                        <span
                          className={`char-counter${
                            noteBody.length >= 500
                              ? "is-limit"
                              : noteBody.length >= 450
                                ? "is-warn"
                                : ""
                          }`}
                        >
                          {noteBody.length}/500
                        </span>
                      </div>
                    </div>
                    <div className="compose-progress-track" aria-hidden="true">
                      <div
                        className={`compose-progress-fill ${
                          noteBody.length >= 450 ? "is-near-limit" : ""
                        }`}
                        style={{
                          width: `${Math.min(100, (noteBody.length / 500) * 100)}%`,
                        }}
                      />
                    </div>
                    {submitError ? (
                      <div className="error-box" role="alert">
                        {submitError}
                      </div>
                    ) : null}
                    <button
                      type="submit"
                      className="primary-btn"
                      disabled={noteBody.trim().length === 0 || submittingNote}
                    >
                      {submittingNote
                        ? "Hanging ornament..."
                        : "Send anonymous note"}
                    </button>
                    <div>
                      <span className="section-label">
                        Prompt starters · @{activeHandle}
                      </span>
                      <div
                        className="prompt-chip-row"
                        role="group"
                        aria-label="Prompt starter ideas"
                      >
                        {VISITOR_IDEA_PROMPTS.map((starter) => (
                          <button
                            key={starter}
                            type="button"
                            className="prompt-chip"
                            onClick={() => {
                              setNoteBody(starter);
                              writeVisitorDraft(activeHandle, starter);
                              composeSubmitKeyRef.current = null;
                              if (submitError) setSubmitError("");
                            }}
                          >
                            {starter}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="section-label">
                        Pick an ornament ({ORNAMENT_TYPES.length} styles)
                      </span>
                      <div
                        className="ornament-strip"
                        role="group"
                        aria-label="Choose ornament style"
                      >
                        <button
                          type="button"
                          className="ornament-pill is-picker-tile"
                          aria-pressed={selectedOrnament === null}
                          onClick={() => setSelectedOrnament(null)}
                        >
                          {selectedOrnament === null ? (
                            <span
                              className="ornament-check-badge"
                              aria-hidden="true"
                            >
                              ✓
                            </span>
                          ) : null}
                          <span
                            className="ornament-pill-glyph"
                            aria-hidden="true"
                          >
                            ✨
                          </span>
                          <span>Surprise</span>
                        </button>
                        {ORNAMENT_TYPES.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="ornament-pill is-picker-tile"
                            aria-pressed={selectedOrnament === item.id}
                            onClick={() => setSelectedOrnament(item.id)}
                          >
                            {selectedOrnament === item.id ? (
                              <span
                                className="ornament-check-badge"
                                aria-hidden="true"
                              >
                                ✓
                              </span>
                            ) : null}
                            <span
                              className="ornament-pill-glyph"
                              aria-hidden="true"
                            >
                              {item.glyph}
                            </span>
                            <span>{item.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="anonymity-note">
                      100% anonymous · No sign-in · Private to @{activeHandle}
                    </p>
                  </form>
                )}
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      ) : null}

      {isOwnerMode ? (
        <>
          <MailDrawer
            open={mailOpen}
            messages={messages}
            activeOrnamentIds={activeOrnamentIds}
            onClose={() => setMailOpen(false)}
            onOpenMessage={(msg) => {
              setMailOpen(false);
              handleOpenMessage(msg);
            }}
            onCopyShareLink={handleCopyLink}
            onMarkAllRead={handleMarkAllRead}
            onExportKeepsake={handleExportKeepsake}
          />
          <MessageCardSheet
            message={activeMessage}
            treeUrl={shareUrl}
            displayName={config.displayName}
            prompt={config.prompt}
            christmasLock={config.christmasLock}
            onClose={() => setActiveMessageId(null)}
            onDelete={handleDeleteMessage}
            onReport={handleReportMessage}
          />
          <InviteStorySheet
            open={inviteSheetOpen}
            treeUrl={shareUrl}
            theme={theme}
            config={{
              handle: activeHandle,
              displayName: config.displayName,
              prompt: config.prompt,
            }}
            onClose={() => setInviteSheetOpen(false)}
            onResult={(outcome) => {
              if (outcome === "shared") {
                showToast("Opened Story share sheet");
              } else if (outcome === "downloaded") {
                showToast("Downloaded 1080×1920 IG Story Invite");
              } else {
                showToast("Story invite share cancelled", "info");
              }
            }}
          />
        </>
      ) : null}
      {flyingOrnament && !reducedMotion ? (
        <div
          ref={flyingOrnamentRef}
          className="flying-ornament"
          style={{
            color: flyingOrnament.color,
            borderColor: flyingOrnament.color,
          }}
          aria-hidden="true"
        >
          {flyingOrnament.glyph}
        </div>
      ) : null}
    </div>
  );
}
