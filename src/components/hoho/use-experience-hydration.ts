"use client";

import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
import {
  readVisitorDraft,
  type PublicTreeApiResponse,
  type StudioTab,
} from "@/components/hoho/experience-helpers";
import { gsap, useGSAP } from "@/lib/gsap-init";
import { loadStoredMessages, type TreeMessage } from "@/lib/messages";
import type { PublicTreeData } from "@/lib/server-store";
import { stopChristmasMusic } from "@/lib/sound";
import {
  defaultTreeConfig,
  loadActiveOwnerHandle,
  loadTreeConfig,
  parseDesignFromSearchParams,
  parseHandle,
  type TreeConfig,
} from "@/lib/tree-config";

interface UseExperienceHydrationOptions {
  isOwnerMode: boolean;
  initialHandle?: string;
  initialPublicTree?: PublicTreeData;
  reducedMotion: boolean;
  staticMode: boolean;
  shortcutsOpen: boolean;
  shortcutsWrapRef: RefObject<HTMLDivElement | null>;
  visitorCardRef: RefObject<HTMLElement | null>;
  hydratedRef: MutableRefObject<boolean>;
  setReducedMotion: Dispatch<SetStateAction<boolean>>;
  setIsOnline: Dispatch<SetStateAction<boolean>>;
  setOrigin: Dispatch<SetStateAction<string>>;
  setStaticMode: Dispatch<SetStateAction<boolean>>;
  setDaysToChristmas: Dispatch<SetStateAction<number | null>>;
  setActiveHandle: Dispatch<SetStateAction<string>>;
  setHandleDraft: Dispatch<SetStateAction<string>>;
  setStudioTab: Dispatch<SetStateAction<StudioTab>>;
  setConfig: Dispatch<SetStateAction<TreeConfig>>;
  setMessages: Dispatch<SetStateAction<TreeMessage[]>>;
  setServerSynced: Dispatch<SetStateAction<boolean>>;
  setOwnerKey: Dispatch<SetStateAction<string>>;
  setAuthChecking: Dispatch<SetStateAction<boolean>>;
  setNoteBody: Dispatch<SetStateAction<string>>;
  setPublicTotalVisible: Dispatch<SetStateAction<number | null>>;
  setShortcutsOpen: Dispatch<SetStateAction<boolean>>;
  setIsMobileViewport: Dispatch<SetStateAction<boolean>>;
  seedKnownMessages: (next: TreeMessage[]) => void;
  checkSession: (targetHandle: string) => Promise<boolean>;
}

/** Handles initial client hydration, responsive viewport tracking, shortcut dismissal, and card GSAP entrance. */
export function useExperienceHydration({
  isOwnerMode,
  initialHandle,
  initialPublicTree,
  reducedMotion,
  staticMode,
  shortcutsOpen,
  shortcutsWrapRef,
  visitorCardRef,
  hydratedRef,
  setReducedMotion,
  setIsOnline,
  setOrigin,
  setStaticMode,
  setDaysToChristmas,
  setActiveHandle,
  setHandleDraft,
  setStudioTab,
  setConfig,
  setMessages,
  setServerSynced,
  setOwnerKey,
  setAuthChecking,
  setNoteBody,
  setPublicTotalVisible,
  setShortcutsOpen,
  setIsMobileViewport,
  seedKnownMessages,
  checkSession,
}: UseExperienceHydrationOptions) {
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

      if (isOwnerMode) {
        if (!resolvedHandle) {
          setActiveHandle("");
          setHandleDraft("");
          setStudioTab("share");
          setConfig(defaultTreeConfig(""));
          setMessages([]);
          setServerSynced(false);
          setAuthChecking(false);
          hydratedRef.current = true;
          return;
        }
        const storedConfig = loadTreeConfig(resolvedHandle);
        setOwnerKey("");
        setHandleDraft(resolvedHandle);
        setConfig(storedConfig);
        const initialStored = loadStoredMessages(resolvedHandle);
        seedKnownMessages(initialStored);
        setMessages(initialStored);
        hydratedRef.current = true;
        const verified = await checkSession(resolvedHandle);
        if (!verified && !cancelled) {
          setActiveHandle("");
          setMessages([]);
          setServerSynced(false);
        }
      } else if (resolvedHandle) {
        setActiveHandle(resolvedHandle);
        setHandleDraft(resolvedHandle);
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
                setMessages(pub.ornaments.map((o) => ({ ...o, body: "" })));
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
    };
  }, [
    checkSession,
    hydratedRef,
    initialHandle,
    initialPublicTree,
    isOwnerMode,
    seedKnownMessages,
    setActiveHandle,
    setAuthChecking,
    setConfig,
    setDaysToChristmas,
    setHandleDraft,
    setIsOnline,
    setMessages,
    setNoteBody,
    setOrigin,
    setOwnerKey,
    setPublicTotalVisible,
    setReducedMotion,
    setServerSynced,
    setStaticMode,
    setStudioTab,
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
  }, [setShortcutsOpen, shortcutsOpen, shortcutsWrapRef]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mobileMq = window.matchMedia("(max-width: 767px)");
    const syncMobile = () => setIsMobileViewport(mobileMq.matches);
    queueMicrotask(syncMobile);
    mobileMq.addEventListener("change", syncMobile);
    return () => mobileMq.removeEventListener("change", syncMobile);
  }, [setIsMobileViewport]);

  // Animate card entrance without mutating React-owned text nodes (fixes BUG-01 stale prompt)
  useGSAP(
    () => {
      const card = visitorCardRef.current;
      if (!card || window.innerWidth < 768) return;
      if (reducedMotion || staticMode) {
        gsap.set(card, { clearProps: "transform,opacity" });
        return;
      }
      const tl = gsap.timeline();
      tl.from(card, {
        y: 18,
        opacity: 0,
        duration: 0.45,
        ease: "power3.out",
        clearProps: "transform,opacity",
      });
      const skip = () => {
        if (tl.progress() < 1) {
          tl.progress(1);
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
      };
    },
    { scope: visitorCardRef, dependencies: [reducedMotion] },
  );
}
