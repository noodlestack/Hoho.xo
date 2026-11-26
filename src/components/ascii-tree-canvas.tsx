"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useTreeLayout } from "@/components/hoho/use-tree-layout";
import { gsap } from "@/lib/gsap-init";
import type { TreeMessage } from "@/lib/messages";
import { getOrnamentSpriteCanvas } from "@/lib/ornament-sprites";
import {
  generateQrTreeCloud,
  mulberry32,
  slotPosition3D,
  TREE_BASE_RADIUS,
  TREE_HEIGHT,
  type QrMatrixResult,
} from "@/lib/qr-tree";
import {
  ORNAMENT_COLORS,
  ORNAMENT_TYPES,
  type TreeTheme,
} from "@/lib/tree-themes";
import type {
  TreeSceneryId,
  TreeShapeId,
  TreeTopperId,
} from "@/lib/tree-config";

export type CameraViewMode = "tree" | "top" | "qr";

export interface ResolvedOrnament extends TreeMessage {
  slot: number;
}

interface ProjectedOrnamentHit {
  id: string;
  x: number;
  y: number;
  r: number;
}

interface BgStar {
  x: number;
  y: number;
  glyph: string;
  phase: number;
  alpha: number;
}

interface Snowflake {
  x: number;
  y: number;
  speed: number;
  swayFreq: number;
  swayAmp: number;
  phase: number;
  glyph: string;
  alpha: number;
  layer: "far" | "near";
}

interface EmberSpark {
  x: number;
  y: number;
  speed: number;
  driftFreq: number;
  phase: number;
  glyph: string;
}

interface AsciiTreeCanvasProps {
  handle: string;
  qrValue: string;
  matrix: QrMatrixResult;
  theme: TreeTheme;
  topper?: TreeTopperId;
  shape?: TreeShapeId;
  scenery?: TreeSceneryId;
  zoom?: number;
  viewMode: CameraViewMode;
  showSnow: boolean;
  showGarland?: boolean;
  showOrnaments: boolean;
  ornaments: ResolvedOrnament[];
  latestDroppedId: string | null;
  reducedMotion: boolean;
  staticMode?: boolean;
  isOwnerMode: boolean;
  onSelectOrnament: (ornament: ResolvedOrnament) => void;
  onToggleQrView: () => void;
  onZoomChange?: (nextZoom: number) => void;
}

const STATIC_FALLBACK_ASCII = `                 *
                /+\\
               * . +
              /+ x .\\
             . + * x +
            / x . + . \\
           + * x . + x *
          / . + x * . + \\
         x + * . + x * . x
                |||`;

function cubicEaseInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function quadEaseInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function dampedBounce(t: number): number {
  if (t >= 1) return 1;
  const inv = 1 - t;
  return 1 - Math.pow(inv, 2.2) * Math.cos(t * Math.PI * 3.2);
}

function isFinderCell(row: number, col: number, size: number): boolean {
  return (
    (row < 7 && col < 7) ||
    (row < 7 && col >= size - 7) ||
    (row >= size - 7 && col < 7)
  );
}

