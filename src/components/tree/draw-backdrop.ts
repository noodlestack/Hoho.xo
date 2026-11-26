import type { TreeSceneryId } from "@/lib/tree-config";
import type { TreeTheme } from "@/lib/tree-themes";
import {
  getGlowSprite,
  type BackdropParticles,
  type Project3DFn,
} from "./canvas-types";

export interface DrawBackdropParams {
  cssW: number;
  cssH: number;
  freeWidth: number;
  stageCenterX: number;
  stageCenterY: number;
  isCompact: boolean;
  fontSize: number;
  fontFamily: string;
  tSec: number;
  qrMix: number;
  curReduced: boolean;
  curSnow: boolean;
  curScenery: TreeSceneryId;
  curTheme: TreeTheme;
  backdrop: BackdropParticles;
  starLimit: number;
  snowLimit: number;
}

export function drawBackdropParticles(
  ctx: CanvasRenderingContext2D,
  p: DrawBackdropParams,
): void {
  const {
    cssW,
    cssH,
    freeWidth,
    stageCenterX,
    isCompact,
    fontSize,
    fontFamily,
    tSec,
    qrMix,
    curReduced,
    curSnow,
    curScenery,
    curTheme,
    backdrop,
    starLimit,
    snowLimit,
  } = p;

  const sceneryFade = Math.max(0, 1 - qrMix / 0.52);

  // 1a. Scenery sky washes
  if (sceneryFade > 0.01) {
    if (curScenery === "aurora") {
      ctx.save();
      ctx.globalAlpha = 0.24 * sceneryFade;
      const wave1Y =
        cssH * 0.19 + (curReduced ? 0 : Math.sin(tSec * 0.45) * 14);
      const grad1 = ctx.createLinearGradient(0, wave1Y - 90, 0, wave1Y + 130);
      grad1.addColorStop(0, "rgba(76, 232, 192, 0)");
      grad1.addColorStop(0.45, "rgba(76, 232, 192, 0.42)");
      grad1.addColorStop(0.75, "rgba(179, 136, 255, 0.28)");
      grad1.addColorStop(1, "rgba(11, 13, 18, 0)");
      ctx.fillStyle = grad1;
      ctx.beginPath();
      ctx.moveTo(0, wave1Y + 90);
      for (let x = 0; x <= freeWidth + 40; x += Math.max(40, freeWidth / 6)) {
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

  // 1b. Twinkling stars
  const bgAlphaScale = 1 - qrMix * 0.65;
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

  // 1c. Falling snow / blizzard streaks / hearth rising embers
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
          : spark.x + Math.sin(tSec * spark.driftFreq + spark.phase) * 0.022;
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

        const maxFlakes = Math.min(snowLimit, backdrop.flakes.length);
        for (let i = 0; i < maxFlakes; i += 1) {
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
                Math.sin(tSec * flake.swayFreq + flake.phase) * flake.swayAmp) %
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
}

export function drawTreeGlowAndGround(
  ctx: CanvasRenderingContext2D,
  opts: {
    curTheme: TreeTheme;
    glowSpriteRef: {
      current: { themeId: string; canvas: HTMLCanvasElement } | null;
    };
    bloomIntensity: number;
    activeScale: number;
    stageCenterX: number;
    stageCenterY: number;
    topMix: number;
    project3D: Project3DFn;
  },
): HTMLCanvasElement | null {
  const {
    curTheme,
    glowSpriteRef,
    bloomIntensity,
    activeScale,
    stageCenterX,
    stageCenterY,
    topMix,
    project3D,
  } = opts;

  let cachedGlow = glowSpriteRef.current;
  if (!cachedGlow || cachedGlow.themeId !== curTheme.id) {
    const nextSprite = getGlowSprite(curTheme);
    if (nextSprite) {
      cachedGlow = { themeId: curTheme.id, canvas: nextSprite };
      glowSpriteRef.current = cachedGlow;
    }
  }

  if (bloomIntensity > 0.05) {
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

  return cachedGlow?.canvas ?? null;
}
