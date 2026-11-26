import type { MutableRefObject } from "react";
import type { UseTreeLayoutResult } from "@/components/hoho/use-tree-layout";
import {
  cubicEaseInOut,
  quadEaseInOut,
  type BackdropParticles,
  type CameraViewMode,
  type ProjectedOrnamentHit,
  type ResolvedOrnament,
} from "@/components/tree/canvas-types";
import {
  drawBackdropParticles,
  drawTreeGlowAndGround,
} from "@/components/tree/draw-backdrop";
import { drawFoliageAndTopper } from "@/components/tree/draw-foliage-and-topper";
import { drawQrPlateAndOrnaments } from "@/components/tree/draw-qr-and-ornaments";
import {
  TREE_HEIGHT,
  type QrMatrixResult,
  type TreeCloudPoint,
} from "@/lib/qr-tree";
import type {
  TreeSceneryId,
  TreeShapeId,
  TreeTopperId,
} from "@/lib/tree-config";
import type { TreeTheme } from "@/lib/tree-themes";

export interface CanvasPropsSnapshot {
  handle: string;
  matrix: QrMatrixResult;
  cloud: TreeCloudPoint[];
  theme: TreeTheme;
  topper: TreeTopperId;
  shape: TreeShapeId;
  scenery: TreeSceneryId;
  viewMode: CameraViewMode;
  showSnow: boolean;
  showGarland: boolean;
  showOrnaments: boolean;
  ornaments: ResolvedOrnament[];
  reducedMotion: boolean;
  staticMode: boolean;
  supporter: boolean;
  isOwnerMode: boolean;
  layout: UseTreeLayoutResult;
}

export interface CanvasAnimState {
  qrMix: number;
  elev: number;
  fromQrMix: number;
  fromElev: number;
  targetQrMix: number;
  targetElev: number;
  transitionStart: number;
  inTransition: boolean;
}

export interface RenderTreeFrameParams {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  now: number;
  lastTimeRef: MutableRefObject<number>;
  hidden: boolean;
  inViewport: boolean;
  debugHud: boolean;
  backdrop: BackdropParticles;
  propsSnapshot: CanvasPropsSnapshot;
  animState: CanvasAnimState;
  dragActive: boolean;
  yawRef: MutableRefObject<number>;
  internalZoomRef: MutableRefObject<number>;
  renderZoomRef: MutableRefObject<number>;
  qualityTierRef: MutableRefObject<"high" | "medium" | "low">;
  perfMonitorRef: MutableRefObject<{
    emaMs: number;
    slowStreak: number;
    skipFrames: number;
    lastFps: number;
  }>;
  glowSpriteRef: MutableRefObject<{
    themeId: string;
    canvas: HTMLCanvasElement;
  } | null>;
  zBufferRef: MutableRefObject<Float32Array>;
  cellGlyphRef: MutableRefObject<string[]>;
  cellColorRef: MutableRefObject<string[]>;
  cellAlphaRef: MutableRefObject<Float32Array>;
  growState: {
    foliage: number;
    garland: number;
    lights: number;
    starScale: number;
  };
  dropAnimRef: MutableRefObject<{ id: string | null; startedAt: number }>;
  hoveredIdRef: MutableRefObject<string | null>;
  wiggleRef: MutableRefObject<{ id: string | null; startedAt: number }>;
}

