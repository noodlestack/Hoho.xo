import QRCode from "qrcode";
import type { TreeShapeId } from "./tree-config";

export const MAX_TREE_GLYPHS = 4096;
export const SLOT_COUNT = 100;
export const TREE_HEIGHT = 10;
export const TREE_BASE_RADIUS = 3.65;

export type QrMatrixResult =
  | {
      ok: true;
      size: number;
      cells: Array<{ row: number; column: number }>;
      grid: Uint8Array;
    }
  | { ok: false; reason: "too-long" | "too-dense" };

export interface TreeGlyphTarget {
  x: number;
  y: number;
  glyph: string;
  tone: number;
}

export type CloudPointKind = "foliage" | "garland" | "trunk" | "ground";

export interface TreeCloudPoint {
  /** Normalized 3D coordinates centered on the tree base axis (y: 0..TREE_HEIGHT) */
  x: number;
  y: number;
  z: number;
  /** Outward surface normal on the horizontal XZ plane for directional lighting */
  nx: number;
  nz: number;
  /** Corresponding 2D QR module coordinates (in -1..1 centered square) */
  qrX: number;
  qrZ: number;
  /** Distance from QR center (0..1) for radial reveal ripples */
  qrRadius: number;
  kind: CloudPointKind;
  shade: number;
  twinklePhase: number;
  isTwinkle: boolean;
  isLight: boolean;
  lightIdx: number;
  glyphIdx: number;
}

export function createQrMatrix(value: string): QrMatrixResult {
  try {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
    const size = modules.size;
    const grid = new Uint8Array(size * size);
    const cells: Array<{ row: number; column: number }> = [];

    for (let index = 0; index < modules.data.length; index += 1) {
      if (modules.data[index]) {
        grid[index] = 1;
        cells.push({
          row: Math.floor(index / size),
          column: index % size,
        });
      }
    }

    if (cells.length > MAX_TREE_GLYPHS) {
      return { ok: false, reason: "too-dense" };
    }

    return { ok: true, size, cells, grid };
  } catch {
    return { ok: false, reason: "too-long" };
  }
}

