export type TreeQualityTier = "low" | "medium" | "high";

export const TREE_ASPECT_RATIO = 0.62;
export const TREE_STAGE_PADDING_RATIO = 0.06;
export const TREE_MIN_FONT_SIZE = 8;
export const TREE_MAX_FONT_SIZE = 16;

export interface TreeLayoutInput {
  containerWidth: number;
  containerHeight: number;
  measuredGlyphRatio?: number;
  measuredLineRatio?: number;
}

export interface TreeLayoutMetrics {
  containerWidth: number;
  containerHeight: number;
  usableWidth: number;
  usableHeight: number;
  fittedWidth: number;
  fittedHeight: number;
  fontSize: number;
  cellW: number;
  cellH: number;
  cols: number;
  rows: number;
  treeScale: number;
  topScale: number;
  qrBoxSide: number;
  quality: TreeQualityTier;
}

/**
 * Compute responsive ASCII grid, font metrics, projection scales, and quality
 * tier from container bounds so the full tree (star + trunk) fits with padding.
 */
export function computeTreeLayout({
  containerWidth,
  containerHeight,
  measuredGlyphRatio = 0.6,
  measuredLineRatio = 1.15,
}: TreeLayoutInput): TreeLayoutMetrics {
  const safeW = Number.isFinite(containerWidth)
    ? Math.max(160, containerWidth)
    : 390;
  const safeH = Number.isFinite(containerHeight)
    ? Math.max(200, containerHeight)
    : 600;

  const glyphRatio = Number.isFinite(measuredGlyphRatio)
    ? Math.max(0.45, Math.min(0.85, measuredGlyphRatio))
    : 0.6;
  const lineRatio = Number.isFinite(measuredLineRatio)
    ? Math.max(1.0, Math.min(1.4, measuredLineRatio))
    : 1.15;

  const usableWidth = Math.max(80, safeW * (1 - TREE_STAGE_PADDING_RATIO * 2));
  const usableHeight = Math.max(
    100,
    safeH * (1 - TREE_STAGE_PADDING_RATIO * 2),
  );

  // Cone width:height ratio (~0.62): landscape is height-limited, portrait is width-limited.
  const fittedHeight = Math.min(usableHeight, usableWidth / TREE_ASPECT_RATIO);
  const fittedWidth = fittedHeight * TREE_ASPECT_RATIO;

  const rawFontSize = fittedHeight / (50 * lineRatio);
  const clampedFontSize = Math.max(
    TREE_MIN_FONT_SIZE,
    Math.min(TREE_MAX_FONT_SIZE, rawFontSize),
  );
  const fontSize = Math.round(clampedFontSize * 10) / 10;

  const cellW = Math.max(4, fontSize * glyphRatio);
  const cellH = Math.max(8, Math.round(fontSize * lineRatio));
  const cols = Math.max(1, Math.floor(safeW / cellW));
  const rows = Math.max(1, Math.floor(safeH / cellH));

  // Total 3D tree extent spans star apex (including multi-line glyph + halo) to ground trunk.
  const treeScale = Math.min(usableHeight / 11.4, usableWidth / 6.8);
  const topScale = Math.min(usableHeight, usableWidth) / 7.4;
  const qrBoxSide = Math.min(
    Math.max(150, usableHeight * 0.78),
    usableWidth * 0.86,
    360,
  );

  const area = safeW * safeH;
  const quality: TreeQualityTier =
    area < 240_000 ? "low" : area < 560_000 ? "medium" : "high";

  return {
    containerWidth: safeW,
    containerHeight: safeH,
    usableWidth,
    usableHeight,
    fittedWidth,
    fittedHeight,
    fontSize,
    cellW,
    cellH,
    cols,
    rows,
    treeScale,
    topScale,
    qrBoxSide,
    quality,
  };
}