/** Renders one complete 2D ASCII Christmas tree / QR morph frame and returns ornament hit targets. */
export function renderTreeCanvasFrame({
  canvas,
  ctx,
  now,
  lastTimeRef,
  hidden,
  inViewport,
  debugHud,
  backdrop,
  propsSnapshot,
  animState: st,
  dragActive,
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
  growState,
  dropAnimRef,
  hoveredIdRef,
  wiggleRef,
}: RenderTreeFrameParams): ProjectedOrnamentHit[] {
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
    supporter: curSupporter,
    layout: curLayout,
  } = propsSnapshot;

  const curReduced = curReducedRaw || Boolean(curStatic);
  const effectiveNow = curStatic ? 12000 : now;
  const rawDtMs = curStatic
    ? 16.6
    : Math.min(100, Math.max(1, effectiveNow - lastTimeRef.current));
  const dt = curStatic
    ? 0
    : Math.min(0.05, Math.max(0, (effectiveNow - lastTimeRef.current) / 1000));
  lastTimeRef.current = effectiveNow;

  const perf = perfMonitorRef.current;
  if (!curReduced && !hidden && inViewport) {
    if (perf.skipFrames > 0) {
      perf.skipFrames -= 1;
    } else {
      perf.emaMs = perf.emaMs * 0.9 + rawDtMs * 0.1;
      perf.lastFps = Math.round(1000 / Math.max(1, perf.emaMs));
      perf.slowStreak =
        rawDtMs > 24 ? perf.slowStreak + 1 : Math.max(0, perf.slowStreak - 1);
      if (perf.slowStreak >= 24 || (perf.emaMs > 24 && perf.slowStreak >= 12)) {
        if (qualityTierRef.current === "high") {
          qualityTierRef.current = "medium";
        } else if (qualityTierRef.current === "medium") {
          qualityTierRef.current = "low";
        }
        perf.slowStreak = 0;
        perf.emaMs = 16.6;
      }
    }
  }

  const activeTier =
    curLayout.quality === "low" ? "low" : qualityTierRef.current;
  const effectiveDprCap =
    activeTier === "low" ? 1 : activeTier === "medium" ? 1.5 : 2;
  const tSec = effectiveNow * 0.001;
  if (curStatic) {
    yawRef.current = 0.25;
  }

  const isQrMorph = Math.abs(st.targetQrMix - st.fromQrMix) > 0.01;
  const transitionDurMs = isQrMorph ? 1150 : 680;
  const qrElapsedSec = st.inTransition
    ? Math.min(1.15, Math.max(0, (effectiveNow - st.transitionStart) / 1000))
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

  if (!curReduced && !dragActive && st.qrMix < 0.95) {
    yawRef.current += dt * 0.38 * (1 - st.qrMix);
  }
  const effectiveYaw =
    st.qrMix > 0.01 ? yawRef.current * (1 - st.qrMix) : yawRef.current;

  const rect = canvas.getBoundingClientRect();
  const cssW = Math.max(1, rect.width);
  const cssH = Math.max(1, rect.height);
  const dpr = Math.min(window.devicePixelRatio || 1, effectiveDprCap);
  const pxW = Math.round(cssW * dpr);
  const pxH = Math.round(cssH * dpr);

  if (canvas.width !== pxW || canvas.height !== pxH) {
    canvas.width = pxW;
    canvas.height = pxH;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const isCompact = cssW < 640;
  const freeWidth = Math.max(200, cssW);
  const stageCenterX = cssW * 0.5;
  const stageCenterY = isCompact ? cssH * 0.5 : cssH * 0.505;
  const { fontSize, cellW, cellH, treeScale, topScale, qrBoxSide, fontFamily } =
    curLayout;
  const cols = Math.max(1, Math.ceil(cssW / cellW));
  const rows = Math.max(1, Math.ceil(cssH / cellH));
  const cellTotal = cols * rows;

  if (zBufferRef.current.length !== cellTotal) {
    zBufferRef.current = new Float32Array(cellTotal);
    cellGlyphRef.current = new Array<string>(cellTotal).fill("");
    cellColorRef.current = new Array<string>(cellTotal).fill("");
    cellAlphaRef.current = new Float32Array(cellTotal);
  }
  zBufferRef.current.fill(-Infinity);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const baseStarLimit =
    curScenery === "starlight"
      ? backdrop.stars.length
      : Math.min(130, backdrop.stars.length);
  const starLimit =
    activeTier === "low"
      ? Math.min(50, baseStarLimit)
      : activeTier === "medium"
        ? Math.min(90, baseStarLimit)
        : baseStarLimit;
  const snowLimit =
    activeTier === "low"
      ? 28
      : activeTier === "medium"
        ? 64
        : backdrop.flakes.length;

  drawBackdropParticles(ctx, {
    cssW,
    cssH,
    freeWidth,
    stageCenterX,
    stageCenterY,
    isCompact,
    fontSize,
    fontFamily,
    tSec,
    qrMix: st.qrMix,
    curReduced,
    curSnow,
    curScenery,
    curTheme,
    backdrop,
    starLimit,
    snowLimit,
  });

  const cosY = Math.cos(effectiveYaw);
  const sinY = Math.sin(effectiveYaw);
  const cosX = Math.cos(st.elev);
  const sinX = Math.sin(st.elev);
  const topMix = Math.max(0, (st.elev - 0.22) / (1.38 - 0.22)) * (1 - st.qrMix);
  if (curReduced) {
    renderZoomRef.current = internalZoomRef.current;
  } else {
    renderZoomRef.current +=
      (internalZoomRef.current - renderZoomRef.current) * Math.min(1, dt * 10);
  }
  const zoomFactor = renderZoomRef.current * (1 - st.qrMix) + st.qrMix;
  const activeScale =
    (treeScale * (1 - topMix) + topScale * topMix) * zoomFactor;

  const project3D = (wx: number, wy: number, wz: number) => {
    const yRel = (wy - TREE_HEIGHT * 0.525) * (1 - st.qrMix);
    const rx = wx * cosY - wz * sinY;
    const rz = wx * sinY + wz * cosY;
    const ry = yRel * cosX - rz * sinX;
    const dz = yRel * sinX + rz * cosX;
    const persp = 1 / (1 - dz * 0.022 * (1 - st.qrMix));
    return {
      sx: stageCenterX + rx * activeScale * persp,
      sy: stageCenterY - ry * activeScale * persp,
      dz,
      persp,
    };
  };

  const activeGlowCanvas = drawTreeGlowAndGround(ctx, {
    curTheme,
    glowSpriteRef,
    bloomIntensity: Math.max(0, 1 - st.qrMix * 1.4),
    activeScale,
    stageCenterX,
    stageCenterY,
    topMix,
    project3D,
  });

  drawFoliageAndTopper(ctx, {
    curCloud,
    curTheme,
    curTopper,
    curShape,
    curReduced,
    curShowGarland,
    curSupporter: Boolean(curSupporter),
    qrMix: st.qrMix,
    targetQrMix: st.targetQrMix,
    fromQrMix: st.fromQrMix,
    inTransition: st.inTransition,
    isQrMorph,
    qrElapsedSec,
    tSec,
    cosY,
    sinY,
    topMix,
    isCompact,
    activeScale,
    activeTier,
    fontSize,
    cellW,
    cellH,
    cols,
    rows,
    fontFamily,
    grow: growState,
    activeGlowCanvas,
    zBuf: zBufferRef.current,
    glyphBuf: cellGlyphRef.current,
    colorBuf: cellColorRef.current,
    alphaBuf: cellAlphaRef.current,
    project3D,
  });

  return drawQrPlateAndOrnaments(ctx, {
    now: effectiveNow,
    tSec,
    dpr,
    isCompact,
    stageCenterX,
    stageCenterY,
    qrBoxSide,
    fontFamily,
    curHandle,
    curMatrix,
    curTheme,
    curOrnaments,
    curShowOrnaments,
    curReduced,
    qrMix: st.qrMix,
    targetQrMix: st.targetQrMix,
    fromQrMix: st.fromQrMix,
    inTransition: st.inTransition,
    isQrMorph,
    qrElapsedSec,
    dropAnimRef,
    hoveredIdRef,
    wiggleRef,
    project3D,
    debugHud,
    perf,
    activeTier,
    snowLimit,
    cloudCount: curCloud.length,
  });
}
