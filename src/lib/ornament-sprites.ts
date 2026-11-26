export const ORNAMENT_SPRITE_IDS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
] as const;

export type OrnamentSpriteId = (typeof ORNAMENT_SPRITE_IDS)[number];

const SPRITE_ID_SET = new Set<number>(ORNAMENT_SPRITE_IDS);
const MAX_SPRITE_CACHE_ENTRIES = 512;

export interface OrnamentSpriteOptions {
  typeId: number;
  color: string;
  radius: number;
  unread?: boolean;
  hovered?: boolean;
  dpr?: number;
}

interface CachedSprite {
  canvas: HTMLCanvasElement;
  logicalSize: number;
}

const spriteCache = new Map<string, CachedSprite>();

export function hasOrnamentSprite(typeId: number): boolean {
  return SPRITE_ID_SET.has(Math.trunc(typeId));
}

export function clearOrnamentSpriteCache(): void {
  spriteCache.clear();
}

export function getOrnamentSpriteCacheSize(): number {
  return spriteCache.size;
}

function normalizeSpriteId(typeId: number): OrnamentSpriteId {
  const n = Math.trunc(Number.isFinite(typeId) ? typeId : 0);
  const mod = ((n % 16) + 16) % 16;
  return mod as OrnamentSpriteId;
}

function drawFivePointStar(
  ctx: CanvasRenderingContext2D,
  outerR: number,
  innerR: number,
): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}

/**
 * Draws a crisp vector jewel ornament silhouette centered at (0, 0).
 * Never calls fillText so all 16 shapes render consistently across OS/fonts.
 */
