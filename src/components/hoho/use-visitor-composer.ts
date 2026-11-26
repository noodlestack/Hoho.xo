"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { toast } from "sonner";
import { gsap } from "@/lib/gsap-init";
import type { CameraViewMode } from "@/components/ascii-tree-canvas";
import { writeVisitorDraft } from "@/components/hoho/experience-helpers";
import { getDefaultCrisisResource } from "@/lib/crisis-resources";
import { classifyMessage, type TreeMessage } from "@/lib/messages";
import { playOrnamentChime } from "@/lib/sound";
import { VISITOR_IDEA_PROMPTS, type TreeConfig } from "@/lib/tree-config";
import {
  ORNAMENT_COLORS,
  ORNAMENT_TYPES,
  type TreeTheme,
} from "@/lib/tree-themes";

export const VISITOR_SNAP_POINTS = [0.28, 0.55, 0.92] as const;
const VISITOR_SNAP_KEY = "hoho:visitor-sheet-snap";

export interface FlyingOrnamentState {
  glyph: string;
  color: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

interface UseVisitorComposerOptions {
  isOwnerMode: boolean;
  isMobileViewport: boolean;
  activeHandle: string;
  config: TreeConfig;
  setConfig: Dispatch<SetStateAction<TreeConfig>>;
  theme: TreeTheme;
  viewMode: CameraViewMode;
  setViewMode: Dispatch<SetStateAction<CameraViewMode>>;
  soundEnabled: boolean;
  reducedMotion: boolean;
  setMessages: Dispatch<SetStateAction<TreeMessage[]>>;
  setPublicTotalVisible: Dispatch<SetStateAction<number | null>>;
  setLatestDroppedId: Dispatch<SetStateAction<string | null>>;
  dropTimerRef: MutableRefObject<number | null>;
}

/** Manages visitor note composition, mobile bottom-sheet snap state, and ornament-drop celebration. */
export function useVisitorComposer({
  isOwnerMode,
  isMobileViewport,
  activeHandle,
  config,
  setConfig,
  theme,
  viewMode,
  setViewMode,
  soundEnabled,
  reducedMotion,
  setMessages,
  setPublicTotalVisible,
  setLatestDroppedId,
  dropTimerRef,
}: UseVisitorComposerOptions) {
  const [visitorSnap, setVisitorSnap] = useState<number | string | null>(0.55);
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0);

  const [noteBody, setNoteBody] = useState<string>("");
  const [honeypot, setHoneypot] = useState<string>("");
  const [selectedOrnament, setSelectedOrnament] = useState<number | null>(null);
  const [submittingNote, setSubmittingNote] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>("");
  const [visitorSentOrnament, setVisitorSentOrnament] =
    useState<TreeMessage | null>(null);
  const [flyingOrnament, setFlyingOrnament] =
    useState<FlyingOrnamentState | null>(null);
  const [visitorIdeaIdx, setVisitorIdeaIdx] = useState<number>(0);

  const composeSubmitKeyRef = useRef<string | null>(null);
  const visitorInputRef = useRef<HTMLTextAreaElement | null>(null);
  const visitorSubmitBtnRef = useRef<HTMLButtonElement | null>(null);
  const flyingOrnamentRef = useRef<HTMLDivElement | null>(null);

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

  const handleVisitorSubmit = useCallback(
    async (event: FormEvent) => {
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
      dropTimerRef,
      honeypot,
      noteBody,
      reducedMotion,
      selectedOrnament,
      setConfig,
      setLatestDroppedId,
      setMessages,
      setPublicTotalVisible,
      setViewMode,
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

  return {
    visitorSnap,
    keyboardOffset,
    noteBody,
    setNoteBody,
    honeypot,
    setHoneypot,
    selectedOrnament,
    setSelectedOrnament,
    submittingNote,
    submitError,
    setSubmitError,
    visitorSentOrnament,
    setVisitorSentOrnament,
    flyingOrnament,
    composeSubmitKeyRef,
    visitorInputRef,
    visitorSubmitBtnRef,
    flyingOrnamentRef,
    handleVisitorSnapChange,
    handleVisitorDice,
    handleVisitorSubmit,
    sentOrnamentMeta,
    sentOrnamentColor,
  };
}
