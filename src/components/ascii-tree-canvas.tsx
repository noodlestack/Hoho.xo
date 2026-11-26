"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useTreeLayout } from "@/components/hoho/use-tree-layout";
import {
  createBackdropParticles,
  STATIC_FALLBACK_ASCII,
  type AsciiTreeCanvasProps,
  type CameraViewMode,
  type ProjectedOrnamentHit,
  type ResolvedOrnament,
} from "@/components/tree/canvas-types";
import {
  renderTreeCanvasFrame,
  type CanvasAnimState,
  type CanvasPropsSnapshot,
} from "@/components/tree/draw-tree-frame";
import { useCanvasPointers } from "@/components/tree/use-canvas-pointers";
import { gsap } from "@/lib/gsap-init";
import { generateQrTreeCloud } from "@/lib/qr-tree";
import { ORNAMENT_TYPES } from "@/lib/tree-themes";

export type { CameraViewMode, ResolvedOrnament };

export const AsciiTreeCanvas = memo(function AsciiTreeCanvas({
  handle,
  qrValue,
  matrix,
  theme,
  topper = "star",
  shape = "classic",
  scenery = "snowfall",
  zoom = 1,
  viewMode,
  showSnow,
  showGarland = true,
  showOrnaments,
  ornaments,
  latestDroppedId,
  reducedMotion,
  staticMode = false,
  supporter = false,
  isOwnerMode,
  onSelectOrnament,
  onToggleQrView,
  onZoomChange,
}: AsciiTreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layout = useTreeLayout(containerRef);
  const glowSpriteRef = useRef<{
    themeId: string;
    canvas: HTMLCanvasElement;
  } | null>(null);
  const internalZoomRef = useRef<number>(Math.max(0.72, Math.min(1.45, zoom)));
  const renderZoomRef = useRef<number>(Math.max(0.72, Math.min(1.45, zoom)));
  const onZoomChangeRef = useRef(onZoomChange);
  const [canvasFailed, setCanvasFailed] = useState(false);

  const zBufferRef = useRef<Float32Array>(new Float32Array(0));
  const cellGlyphRef = useRef<string[]>([]);
  const cellColorRef = useRef<string[]>([]);
  const cellAlphaRef = useRef<Float32Array>(new Float32Array(0));
  const yawRef = useRef<number>(0.25);

  const animStateRef = useRef<CanvasAnimState>({
    qrMix: viewMode === "qr" ? 1 : 0,
    elev: viewMode === "qr" ? Math.PI / 2 : viewMode === "top" ? 1.38 : 0.22,
    fromQrMix: viewMode === "qr" ? 1 : 0,
    fromElev:
      viewMode === "qr" ? Math.PI / 2 : viewMode === "top" ? 1.38 : 0.22,
    targetQrMix: viewMode === "qr" ? 1 : 0,
    targetElev:
      viewMode === "qr" ? Math.PI / 2 : viewMode === "top" ? 1.38 : 0.22,
    transitionStart: 0,
    inTransition: false,
  });

  const projectedOrnamentsRef = useRef<ProjectedOrnamentHit[]>([]);
  const drawNowRef = useRef<() => void>(() => {});
  const ensureLoopRef = useRef<() => void>(() => {});
  const wiggleRef = useRef<{ id: string | null; startedAt: number }>({
    id: null,
    startedAt: 0,
  });
  const dropAnimRef = useRef<{ id: string | null; startedAt: number }>({
    id: null,
    startedAt: 0,
  });
  const hoveredIdRef = useRef<string | null>(null);
  const qualityTierRef = useRef<"high" | "medium" | "low">(
    layout.quality === "low" ? "low" : "high",
  );
  const perfMonitorRef = useRef({
    emaMs: 16.6,
    slowStreak: 0,
    skipFrames: 3,
    lastFps: 60,
  });
  const debugHud = useMemo(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("debug") === "1",
    [],
  );
  const growStateRef = useRef({
    foliage: reducedMotion ? 1 : 0,
    garland: reducedMotion ? 1 : 0,
    lights: reducedMotion ? 1 : 0,
    starScale: reducedMotion ? 1 : 0,
  });

  const effectiveReduced = reducedMotion || staticMode;

  useEffect(() => {
    const grow = growStateRef.current;
    if (effectiveReduced) {
      grow.foliage = 1;
      grow.garland = 1;
      grow.lights = 1;
      grow.starScale = 1;
      drawNowRef.current();
      return;
    }

    grow.foliage = 0;
    grow.garland = 0;
    grow.lights = 0;
    grow.starScale = 0;

    const tl = gsap.timeline();
    tl.to(grow, { foliage: 1, duration: 0.9, ease: "power3.out" }, 0)
      .to(grow, { garland: 1, duration: 0.8, ease: "power3.out" }, 0.3)
      .to(grow, { lights: 1, duration: 0.7, ease: "power2.out" }, 0.5)
      .to(grow, { starScale: 1.15, duration: 0.32, ease: "back.out(2)" }, 0.9)
      .to(grow, { starScale: 1, duration: 0.18, ease: "power2.out" }, 1.22);

    const skip = () => {
      if (tl.progress() < 1) tl.progress(1);
    };
    window.addEventListener("pointerdown", skip, { once: true, passive: true });
    window.addEventListener("keydown", skip, { once: true, passive: true });

    return () => {
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
      tl.kill();
    };
  }, [effectiveReduced]);

  useEffect(() => {
    if (!latestDroppedId || reducedMotion) return;
    dropAnimRef.current = {
      id: latestDroppedId,
      startedAt: performance.now(),
    };
  }, [latestDroppedId, reducedMotion]);

  const isDenseCloud = layout.quality !== "low";
  const cloud = useMemo(() => {
    if (!matrix.ok) return [];
    return generateQrTreeCloud(matrix, qrValue, {
      dense: isDenseCloud,
      shape,
    });
  }, [matrix, qrValue, shape, isDenseCloud]);

  const backdrop = useMemo(() => createBackdropParticles(), []);

  const propsRef = useRef<CanvasPropsSnapshot>({
    handle,
    matrix,
    cloud,
    theme,
    topper,
    shape,
    scenery,
    viewMode,
    showSnow,
    showGarland,
    showOrnaments,
    ornaments,
    reducedMotion,
    staticMode,
    supporter,
    isOwnerMode,
    layout,
  });

  useEffect(() => {
    internalZoomRef.current = Math.max(0.72, Math.min(1.45, zoom));
    onZoomChangeRef.current = onZoomChange;

    propsRef.current = {
      handle,
      matrix,
      cloud,
      theme,
      topper,
      shape,
      scenery,
      viewMode,
      showSnow,
      showGarland,
      showOrnaments,
      ornaments,
      reducedMotion,
      staticMode,
      supporter,
      isOwnerMode,
      layout,
    };

    const st = animStateRef.current;
    const nextQrMix = viewMode === "qr" ? 1 : 0;
    const nextElev =
      viewMode === "qr" ? Math.PI / 2 : viewMode === "top" ? 1.38 : 0.22;

    if (
      st.targetQrMix !== nextQrMix ||
      Math.abs(st.targetElev - nextElev) > 0.001
    ) {
      st.fromQrMix = st.qrMix;
      st.fromElev = st.elev;
      st.targetQrMix = nextQrMix;
      st.targetElev = nextElev;
      if (reducedMotion || staticMode) {
        st.qrMix = nextQrMix;
        st.elev = nextElev;
        st.inTransition = false;
      } else {
        st.transitionStart = performance.now();
        st.inTransition = true;
      }
    }

    if (reducedMotion || staticMode) {
      drawNowRef.current();
    } else {
      ensureLoopRef.current();
    }
  }, [
    handle,
    matrix,
    cloud,
    theme,
    topper,
    shape,
    scenery,
    zoom,
    viewMode,
    showSnow,
    showGarland,
    showOrnaments,
    ornaments,
    reducedMotion,
    staticMode,
    supporter,
    isOwnerMode,
    layout,
    onZoomChange,
  ]);

  const { dragStateRef, hoveredInfo, pointerHandlers } = useCanvasPointers({
    canvasRef,
    viewMode,
    ornaments,
    isOwnerMode,
    reducedMotion,
    internalZoomRef,
    onZoomChangeRef,
    yawRef,
    projectedOrnamentsRef,
    hoveredIdRef,
    wiggleRef,
    drawNowRef,
    onSelectOrnament,
    onToggleQrView,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      queueMicrotask(() => setCanvasFailed(true));
      return;
    }

    let rafId = 0;
    const lastTimeRef = { current: performance.now() };
    let hidden = document.hidden;
    let inViewport = true;

    const drawFrame = (now: number) => {
      projectedOrnamentsRef.current = renderTreeCanvasFrame({
        canvas,
        ctx,
        now,
        lastTimeRef,
        hidden,
        inViewport,
        debugHud,
        backdrop,
        propsSnapshot: propsRef.current,
        animState: animStateRef.current,
        dragActive: dragStateRef.current.active,
        yawRef,
        internalZoomRef,
        renderZoomRef,
        qualityTierRef,
        perfMonitorRef,
        glowSpriteRef,
        zBufferRef,
        cellGlyphRef,
        cellColorRef,
        cellAlphaRef,
        growState: growStateRef.current,
        dropAnimRef,
        hoveredIdRef,
        wiggleRef,
      });
    };

    const tick = (now: number) => {
      rafId = 0;
      drawFrame(now);
      if (
        !hidden &&
        inViewport &&
        !propsRef.current.reducedMotion &&
        !propsRef.current.staticMode
      ) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const ensureLoop = () => {
      if (
        !hidden &&
        inViewport &&
        !propsRef.current.reducedMotion &&
        !propsRef.current.staticMode &&
        rafId === 0
      ) {
        lastTimeRef.current = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    };

    drawNowRef.current = () => drawFrame(performance.now());
    ensureLoopRef.current = ensureLoop;

    const handleVisibility = () => {
      hidden = document.hidden;
      lastTimeRef.current = performance.now();
      perfMonitorRef.current.skipFrames = 3;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      ensureLoop();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    if (propsRef.current.reducedMotion || propsRef.current.staticMode) {
      rafId = requestAnimationFrame((ts) => {
        rafId = 0;
        drawFrame(ts);
      });
    } else {
      ensureLoop();
    }

    const handleResize = () => drawFrame(performance.now());
    window.addEventListener("resize", handleResize);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => drawFrame(performance.now()))
        : null;
    resizeObserver?.observe(canvas);

    const intersectionObserver =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              const entry = entries[0];
              if (!entry) return;
              inViewport = entry.isIntersecting;
              if (!inViewport && rafId) {
                cancelAnimationFrame(rafId);
                rafId = 0;
              } else if (inViewport) {
                ensureLoop();
              }
            },
            { threshold: 0.02 },
          )
        : null;
    intersectionObserver?.observe(canvas);

    const handleWheel = (event: WheelEvent) => {
      if (propsRef.current.viewMode === "qr") return;
      event.preventDefault();
      const next = Math.max(
        0.72,
        Math.min(
          1.45,
          Number((internalZoomRef.current - event.deltaY * 0.0011).toFixed(3)),
        ),
      );
      internalZoomRef.current = next;
      onZoomChangeRef.current?.(next);
      if (propsRef.current.reducedMotion) drawFrame(performance.now());
    };
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    const handleKeyRotate = (event: KeyboardEvent) => {
      if (propsRef.current.viewMode === "qr") return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }
      if (event.key === "ArrowLeft") {
        yawRef.current -= 0.22;
        if (propsRef.current.reducedMotion) drawFrame(performance.now());
      } else if (event.key === "ArrowRight") {
        yawRef.current += 0.22;
        if (propsRef.current.reducedMotion) drawFrame(performance.now());
      }
    };
    window.addEventListener("keydown", handleKeyRotate);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      drawNowRef.current = () => {};
      ensureLoopRef.current = () => {};
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyRotate);
      canvas.removeEventListener("wheel", handleWheel);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
    };
  }, [backdrop, debugHud, dragStateRef]);

  const hoveredStyle = hoveredInfo
    ? (ORNAMENT_TYPES[hoveredInfo.ornament.ornamentType] ?? ORNAMENT_TYPES[0])
    : null;

  return (
    <div ref={containerRef} className="tree-canvas-wrap">
      {canvasFailed ? (
        <div
          className="static-tree-fallback"
          role="region"
          aria-label="Static ASCII Christmas tree"
        >
          <pre className="static-tree-pre">{STATIC_FALLBACK_ASCII}</pre>
          <p className="tree-meta-line">
            Canvas preview unavailable. Ornaments below remain accessible.
          </p>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className={["tree-canvas", hoveredInfo ? "is-hovering-ornament" : ""]
            .filter(Boolean)
            .join(" ")}
          style={{ touchAction: "none" }}
          aria-label={
            viewMode === "qr"
              ? `Scannable QR code for ${qrValue}. Click to grow the tree.`
              : `Interactive 3D ASCII Christmas tree in ${theme.label} style. Drag to rotate, pinch or scroll to zoom, click an ornament to inspect, or click empty sky to view QR code.`
          }
          {...pointerHandlers}
        />
      )}

      {hoveredInfo && hoveredStyle && viewMode !== "qr" && (
        <div
          className="ornament-tooltip"
          style={{
            left: `${hoveredInfo.x}px`,
            top: `${Math.max(76, hoveredInfo.y - 24)}px`,
          }}
          aria-hidden="true"
        >
          <span>{hoveredStyle.glyph}</span>
          <span>
            {isOwnerMode
              ? `${hoveredStyle.name} · #${hoveredInfo.ornament.seq}${
                  hoveredInfo.ornament.readAt ? "" : " · Unread"
                }`
              : `${hoveredStyle.name} · Anonymous ornament`}
          </span>
        </div>
      )}
    </div>
  );
});
