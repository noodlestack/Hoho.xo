import QRCode from "qrcode";
import { loadCanvasFont } from "./canvas-font";
import type { TreeMessage } from "./messages";
import { drawOrnamentSilhouette } from "./ornament-sprites";
import { createExportHolidayAudioTrack } from "./sound";
import type { TreeConfig } from "./tree-config";
import { ORNAMENT_COLORS, ORNAMENT_TYPES, type TreeTheme } from "./tree-themes";

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number | [number, number, number, number],
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

/**
 * Renders an Ultra-HD (default 2400px wide) high-contrast QR card.
 * Dark modules on a warm ivory quiet-zone plate guarantee instant scanning on iOS & Android cameras,
 * encoding the direct `/t/<handle>` visitor messaging URL.
 */
export async function renderThemedQrDataUrl(
  value: string,
  theme: TreeTheme,
  sizePx = 2400,
  handle = "noodlestack",
): Promise<string> {
  const [sansFont, monoFont] = await Promise.all([
    loadCanvasFont(700, 48, "--font-sans", "system-ui, sans-serif"),
    loadCanvasFont(600, 40, "--font-mono", "monospace"),
  ]);

  const { modules } = QRCode.create(value, { errorCorrectionLevel: "H" });
  const n = modules.size;
  const quiet = 4;
  const total = n + quiet * 2;
  const footerPx = Math.round(sizePx * 0.18);
  const totalH = sizePx + footerPx;

  const canvas = document.createElement("canvas");
  canvas.width = sizePx;
  canvas.height = totalH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // High-contrast warm ivory plate with strict 4-module quiet zone
  ctx.fillStyle = "#FAF6EE";
  ctx.fillRect(0, 0, sizePx, sizePx);

  // Deep night footer band strictly below the 4-module quiet zone
  ctx.fillStyle = "#0F141F";
  ctx.fillRect(0, sizePx, sizePx, footerPx);

  const borderW = Math.max(8, Math.round(sizePx * 0.008));
  ctx.strokeStyle = theme.swatch;
  ctx.lineWidth = borderW;
  ctx.strokeRect(borderW / 2, borderW / 2, sizePx - borderW, totalH - borderW);

  const cell = sizePx / total;
  const isFinderCell = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (!modules.data[r * n + c]) continue;
      ctx.fillStyle = isFinderCell(r, c) ? "#0B1320" : "#111827";
      const x = Math.floor((c + quiet) * cell);
      const y = Math.floor((r + quiet) * cell);
      const w = Math.ceil((c + quiet + 1) * cell) - x;
      const h = Math.ceil((r + quiet + 1) * cell) - y;
      ctx.fillRect(x, y, w, h);
    }
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = theme.swatch;
  ctx.font = `700 ${Math.round(sizePx * 0.036)}px ${sansFont}`;
  ctx.fillText(
    `Send a Holiday Letter to @${handle}`.slice(0, 40),
    sizePx / 2,
    sizePx + footerPx * 0.36,
  );

  const cleanDisplayUrl = value.replace(/^https?:\/\//i, "").slice(0, 52);
  ctx.fillStyle = "#D6D1C7";
  ctx.font = `600 ${Math.round(sizePx * 0.024)}px ${monoFont}`;
  ctx.fillText(cleanDisplayUrl, sizePx / 2, sizePx + footerPx * 0.72);

  return canvas.toDataURL("image/png");
}

export async function downloadThemedQrPng(
  value: string,
  theme: TreeTheme,
  handle = "noodlestack",
): Promise<boolean> {
  try {
    const dataUrl = await renderThemedQrDataUrl(value, theme, 2400, handle);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `hoho-xo-${handle}-${theme.id}-qr-uhd.png`;
    link.click();
    return true;
  } catch {
    return false;
  }
}

const ASCII_MOTIF = [
  "          *          ",
  "         /+\\         ",
  "        * . +        ",
  "       /+ x .\\       ",
  "      . + * x +      ",
  "     / x . + . \\     ",
  "    + * x . + x *    ",
  "   / . + x * . + \\   ",
  "  x + * . + x * . x  ",
  "         |||         ",
];

function wrapParagraphs(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = words[0];
    for (let i = 1; i < words.length; i += 1) {
      const next = `${current} ${words[i]}`;
      if (ctx.measureText(next).width <= maxWidth) {
        current = next;
      } else {
        lines.push(current);
        current = words[i];
      }
    }
    lines.push(current);
  }
  return lines;
}

export type StoryVibe = "night" | "pine" | "ember" | "blush";
export type InviteTemplateId =
  | "qr-forward"
  | "big-prompt"
  | "minimal"
  | "polaroid"
  | "receipt"
  | "sticker-note";

export type StoryAspectId = "story" | "portrait" | "square";

export const STORY_ASPECT_FORMATS: ReadonlyArray<{
  id: StoryAspectId;
  label: string;
  width: number;
  height: number;
  exportWidth: number;
  exportHeight: number;
}> = [
  {
    id: "story",
    label: "9:16 Story (4K)",
    width: 1080,
    height: 1920,
    exportWidth: 2160,
    exportHeight: 3840,
  },
  {
    id: "portrait",
    label: "4:5 Post (UHD)",
    width: 1080,
    height: 1350,
    exportWidth: 2160,
    exportHeight: 2700,
  },
  {
    id: "square",
    label: "1:1 Square (UHD)",
    width: 1080,
    height: 1080,
    exportWidth: 2160,
    exportHeight: 2160,
  },
];

export const INVITE_TEMPLATES: ReadonlyArray<{
  id: InviteTemplateId;
  label: string;
  caption: string;
}> = [
  { id: "qr-forward", label: "QR Forward", caption: "Scannable QR + prompt" },
  { id: "big-prompt", label: "Big Prompt", caption: "Editorial headline" },
  { id: "minimal", label: "Minimal", caption: "Quiet luxury card" },
  { id: "polaroid", label: "Polaroid", caption: "Instant holiday snapshot" },
  { id: "receipt", label: "Post Slip", caption: "North Pole dispatch" },
  { id: "sticker-note", label: "Stationery", caption: "Handwritten note" },
];

