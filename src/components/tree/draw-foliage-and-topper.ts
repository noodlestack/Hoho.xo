import {
  TREE_BASE_RADIUS,
  TREE_HEIGHT,
  type TreeCloudPoint,
} from "@/lib/qr-tree";
import type { TreeShapeId, TreeTopperId } from "@/lib/tree-config";
import type { TreeTheme } from "@/lib/tree-themes";
import { quadEaseInOut, type Project3DFn } from "./canvas-types";

export interface DrawFoliageParams {
  curCloud: TreeCloudPoint[];
  curTheme: TreeTheme;
  curTopper: TreeTopperId;
  curShape: TreeShapeId;
  curReduced: boolean;
  curShowGarland: boolean;
  curSupporter: boolean;
  qrMix: number;
  targetQrMix: number;
  fromQrMix: number;
  inTransition: boolean;
  isQrMorph: boolean;
  qrElapsedSec: number;
  tSec: number;
  cosY: number;
  sinY: number;
  topMix: number;
  isCompact: boolean;
  activeScale: number;
  activeTier: "high" | "medium" | "low";
  fontSize: number;
  cellW: number;
  cellH: number;
  cols: number;
  rows: number;
  fontFamily: string;
  grow: { foliage: number; garland: number; lights: number; starScale: number };
  activeGlowCanvas: HTMLCanvasElement | null;
  zBuf: Float32Array;
  glyphBuf: string[];
  colorBuf: string[];
  alphaBuf: Float32Array;
  project3D: Project3DFn;
}