function getGlowSprite(theme: TreeTheme): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const size = 256;
  const sprite = document.createElement("canvas");
  sprite.width = size;
  sprite.height = size;
  const gCtx = sprite.getContext("2d");
  if (!gCtx) return null;

  const half = size * 0.5;
  const innerColor = theme.foliage[3] ?? theme.star;
  const midColor = theme.foliage[2] ?? theme.swatch;

  const outerGrad = gCtx.createRadialGradient(half, half, 4, half, half, half);
  outerGrad.addColorStop(0, midColor);
  outerGrad.addColorStop(0.5, theme.swatch);
  outerGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  gCtx.globalAlpha = 0.48;
  gCtx.fillStyle = outerGrad;
  gCtx.fillRect(0, 0, size, size);

  const coreGrad = gCtx.createRadialGradient(
    half,
    half,
    2,
    half,
    half,
    half * 0.65,
  );
  coreGrad.addColorStop(0, innerColor);
  coreGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  gCtx.globalAlpha = 0.4;
  gCtx.fillStyle = coreGrad;
  gCtx.fillRect(0, 0, size, size);

  return sprite;
}

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
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(
    new Map(),
  );
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);
  const wasPinchingRef = useRef(false);
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [hoveredInfo, setHoveredInfo] = useState<{
    ornament: ResolvedOrnament;
    x: number;
    y: number;
  } | null>(null);

  // Reusable z-buffer arrays to avoid per-frame allocations
  const zBufferRef = useRef<Float32Array>(new Float32Array(0));
  const cellGlyphRef = useRef<string[]>([]);
  const cellColorRef = useRef<string[]>([]);
  const cellAlphaRef = useRef<Float32Array>(new Float32Array(0));

  // Interactive camera and pointer state
  const yawRef = useRef(0.35);
  const dragStateRef = useRef<{
    active: boolean;
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    moved: boolean;
  }>({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    lastX: 0,
    moved: false,
  });

  // Smooth transition state between views (tree, top, qr)
  const animStateRef = useRef({
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
      if (tl.progress() < 1) {
        tl.progress(1);
      }
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

  // Deterministic cloud derived from active QR matrix + link + silhouette (container-area adaptive density)
  const isDenseCloud = layout.quality !== "low";
  const cloud = useMemo(() => {
    if (!matrix.ok) return [];
    return generateQrTreeCloud(matrix, qrValue, {
      dense: isDenseCloud,
      shape,
    });
  }, [matrix, qrValue, shape, isDenseCloud]);

  // Pre-generated background stars, parallax snowflakes, and hearth ember sparks
  const backdrop = useMemo(() => {
    const rng = mulberry32(20261225);
    const stars: BgStar[] = Array.from({ length: 185 }, () => ({
      x: rng(),
      y: rng(),
      glyph: rng() < 0.22 ? "*" : rng() < 0.55 ? "+" : ".",
      phase: rng() * Math.PI * 2,
      alpha: 0.16 + rng() * 0.36,
    }));
    const flakes: Snowflake[] = Array.from({ length: 130 }, (_, i) => {
      const layer = i < 70 ? "far" : "near";
      return {
        x: rng(),
        y: rng(),
        speed: layer === "far" ? 0.018 + rng() * 0.024 : 0.036 + rng() * 0.044,
        swayFreq: layer === "far" ? 0.6 + rng() * 0.9 : 1.0 + rng() * 1.4,
        swayAmp: layer === "far" ? 0.005 + rng() * 0.009 : 0.01 + rng() * 0.016,
        phase: rng() * Math.PI * 2,
        glyph: layer === "far" ? "." : rng() < 0.42 ? "*" : "+",
        alpha: layer === "far" ? 0.22 + rng() * 0.28 : 0.45 + rng() * 0.45,
        layer,
      };
    });
    const embers: EmberSpark[] = Array.from({ length: 56 }, () => ({
      x: 0.15 + rng() * 0.7,
      y: rng(),
      speed: 0.045 + rng() * 0.06,
      driftFreq: 1.2 + rng() * 1.8,
      phase: rng() * Math.PI * 2,
      glyph: rng() < 0.35 ? "*" : rng() < 0.65 ? "+" : ".",
    }));
    return { stars, flakes, embers };
  }, []);

  // Latest props ref so the single RAF loop reads fresh values without tearing down
  const propsRef = useRef({
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
    isOwnerMode,
    layout,
  });

  useEffect(() => {
    const clampedZoom = Math.max(0.72, Math.min(1.45, zoom));
    internalZoomRef.current = clampedZoom;
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
    isOwnerMode,
    layout,
    onZoomChange,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      queueMicrotask(() => setCanvasFailed(true));
      return;
    }

    let rafId = 0;
    let lastTime = performance.now();
    let hidden = document.hidden;
    let inViewport = true;

    const drawFrame = (now: number) => {
      const {
        handle: curHandle,
        matrix: curMatrix,
        cloud: curCloud,
        theme: curTheme,
        topper: curTopper,
        shape: curShape = "classic",
        scenery: curScenery,
        showSnow: curSnow,
        showGarland: curShowGarland,
        showOrnaments: curShowOrnaments,
        ornaments: curOrnaments,
        reducedMotion: curReducedRaw,
        staticMode: curStatic,
        layout: curLayout,
      } = propsRef.current;

      const curReduced = curReducedRaw || Boolean(curStatic);
      const effectiveNow = curStatic ? 12000 : now;
      const dt = curStatic
        ? 0
        : Math.min(0.05, Math.max(0, (effectiveNow - lastTime) / 1000));
      lastTime = effectiveNow;
      const tSec = effectiveNow * 0.001;
      if (curStatic) {
        yawRef.current = 0.25;
      }

      // Update view transition (radial QR morph wave <= 1.2s total)
      const st = animStateRef.current;
      const isQrMorph = Math.abs(st.targetQrMix - st.fromQrMix) > 0.01;
      const transitionDurMs = isQrMorph ? 1150 : 680;
      const qrElapsedSec = st.inTransition
        ? Math.min(
            1.15,
            Math.max(0, (effectiveNow - st.transitionStart) / 1000),
          )
        : st.qrMix >= 0.5
          ? 1.15
          : 0;
      if (st.inTransition) {
        const elapsed = (effectiveNow - st.transitionStart) / transitionDurMs;
        if (elapsed >= 1) {
          st.qrMix = st.targetQrMix;
          st.elev = st.targetElev;
          st.inTransition = false;
        } else {
          const eased = isQrMorph
            ? quadEaseInOut(Math.max(0, elapsed))
            : cubicEaseInOut(Math.max(0, elapsed));
          st.qrMix = st.fromQrMix + (st.targetQrMix - st.fromQrMix) * eased;
          st.elev = st.fromElev + (st.targetElev - st.fromElev) * eased;
        }
      }

      // Gentle auto-spin when not dragging and not in QR state
      if (!curReduced && !dragStateRef.current.active && st.qrMix < 0.95) {
        yawRef.current += dt * 0.38 * (1 - st.qrMix);
      }

      // Snap yaw softly toward 0 when approaching QR mode so finder blocks align cleanly
      const effectiveYaw =
        st.qrMix > 0.01 ? yawRef.current * (1 - st.qrMix) : yawRef.current;

      const rect = canvas.getBoundingClientRect();
      const cssW = Math.max(1, rect.width);
      const cssH = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pxW = Math.round(cssW * dpr);
      const pxH = Math.round(cssH * dpr);

      if (canvas.width !== pxW || canvas.height !== pxH) {
        canvas.width = pxW;
        canvas.height = pxH;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      // Font & grid cell sizing from ResizeObserver + measured glyph metrics
      const isCompact = cssW < 640;
      const freeWidth = Math.max(200, cssW);
      const stageCenterX = cssW * 0.5;
      const stageCenterY = isCompact ? cssH * 0.5 : cssH * 0.505;

      const {
        fontSize,
        cellW,
        cellH,
        treeScale,
        topScale,
        qrBoxSide,
        fontFamily,
      } = curLayout;
      const cols = Math.max(1, Math.ceil(cssW / cellW));
      const rows = Math.max(1, Math.ceil(cssH / cellH));
      const cellTotal = cols * rows;

      if (zBufferRef.current.length !== cellTotal) {
        zBufferRef.current = new Float32Array(cellTotal);
        cellGlyphRef.current = new Array<string>(cellTotal).fill("");
        cellColorRef.current = new Array<string>(cellTotal).fill("");
        cellAlphaRef.current = new Float32Array(cellTotal);
      }
      const zBuf = zBufferRef.current;
      const glyphBuf = cellGlyphRef.current;
      const colorBuf = cellColorRef.current;
      const alphaBuf = cellAlphaRef.current;
      zBuf.fill(-Infinity);

      // 1. Background Sceneries & Atmospheric Particles (fade cleanly to 0 in QR mode)
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const sceneryFade = Math.max(0, 1 - st.qrMix / 0.52);

      // 1a. Scenery sky washes (Aurora curtains, Starlight moon, Hearth base glow)
      if (sceneryFade > 0.01) {
        if (curScenery === "aurora") {
          ctx.save();
          ctx.globalAlpha = 0.24 * sceneryFade;
          const wave1Y =
            cssH * 0.19 + (curReduced ? 0 : Math.sin(tSec * 0.45) * 14);
          const grad1 = ctx.createLinearGradient(
            0,
            wave1Y - 90,
            0,
            wave1Y + 130,
          );
          grad1.addColorStop(0, "rgba(76, 232, 192, 0)");
          grad1.addColorStop(0.45, "rgba(76, 232, 192, 0.42)");
          grad1.addColorStop(0.75, "rgba(179, 136, 255, 0.28)");
          grad1.addColorStop(1, "rgba(11, 13, 18, 0)");
          ctx.fillStyle = grad1;
          ctx.beginPath();
          ctx.moveTo(0, wave1Y + 90);
          for (
            let x = 0;
            x <= freeWidth + 40;
            x += Math.max(40, freeWidth / 6)
          ) {
            const dy =
              Math.sin(x * 0.008 + (curReduced ? 0 : tSec * 0.7)) * 28 +
              Math.cos(x * 0.004 - (curReduced ? 0 : tSec * 0.4)) * 18;
            ctx.lineTo(x, wave1Y + dy);
          }
          ctx.lineTo(cssW, wave1Y + 140);
          ctx.lineTo(0, wave1Y + 140);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else if (curScenery === "starlight") {
          ctx.save();
          ctx.globalAlpha = sceneryFade;
          const moonX = Math.max(76, freeWidth * 0.18);
          const moonY = Math.max(92, cssH * 0.18);
          const moonHalo = ctx.createRadialGradient(
            moonX,
            moonY,
            8,
            moonX,
            moonY,
            isCompact ? 96 : 140,
          );
          moonHalo.addColorStop(0, "rgba(255, 245, 214, 0.22)");
          moonHalo.addColorStop(0.45, "rgba(143, 211, 255, 0.09)");
          moonHalo.addColorStop(1, "rgba(11, 13, 18, 0)");
          ctx.fillStyle = moonHalo;
          ctx.beginPath();
          ctx.arc(moonX, moonY, isCompact ? 96 : 140, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#FFF5D6";
          ctx.globalAlpha = 0.75 * sceneryFade;
          ctx.beginPath();
          ctx.arc(moonX, moonY, isCompact ? 11 : 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#080A0F";
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.arc(
            moonX + (isCompact ? 5 : 6.5),
            moonY - (isCompact ? 3 : 4),
            isCompact ? 9.5 : 13,
            0,
            Math.PI * 2,
          );
          ctx.fill();
          ctx.restore();
        } else if (curScenery === "hearth") {
          ctx.save();
          ctx.globalAlpha = 0.28 * sceneryFade;
          const hearthY = cssH * 0.88;
          const hearthGrad = ctx.createRadialGradient(
            stageCenterX,
            hearthY,
            12,
            stageCenterX,
            hearthY,
            Math.max(cssW, cssH) * 0.45,
          );
          hearthGrad.addColorStop(0, "rgba(255, 159, 67, 0.36)");
          hearthGrad.addColorStop(0.5, "rgba(229, 72, 77, 0.12)");
          hearthGrad.addColorStop(1, "rgba(11, 13, 18, 0)");
          ctx.fillStyle = hearthGrad;
          ctx.fillRect(0, 0, cssW, cssH);
          ctx.restore();
        }
      }

      // 1b. Twinkling stars (dense constellation boost in starlight scenery)
      const bgAlphaScale = 1 - st.qrMix * 0.65;
      const starLimit =
        curScenery === "starlight"
          ? backdrop.stars.length
          : Math.min(130, backdrop.stars.length);
      ctx.font = `500 ${Math.max(8, Math.round(fontSize * 0.9))}px ${fontFamily}`;
      for (let i = 0; i < starLimit; i += 1) {
        const star = backdrop.stars[i];
        const twinkle = curReduced
          ? 0.78
          : 0.42 + 0.58 * Math.sin(tSec * 1.55 + star.phase);
        const starBoost = curScenery === "starlight" ? 1.35 : 1;
        ctx.globalAlpha = Math.min(
          0.85,
          star.alpha * twinkle * bgAlphaScale * starBoost,
        );
        ctx.fillStyle = curScenery === "starlight" ? "#D6E8FF" : "#9A968D";
        ctx.fillText(star.glyph, star.x * cssW, star.y * cssH);
      }

      // 1c. Falling snow / wind-driven blizzard streaks / hearth rising embers
      if (curSnow && sceneryFade > 0.01) {
        if (curScenery === "hearth") {
          ctx.font = `600 ${Math.max(8, Math.round(fontSize * 0.88))}px ${fontFamily}`;
          for (let i = 0; i < backdrop.embers.length; i += 1) {
            const spark = backdrop.embers[i];
            const ey = curReduced
              ? spark.y
              : 1 - ((1 - spark.y + tSec * spark.speed) % 1);
            const ex = curReduced
              ? spark.x
              : spark.x +
                Math.sin(tSec * spark.driftFreq + spark.phase) * 0.022;
            const edgeFade = Math.sin(ey * Math.PI);
            ctx.globalAlpha = Math.max(0.15, edgeFade) * 0.72 * sceneryFade;
            ctx.fillStyle = i % 2 === 0 ? "#FF9F43" : "#FFD97D";
            ctx.fillText(spark.glyph, ex * cssW, ey * cssH);
          }
        } else {
          const isBlizzard = curScenery === "blizzard";
          const windDriftBase = isBlizzard && !curReduced ? tSec * 0.095 : 0;
          const speedMult = isBlizzard ? 2.15 : 1;
          const alphaBoost = isBlizzard ? 1.1 : 1;
          ctx.fillStyle = curTheme.snowColor;

          for (const layer of ["far", "near"] as const) {
            ctx.font = `${layer === "near" ? 600 : 400} ${
              layer === "near"
                ? Math.max(8.5, Math.round(fontSize * 1.02))
                : Math.max(7.5, Math.round(fontSize * 0.85))
            }px ${fontFamily}`;

            for (let i = 0; i < backdrop.flakes.length; i += 1) {
              const flake = backdrop.flakes[i];
              if (flake.layer !== layer) continue;
              const fy = curReduced
                ? flake.y
                : (flake.y + tSec * flake.speed * speedMult) % 1;
              const windDrift =
                isBlizzard && !curReduced ? windDriftBase + flake.phase : 0;
              const fx = curReduced
                ? flake.x
                : (((flake.x +
                    windDrift +
                    Math.sin(tSec * flake.swayFreq + flake.phase) *
                      flake.swayAmp) %
                    1) +
                    1) %
                  1;
              ctx.globalAlpha = flake.alpha * sceneryFade * alphaBoost;
              const glyph = isBlizzard && layer === "near" ? "/" : flake.glyph;
              ctx.fillText(glyph, fx * cssW, fy * cssH);
            }
          }
        }
      }
      ctx.globalAlpha = 1;

      // 2. Projection parameters (fit-derived scales from useTreeLayout)
      const cosY = Math.cos(effectiveYaw);
      const sinY = Math.sin(effectiveYaw);
      const cosX = Math.cos(st.elev);
      const sinX = Math.sin(st.elev);

      const topMix =
        Math.max(0, (st.elev - 0.22) / (1.38 - 0.22)) * (1 - st.qrMix);
      if (curReduced) {
        renderZoomRef.current = internalZoomRef.current;
      } else {
        renderZoomRef.current +=
          (internalZoomRef.current - renderZoomRef.current) *
          Math.min(1, dt * 10);
      }
      const zoomFactor = renderZoomRef.current * (1 - st.qrMix) + st.qrMix;
      const activeScale =
        (treeScale * (1 - topMix) + topScale * topMix) * zoomFactor;

      // Cached offscreen radial glow sprite (zero per-frame blur readback)
      const bloomIntensity = Math.max(0, 1 - st.qrMix * 1.4);
      if (bloomIntensity > 0.05) {
        let cachedGlow = glowSpriteRef.current;
        if (!cachedGlow || cachedGlow.themeId !== curTheme.id) {
          const nextSprite = getGlowSprite(curTheme);
          if (nextSprite) {
            cachedGlow = { themeId: curTheme.id, canvas: nextSprite };
            glowSpriteRef.current = cachedGlow;
          }
        }
        if (cachedGlow) {
          const glowSize = activeScale * 9.8;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = 0.28 * bloomIntensity;
          ctx.drawImage(
            cachedGlow.canvas,
            stageCenterX - glowSize * 0.5,
            stageCenterY - glowSize * 0.52,
            glowSize,
            glowSize,
          );
          ctx.restore();
        }
      }

      const project3D = (wx: number, wy: number, wz: number) => {
        const yRel = (wy - TREE_HEIGHT * 0.525) * (1 - st.qrMix);
        const rx = wx * cosY - wz * sinY;
        const rz = wx * sinY + wz * cosY;

        const ry = yRel * cosX - rz * sinX;
        const dz = yRel * sinX + rz * cosX;

        const persp = 1 / (1 - dz * 0.022 * (1 - st.qrMix));
        const sx = stageCenterX + rx * activeScale * persp;
        const sy = stageCenterY - ry * activeScale * persp;
        return { sx, sy, dz, persp };
      };

      // Soft elliptical ground glow anchoring trunk to snow floor
      if (bloomIntensity > 0.05) {
        const basePt = project3D(0, 0.04, 0);
        const ellipseW = activeScale * 4.4;
        const ellipseH = activeScale * 1.15;
        ctx.save();
        ctx.globalAlpha = 0.22 * bloomIntensity * (1 - topMix * 0.5);
        ctx.translate(basePt.sx, basePt.sy);
        ctx.scale(1, ellipseH / Math.max(1, ellipseW));
        const groundGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, ellipseW);
        groundGrad.addColorStop(0, curTheme.swatch);
        groundGrad.addColorStop(0.55, curTheme.foliage[1]);
        groundGrad.addColorStop(1, "rgba(11, 13, 18, 0)");
        ctx.fillStyle = groundGrad;
        ctx.beginPath();
        ctx.arc(0, 0, ellipseW, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 3. Deposit QR-constrained 3D cloud into ASCII cell z-buffer with orbiting Lambert shading
      const glyphAlpha = Math.max(0, 1 - st.qrMix * 1.15);
      const ramp = curTheme.glyphRamp;
      const swirlPeak = Math.sin(st.qrMix * Math.PI) * 0.52;
      const lightYaw = curReduced ? -0.58 : -0.58 + tSec * ((Math.PI * 2) / 24);
      const lightDirX = Math.sin(lightYaw);
      const lightDirZ = Math.cos(lightYaw);
      const windWave = curReduced ? 0 : Math.sin(tSec * 0.7) * (1 - st.qrMix);
      const brightLightHalos: Array<{
        x: number;
        y: number;
        color: string;
        alpha: number;
      }> = [];
      let lightPassCount = 0;
      const maxSparseLights = Math.floor(curCloud.length * 0.07);

      const grow = growStateRef.current;

      if (glyphAlpha > 0.02) {
        const morphingToQr = st.targetQrMix > st.fromQrMix;
        const useRadialWave = st.inTransition && isQrMorph && !curReduced;
        for (let i = 0; i < curCloud.length; i += 1) {
          const pt = curCloud[i];
          if (pt.kind !== "ground" && grow.foliage < 0.999) {
            if (pt.y > TREE_HEIGHT * grow.foliage) continue;
          }

          let ptQrMix = st.qrMix;
          if (useRadialWave) {
            const normRad = Math.min(1, Math.max(0, pt.qrRadius / 1.414));
            const delay = morphingToQr ? normRad * 0.45 : (1 - normRad) * 0.45;
            const localT = Math.max(
              0,
              Math.min(1, (qrElapsedSec - delay) / 0.7),
            );
            const easedLocal = quadEaseInOut(localT);
            ptQrMix = morphingToQr
              ? st.fromQrMix + (st.targetQrMix - st.fromQrMix) * easedLocal
              : st.fromQrMix + (st.targetQrMix - st.fromQrMix) * easedLocal;
          }

          const swayX =
            pt.kind === "ground"
              ? 0
              : Math.pow(Math.max(0, pt.y), 1.5) * 0.008 * windWave;
          let px =
            (pt.x + swayX) * (1 - ptQrMix) +
            pt.qrX * TREE_BASE_RADIUS * ptQrMix;
          let pz = pt.z * (1 - ptQrMix) + pt.qrZ * TREE_BASE_RADIUS * ptQrMix;
          const py = pt.y * (1 - ptQrMix);

          if (swirlPeak > 0.01) {
            const sAng = swirlPeak * (1 - pt.qrRadius * 0.25);
            const cs = Math.cos(sAng);
            const sn = Math.sin(sAng);
            const sx2 = px * cs - pz * sn;
            const sz2 = px * sn + pz * cs;
            px = sx2;
            pz = sz2;
          }

          if (pt.kind === "ground") {
            const distSq = pt.x * pt.x + pt.z * pt.z;
            const ringBand = Math.floor(
              Math.sqrt(distSq) / (TREE_BASE_RADIUS * 0.72),
            );
            if (ringBand > 2 || pt.glyphIdx % 4 !== 0) continue;
          }

          const { sx, sy, dz } = project3D(px, py, pz);
          const col = Math.floor(sx / cellW);
          const row = Math.floor(sy / cellH);
          if (col < 0 || col >= cols || row < 0 || row >= rows) continue;

          const cIdx = row * cols + col;
          if (dz <= zBuf[cIdx]) continue;
          zBuf[cIdx] = dz;

          if (pt.kind === "ground") {
            glyphBuf[cIdx] = pt.glyphIdx % 3 === 0 ? ":" : ".";
            colorBuf[cIdx] = curTheme.foliage[1];
            alphaBuf[cIdx] = 0.34 * glyphAlpha * (1 - topMix * 0.5);
          } else if (pt.kind === "trunk") {
            glyphBuf[cIdx] = pt.glyphIdx % 2 === 0 ? "|" : "#";
            colorBuf[cIdx] = curTheme.trunk;
            alphaBuf[cIdx] = 0.9 * glyphAlpha;
          } else if (
            pt.isLight &&
            curShowGarland &&
            lightPassCount < maxSparseLights &&
            pt.glyphIdx % 3 === 0
          ) {
            const lightAlpha = Math.max(
              0,
              Math.min(1, grow.lights * 1.4 - (pt.y / TREE_HEIGHT) * 0.4),
            );
            if (lightAlpha <= 0.02) {
              // Wait until light intro wave reaches this tier
            } else {
              lightPassCount += 1;
              const pulse = curReduced
                ? 0.9
                : 0.55 + 0.45 * Math.sin(tSec * 1.6 + pt.twinklePhase);
              const lColor =
                curTheme.lights[pt.lightIdx % curTheme.lights.length] ??
                curTheme.garland;
              glyphBuf[cIdx] = pulse > 0.78 ? "O" : "*";
              colorBuf[cIdx] = lColor;
              alphaBuf[cIdx] = (0.72 + 0.28 * pulse) * glyphAlpha * lightAlpha;
              if (pulse > 0.88 && st.qrMix < 0.2 && dz > -0.5) {
                brightLightHalos.push({
                  x: (col + 0.5) * cellW,
                  y: (row + 0.5) * cellH,
                  color: lColor,
                  alpha: (pulse - 0.85) * 2.2 * glyphAlpha * lightAlpha,
                });
              }
            }
          } else {
            // Single-hue volumetric Lambert term from slowly orbiting light
            const rnx = pt.nx * cosY - pt.nz * sinY;
            const rnz = pt.nx * sinY + pt.nz * cosY;
            const lambert = Math.max(
              0,
              rnx * lightDirX * 0.88 + rnz * lightDirZ * 0.88 + 0.36,
            );
            const depthNorm = Math.max(
              0,
              Math.min(1, (dz + TREE_BASE_RADIUS) / (TREE_BASE_RADIUS * 2)),
            );
            const lit = Math.max(
              0.08,
              Math.min(1, lambert * 0.62 + depthNorm * 0.38),
            );
            const rampIdx = Math.min(
              ramp.length - 1,
              Math.floor((1 - lit * 0.88) * (ramp.length - 1)),
            );
            glyphBuf[cIdx] = ramp[rampIdx] ?? "*";
            const shadeIdx = Math.min(3, Math.max(0, Math.floor(lit * 3.99)));
            colorBuf[cIdx] = curTheme.foliage[shadeIdx];
            alphaBuf[cIdx] = (0.48 + 0.5 * lit) * glyphAlpha;
          }
        }

        // Continuous helical garland curve along outer surface
        if (curShowGarland && st.qrMix < 0.45) {
          const rScale =
            curShape === "spire"
              ? 0.74
              : curShape === "wide"
                ? 1.2
                : curShape === "layered"
                  ? 1.04
                  : 1.0;
          const hMult =
            curShape === "spire" ? 1.05 : curShape === "wide" ? 0.94 : 1.0;
          const tiers = curShape === "layered" ? 6 : 5;
          const tDepth =
            curShape === "layered" ? 0.46 : curShape === "wide" ? 0.22 : 0.34;
          const steps = isCompact ? 130 : 190;
          const maxGarlandStep = Math.floor(steps * grow.garland);
          for (let s = 0; s <= maxGarlandStep; s += 1) {
            const frac = 0.07 + (s / steps) * 0.86;
            const y = 0.55 + frac * (TREE_HEIGHT * hMult - 0.75);
            const tierPhase = (frac * tiers) % 1;
            const tierFactor = 1 - tDepth + tDepth * (1 - tierPhase);
            const maxR =
              TREE_BASE_RADIUS *
              rScale *
              (1 - frac * (curShape === "wide" ? 0.88 : 0.94)) *
              tierFactor *
              1.03;
            const theta = frac * Math.PI * 2 * 3.5;
            const swayX = Math.pow(Math.max(0, y), 1.5) * 0.008 * windWave;
            const gx = Math.cos(theta) * maxR + swayX;
            const gz = Math.sin(theta) * maxR;
            const { sx, sy, dz } = project3D(
              gx * (1 - st.qrMix),
              y * (1 - st.qrMix),
              gz * (1 - st.qrMix),
            );
            const col = Math.floor(sx / cellW);
            const row = Math.floor(sy / cellH);
            if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
            const cIdx = row * cols + col;
            if (dz + 0.12 <= zBuf[cIdx]) continue;
            zBuf[cIdx] = dz + 0.12;
            glyphBuf[cIdx] = s % 2 === 0 ? "~" : ".";
            colorBuf[cIdx] = curTheme.garland;
            alphaBuf[cIdx] = 0.85 * glyphAlpha;
          }
        }

        // Glow sprite pass behind only the brightest quarter of active twinkle lights
        const activeSprite = glowSpriteRef.current;
        if (brightLightHalos.length > 0 && activeSprite) {
          const lightGlowSize = activeScale * 0.85;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (let i = 0; i < brightLightHalos.length; i += 1) {
            const h = brightLightHalos[i];
            ctx.globalAlpha = Math.min(0.24, h.alpha * 0.3);
            ctx.drawImage(
              activeSprite.canvas,
              h.x - lightGlowSize * 0.5,
              h.y - lightGlowSize * 0.5,
              lightGlowSize,
              lightGlowSize,
            );
          }
          ctx.restore();
        }

        // Draw surviving ASCII cells at integer pixel coordinates
        ctx.font = `600 ${fontSize}px ${fontFamily}`;
        for (let idx = 0; idx < cellTotal; idx += 1) {
          if (zBuf[idx] === -Infinity) continue;
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          ctx.globalAlpha = alphaBuf[idx];
          ctx.fillStyle = colorBuf[idx];
          ctx.fillText(
            glyphBuf[idx],
            Math.round((col + 0.5) * cellW),
            Math.round((row + 0.5) * cellH),
          );
        }
        ctx.globalAlpha = 1;

        // 4. Analytically rendered Editable Apex Topper (sways minimally)
        if (grow.starScale > 0.02) {
          const apexSwayX = Math.pow(TREE_HEIGHT, 1.5) * 0.002 * windWave;
          const apex = project3D(apexSwayX, TREE_HEIGHT + 0.42, 0);
          const starGlow = curReduced ? 1 : 0.82 + 0.18 * Math.sin(tSec * 2.2);
          const starRadiusPx = Math.max(15, activeScale * 0.5);

          ctx.save();
          ctx.translate(apex.sx, apex.sy);
          ctx.scale(grow.starScale, grow.starScale);
          ctx.translate(-apex.sx, -apex.sy);
          ctx.globalAlpha = starGlow * glyphAlpha * Math.min(1, grow.starScale);
          const haloRgba =
            curTopper === "heart"
              ? "rgba(255, 143, 177, 0.36)"
              : curTopper === "snowflake"
                ? "rgba(143, 211, 255, 0.36)"
                : "rgba(245, 196, 81, 0.38)";
          const haloFade =
            curTopper === "heart"
              ? "rgba(255, 143, 177, 0)"
              : curTopper === "snowflake"
                ? "rgba(143, 211, 255, 0)"
                : "rgba(245, 196, 81, 0)";
          const starGrad = ctx.createRadialGradient(
            apex.sx,
            apex.sy,
            1,
            apex.sx,
            apex.sy,
            starRadiusPx * 2.7,
          );
          starGrad.addColorStop(0, haloRgba);
          starGrad.addColorStop(1, haloFade);
          ctx.fillStyle = starGrad;
          ctx.beginPath();
          ctx.arc(apex.sx, apex.sy, starRadiusPx * 2.7, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle =
            curTopper === "heart"
              ? "#FF8FB1"
              : curTopper === "snowflake"
                ? "#8FD3FF"
                : curTheme.star;
          ctx.font = `700 ${Math.max(8, Math.round(fontSize * 0.92))}px ${fontFamily}`;
          const step = Math.max(6.5, cellW * 1.15);

          if (curTopper === "diamond") {
            for (let dy = -2; dy <= 2; dy += 1) {
              for (let dx = -2; dx <= 2; dx += 1) {
                const manhattan = Math.abs(dx) * 1.15 + Math.abs(dy) * 0.85;
                if (manhattan <= 2.15) {
                  const g =
                    manhattan < 0.8 ? "@" : dx === 0 || dy === 0 ? "+" : "*";
                  ctx.fillText(
                    g,
                    apex.sx + dx * step,
                    apex.sy + dy * step * 1.1,
                  );
                }
              }
            }
          } else if (curTopper === "snowflake") {
            for (let dy = -2; dy <= 2; dy += 1) {
              for (let dx = -2; dx <= 2; dx += 1) {
                const onAxis =
                  dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy);
                if (onAxis && Math.hypot(dx, dy) <= 2.9) {
                  const g =
                    dx === 0 && dy === 0
                      ? "*"
                      : dx === 0
                        ? "|"
                        : dy === 0
                          ? "-"
                          : dx === dy
                            ? "\\"
                            : "/";
                  ctx.fillText(
                    g,
                    apex.sx + dx * step,
                    apex.sy + dy * step * 1.1,
                  );
                }
              }
            }
          } else if (curTopper === "heart") {
            const heartGrid = ["oo oo", "@@@@@", "#####", " *** ", "  v  "];
            for (let r = 0; r < heartGrid.length; r += 1) {
              for (let c = 0; c < heartGrid[r].length; c += 1) {
                const ch = heartGrid[r][c];
                if (ch === " ") continue;
                ctx.fillText(
                  ch,
                  apex.sx + (c - 2) * step,
                  apex.sy + (r - 2) * step * 1.1,
                );
              }
            }
          } else if (curTopper === "crown") {
            const crownGrid = ["^ * ^", "|#|#|", "@@@@@", "====="];
            for (let r = 0; r < crownGrid.length; r += 1) {
              for (let c = 0; c < crownGrid[r].length; c += 1) {
                const ch = crownGrid[r][c];
                if (ch === " ") continue;
                ctx.fillText(
                  ch,
                  apex.sx + (c - 2) * step,
                  apex.sy + (r - 1.5) * step * 1.1,
                );
              }
            }
          } else if (curTopper === "ribbon") {
            ctx.fillStyle = "#FF8FB1";
            const ribbonGrid = ["~~ ~~", ">>@<<", " / \\ ", "/   \\"];
            for (let r = 0; r < ribbonGrid.length; r += 1) {
              for (let c = 0; c < ribbonGrid[r].length; c += 1) {
                const ch = ribbonGrid[r][c];
                if (ch === " ") continue;
                ctx.fillText(
                  ch,
                  apex.sx + (c - 2) * step,
                  apex.sy + (r - 1.5) * step * 1.1,
                );
              }
            }
          } else {
            // Multi-line dense golden xmasqr-style ASCII star apex
            const starGrid = [
              "##",
              "%%%%",
              "*##%%%@@@@%%%##",
              "%%%%@@@@@@%%%%#",
              "%@@@@@@%",
              "%%%%@%%%%",
              "###%#%@#%",
            ];
            const starStepX = Math.max(4.6, cellW * 0.86);
            const starStepY = Math.max(6.8, fontSize * 0.74);
            for (let r = 0; r < starGrid.length; r += 1) {
              const line = starGrid[r];
              const halfLen = (line.length - 1) / 2;
              for (let c = 0; c < line.length; c += 1) {
                const ch = line[c];
                if (ch === " ") continue;
                ctx.fillText(
                  ch,
                  apex.sx + (c - halfLen) * starStepX,
                  apex.sy + (r - 3.6) * starStepY,
                );
              }
            }
          }
          ctx.restore();
        }
      }

      // 5. Seamless Dark-Canvas Scannable QR Plate (xmasqr-style, strict 4-module quiet zone)
      if (curMatrix.ok && st.qrMix > 0.04) {
        const quietModules = 4;
        const totalModules = curMatrix.size + quietModules * 2;
        const modulePx = qrBoxSide / totalModules;
        const footerH = Math.round(qrBoxSide * 0.16);
        const cardH = qrBoxSide + footerH;
        const qrLeft = stageCenterX - qrBoxSide / 2;
        const qrTop = stageCenterY - cardH / 2;

        ctx.save();
        ctx.globalAlpha = Math.min(1, st.qrMix * 1.25);

        // Solid #0B0D12 night backing plate so stars/snow never pollute the quiet zone
        ctx.fillStyle = curTheme.qrBg;
        ctx.fillRect(qrLeft, qrTop, qrBoxSide, cardH);

        ctx.strokeStyle = "#232834";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(qrLeft, qrTop, qrBoxSide, cardH);

        // Render themed high-contrast QR modules strictly inside the 4-module quiet zone
        const n = curMatrix.size;
        const halfN = (n - 1) / 2;
        const morphingToQrPlate = st.targetQrMix > st.fromQrMix;
        const usePlateWave = st.inTransition && isQrMorph && !curReduced;
        for (let i = 0; i < curMatrix.cells.length; i += 1) {
          const { row, column } = curMatrix.cells[i];
          const finder = isFinderCell(row, column, n);
          const normDist = Math.min(
            1,
            Math.hypot(column - halfN, row - halfN) / (halfN * 1.414),
          );
          let cellReveal: number;
          if (usePlateWave) {
            const delay = morphingToQrPlate
              ? normDist * 0.45
              : (1 - normDist) * 0.45;
            const localT = Math.max(
              0,
              Math.min(1, (qrElapsedSec - delay) / 0.7),
            );
            const waveMix = quadEaseInOut(localT);
            cellReveal = morphingToQrPlate ? waveMix : 1 - waveMix;
          } else {
            const threshold = finder ? 0.15 : 0.25 + normDist * 0.55;
            cellReveal = Math.max(
              0,
              Math.min(1, (st.qrMix - threshold * 0.55) / 0.45),
            );
          }
          if (cellReveal <= 0.01) continue;

          ctx.fillStyle = finder ? curTheme.qrFinder : curTheme.qrDark;
          ctx.globalAlpha = cellReveal;

          const x0 = qrLeft + (column + quietModules) * modulePx;
          const y0 = qrTop + (row + quietModules) * modulePx;

          if (st.qrMix > 0.96) {
            const ix = Math.floor(x0);
            const iy = Math.floor(y0);
            const iw = Math.ceil(x0 + modulePx) - ix;
            const ih = Math.ceil(y0 + modulePx) - iy;
            ctx.fillRect(ix, iy, iw, ih);
          } else {
            const scale = 0.4 + 0.6 * cellReveal;
            const pad = (modulePx * (1 - scale)) / 2;
            ctx.fillRect(
              x0 + pad,
              y0 + pad,
              modulePx * scale,
              modulePx * scale,
            );
          }
        }

        // Caption strip strictly OUTSIDE the 4-module quiet zone
        const captionFade = Math.max(0, (st.qrMix - 0.55) / 0.45);
        if (captionFade > 0.01) {
          ctx.globalAlpha = captionFade;
          const stripY = qrTop + qrBoxSide;

          ctx.strokeStyle = "#232834";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(qrLeft + 14, stripY);
          ctx.lineTo(qrLeft + qrBoxSide - 14, stripY);
          ctx.stroke();

          ctx.fillStyle = "#F2EDE4";
          ctx.font = `700 ${Math.max(10, Math.round(qrBoxSide * 0.04))}px ${fontFamily}`;
          ctx.fillText(
            `hoho.xo · @${curHandle}`.slice(0, 28),
            stageCenterX,
            stripY + footerH * 0.36,
          );

          ctx.fillStyle = "#9A968D";
          ctx.font = `500 ${Math.max(8, Math.round(qrBoxSide * 0.03))}px ${fontFamily}`;
          ctx.fillText(
            "SCAN TO SEND AN ANONYMOUS NOTE",
            stageCenterX,
            stripY + footerH * 0.72,
          );
        }

        ctx.restore();
      }

      // 6. Render Active Message Ornaments (up to latest 100 resolved slots; hidden in QR mode)
      const hitList: ProjectedOrnamentHit[] = [];
      if (curShowOrnaments && st.qrMix < 0.28 && curOrnaments.length > 0) {
        const ornamentAlpha = Math.max(0, 1 - st.qrMix / 0.28);
        const isDenseOrnaments = curOrnaments.length > 24;
        const projected = curOrnaments
          .map((item) => {
            const pos = slotPosition3D(
              item.slot,
              TREE_HEIGHT,
              TREE_BASE_RADIUS,
            );
            const proj = project3D(pos.x, pos.y, pos.z);
            let drawSy = proj.sy;
            let dropFlashAlpha = 0;
            let pendulumAngle = 0;

            if (!curReduced && dropAnimRef.current.id === item.id) {
              const elapsedMs = Math.max(
                0,
                now - dropAnimRef.current.startedAt,
              );
              const dropDurMs = 900;
              const swingDurMs = 2200;
              if (elapsedMs >= dropDurMs + swingDurMs) {
                dropAnimRef.current.id = null;
              } else if (elapsedMs < dropDurMs) {
                const easedDrop = dampedBounce(elapsedMs / dropDurMs);
                const startSy = proj.sy - 120;
                drawSy = startSy + (proj.sy - startSy) * easedDrop;
                if (elapsedMs > dropDurMs - 90) {
                  dropFlashAlpha = (elapsedMs - (dropDurMs - 90)) / 90;
                }
              } else {
                const afterLandMs = elapsedMs - dropDurMs;
                if (afterLandMs < 90) {
                  dropFlashAlpha = 1 - afterLandMs / 90;
                }
                const swingSec = afterLandMs / 1000;
                pendulumAngle =
                  ((7 * Math.PI) / 180) *
                  Math.exp(-swingSec * 1.45) *
                  Math.sin(swingSec * Math.PI * 3.1);
              }
            }

            return {
              item,
              sx: proj.sx,
              sy: drawSy,
              dz: proj.dz,
              dropFlashAlpha,
              pendulumAngle,
            };
          })
          .sort((a, b) => a.dz - b.dz);

        for (let i = 0; i < projected.length; i += 1) {
          const { item, sx, sy, dz, dropFlashAlpha, pendulumAngle } =
            projected[i];
          const color =
            ORNAMENT_COLORS[item.colorIdx % ORNAMENT_COLORS.length] ??
            "#F5C451";
          const isUnread = !item.readAt;
          const isHovered = hoveredIdRef.current === item.id;
          const depthDim = dz < -0.6 ? 0.78 : 1;

          let wiggleOffset = 0;
          if (wiggleRef.current.id === item.id) {
            const wElapsed = tSec - wiggleRef.current.startedAt * 0.001;
            if (wElapsed < 0.65) {
              wiggleOffset =
                Math.sin(wElapsed * 28) * Math.exp(-wElapsed * 5.2) * 8;
            } else {
              wiggleRef.current.id = null;
            }
          }

          const ox = sx + wiggleOffset;
          const oy = sy;
          const diskR = isDenseOrnaments ? 9 : isCompact ? 12 : 14;

          ctx.save();
          ctx.globalAlpha = ornamentAlpha * depthDim * (isUnread ? 1 : 0.86);

          // Rotate around hanger at top edge during Phase 2 damped pendulum
          ctx.translate(ox, oy - diskR);
          if (Math.abs(pendulumAngle) > 0.0005) {
            ctx.rotate(pendulumAngle);
          }
          ctx.translate(0, diskR);

          // Short landing flash halo on arrival
          if (dropFlashAlpha > 0.01) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, dropFlashAlpha) * 0.85;
            ctx.strokeStyle = "#F5C451";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(
              0,
              0,
              diskR + 4 + (1 - dropFlashAlpha) * 18,
              0,
              Math.PI * 2,
            );
            ctx.stroke();
            ctx.restore();
          }

          const sprite = getOrnamentSpriteCanvas({
            typeId: item.ornamentType,
            color,
            radius: diskR,
            unread: isUnread,
            hovered: isHovered,
            dpr,
          });
          if (sprite) {
            const halfSprite = sprite.logicalSize / 2;
            ctx.drawImage(
              sprite.canvas,
              -halfSprite,
              -halfSprite,
              sprite.logicalSize,
              sprite.logicalSize,
            );
          }

          ctx.restore();

          hitList.push({
            id: item.id,
            x: ox,
            y: oy,
            r: isDenseOrnaments ? (isCompact ? 22 : 16) : isCompact ? 28 : 22,
          });
        }
      }
      projectedOrnamentsRef.current = hitList;
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
        lastTime = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    };

    drawNowRef.current = () => drawFrame(performance.now());
    ensureLoopRef.current = ensureLoop;

    const handleVisibility = () => {
      hidden = document.hidden;
      lastTime = performance.now();
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

    const handleResize = () => {
      drawFrame(performance.now());
    };
    window.addEventListener("resize", handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        drawFrame(performance.now());
      });
      resizeObserver.observe(canvas);
    }

    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      intersectionObserver = new IntersectionObserver(
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
      );
      intersectionObserver.observe(canvas);
    }

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
      if (propsRef.current.reducedMotion) {
        drawFrame(performance.now());
      }
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
        if (propsRef.current.reducedMotion) {
          drawFrame(performance.now());
        }
      } else if (event.key === "ArrowRight") {
        yawRef.current += 0.22;
        if (propsRef.current.reducedMotion) {
          drawFrame(performance.now());
        }
      }
    };
    window.addEventListener("keydown", handleKeyRotate);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      drawNowRef.current = () => {};
      ensureLoopRef.current = () => {};
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyRotate);
      canvas.removeEventListener("wheel", handleWheel);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
    };
  }, [backdrop]);

  function findOrnamentAt(
    clientX: number,
    clientY: number,
    pointerType = "mouse",
  ): { ornament: ResolvedOrnament; hit: ProjectedOrnamentHit } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const hits = projectedOrnamentsRef.current;
    let best: { hit: ProjectedOrnamentHit; dist: number } | null = null;
    for (let i = hits.length - 1; i >= 0; i -= 1) {
      const hit = hits[i];
      const hitRadius = Math.max(hit.r, pointerType === "touch" ? 24 : 15);
      const d = Math.hypot(x - hit.x, y - hit.y);
      if (d <= hitRadius && (!best || d < best.dist)) {
        best = { hit, dist: d };
      }
    }
    if (!best) return null;
    const found = ornaments.find((item) => item.id === best.hit.id);
    return found ? { ornament: found, hit: best.hit } : null;
  }

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
          className={`tree-canvas${hoveredInfo ? "is-hovering-ornament" : ""}`}
          style={{ touchAction: "none" }}
          aria-label={
            viewMode === "qr"
              ? `Scannable QR code for ${qrValue}. Click to grow the tree.`
              : `Interactive 3D ASCII Christmas tree in ${theme.label} style. Drag to rotate, pinch or scroll to zoom, click an ornament to inspect, or click empty sky to view QR code.`
          }
          onPointerDown={(event) => {
            activePointersRef.current.set(event.pointerId, {
              x: event.clientX,
              y: event.clientY,
            });
            if (activePointersRef.current.size === 2 && viewMode !== "qr") {
              const pts = Array.from(activePointersRef.current.values());
              pinchStartDistRef.current = Math.hypot(
                pts[0].x - pts[1].x,
                pts[0].y - pts[1].y,
              );
              pinchStartZoomRef.current = internalZoomRef.current;
              wasPinchingRef.current = true;
              dragStateRef.current.active = false;
              return;
            }
            dragStateRef.current = {
              active: viewMode !== "qr" && activePointersRef.current.size === 1,
              pointerId: event.pointerId,
              startX: event.clientX,
              startY: event.clientY,
              lastX: event.clientX,
              moved: false,
            };
          }}
          onPointerMove={(event) => {
            if (activePointersRef.current.has(event.pointerId)) {
              activePointersRef.current.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY,
              });
            }
            if (
              activePointersRef.current.size === 2 &&
              pinchStartDistRef.current &&
              pinchStartDistRef.current > 8 &&
              viewMode !== "qr"
            ) {
              const pts = Array.from(activePointersRef.current.values());
              const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
              const nextZoom = Math.max(
                0.72,
                Math.min(
                  1.45,
                  Number(
                    (
                      pinchStartZoomRef.current *
                      (dist / pinchStartDistRef.current)
                    ).toFixed(3),
                  ),
                ),
              );
              internalZoomRef.current = nextZoom;
              onZoomChangeRef.current?.(nextZoom);
              if (reducedMotion) {
                drawNowRef.current();
              }
              return;
            }
            if (
              dragStateRef.current.active &&
              dragStateRef.current.pointerId === event.pointerId
            ) {
              const dx = event.clientX - dragStateRef.current.lastX;
              if (
                Math.hypot(
                  event.clientX - dragStateRef.current.startX,
                  event.clientY - dragStateRef.current.startY,
                ) > 6
              ) {
                dragStateRef.current.moved = true;
              }
              yawRef.current += dx * 0.008;
              dragStateRef.current.lastX = event.clientX;
              if (reducedMotion) {
                drawNowRef.current();
              }
              return;
            }
            if (event.pointerType === "mouse") {
              const hovered = findOrnamentAt(
                event.clientX,
                event.clientY,
                event.pointerType,
              );
              const nextHoveredId = hovered ? hovered.ornament.id : null;
              if (hoveredIdRef.current !== nextHoveredId) {
                hoveredIdRef.current = nextHoveredId;
                if (reducedMotion) {
                  drawNowRef.current();
                }
              }
              setHoveredInfo(
                hovered
                  ? {
                      ornament: hovered.ornament,
                      x: hovered.hit.x,
                      y: hovered.hit.y,
                    }
                  : null,
              );
            }
          }}
          onPointerUp={(event) => {
            activePointersRef.current.delete(event.pointerId);
            if (activePointersRef.current.size < 2) {
              pinchStartDistRef.current = null;
            }
            if (wasPinchingRef.current) {
              dragStateRef.current.active = false;
              if (activePointersRef.current.size === 0) {
                wasPinchingRef.current = false;
              }
              return;
            }
            const wasMoved = dragStateRef.current.moved;
            dragStateRef.current.active = false;
            if (wasMoved) return;

            const found = findOrnamentAt(
              event.clientX,
              event.clientY,
              event.pointerType,
            );
            if (found) {
              if (!isOwnerMode) {
                wiggleRef.current = {
                  id: found.ornament.id,
                  startedAt: performance.now(),
                };
              }
              onSelectOrnament(found.ornament);
              return;
            }
            onToggleQrView();
          }}
          onPointerLeave={(event) => {
            activePointersRef.current.delete(event.pointerId);
            if (activePointersRef.current.size < 2) {
              pinchStartDistRef.current = null;
            }
            if (activePointersRef.current.size === 0) {
              wasPinchingRef.current = false;
            }
            dragStateRef.current.active = false;
            if (hoveredIdRef.current !== null) {
              hoveredIdRef.current = null;
              if (reducedMotion) drawNowRef.current();
            }
            setHoveredInfo(null);
          }}
          onPointerCancel={(event) => {
            activePointersRef.current.delete(event.pointerId);
            if (activePointersRef.current.size < 2) {
              pinchStartDistRef.current = null;
            }
            if (activePointersRef.current.size === 0) {
              wasPinchingRef.current = false;
            }
            dragStateRef.current.active = false;
            if (hoveredIdRef.current !== null) {
              hoveredIdRef.current = null;
              if (reducedMotion) drawNowRef.current();
            }
            setHoveredInfo(null);
          }}
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