export function drawOrnamentSilhouette(
  ctx: CanvasRenderingContext2D,
  typeId: number,
  radius: number,
  color: string,
): void {
  const id = normalizeSpriteId(typeId);
  const s = Math.max(3.5, radius);

  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  switch (id) {
    case 0: {
      // Bauble: gold/cream cap + hanging loop + round sphere + highlight
      ctx.strokeStyle = "rgba(247, 232, 184, 0.9)";
      ctx.lineWidth = Math.max(1, s * 0.11);
      ctx.beginPath();
      ctx.arc(0, -s * 0.78, s * 0.14, Math.PI, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#e8c46a";
      ctx.beginPath();
      ctx.rect(-s * 0.22, -s * 0.68, s * 0.44, s * 0.22);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, s * 0.14, s * 0.66, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.36)";
      ctx.beginPath();
      ctx.arc(-s * 0.22, -s * 0.06, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 1: {
      // Star: crisp 5-pointed star + warm center glint
      drawFivePointStar(ctx, s * 0.88, s * 0.38);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 252, 235, 0.45)";
      ctx.beginPath();
      ctx.arc(-s * 0.06, -s * 0.08, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 2: {
      // Candy cane: rounded J-hook with diagonal color accent bands
      ctx.strokeStyle = "#f7f3ea";
      ctx.lineWidth = Math.max(2, s * 0.32);
      ctx.beginPath();
      ctx.arc(-s * 0.05, -s * 0.32, s * 0.36, Math.PI, 0, false);
      ctx.lineTo(s * 0.31, s * 0.68);
      ctx.stroke();

      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.5, s * 0.22);
      ctx.beginPath();
      ctx.moveTo(-s * 0.38, -s * 0.38);
      ctx.lineTo(-s * 0.18, -s * 0.56);
      ctx.moveTo(s * 0.16, -s * 0.52);
      ctx.lineTo(s * 0.36, -s * 0.28);
      ctx.moveTo(s * 0.19, s * 0.06);
      ctx.lineTo(s * 0.41, s * 0.24);
      ctx.moveTo(s * 0.19, s * 0.46);
      ctx.lineTo(s * 0.41, s * 0.62);
      ctx.stroke();
      break;
    }

    case 3: {
      // Bell: flared dome + clapper + top ring
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.66);
      ctx.bezierCurveTo(
        -s * 0.46,
        -s * 0.62,
        -s * 0.46,
        s * 0.12,
        -s * 0.7,
        s * 0.42,
      );
      ctx.lineTo(s * 0.7, s * 0.42);
      ctx.bezierCurveTo(s * 0.46, s * 0.12, s * 0.46, -s * 0.62, 0, -s * 0.66);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#f5d77f";
      ctx.beginPath();
      ctx.arc(0, s * 0.6, s * 0.17, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#f5d77f";
      ctx.lineWidth = Math.max(1, s * 0.12);
      ctx.beginPath();
      ctx.arc(0, -s * 0.76, s * 0.12, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    case 4: {
      // Gift: wrapped box + contrasting cross ribbon + bow
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.rect(-s * 0.62, -s * 0.34, s * 1.24, s * 1.06);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 245, 214, 0.92)";
      ctx.beginPath();
      ctx.rect(-s * 0.12, -s * 0.34, s * 0.24, s * 1.06);
      ctx.rect(-s * 0.62, s * 0.08, s * 1.24, s * 0.22);
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 245, 214, 0.95)";
      ctx.lineWidth = Math.max(1.2, s * 0.14);
      ctx.beginPath();
      ctx.ellipse(
        -s * 0.24,
        -s * 0.52,
        s * 0.22,
        s * 0.14,
        -0.35,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(
        s * 0.24,
        -s * 0.52,
        s * 0.22,
        s * 0.14,
        0.35,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      break;
    }

    case 5: {
      // Snowflake: 6 symmetrical radial arms with V-tips
      ctx.lineWidth = Math.max(1.2, s * 0.14);
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(cos * s * 0.82, sin * s * 0.82);
        const bx = cos * s * 0.5;
        const by = sin * s * 0.5;
        const leftA = angle - 0.65;
        const rightA = angle + 0.65;
        ctx.moveTo(bx, by);
        ctx.lineTo(
          bx + Math.cos(leftA) * s * 0.26,
          by + Math.sin(leftA) * s * 0.26,
        );
        ctx.moveTo(bx, by);
        ctx.lineTo(
          bx + Math.cos(rightA) * s * 0.26,
          by + Math.sin(rightA) * s * 0.26,
        );
        ctx.stroke();
      }
      break;
    }

    case 6: {
      // Heart: balanced twin-lobe vector heart + glint
      ctx.beginPath();
      ctx.moveTo(0, s * 0.72);
      ctx.bezierCurveTo(
        -s * 0.92,
        s * 0.22,
        -s * 0.92,
        -s * 0.58,
        -s * 0.38,
        -s * 0.62,
      );
      ctx.bezierCurveTo(-s * 0.12, -s * 0.64, 0, -s * 0.36, 0, -s * 0.32);
      ctx.bezierCurveTo(0, -s * 0.36, s * 0.12, -s * 0.64, s * 0.38, -s * 0.62);
      ctx.bezierCurveTo(s * 0.92, -s * 0.58, s * 0.92, s * 0.22, 0, s * 0.72);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.beginPath();
      ctx.arc(-s * 0.34, -s * 0.24, s * 0.14, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 7: {
      // Lantern: hanging ring, cap, warm illuminated pane, plinth base
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.2, s * 0.12);
      ctx.beginPath();
      ctx.arc(0, -s * 0.74, s * 0.13, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-s * 0.44, -s * 0.42);
      ctx.lineTo(0, -s * 0.64);
      ctx.lineTo(s * 0.44, -s * 0.42);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(255, 232, 166, 0.92)";
      ctx.beginPath();
      ctx.rect(-s * 0.34, -s * 0.38, s * 0.68, s * 0.82);
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.2, s * 0.12);
      ctx.beginPath();
      ctx.rect(-s * 0.36, -s * 0.38, s * 0.72, s * 0.82);
      ctx.moveTo(0, -s * 0.38);
      ctx.lineTo(0, s * 0.44);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.rect(-s * 0.48, s * 0.46, s * 0.96, s * 0.18);
      ctx.fill();
      break;
    }

    case 8: {
      // Gingerbread cookie silhouette
      ctx.beginPath();
      ctx.arc(0, -s * 0.44, s * 0.28, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = Math.max(2, s * 0.26);
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, -s * 0.08);
      ctx.lineTo(s * 0.6, -s * 0.08);
      ctx.moveTo(0, -s * 0.22);
      ctx.lineTo(0, s * 0.32);
      ctx.moveTo(-s * 0.06, s * 0.28);
      ctx.lineTo(-s * 0.36, s * 0.68);
      ctx.moveTo(s * 0.06, s * 0.28);
      ctx.lineTo(s * 0.36, s * 0.68);
      ctx.stroke();

      ctx.fillStyle = "#fff8eb";
      ctx.beginPath();
      ctx.arc(-s * 0.09, -s * 0.48, s * 0.055, 0, Math.PI * 2);
      ctx.arc(s * 0.09, -s * 0.48, s * 0.055, 0, Math.PI * 2);
      ctx.arc(0, -s * 0.04, s * 0.065, 0, Math.PI * 2);
      ctx.arc(0, s * 0.16, s * 0.065, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 9: {
      // Stocking: L-boot silhouette + fluffy white cuff
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-s * 0.24, -s * 0.46);
      ctx.lineTo(s * 0.36, -s * 0.46);
      ctx.lineTo(s * 0.36, s * 0.26);
      ctx.bezierCurveTo(
        s * 0.36,
        s * 0.68,
        -s * 0.08,
        s * 0.72,
        -s * 0.56,
        s * 0.66,
      );
      ctx.bezierCurveTo(
        -s * 0.78,
        s * 0.62,
        -s * 0.76,
        s * 0.22,
        -s * 0.42,
        s * 0.22,
      );
      ctx.lineTo(-s * 0.24, s * 0.22);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#f7f3ea";
      ctx.beginPath();
      ctx.rect(-s * 0.32, -s * 0.68, s * 0.74, s * 0.26);
      ctx.fill();
      break;
    }

    case 10: {
      // Ribbon: swirled S-curve streamer
      ctx.lineWidth = Math.max(2, s * 0.26);
      ctx.beginPath();
      ctx.moveTo(-s * 0.56, -s * 0.56);
      ctx.bezierCurveTo(
        s * 0.56,
        -s * 0.52,
        -s * 0.56,
        s * 0.52,
        s * 0.56,
        s * 0.56,
      );
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
      ctx.lineWidth = Math.max(1, s * 0.08);
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, -s * 0.56);
      ctx.bezierCurveTo(
        s * 0.5,
        -s * 0.52,
        -s * 0.5,
        s * 0.52,
        s * 0.5,
        s * 0.56,
      );
      ctx.stroke();
      break;
    }

    case 11: {
      // Wreath: lush circular ring + berry cluster accent
      ctx.lineWidth = Math.max(2.4, s * 0.36);
      ctx.beginPath();
      ctx.arc(0, s * 0.06, s * 0.52, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#e5484d";
      ctx.beginPath();
      ctx.arc(-s * 0.11, -s * 0.48, s * 0.11, 0, Math.PI * 2);
      ctx.arc(s * 0.11, -s * 0.48, s * 0.11, 0, Math.PI * 2);
      ctx.arc(0, -s * 0.36, s * 0.11, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 12: {
      // Moon: luminous crescent
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.72, -Math.PI * 0.42, Math.PI * 0.42, false);
      ctx.bezierCurveTo(
        s * 0.34,
        s * 0.24,
        s * 0.34,
        -s * 0.24,
        Math.cos(-Math.PI * 0.42) * s * 0.72,
        Math.sin(-Math.PI * 0.42) * s * 0.72,
      );
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.arc(s * 0.12, 0, s * 0.7, Math.PI * 0.55, -Math.PI * 0.55, false);
      ctx.bezierCurveTo(
        s * 0.38,
        -s * 0.42,
        s * 0.38,
        s * 0.42,
        Math.cos(Math.PI * 0.55) * s * 0.7,
        Math.sin(Math.PI * 0.55) * s * 0.7,
      );
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 13: {
      // Angel: halo + head + twin wings + flared robe
      ctx.strokeStyle = "#f5d77f";
      ctx.lineWidth = Math.max(1, s * 0.1);
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.76, s * 0.24, s * 0.08, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.beginPath();
      ctx.moveTo(-s * 0.1, -s * 0.2);
      ctx.quadraticCurveTo(-s * 0.88, -s * 0.42, -s * 0.62, s * 0.14);
      ctx.closePath();
      ctx.moveTo(s * 0.1, -s * 0.2);
      ctx.quadraticCurveTo(s * 0.88, -s * 0.42, s * 0.62, s * 0.14);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, -s * 0.44, s * 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, -s * 0.26);
      ctx.lineTo(-s * 0.46, s * 0.68);
      ctx.lineTo(s * 0.46, s * 0.68);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 14: {
      // Candle: wax pillar + saucer + warm teardrop flame
      ctx.fillStyle = "#ffe58a";
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.82);
      ctx.bezierCurveTo(s * 0.26, -s * 0.48, s * 0.22, -s * 0.26, 0, -s * 0.24);
      ctx.bezierCurveTo(
        -s * 0.22,
        -s * 0.26,
        -s * 0.26,
        -s * 0.48,
        0,
        -s * 0.82,
      );
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.rect(-s * 0.26, -s * 0.14, s * 0.52, s * 0.72);
      ctx.fill();

      ctx.fillStyle = "#e8c46a";
      ctx.beginPath();
      ctx.rect(-s * 0.46, s * 0.56, s * 0.92, s * 0.16);
      ctx.fill();
      break;
    }

    case 15: {
      // Bow: twin rounded ribbon loops + knot + tails
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.06);
      ctx.bezierCurveTo(-s * 0.76, -s * 0.56, -s * 0.84, s * 0.24, 0, s * 0.06);
      ctx.bezierCurveTo(s * 0.84, s * 0.24, s * 0.76, -s * 0.56, 0, -s * 0.06);
      ctx.closePath();
      ctx.fill();

      ctx.lineWidth = Math.max(1.5, s * 0.2);
      ctx.beginPath();
      ctx.moveTo(-s * 0.08, s * 0.06);
      ctx.lineTo(-s * 0.44, s * 0.68);
      ctx.moveTo(s * 0.08, s * 0.06);
      ctx.lineTo(s * 0.44, s * 0.68);
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 248, 224, 0.9)";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

/**
 * Returns a cached DPR-aware offscreen canvas containing the luminous
 * ornament jewel badge (soft halo, dark disk, gold/tinted rim, unread bow,
 * crisp vector silhouette, and specular highlight).
 */
export function getOrnamentSpriteCanvas(
  options: OrnamentSpriteOptions,
): CachedSprite | null {
  if (typeof document === "undefined") {
    return null;
  }

  const radius = Math.max(6, Math.round(options.radius));
  const dpr = Math.min(2, Math.max(1, options.dpr ?? 1));
  const unread = Boolean(options.unread);
  const hovered = Boolean(options.hovered);
  const id = normalizeSpriteId(options.typeId);
  const key = `${id}|${options.color}|${radius}|${unread ? 1 : 0}|${hovered ? 1 : 0}|${dpr}`;

  const hit = spriteCache.get(key);
  if (hit) {
    return hit;
  }

  const haloPad =
    Math.ceil(radius * (hovered ? 0.95 : unread ? 0.8 : 0.65)) + 3;
  const logicalSize = (radius + haloPad) * 2;
  const half = logicalSize / 2;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(logicalSize * dpr));
  canvas.height = Math.max(1, Math.round(logicalSize * dpr));

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  ctx.scale(dpr, dpr);

  // 1. Soft radial outer glow (stronger for hovered or unread)
  const glowR = radius * (hovered ? 1.85 : unread ? 1.7 : 1.48);
  const glow = ctx.createRadialGradient(
    half,
    half,
    radius * 0.25,
    half,
    half,
    glowR,
  );
  glow.addColorStop(
    0,
    hovered ? "rgba(255, 250, 232, 0.42)" : "rgba(255, 245, 210, 0.24)",
  );
  glow.addColorStop(
    0.55,
    unread ? "rgba(245, 196, 81, 0.28)" : "rgba(255, 255, 255, 0.08)",
  );
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(half, half, glowR, 0, Math.PI * 2);
  ctx.fill();

  // 2. Dark jewel backing disk
  const diskGrad = ctx.createRadialGradient(
    half - radius * 0.26,
    half - radius * 0.28,
    radius * 0.1,
    half,
    half,
    radius,
  );
  diskGrad.addColorStop(0, "#1c2734");
  diskGrad.addColorStop(1, "#0a1017");
  ctx.fillStyle = diskGrad;
  ctx.beginPath();
  ctx.arc(half, half, radius, 0, Math.PI * 2);
  ctx.fill();

  // 3. Rim ring: warm gold when unread, bright jewel border otherwise
  ctx.strokeStyle = unread
    ? "#f5c451"
    : hovered
      ? "rgba(255, 252, 240, 0.85)"
      : "rgba(255, 255, 255, 0.34)";
  ctx.lineWidth = unread || hovered ? 1.5 : 1.05;
  ctx.beginPath();
  ctx.arc(half, half, radius - 0.5, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Unread ribbon crown at the top edge
  if (unread) {
    ctx.save();
    ctx.translate(half, half - radius);
    ctx.fillStyle = "#f5c451";
    ctx.beginPath();
    ctx.ellipse(-2.5, -1.2, 2.5, 1.35, -0.35, 0, Math.PI * 2);
    ctx.ellipse(2.5, -1.2, 2.5, 1.35, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -1, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 5. Crisp vector silhouette
  ctx.save();
  ctx.translate(half, half);
  drawOrnamentSilhouette(ctx, id, radius * 0.62, options.color);
  ctx.restore();

  // 6. Subtle top-left glass specular highlight
  ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
  ctx.lineWidth = Math.max(0.9, radius * 0.09);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(half, half, radius * 0.78, Math.PI * 1.16, Math.PI * 1.44);
  ctx.stroke();

  if (spriteCache.size >= MAX_SPRITE_CACHE_ENTRIES) {
    const oldestKey = spriteCache.keys().next().value;
    if (oldestKey !== undefined) {
      spriteCache.delete(oldestKey);
    }
  }

  const entry: CachedSprite = { canvas, logicalSize };
  spriteCache.set(key, entry);
  return entry;
}
