import type { TreeMessage } from "@/lib/messages";
import { mulberry32, type QrMatrixResult } from "@/lib/qr-tree";
import type {
  TreeSceneryId,
  TreeShapeId,
  TreeTopperId,
} from "@/lib/tree-config";
import type { TreeTheme } from "@/lib/tree-themes";

export type CameraViewMode = "tree" | "top" | "qr";

export interface ResolvedOrnament extends TreeMessage {
  slot: number;
}

export interface ProjectedOrnamentHit {
  id: string;
  x: number;
  y: number;
  r: number;
}

export interface BgStar {
  x: number;
  y: number;
  glyph: string;
  phase: number;
  alpha: number;
}

export interface Snowflake {
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

export interface EmberSpark {
  x: number;
  y: number;
  speed: number;
  driftFreq: number;
  phase: number;
  glyph: string;
}

export interface BackdropParticles {
  stars: BgStar[];
  flakes: Snowflake[];
  embers: EmberSpark[];
}

export interface AsciiTreeCanvasProps {
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
  supporter?: boolean;
  isOwnerMode: boolean;
  paused?: boolean;
  onSelectOrnament: (ornament: ResolvedOrnament) => void;
  onToggleQrView: () => void;
  onZoomChange?: (nextZoom: number) => void;
}

export interface ProjectedPoint3D {
  sx: number;
  sy: number;
  dz: number;
  persp: number;
}

export type Project3DFn = (
  wx: number,
  wy: number,
  wz: number,
) => ProjectedPoint3D;

export const STATIC_FALLBACK_ASCII = `                 *
                /+\\
               * . +
              /+ x .\\
             . + * x +
            / x . + . \\
           + * x . + x *
          / . + x * . + \\
         x + * . + x * . x
                |||`;

export function cubicEaseInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function quadEaseInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function dampedBounce(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return 1 - Math.exp(-5.4 * c) * Math.abs(Math.cos(c * Math.PI * 2.1));
}

export function isFinderCell(row: number, col: number, size: number): boolean {
  return (
    (row < 7 && col < 7) ||
    (row < 7 && col >= size - 7) ||
    (row >= size - 7 && col < 7)
  );
}

export function getGlowSprite(theme: TreeTheme): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const sprite = document.createElement("canvas");
  const size = 256;
  sprite.width = size;
  sprite.height = size;
  const gCtx = sprite.getContext("2d");
  if (!gCtx) return null;

  const half = size / 2;
  const grad = gCtx.createRadialGradient(half, half, 4, half, half, half);
  grad.addColorStop(0, theme.swatch);
  grad.addColorStop(0.28, theme.foliage[2]);
  grad.addColorStop(0.6, theme.foliage[0]);
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");

  gCtx.globalAlpha = 0.65;
  gCtx.fillStyle = grad;
  gCtx.fillRect(0, 0, size, size);

  const coreGrad = gCtx.createRadialGradient(
    half,
    half,
    2,
    half,
    half,
    half * 0.45,
  );
  coreGrad.addColorStop(0, "#FFF5D6");
  coreGrad.addColorStop(0.5, theme.star);
  coreGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  gCtx.globalAlpha = 0.4;
  gCtx.fillStyle = coreGrad;
  gCtx.fillRect(0, 0, size, size);

  return sprite;
}

export function createBackdropParticles(): BackdropParticles {
  const rng = mulberry32(20261225);
  const stars: BgStar[] = Array.from({ length: 185 }, () => ({
    x: rng(),
    y: rng(),
    glyph: rng() < 0.22 ? "*" : rng() < 0.55 ? "+" : ".",
    phase: rng() * Math.PI * 2,
    alpha: 0.16 + rng() * 0.36,
  }));
  const flakes: Snowflake[] = Array.from({ length: 120 }, (_, i) => {
    const layer = i < 72 ? "far" : "near";
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
}