export const STORY_REPLY_MAX_LENGTH = 140;

export function clampStoryReply(reply?: string): string {
  return (reply ?? "").trim().slice(0, STORY_REPLY_MAX_LENGTH);
}

export async function shareOrDownloadPngDataUrl(
  dataUrl: string,
  filename: string,
  title: string,
  text?: string,
): Promise<"shared" | "downloaded" | "failed"> {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function"
  ) {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
          ...(text ? { text } : {}),
        });
        return "shared";
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return "failed";
      }
    }
  }

  try {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    link.click();
    return "downloaded";
  } catch {
    return "failed";
  }
}

export interface StoryCardOptions {
  displayName?: string;
  prompt?: string;
  reply?: string;
  vibe?: StoryVibe;
  supersample?: 1 | 2;
}

const STORY_VIBE_PALETTES: Record<
  StoryVibe,
  { bg: string; glow: string; accent: string; seal: string; ascii: string }
> = {
  night: {
    bg: "#0B0E17",
    glow: "rgba(245, 196, 81, 0.22)",
    accent: "#F5C451",
    seal: "#B83238",
    ascii: "#5BD18B",
  },
  pine: {
    bg: "#091712",
    glow: "rgba(91, 209, 139, 0.26)",
    accent: "#5BD18B",
    seal: "#B83238",
    ascii: "#7EF0B4",
  },
  ember: {
    bg: "#170D0C",
    glow: "rgba(255, 159, 67, 0.25)",
    accent: "#FF9F43",
    seal: "#9E2A2B",
    ascii: "#FFB86B",
  },
  blush: {
    bg: "#160D15",
    glow: "rgba(255, 143, 177, 0.25)",
    accent: "#FF8FB1",
    seal: "#A63A64",
    ascii: "#FFACD0",
  },
};

function drawHighContrastQrBadge(
  ctx: CanvasRenderingContext2D,
  url: string,
  centerX: number,
  topY: number,
  boxSize: number,
  borderColor: string,
) {
  const { modules } = QRCode.create(url, { errorCorrectionLevel: "M" });
  const n = modules.size;
  const quiet = 4;
  const qrX = centerX - boxSize / 2;
  const cell = boxSize / (n + quiet * 2);

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = "#FAF6EE";
  drawRoundedRect(ctx, qrX, topY, boxSize, boxSize, 20);
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  const isFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (!modules.data[r * n + c]) continue;
      ctx.fillStyle = isFinder(r, c) ? "#0B1320" : "#111827";
      const x = Math.floor(qrX + (c + quiet) * cell);
      const y = Math.floor(topY + (r + quiet) * cell);
      const w = Math.ceil(qrX + (c + quiet + 1) * cell) - x;
      const h = Math.ceil(topY + (r + quiet + 1) * cell) - y;
      ctx.fillRect(x, y, w, h);
    }
  }
  ctx.restore();
}

function drawAirmailStripeBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.save();
  drawRoundedRect(ctx, x, y, w, h, 4);
  ctx.clip();
  const stripeW = 24;
  const colors = ["#C53B41", "#FAF5EB", "#2A6D50", "#FAF5EB"];
  for (let i = -2; i < Math.ceil(w / stripeW) + 2; i += 1) {
    ctx.fillStyle =
      colors[((i % colors.length) + colors.length) % colors.length];
    ctx.beginPath();
    ctx.moveTo(x + i * stripeW, y + h);
    ctx.lineTo(x + i * stripeW + 10, y);
    ctx.lineTo(x + (i + 1) * stripeW + 10, y);
    ctx.lineTo(x + (i + 1) * stripeW, y + h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Renders a 4K Ultra-HD (2160×3840) Holiday Stationery Letter & Opened Envelope Story Card
 * with an embedded high-contrast QR badge pointing directly to `treeUrl`.
 */
export async function renderStoryCardDataUrl(
  message: TreeMessage,
  treeUrl: string,
  options: StoryCardOptions = {},
): Promise<string> {
  const [sansFont, monoFont, displayFont, handFont] = await Promise.all([
    loadCanvasFont(700, 36, "--font-sans", "system-ui, sans-serif"),
    loadCanvasFont(600, 28, "--font-mono", "monospace"),
    loadCanvasFont(400, 56, "--font-display", "Georgia, serif"),
    loadCanvasFont(600, 48, "--font-handwriting", "Georgia, cursive"),
  ]);

  const scale = options.supersample ?? 2;
  const width = 1080;
  const height = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const vibe = STORY_VIBE_PALETTES[options.vibe ?? "night"];
  const ornament = ORNAMENT_TYPES[message.ornamentType] ?? ORNAMENT_TYPES[0];
  const ornamentColor =
    ORNAMENT_COLORS[message.colorIdx % ORNAMENT_COLORS.length] ?? vibe.accent;
  const recipientName = options.displayName?.trim() || "My Holiday Tree";
  const clampedReply = clampStoryReply(options.reply);
  const hasReply = Boolean(clampedReply);

  // Rich atmospheric backdrop
  ctx.fillStyle = vibe.bg;
  ctx.fillRect(0, 0, width, height);

  const grad = ctx.createRadialGradient(
    width * 0.5,
    height * 0.34,
    40,
    width * 0.5,
    height * 0.34,
    860,
  );
  grad.addColorStop(0, vibe.glow);
  grad.addColorStop(1, "rgba(11, 13, 18, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Outer luxury frame
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = 2.5;
  drawRoundedRect(ctx, 44, 44, width - 88, height - 88, 44);
  ctx.stroke();

  // Top Header
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = vibe.accent;
  ctx.font = `700 26px ${sansFont}`;
  ctx.fillText("✦  NORTH POLE HOLIDAY POST  ✦", width / 2, 128);

  if (options.prompt?.trim()) {
    ctx.fillStyle = "#E4DFD5";
    ctx.font = `400 34px ${displayFont}`;
    const promptLines = wrapParagraphs(
      ctx,
      `“${options.prompt.trim()}”`,
      width - 220,
    ).slice(0, 2);
    promptLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, 182 + idx * 40);
    });
  }

  // Opened Envelope Backing behind the Stationery Sheet
  const paperX = 96;
  const paperY = 268;
  const paperW = width - 192;
  const paperH = hasReply ? 820 : 980;

  ctx.save();
  ctx.fillStyle = "#202737";
  drawRoundedRect(ctx, paperX - 18, paperY + 80, paperW + 36, paperH - 36, 30);
  ctx.fill();
  ctx.strokeStyle = "rgba(245, 196, 81, 0.32)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Warm Cream Holiday Stationery Letter Sheet
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.48)";
  ctx.shadowBlur = 42;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = "#FAF5EB";
  drawRoundedRect(ctx, paperX, paperY, paperW, paperH, 28);
  ctx.fill();
  ctx.restore();

  drawAirmailStripeBar(ctx, paperX + 28, paperY + 22, paperW - 56, 10);
  drawAirmailStripeBar(ctx, paperX + 28, paperY + paperH - 32, paperW - 56, 10);

  // Postage Stamp in top-right of letter
  const stampSize = 96;
  const stampX = paperX + paperW - stampSize - 42;
  const stampY = paperY + 54;
  ctx.save();
  ctx.fillStyle = "#141925";
  drawRoundedRect(ctx, stampX, stampY, stampSize, stampSize, 16);
  ctx.fill();
  ctx.strokeStyle = ornamentColor;
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.translate(stampX + stampSize / 2, stampY + stampSize / 2 - 8);
  drawOrnamentSilhouette(ctx, message.ornamentType, 22, ornamentColor);
  ctx.restore();

  ctx.fillStyle = "#FAF5EB";
  ctx.font = `700 16px ${monoFont}`;
  ctx.textAlign = "center";
  ctx.fillText(
    `#${message.seq}`,
    stampX + stampSize / 2,
    stampY + stampSize - 16,
  );

  // Salutation
  ctx.textAlign = "left";
  ctx.fillStyle = "#6E6559";
  ctx.font = `700 20px ${monoFont}`;
  ctx.fillText(
    `${ornament.name.toUpperCase()} ORNAMENT LETTER`,
    paperX + 52,
    paperY + 76,
  );

  ctx.fillStyle = "#1C202B";
  ctx.font = `600 42px ${handFont}`;
  ctx.fillText(`Dear ${recipientName},`, paperX + 52, paperY + 128);

  // Subtle stationery ruled lines
  ctx.strokeStyle = "rgba(28, 32, 43, 0.07)";
  ctx.lineWidth = 1.5;
  for (let ry = paperY + 200; ry < paperY + paperH - 110; ry += 62) {
    ctx.beginPath();
    ctx.moveTo(paperX + 52, ry);
    ctx.lineTo(paperX + paperW - 52, ry);
    ctx.stroke();
  }

  // Adaptive Letter Body Typography
  const textLen = message.body.length;
  const fontSize = hasReply
    ? textLen > 300
      ? 34
      : textLen > 160
        ? 42
        : 50
    : textLen > 320
      ? 38
      : textLen > 170
        ? 46
        : 56;
  const lineHeight = Math.round(fontSize * 1.34);

  ctx.fillStyle = "#181B24";
  ctx.font = `400 ${fontSize}px ${displayFont}`;
  ctx.textBaseline = "top";
  const bodyLines = wrapParagraphs(ctx, message.body, paperW - 108);
  const bodyAreaTop = paperY + 182;
  const bodyAreaBottom = paperY + paperH - 124;
  let cursorY = bodyAreaTop;
  for (const line of bodyLines) {
    if (cursorY + lineHeight > bodyAreaBottom) break;
    ctx.fillText(line, paperX + 54, cursorY);
    cursorY += lineHeight;
  }

  // Sign-off + Wax Seal
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = "#5B5347";
  ctx.font = `600 36px ${handFont}`;
  ctx.fillText(
    "Warmly, A Secret Holiday Friend",
    paperX + 54,
    paperY + paperH - 72,
  );

  const sealX = paperX + paperW - 86;
  const sealY = paperY + paperH - 74;
  ctx.save();
  ctx.fillStyle = vibe.seal;
  ctx.beginPath();
  ctx.arc(sealX, sealY, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#F5C451";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.translate(sealX, sealY);
  drawOrnamentSilhouette(ctx, message.ornamentType, 14, "#FAF5EB");
  ctx.restore();

  // Optional Owner Reply Card
  if (hasReply) {
    const replyY = paperY + paperH + 28;
    const replyH = 210;
    ctx.fillStyle = "rgba(18, 23, 34, 0.95)";
    drawRoundedRect(ctx, paperX, replyY, paperW, replyH, 26);
    ctx.fill();
    ctx.strokeStyle = vibe.accent;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = vibe.accent;
    ctx.font = `700 21px ${sansFont}`;
    ctx.fillText(
      `${recipientName.toUpperCase()}'S REPLY`,
      width / 2,
      replyY + 40,
    );

    ctx.fillStyle = "#F6F2E9";
    ctx.font = `400 38px ${displayFont}`;
    const replyLines = wrapParagraphs(ctx, clampedReply, paperW - 96).slice(
      0,
      3,
    );
    replyLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, replyY + 92 + idx * 44);
    });
  }

  // Bottom Scannable QR Call-to-Action Footer
  const footerTopY = 1560;
  const qrSize = 196;
  drawHighContrastQrBadge(ctx, treeUrl, 220, footerTopY, qrSize, vibe.accent);

  ctx.textAlign = "left";
  ctx.fillStyle = vibe.accent;
  ctx.font = `700 28px ${sansFont}`;
  ctx.fillText("Send me an anonymous letter", 350, footerTopY + 56);

  const shortLink = treeUrl.replace(/^https?:\/\//i, "").slice(0, 42);
  ctx.fillStyle = "#F5F1E8";
  ctx.font = `600 26px ${monoFont}`;
  ctx.fillText(shortLink, 350, footerTopY + 104);

  ctx.fillStyle = "#A39E93";
  ctx.font = `500 22px ${sansFont}`;
  ctx.fillText(
    "Scan the QR or open my tree link · hoho.xo",
    350,
    footerTopY + 148,
  );

  return canvas.toDataURL("image/png");
}