export function normalizeWebUrl(value: string): string | null {
  if (!value || value.length > 2048) return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function slotFor(seq: number): number {
  return ((seq % SLOT_COUNT) + SLOT_COUNT) % SLOT_COUNT;
}

export function slotPosition3D(
  slotIndex: number,
  height = TREE_HEIGHT,
  baseRadius = TREE_BASE_RADIUS,
): { x: number; y: number; z: number } {
  const GOLDEN_ANGLE = 2.399963229728653;
  const idx = slotFor(slotIndex);
  const u = (((idx * 37 + 13) % SLOT_COUNT) + 0.5) / SLOT_COUNT;
  const hFrac = (1 - Math.sqrt(1 - u * 0.96)) / 0.8;
  const y = 0.72 + hFrac * (height - 1.65);
  const r = baseRadius * (1 - hFrac * 0.94) * 0.95 + 0.24;
  const theta = idx * GOLDEN_ANGLE;
  return {
    x: r * Math.cos(theta),
    y,
    z: r * Math.sin(theta),
  };
}

export function resolveTreeOrnaments<
  T extends { seq: number; status: string },
>(messages: readonly T[]): Array<T & { slot: number }> {
  const eligible = messages
    .filter((m) => m.status === "visible")
    .sort((a, b) => b.seq - a.seq);

  const taken = new Set<number>();
  const resolved: Array<T & { slot: number }> = [];

  for (const msg of eligible) {
    const slot = slotFor(msg.seq);
    if (taken.has(slot)) continue;
    taken.add(slot);
    resolved.push({ ...msg, slot });
    if (resolved.length >= SLOT_COUNT) break;
  }

  return resolved;
}

const legacyGlyphs = [".", "+", "x", "*", ":"];

export function createTreeGlyphTargets(
  count: number,
  seed: string,
): TreeGlyphTarget[] {
  if (!Number.isInteger(count) || count < 0 || count > MAX_TREE_GLYPHS) return [];

  const random = mulberry32(hashString(seed));
  return Array.from({ length: count }, () => {
    const y = 0.1 + random() * 0.72;
    const halfWidth = 0.035 + ((y - 0.1) / 0.72) * 0.39;
    return {
      x: 0.5 + (random() * 2 - 1) * halfWidth,
      y,
      glyph: legacyGlyphs[Math.floor(random() * legacyGlyphs.length)],
      tone: Math.floor(random() * 3),
    };
  });
}

/**
 * Generates a deterministic QR-constrained 3D stepped-cone point cloud.
 * Foliage points sit directly above dark QR modules inside the cone radius,
 * preserving the QR footprint from top-down view while forming a 5-tier cone in 3D.
 */
export function generateQrTreeCloud(
  matrix: Extract<QrMatrixResult, { ok: true }>,
  seedInput: string,
  options: { dense?: boolean; shape?: TreeShapeId } = {},
): TreeCloudPoint[] {
  const dense = options.dense ?? true;
  const shape = options.shape ?? "classic";
  const random = mulberry32(hashString(`${seedInput}:${shape}`));
  const points: TreeCloudPoint[] = [];
  const size = matrix.size;

  const isDarkModuleAtNormalized = (nx: number, nz: number): boolean => {
    const col = Math.floor(((nx + 1) * 0.5) * size);
    const row = Math.floor(((nz + 1) * 0.5) * size);
    if (col < 0 || col >= size || row < 0 || row >= size) return false;
    return matrix.grid[row * size + col] === 1;
  };

  const radiusScale =
    shape === "spire" ? 0.74 : shape === "wide" ? 1.2 : shape === "layered" ? 1.04 : 1.0;
  const heightMult = shape === "spire" ? 1.05 : shape === "wide" ? 0.94 : 1.0;
  const tierCount = shape === "layered" ? 6 : 5;
  const tierDepth = shape === "layered" ? 0.46 : shape === "wide" ? 0.22 : 0.34;

  // 1. Stepped-cone foliage constrained to dark QR modules
  const targetFoliage = dense ? 6600 : 3400;
  let attempts = 0;
  let foliageCount = 0;
  while (foliageCount < targetFoliage && attempts < targetFoliage * 8) {
    attempts += 1;
    const hFrac = Math.pow(random(), 0.76);
    const y = 0.55 + hFrac * (TREE_HEIGHT * heightMult - 0.75);

    const tierPhase = (hFrac * tierCount) % 1;
    const tierFactor = 1 - tierDepth + tierDepth * (1 - tierPhase);
    const maxR =
      TREE_BASE_RADIUS *
      radiusScale *
      (1 - hFrac * (shape === "wide" ? 0.88 : 0.94)) *
      tierFactor;

    const radialBias = Math.pow(random(), 0.38);
    const r = maxR * radialBias;
    const theta = random() * Math.PI * 2;
    const nx = Math.cos(theta);
    const nz = Math.sin(theta);
    const x = r * nx;
    const z = r * nz;

    const qrX = x / (TREE_BASE_RADIUS * radiusScale);
    const qrZ = z / (TREE_BASE_RADIUS * radiusScale);

    if (!isDarkModuleAtNormalized(qrX, qrZ) && random() < 0.86) {
      continue;
    }

    // Spiral garland ribbon along outer branches
    const normalizedAngle = ((theta / (Math.PI * 2)) % 1 + 1) % 1;
    const spiralDist = Math.abs(((normalizedAngle + hFrac * 3.5) % 1) - 0.5);
    const isGarland = radialBias > 0.76 && spiralDist < 0.052;
    const isLight =
      !isGarland && radialBias > 0.62 && hFrac > 0.04 && hFrac < 0.96 && random() < 0.24;

    const shade = Math.min(3, Math.floor((hFrac * 0.45 + radialBias * 0.55) * 4));
    const isTwinkle = !isGarland && !isLight && random() < 0.1;

    points.push({
      x,
      y,
      z,
      nx,
      nz,
      qrX,
      qrZ,
      qrRadius: Math.min(1, Math.hypot(qrX, qrZ)),
      kind: isGarland ? "garland" : "foliage",
      shade,
      twinklePhase: random() * Math.PI * 2,
      isTwinkle,
      isLight,
      lightIdx: isLight ? Math.floor(random() * 4) : 0,
      glyphIdx: Math.floor(random() * 100),
    });
    foliageCount += 1;
  }

  // 2. Trunk particles near base center
  const trunkCount = dense ? 170 : 110;
  for (let i = 0; i < trunkCount; i += 1) {
    const theta = random() * Math.PI * 2;
    const r = (0.14 + 0.34 * random()) * 1.1;
    const nx = Math.cos(theta);
    const nz = Math.sin(theta);
    const x = r * nx;
    const z = r * nz;
    const y = random() * 0.95;
    const qrX = x / TREE_BASE_RADIUS;
    const qrZ = z / TREE_BASE_RADIUS;
    points.push({
      x,
      y,
      z,
      nx,
      nz,
      qrX,
      qrZ,
      qrRadius: Math.min(1, Math.hypot(qrX, qrZ)),
      kind: "trunk",
      shade: 1,
      twinklePhase: 0,
      isTwinkle: false,
      isLight: false,
      lightIdx: 0,
      glyphIdx: i,
    });
  }

  // 3. Expansive perspective snowfield halo dots around base
  const groundCount = dense ? 1050 : 540;
  for (let i = 0; i < groundCount; i += 1) {
    const theta = random() * Math.PI * 2;
    const r = TREE_BASE_RADIUS * (0.4 + 2.25 * Math.pow(random(), 0.72));
    const nx = Math.cos(theta);
    const nz = Math.sin(theta);
    const x = r * nx;
    const z = r * nz;
    const qrX = x / TREE_BASE_RADIUS;
    const qrZ = z / TREE_BASE_RADIUS;
    points.push({
      x,
      y: 0.04,
      z,
      nx,
      nz,
      qrX,
      qrZ,
      qrRadius: Math.min(1, Math.hypot(qrX, qrZ)),
      kind: "ground",
      shade: 0,
      twinklePhase: random() * Math.PI * 2,
      isTwinkle: false,
      isLight: false,
      lightIdx: 0,
      glyphIdx: i,
    });
  }

  return points;
}