export function drawFoliageAndTopper(
  ctx: CanvasRenderingContext2D,
  p: DrawFoliageParams,
): void {
  const {
    curCloud,
    curTheme,
    curTopper,
    curShape,
    curReduced,
    curShowGarland,
    curSupporter,
    qrMix,
    targetQrMix,
    fromQrMix,
    inTransition,
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
    grow,
    activeGlowCanvas,
    zBuf,
    glyphBuf,
    colorBuf,
    alphaBuf,
    project3D,
  } = p;

  const glyphAlpha = Math.max(0, 1 - qrMix * 1.35);
  if (glyphAlpha <= 0.02) return;

  const cellTotal = cols * rows;
  const ramp = curTheme.glyphRamp;
  const swirlPeak = Math.sin(qrMix * Math.PI) * 0.52;
  const lightYaw = curReduced ? -0.58 : -0.58 + tSec * ((Math.PI * 2) / 24);
  const lightDirX = Math.sin(lightYaw);
  const lightDirZ = Math.cos(lightYaw);
  const windWave = curReduced ? 0 : Math.sin(tSec * 0.7) * (1 - qrMix);
  const brightLightHalos: Array<{
    x: number;
    y: number;
    color: string;
    alpha: number;
  }> = [];
  let lightPassCount = 0;
  const maxSparseLights = Math.floor(curCloud.length * 0.07);

  const morphingToQr = targetQrMix > fromQrMix;
  const useRadialWave = inTransition && isQrMorph && !curReduced;

  for (let i = 0; i < curCloud.length; i += 1) {
    const pt = curCloud[i];
    if (pt.kind !== "ground" && grow.foliage < 0.999) {
      if (pt.y > TREE_HEIGHT * grow.foliage) continue;
    }

    let ptQrMix = qrMix;
    if (useRadialWave) {
      const normRad = Math.min(1, Math.max(0, pt.qrRadius / 1.414));
      const delay = morphingToQr ? normRad * 0.45 : (1 - normRad) * 0.45;
      const localT = Math.max(0, Math.min(1, (qrElapsedSec - delay) / 0.7));
      const easedLocal = quadEaseInOut(localT);
      ptQrMix = fromQrMix + (targetQrMix - fromQrMix) * easedLocal;
    }

    const swayX =
      pt.kind === "ground"
        ? 0
        : Math.pow(Math.max(0, pt.y), 1.5) * 0.008 * windWave;
    let px =
      (pt.x + swayX) * (1 - ptQrMix) + pt.qrX * TREE_BASE_RADIUS * ptQrMix;
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
      if (lightAlpha > 0.02) {
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
        if (pulse > 0.88 && qrMix < 0.2 && dz > -0.5) {
          brightLightHalos.push({
            x: (col + 0.5) * cellW,
            y: (row + 0.5) * cellH,
            color: lColor,
            alpha: (pulse - 0.85) * 2.2 * glyphAlpha * lightAlpha,
          });
        }
      }
    } else {
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

  // Helical garland curve
  if (curShowGarland && qrMix < 0.45) {
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
        gx * (1 - qrMix),
        y * (1 - qrMix),
        gz * (1 - qrMix),
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

  if (brightLightHalos.length > 0 && activeGlowCanvas && activeTier !== "low") {
    const lightGlowSize = activeScale * 0.85;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < brightLightHalos.length; i += 1) {
      const h = brightLightHalos[i];
      ctx.globalAlpha = Math.min(0.24, h.alpha * 0.3);
      ctx.drawImage(
        activeGlowCanvas,
        h.x - lightGlowSize * 0.5,
        h.y - lightGlowSize * 0.5,
        lightGlowSize,
        lightGlowSize,
      );
    }
    ctx.restore();
  }

  const colorBuckets = new Map<string, number[]>();
  for (let idx = 0; idx < cellTotal; idx += 1) {
    if (zBuf[idx] === -Infinity) continue;
    const color = colorBuf[idx];
    let bucket = colorBuckets.get(color);
    if (!bucket) {
      bucket = [];
      colorBuckets.set(color, bucket);
    }
    bucket.push(idx);
  }

  ctx.font = `600 ${fontSize}px ${fontFamily}`;
  let lastAlpha = -1;
  colorBuckets.forEach((indices, color) => {
    ctx.fillStyle = color;
    for (let b = 0; b < indices.length; b += 1) {
      const idx = indices[b];
      const quantizedAlpha = Math.round(alphaBuf[idx] * 25) * 0.04;
      if (quantizedAlpha !== lastAlpha) {
        lastAlpha = quantizedAlpha;
        ctx.globalAlpha = quantizedAlpha;
      }
      const col = idx % cols;
      const row = (idx / cols) | 0;
      ctx.fillText(
        glyphBuf[idx],
        Math.round((col + 0.5) * cellW),
        Math.round((row + 0.5) * cellH),
      );
    }
  });
  ctx.globalAlpha = 1;

  // 4. Apex topper
  if (grow.starScale <= 0.02) return;
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

  drawTopperShape(
    ctx,
    curTopper,
    apex,
    step,
    starRadiusPx,
    fontSize,
    fontFamily,
    curTheme.star,
  );

  if (curSupporter) {
    ctx.save();
    ctx.globalAlpha *= 0.68;
    ctx.strokeStyle = "#F5C451";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(
      apex.sx,
      apex.sy - fontSize * 0.2,
      starRadiusPx * 1.62,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawTopperShape(
  ctx: CanvasRenderingContext2D,
  curTopper: TreeTopperId,
  apex: { sx: number; sy: number },
  step: number,
  starRadiusPx: number,
  fontSize: number,
  fontFamily: string,
  starColor: string,
): void {
  if (curTopper === "diamond") {
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        const manhattan = Math.abs(dx) * 1.15 + Math.abs(dy) * 0.85;
        if (manhattan <= 2.15) {
          const g = manhattan < 0.8 ? "@" : dx === 0 || dy === 0 ? "+" : "*";
          ctx.fillText(g, apex.sx + dx * step, apex.sy + dy * step * 1.1);
        }
      }
    }
    return;
  }
  if (curTopper === "snowflake") {
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        const onAxis = dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy);
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
          ctx.fillText(g, apex.sx + dx * step, apex.sy + dy * step * 1.1);
        }
      }
    }
    return;
  }
  const grids: Partial<Record<TreeTopperId, string[]>> = {
    heart: ["oo oo", "@@@@@", "#####", " *** ", "  v  "],
    crown: ["^ * ^", "|#|#|", "@@@@@", "====="],
    ribbon: ["~~ ~~", ">>@<<", " / \\ ", "/   \\"],
  };
  const customGrid = grids[curTopper];
  if (customGrid) {
    if (curTopper === "ribbon") ctx.fillStyle = "#FF8FB1";
    const rowMid = curTopper === "heart" ? 2 : 1.5;
    for (let r = 0; r < customGrid.length; r += 1) {
      for (let c = 0; c < customGrid[r].length; c += 1) {
        const ch = customGrid[r][c];
        if (ch === " ") continue;
        ctx.fillText(
          ch,
          apex.sx + (c - 2) * step,
          apex.sy + (r - rowMid) * step * 1.1,
        );
      }
    }
    return;
  }

  const starX = apex.sx;
  const starY = apex.sy - fontSize * 0.25;
  const outerR = starRadiusPx * 1.02;
  const innerR = starRadiusPx * 0.43;
  const rayLen = outerR * 1.65;

  ctx.save();
  ctx.globalAlpha *= 0.55;
  ctx.strokeStyle = starColor;
  ctx.lineWidth = Math.max(1.2, outerR * 0.11);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(starX - rayLen, starY);
  ctx.lineTo(starX + rayLen, starY);
  ctx.moveTo(starX, starY - rayLen);
  ctx.lineTo(starX, starY + rayLen);
  ctx.stroke();
  ctx.restore();

  const coreGrad = ctx.createRadialGradient(
    starX,
    starY,
    innerR * 0.15,
    starX,
    starY,
    outerR,
  );
  coreGrad.addColorStop(0, "#FFFDF2");
  coreGrad.addColorStop(0.55, starColor);
  coreGrad.addColorStop(1, "#D99B26");

  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = starX + Math.cos(angle) * r;
    const py = starY + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  ctx.beginPath();
  ctx.arc(starX, starY, innerR * 0.34, 0, Math.PI * 2);
  ctx.fill();

  const glintOffset = outerR * 1.12;
  ctx.font = `700 ${Math.max(7, Math.round(fontSize * 0.78))}px ${fontFamily}`;
  ctx.fillStyle = starColor;
  ctx.fillText("*", starX - glintOffset, starY - glintOffset * 0.55);
  ctx.fillText("+", starX + glintOffset, starY - glintOffset * 0.45);
  ctx.fillText("+", starX - glintOffset * 0.85, starY + glintOffset * 0.65);
  ctx.fillText("*", starX + glintOffset * 0.85, starY + glintOffset * 0.65);
}