export async function downloadStoryCardPng(
  message: TreeMessage,
  treeUrl: string,
  options: StoryCardOptions = {},
): Promise<boolean> {
  try {
    const dataUrl = await renderStoryCardDataUrl(message, treeUrl, options);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `hoho-xo-letter-${message.seq}-4k.png`;
    link.click();
    return true;
  } catch {
    return false;
  }
}

export async function renderInviteStoryCardDataUrl(
  treeUrl: string,
  theme: TreeTheme,
  config: Pick<TreeConfig, "handle" | "displayName" | "prompt">,
  template: InviteTemplateId = "qr-forward",
  aspect: StoryAspectId = "story",
  supersample: 1 | 2 = 2,
): Promise<string> {
  const [sansFont, monoFont, displayFont, handFont] = await Promise.all([
    loadCanvasFont(700, 36, "--font-sans", "system-ui, sans-serif"),
    loadCanvasFont(600, 32, "--font-mono", "monospace"),
    loadCanvasFont(400, 68, "--font-display", "Georgia, serif"),
    loadCanvasFont(600, 52, "--font-handwriting", "Georgia, cursive"),
  ]);

  const format =
    STORY_ASPECT_FORMATS.find((f) => f.id === aspect) ??
    STORY_ASPECT_FORMATS[0];
  const width = format.width;
  const height = format.height;
  const isStory = aspect === "story";
  const isSquare = aspect === "square";
  const canvas = document.createElement("canvas");
  canvas.width = width * supersample;
  canvas.height = height * supersample;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  ctx.scale(supersample, supersample);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.fillStyle = "#0B0D12";
  ctx.fillRect(0, 0, width, height);

  const skyGlow = ctx.createRadialGradient(
    width * 0.5,
    height * 0.28,
    30,
    width * 0.5,
    height * 0.28,
    Math.round(height * 0.45),
  );
  skyGlow.addColorStop(0, `${theme.swatch}30`);
  skyGlow.addColorStop(1, "rgba(11, 13, 18, 0)");
  ctx.fillStyle = skyGlow;
  ctx.fillRect(0, 0, width, height);

  const framePad = isSquare ? 40 : 52;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = 3;
  drawRoundedRect(
    ctx,
    framePad,
    framePad,
    width - framePad * 2,
    height - framePad * 2,
    40,
  );
  ctx.stroke();

  const headerTopY = isStory ? 152 : isSquare ? 94 : 110;
  const contentTopY = headerTopY + (isStory ? 116 : 92);
  const footerStartY = height - (isStory ? 224 : isSquare ? 118 : 138);

  if (
    template === "qr-forward" ||
    template === "big-prompt" ||
    template === "minimal"
  ) {
    ctx.save();
    ctx.globalAlpha = template === "minimal" ? 0.1 : 0.16;
    ctx.fillStyle = theme.foliage[3];
    ctx.font = `600 30px ${monoFont}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const motifY = footerStartY - (isStory ? 245 : 210);
    ASCII_MOTIF.slice(0, isSquare ? 4 : 6).forEach((row, index) => {
      ctx.fillText(row, width / 2, motifY + index * 32);
    });
    ctx.restore();
  }

  const cleanHandle = config.handle || "your_tree";

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = theme.swatch;
  ctx.font = `700 ${isSquare ? 23 : 27}px ${sansFont}`;
  ctx.fillText(
    `✦  @${cleanHandle.toUpperCase()} · ${theme.label.toUpperCase()} TREE  ✦`,
    width / 2,
    headerTopY,
  );

  ctx.fillStyle = "#F5F1E8";
  ctx.font = `700 ${isSquare ? 36 : 44}px ${sansFont}`;
  ctx.fillText(
    (config.displayName || `@${cleanHandle}`).slice(0, 32),
    width / 2,
    headerTopY + (isSquare ? 46 : 60),
  );

  const availH = Math.max(420, footerStartY - contentTopY - 24);

  if (template === "polaroid") {
    const cardW = isSquare ? 720 : 780;
    const cardH = Math.min(availH - 20, isStory ? 980 : 760);
    const cardX = -cardW / 2;
    const cardY = -cardH / 2;
    const centerY = contentTopY + availH / 2;

    ctx.save();
    ctx.translate(width / 2, centerY);
    ctx.rotate(-0.022);

    ctx.fillStyle = "rgba(0, 0, 0, 0.44)";
    drawRoundedRect(ctx, cardX + 14, cardY + 22, cardW, cardH, 24);
    ctx.fill();

    ctx.fillStyle = "#F6F1E7";
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 22);
    ctx.fill();

    const insetPad = 38;
    const photoH = Math.round(cardH * 0.72);
    const photoW = cardW - insetPad * 2;
    ctx.fillStyle = "#0E131D";
    drawRoundedRect(
      ctx,
      cardX + insetPad,
      cardY + insetPad,
      photoW,
      photoH,
      14,
    );
    ctx.fill();

    const qrSize = Math.min(isSquare ? 320 : 410, Math.round(photoH * 0.78));
    drawHighContrastQrBadge(
      ctx,
      treeUrl,
      0,
      cardY + insetPad + (photoH - qrSize) / 2,
      qrSize,
      theme.swatch,
    );

    ctx.fillStyle = "#181A20";
    ctx.font = `600 ${isSquare ? 40 : 48}px ${handFont}`;
    const captionLines = wrapParagraphs(ctx, config.prompt, cardW - 96).slice(
      0,
      2,
    );
    const captionBaseY =
      cardY + insetPad + photoH + (cardH - insetPad - photoH) / 2;
    const startCapY = captionBaseY - ((captionLines.length - 1) * 44) / 2;
    captionLines.forEach((line, idx) => {
      ctx.fillText(line, 0, startCapY + idx * 44);
    });
    ctx.restore();
  } else if (template === "receipt") {
    const paperW = 700;
    const paperH = Math.min(availH - 16, isStory ? 1120 : 840);
    const paperX = (width - paperW) / 2;
    const paperY = contentTopY + (availH - paperH) / 2;

    ctx.save();
    ctx.fillStyle = "#FAF7F0";
    ctx.beginPath();
    const teeth = 28;
    const toothW = paperW / teeth;
    ctx.moveTo(paperX, paperY);
    for (let i = 0; i < teeth; i += 1) {
      ctx.lineTo(paperX + (i + 0.5) * toothW, paperY - 10);
      ctx.lineTo(paperX + (i + 1) * toothW, paperY);
    }
    ctx.lineTo(paperX + paperW, paperY + paperH);
    for (let i = teeth; i > 0; i -= 1) {
      ctx.lineTo(paperX + (i - 0.5) * toothW, paperY + paperH + 10);
      ctx.lineTo(paperX + (i - 1) * toothW, paperY + paperH);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#171A21";
    ctx.font = `700 24px ${monoFont}`;
    ctx.fillText("HOHO.XO · NORTH POLE POST", width / 2, paperY + 46);
    ctx.font = `500 20px ${monoFont}`;
    ctx.fillText(
      "----------------------------------------",
      width / 2,
      paperY + 80,
    );
    ctx.fillText("01 HOLIDAY LETTER ........... FREE", width / 2, paperY + 114);
    ctx.fillText("02 SEALED ANONYMOUSLY ....... FREE", width / 2, paperY + 148);
    ctx.fillText(
      "----------------------------------------",
      width / 2,
      paperY + 182,
    );

    ctx.font = `400 ${isSquare ? 36 : 44}px ${displayFont}`;
    const promptLines = wrapParagraphs(ctx, config.prompt, paperW - 96).slice(
      0,
      3,
    );
    const pStartY = paperY + 248;
    promptLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, pStartY + idx * (isSquare ? 42 : 52));
    });

    const qrTop = pStartY + promptLines.length * (isSquare ? 42 : 52) + 28;
    const qrSize = Math.min(
      isSquare ? 260 : 380,
      Math.max(200, paperY + paperH - qrTop - 68),
    );
    drawHighContrastQrBadge(ctx, treeUrl, width / 2, qrTop, qrSize, "#171A21");

    ctx.fillStyle = "#4B505E";
    ctx.font = `600 18px ${monoFont}`;
    ctx.fillText(
      `DIRECT TO · @${cleanHandle.toUpperCase()}`,
      width / 2,
      paperY + paperH - 28,
    );
    ctx.restore();
  } else if (template === "sticker-note") {
    const cardW = isSquare ? 720 : 760;
    const cardH = Math.min(availH - 24, isStory ? 960 : 740);
    const centerY = contentTopY + availH / 2;

    ctx.save();
    ctx.translate(width / 2, centerY);
    ctx.rotate(0.02);

    ctx.fillStyle = "rgba(0, 0, 0, 0.36)";
    drawRoundedRect(ctx, -cardW / 2 + 12, -cardH / 2 + 18, cardW, cardH, 28);
    ctx.fill();

    ctx.fillStyle = "#FFF4CC";
    drawRoundedRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 28);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
    ctx.fillRect(-110, -cardH / 2 - 18, 220, 44);

    ctx.fillStyle = "#241E14";
    ctx.font = `600 ${isSquare ? 46 : 56}px ${handFont}`;
    const promptLines = wrapParagraphs(ctx, config.prompt, cardW - 110).slice(
      0,
      3,
    );
    const pTop = -cardH / 2 + 106;
    promptLines.forEach((line, idx) => {
      ctx.fillText(line, 0, pTop + idx * (isSquare ? 52 : 64));
    });

    const qrTop = pTop + promptLines.length * (isSquare ? 52 : 64) + 26;
    const qrSize = Math.min(
      isSquare ? 280 : 380,
      Math.max(220, cardH / 2 - qrTop - 36),
    );
    drawHighContrastQrBadge(ctx, treeUrl, 0, qrTop, qrSize, "#241E14");
    ctx.restore();
  } else if (template === "big-prompt") {
    const boxH = isSquare ? 230 : 340;
    ctx.fillStyle = "rgba(18, 22, 32, 0.92)";
    drawRoundedRect(ctx, 100, contentTopY, width - 200, boxH, 36);
    ctx.fill();
    ctx.strokeStyle = `${theme.swatch}99`;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = "#F5F1E8";
    ctx.font = `400 ${isSquare ? 50 : 66}px ${displayFont}`;
    const promptLines = wrapParagraphs(ctx, config.prompt, width - 290).slice(
      0,
      isSquare ? 3 : 4,
    );
    const lineStep = isSquare ? 58 : 74;
    const pStartY =
      contentTopY + boxH / 2 - ((promptLines.length - 1) * lineStep) / 2;
    promptLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, pStartY + idx * lineStep);
    });

    const qrSize = isStory ? 340 : isSquare ? 280 : 320;
    drawHighContrastQrBadge(
      ctx,
      treeUrl,
      width / 2,
      contentTopY + boxH + 34,
      qrSize,
      theme.swatch,
    );
  } else if (template === "minimal") {
    const boxH = isSquare ? 185 : 225;
    ctx.fillStyle = "rgba(18, 22, 32, 0.78)";
    drawRoundedRect(ctx, 128, contentTopY, width - 256, boxH, 30);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#F5F1E8";
    ctx.font = `400 ${isSquare ? 42 : 50}px ${displayFont}`;
    const promptLines = wrapParagraphs(ctx, config.prompt, width - 340).slice(
      0,
      3,
    );
    const lineStep = isSquare ? 48 : 58;
    const pStartY =
      contentTopY + boxH / 2 - ((promptLines.length - 1) * lineStep) / 2;
    promptLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, pStartY + idx * lineStep);
    });

    const qrSize = isStory ? 400 : isSquare ? 310 : 360;
    drawHighContrastQrBadge(
      ctx,
      treeUrl,
      width / 2,
      contentTopY + boxH + 34,
      qrSize,
      theme.swatch,
    );
  } else {
    const boxH = isSquare ? 180 : 210;
    ctx.fillStyle = "#121621";
    drawRoundedRect(ctx, 112, contentTopY, width - 224, boxH, 28);
    ctx.fill();
    ctx.strokeStyle = "#32394A";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#F5F1E8";
    ctx.font = `400 ${isSquare ? 42 : 50}px ${displayFont}`;
    const promptLines = wrapParagraphs(ctx, config.prompt, width - 300).slice(
      0,
      3,
    );
    const lineStep = isSquare ? 48 : 58;
    const pStartY =
      contentTopY + boxH / 2 - ((promptLines.length - 1) * lineStep) / 2;
    promptLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, pStartY + idx * lineStep);
    });

    const qrSize = isStory ? 490 : isSquare ? 320 : 410;
    drawHighContrastQrBadge(
      ctx,
      treeUrl,
      width / 2,
      contentTopY + boxH + 34,
      qrSize,
      theme.swatch,
    );
  }

  ctx.fillStyle = theme.swatch;
  ctx.font = `700 ${isSquare ? 24 : 28}px ${sansFont}`;
  ctx.fillText(
    `SCAN QR TO SEND @${cleanHandle.toUpperCase()} A HOLIDAY LETTER`,
    width / 2,
    footerStartY + 18,
  );

  ctx.fillStyle = "#F5F1E8";
  ctx.font = `600 ${isSquare ? 22 : 26}px ${monoFont}`;
  const shortLink = treeUrl.replace(/^https?:\/\//, "").slice(0, 48);
  ctx.fillText(shortLink, width / 2, footerStartY + (isSquare ? 52 : 66));

  ctx.fillStyle = "#9A968D";
  ctx.font = `500 ${isSquare ? 18 : 22}px ${sansFont}`;
  ctx.fillText(
    "hoho.xo · 3D Holiday Tree & Secret Letters",
    width / 2,
    footerStartY + (isSquare ? 82 : 118),
  );

  return canvas.toDataURL("image/png");
}

function selectBestRecorderFormat(includeAudio: boolean): {
  mimeType: string;
  ext: "mp4" | "webm";
} | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates: Array<{ mimeType: string; ext: "mp4" | "webm" }> =
    includeAudio
      ? [
          { mimeType: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", ext: "mp4" },
          { mimeType: "video/mp4", ext: "mp4" },
          { mimeType: "video/webm;codecs=vp9,opus", ext: "webm" },
          { mimeType: "video/webm;codecs=vp8,opus", ext: "webm" },
          { mimeType: "video/webm", ext: "webm" },
        ]
      : [
          { mimeType: "video/mp4;codecs=avc1.42E01E", ext: "mp4" },
          { mimeType: "video/mp4", ext: "mp4" },
          { mimeType: "video/webm;codecs=vp9", ext: "webm" },
          { mimeType: "video/webm", ext: "webm" },
        ];

  for (const item of candidates) {
    if (MediaRecorder.isTypeSupported(item.mimeType)) {
      return item;
    }
  }
  return null;
}

/**
 * Exports a Full-HD 1080×1920 60fps 16Mbps Story/Reel video (`.mp4` or `.webm`)
 * with shimmering holiday snow, golden bokeh lights, and optional Christmas celesta soundtrack.
 */
export async function exportInviteReelClip(
  treeUrl: string,
  theme: TreeTheme,
  config: Pick<TreeConfig, "handle" | "displayName" | "prompt">,
  template: InviteTemplateId = "qr-forward",
  durationMs = 4500,
): Promise<{ status: "downloaded" | "unsupported" | "failed"; ext?: string }> {
  if (
    typeof document === "undefined" ||
    typeof MediaRecorder === "undefined" ||
    typeof HTMLCanvasElement === "undefined" ||
    typeof HTMLCanvasElement.prototype.captureStream !== "function"
  ) {
    return { status: "unsupported" };
  }

  const holidayAudio = createExportHolidayAudioTrack(durationMs);
  const chosen =
    selectBestRecorderFormat(Boolean(holidayAudio)) ??
    selectBestRecorderFormat(false);
  if (!chosen) {
    holidayAudio?.cleanup();
    return { status: "unsupported" };
  }

  try {
    const bgDataUrl = await renderInviteStoryCardDataUrl(
      treeUrl,
      theme,
      config,
      template,
      "story",
      2,
    );
    const bgImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = bgDataUrl;
    });

    const width = 1080;
    const height = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      holidayAudio?.cleanup();
      return { status: "failed" };
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const flakes = Array.from({ length: 76 }, (_, idx) => ({
      x: ((idx * 137) % 1000) / 1000,
      y: ((idx * 293) % 1000) / 1000,
      speed: 0.11 + (idx % 6) * 0.032,
      size: 2.5 + (idx % 4) * 1.4,
      phase: idx * 0.7,
    }));

    const stream = canvas.captureStream(60);
    if (
      (holidayAudio && chosen.mimeType.includes("opus")) ||
      chosen.ext === "mp4"
    ) {
      if (holidayAudio) {
        try {
          stream.addTrack(holidayAudio.audioTrack);
        } catch {
          // Proceed cleanly with video-only if browser rejects mixed track
        }
      }
    }

    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream, {
      mimeType: chosen.mimeType,
      videoBitsPerSecond: 16_000_000,
    });
    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data);
    };

    const done = new Promise<{
      status: "downloaded" | "failed";
      ext?: string;
    }>((resolve) => {
      recorder.onstop = () => {
        holidayAudio?.cleanup();
        try {
          const blob = new Blob(chunks, { type: chosen.mimeType });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `hoho-xo-${config.handle || "tree"}-1080p-${template}.${chosen.ext}`;
          link.click();
          window.setTimeout(() => URL.revokeObjectURL(url), 2000);
          resolve({ status: "downloaded", ext: chosen.ext });
        } catch {
          resolve({ status: "failed" });
        }
      };
      recorder.onerror = () => {
        holidayAudio?.cleanup();
        resolve({ status: "failed" });
      };
    });

    recorder.start();
    const start = performance.now();

    const drawStep = (now: number) => {
      const elapsed = now - start;
      const tSec = elapsed / 1000;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(bgImg, 0, 0, width, height);

      // Shimmering snow & holiday bokeh lights at crisp 1080p
      ctx.save();
      for (let i = 0; i < flakes.length; i += 1) {
        const f = flakes[i];
        const y = ((f.y + tSec * f.speed) % 1) * height;
        const x =
          (((f.x + Math.sin(tSec * 1.9 + f.phase) * 0.018) % 1) + 1) % 1;
        const twinkle =
          0.35 + 0.55 * (0.5 + 0.5 * Math.sin(tSec * 3.4 + f.phase));
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = i % 7 === 0 ? theme.swatch : theme.snowColor;
        ctx.beginPath();
        ctx.arc(x * width, y, f.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      if (elapsed < durationMs) {
        window.requestAnimationFrame(drawStep);
      } else if (recorder.state === "recording") {
        recorder.stop();
      }
    };

    window.requestAnimationFrame(drawStep);
    return await done;
  } catch {
    holidayAudio?.cleanup();
    return { status: "failed" };
  }
}

function easeOutCubic(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - c, 3);
}

function easeOutBack(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  const s = 1.70158;
  return 1 + (s + 1) * Math.pow(c - 1, 3) + s * Math.pow(c - 1, 2);
}

/**
 * Exports a Full-HD 1080×1920 60fps 16Mbps video recording the complete
 * Decoration → Sealed Holiday Mail → Envelope Opening → Unfolding Letter reveal!
 */
export async function exportLetterVideoClip(
  message: TreeMessage,
  treeUrl: string,
  options: StoryCardOptions = {},
  durationMs = 5600,
): Promise<{ status: "downloaded" | "unsupported" | "failed"; ext?: string }> {
  if (
    typeof document === "undefined" ||
    typeof MediaRecorder === "undefined" ||
    typeof HTMLCanvasElement === "undefined" ||
    typeof HTMLCanvasElement.prototype.captureStream !== "function"
  ) {
    return { status: "unsupported" };
  }

  const holidayAudio = createExportHolidayAudioTrack(durationMs);
  const chosen =
    selectBestRecorderFormat(Boolean(holidayAudio)) ??
    selectBestRecorderFormat(false);
  if (!chosen) {
    holidayAudio?.cleanup();
    return { status: "unsupported" };
  }

  try {
    const [finalLetterDataUrl, sansFont, handFont] = await Promise.all([
      renderStoryCardDataUrl(message, treeUrl, { ...options, supersample: 2 }),
      loadCanvasFont(700, 34, "--font-sans", "system-ui, sans-serif"),
      loadCanvasFont(600, 44, "--font-handwriting", "Georgia, cursive"),
    ]);

    const finalLetterImg = await new Promise<HTMLImageElement>(
      (resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Letter render load failed"));
        img.src = finalLetterDataUrl;
      },
    );

    const width = 1080;
    const height = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      holidayAudio?.cleanup();
      return { status: "failed" };
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const vibe = STORY_VIBE_PALETTES[options.vibe ?? "night"];
    const ornament = ORNAMENT_TYPES[message.ornamentType] ?? ORNAMENT_TYPES[0];
    const ornamentColor =
      ORNAMENT_COLORS[message.colorIdx % ORNAMENT_COLORS.length] ?? vibe.accent;
    const recipientName = options.displayName?.trim() || "My Holiday Tree";

    const flakes = Array.from({ length: 64 }, (_, idx) => ({
      x: ((idx * 173) % 1000) / 1000,
      y: ((idx * 311) % 1000) / 1000,
      speed: 0.1 + (idx % 5) * 0.03,
      size: 2.2 + (idx % 4) * 1.2,
      phase: idx * 0.85,
    }));

    const stream = canvas.captureStream(60);
    if (
      holidayAudio &&
      (chosen.mimeType.includes("opus") || chosen.ext === "mp4")
    ) {
      try {
        stream.addTrack(holidayAudio.audioTrack);
      } catch {
        // Ignore if mixed track unsupported
      }
    }

    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream, {
      mimeType: chosen.mimeType,
      videoBitsPerSecond: 16_000_000,
    });
    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data);
    };

    const done = new Promise<{
      status: "downloaded" | "failed";
      ext?: string;
    }>((resolve) => {
      recorder.onstop = () => {
        holidayAudio?.cleanup();
        try {
          const blob = new Blob(chunks, { type: chosen.mimeType });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `hoho-xo-letter-${message.seq}-1080p.${chosen.ext}`;
          link.click();
          window.setTimeout(() => URL.revokeObjectURL(url), 2000);
          resolve({ status: "downloaded", ext: chosen.ext });
        } catch {
          resolve({ status: "failed" });
        }
      };
      recorder.onerror = () => {
        holidayAudio?.cleanup();
        resolve({ status: "failed" });
      };
    });

    recorder.start();
    const start = performance.now();

    const drawStep = (now: number) => {
      const elapsed = now - start;
      const tSec = elapsed / 1000;

      // Backdrop
      ctx.fillStyle = vibe.bg;
      ctx.fillRect(0, 0, width, height);
      const glow = ctx.createRadialGradient(
        width * 0.5,
        height * 0.45,
        40,
        width * 0.5,
        height * 0.45,
        820,
      );
      glow.addColorStop(0, vibe.glow);
      glow.addColorStop(1, "rgba(11, 13, 18, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // Phase timeline:
      // 0.0 - 1.1s: Glowing Ornament Decoration spins & gathers magic
      // 1.1 - 2.3s: Morphs into Sealed Holiday Mail Envelope
      // 2.3 - 3.3s: Wax seal pops & envelope flap opens with rising stationery
      // 3.1 - 5.6s: Smooth crossfade/rise into full crisp 4K-rendered Holiday Letter
      if (tSec < 3.4) {
        const cx = width / 2;
        const cy = height * 0.48;

        if (tSec < 1.25) {
          const p = easeOutBack(Math.min(1, tSec / 0.75));
          const morphOut = tSec > 0.95 ? 1 - (tSec - 0.95) / 0.3 : 1;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(p * morphOut, p * morphOut);

          ctx.fillStyle = `${ornamentColor}24`;
          ctx.beginPath();
          ctx.arc(0, 0, 170, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = ornamentColor;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, 0, 128, 0, Math.PI * 2);
          ctx.stroke();

          drawOrnamentSilhouette(ctx, message.ornamentType, 72, ornamentColor);
          ctx.restore();

          ctx.textAlign = "center";
          ctx.fillStyle = vibe.accent;
          ctx.font = `700 32px ${sansFont}`;
          ctx.globalAlpha = morphOut;
          ctx.fillText(
            `${ornament.name} Ornament · Note #${message.seq}`,
            cx,
            cy + 230,
          );
          ctx.globalAlpha = 1;
        }

        if (tSec >= 0.95) {
          const envIn = easeOutCubic(Math.min(1, (tSec - 0.95) / 0.45));
          const flapOpen = tSec > 2.0 ? easeOutCubic((tSec - 2.0) / 0.65) : 0;
          const fadeOut = tSec > 2.9 ? Math.max(0, 1 - (tSec - 2.9) / 0.5) : 1;

          const envW = 760;
          const envH = 500;
          const envX = cx - envW / 2;
          const envY = cy - envH / 2 + 40;

          ctx.save();
          ctx.globalAlpha = envIn * fadeOut;
          ctx.translate(cx, envY + envH / 2);
          const s = 0.84 + 0.16 * envIn;
          ctx.scale(s, s);
          ctx.translate(-cx, -(envY + envH / 2));

          // Rising letter sheet out of opened envelope
          if (flapOpen > 0.05) {
            const rise = flapOpen * 210;
            ctx.fillStyle = "#FAF5EB";
            drawRoundedRect(
              ctx,
              envX + 44,
              envY + 24 - rise,
              envW - 88,
              envH - 40,
              20,
            );
            ctx.fill();
            ctx.fillStyle = "#1C202B";
            ctx.font = `600 40px ${handFont}`;
            ctx.textAlign = "left";
            ctx.fillText(
              `Dear ${recipientName},`,
              envX + 86,
              envY + 104 - rise,
            );
          }

          // Envelope body
          ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
          ctx.shadowBlur = 40;
          ctx.shadowOffsetY = 20;
          ctx.fillStyle = "#F4ECE0";
          drawRoundedRect(ctx, envX, envY, envW, envH, 26);
          ctx.fill();
          ctx.shadowColor = "transparent";

          drawAirmailStripeBar(ctx, envX + 24, envY + envH - 28, envW - 48, 10);

          // Envelope pocket folds
          ctx.strokeStyle = "rgba(28, 32, 43, 0.14)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(envX, envY + envH);
          ctx.lineTo(cx, envY + envH * 0.44);
          ctx.lineTo(envX + envW, envY + envH);
          ctx.stroke();

          // Envelope top flap (flips upward as flapOpen -> 1)
          const flapTipY = envY + (1 - flapOpen * 1.85) * (envH * 0.54);
          ctx.fillStyle = flapOpen > 0.55 ? "#E8DEC9" : "#EFE5D4";
          ctx.beginPath();
          ctx.moveTo(envX + 4, envY + 6);
          ctx.lineTo(cx, flapTipY);
          ctx.lineTo(envX + envW - 4, envY + 6);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "rgba(28, 32, 43, 0.16)";
          ctx.stroke();

          // Address & Wax Seal
          ctx.textAlign = "center";
          ctx.fillStyle = "#202532";
          ctx.font = `600 42px ${handFont}`;
          ctx.fillText(`For ${recipientName}`, cx, envY + envH - 96);

          if (flapOpen < 0.45) {
            const sealScale = 1 - flapOpen * 2;
            ctx.save();
            ctx.translate(cx, envY + envH * 0.52);
            ctx.scale(sealScale, sealScale);
            ctx.fillStyle = vibe.seal;
            ctx.beginPath();
            ctx.arc(0, 0, 48, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#F5C451";
            ctx.lineWidth = 3;
            ctx.stroke();
            drawOrnamentSilhouette(ctx, message.ornamentType, 22, "#FAF5EB");
            ctx.restore();
          }

          ctx.restore();
        }
      }

      // Unfolded crisp Holiday Letter Stationery
      if (tSec >= 2.85) {
        const letterReveal = easeOutCubic(Math.min(1, (tSec - 2.85) / 0.55));
        ctx.save();
        ctx.globalAlpha = letterReveal;
        const offsetY = (1 - letterReveal) * 70;
        ctx.drawImage(finalLetterImg, 0, offsetY, width, height);
        ctx.restore();
      }

      // Snow overlay across entire video
      ctx.save();
      for (let i = 0; i < flakes.length; i += 1) {
        const f = flakes[i];
        const y = ((f.y + tSec * f.speed) % 1) * height;
        const x =
          (((f.x + Math.sin(tSec * 1.8 + f.phase) * 0.016) % 1) + 1) % 1;
        ctx.globalAlpha =
          0.3 + 0.45 * (0.5 + 0.5 * Math.sin(tSec * 3 + f.phase));
        ctx.fillStyle = i % 6 === 0 ? vibe.accent : "#FAF6EE";
        ctx.beginPath();
        ctx.arc(x * width, y, f.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      if (elapsed < durationMs) {
        window.requestAnimationFrame(drawStep);
      } else if (recorder.state === "recording") {
        recorder.stop();
      }
    };

    window.requestAnimationFrame(drawStep);
    return await done;
  } catch {
    holidayAudio?.cleanup();
    return { status: "failed" };
  }
}

export async function downloadInviteStoryCardPng(
  treeUrl: string,
  theme: TreeTheme,
  config: Pick<TreeConfig, "handle" | "displayName" | "prompt">,
  template: InviteTemplateId = "qr-forward",
  aspect: StoryAspectId = "story",
): Promise<boolean> {
  try {
    const dataUrl = await renderInviteStoryCardDataUrl(
      treeUrl,
      theme,
      config,
      template,
      aspect,
      2,
    );
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `hoho-xo-${config.handle}-${aspect}-${template}-uhd.png`;
    link.click();
    return true;
  } catch {
    return false;
  }
}
