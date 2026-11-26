import QRCode from "qrcode";
import { loadCanvasFont } from "./canvas-font";
import type { TreeMessage } from "./messages";
import { drawOrnamentSilhouette } from "./ornament-sprites";
import type { TreeConfig } from "./tree-config";
import { ORNAMENT_COLORS, ORNAMENT_TYPES, type TreeTheme } from "./tree-themes";

export async function renderThemedQrDataUrl(
  value: string,
  theme: TreeTheme,
  sizePx = 1200,
  handle = "noodlestack",
): Promise<string> {
  const monoFont = await loadCanvasFont(700, 44, "--font-mono", "monospace");
  const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
  const n = modules.size;
  const quiet = 4;
  const total = n + quiet * 2;
  const footerPx = Math.round(sizePx * 0.14);
  const totalH = sizePx + footerPx;

  const canvas = document.createElement("canvas");
  canvas.width = sizePx;
  canvas.height = totalH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  // Seamless dark-canvas theme plate matching xmasqr aesthetic with strict 4-module quiet zone
  ctx.fillStyle = theme.qrBg;
  ctx.fillRect(0, 0, sizePx, totalH);

  const borderW = Math.max(4, Math.round(sizePx * 0.005));
  ctx.strokeStyle = "#232834";
  ctx.lineWidth = borderW;
  ctx.strokeRect(borderW / 2, borderW / 2, sizePx - borderW, totalH - borderW);

  const cell = sizePx / total;
  const isFinderCell = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (!modules.data[r * n + c]) continue;
      ctx.fillStyle = isFinderCell(r, c) ? theme.qrFinder : theme.qrDark;
      const x = Math.floor((c + quiet) * cell);
      const y = Math.floor((r + quiet) * cell);
      const w = Math.ceil((c + quiet + 1) * cell) - x;
      const h = Math.ceil((r + quiet + 1) * cell) - y;
      ctx.fillRect(x, y, w, h);
    }
  }

  // Keepsake caption strictly below the 4-module quiet zone
  ctx.strokeStyle = "#232834";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(Math.round(sizePx * 0.08), sizePx);
  ctx.lineTo(Math.round(sizePx * 0.92), sizePx);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#F2EDE4";
  ctx.font = `700 ${Math.round(sizePx * 0.036)}px ${monoFont}`;
  ctx.fillText(
    `hoho.xo · @${handle}`.slice(0, 32),
    sizePx / 2,
    sizePx + footerPx * 0.36,
  );

  ctx.fillStyle = "#9A968D";
  ctx.font = `500 ${Math.round(sizePx * 0.022)}px ${monoFont}`;
  ctx.fillText(
    "SCAN TO HANG AN ANONYMOUS NOTE · made by noodlestack",
    sizePx / 2,
    sizePx + footerPx * 0.72,
  );

  return canvas.toDataURL("image/png");
}

export async function downloadThemedQrPng(
  value: string,
  theme: TreeTheme,
  handle = "noodlestack",
): Promise<boolean> {
  try {
    const dataUrl = await renderThemedQrDataUrl(value, theme, 1200, handle);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `hoho-xo-${handle}-${theme.id}-qr.png`;
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
}> = [
  { id: "story", label: "9:16 Story", width: 1080, height: 1920 },
  { id: "portrait", label: "4:5 Post", width: 1080, height: 1350 },
  { id: "square", label: "1:1 Square", width: 1080, height: 1080 },
];

export const INVITE_TEMPLATES: ReadonlyArray<{
  id: InviteTemplateId;
  label: string;
  caption: string;
}> = [
  { id: "qr-forward", label: "QR Forward", caption: "Scannable QR + prompt" },
  { id: "big-prompt", label: "Big Prompt", caption: "Editorial NGL headline" },
  { id: "minimal", label: "Minimal", caption: "Quiet luxury card" },
  { id: "polaroid", label: "Polaroid", caption: "Instant holiday snapshot" },
  { id: "receipt", label: "Receipt", caption: "North Pole post slip" },
  { id: "sticker-note", label: "Sticker", caption: "Handwritten sticky note" },
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
      // Fall through cleanly to direct PNG download
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
}

const STORY_VIBE_PALETTES: Record<
  StoryVibe,
  { bg: string; glow: string; accent: string; ascii: string }
> = {
  night: {
    bg: "#0B0D12",
    glow: "rgba(245, 196, 81, 0.16)",
    accent: "#F5C451",
    ascii: "#5BD18B",
  },
  pine: {
    bg: "#0B1612",
    glow: "rgba(91, 209, 139, 0.22)",
    accent: "#5BD18B",
    ascii: "#5BD18B",
  },
  ember: {
    bg: "#160D0D",
    glow: "rgba(255, 159, 67, 0.22)",
    accent: "#FF9F43",
    ascii: "#FF9F43",
  },
  blush: {
    bg: "#160E15",
    glow: "rgba(255, 143, 177, 0.22)",
    accent: "#FF8FB1",
    ascii: "#FF8FB1",
  },
};

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

export async function renderStoryCardDataUrl(
  message: TreeMessage,
  treeUrl: string,
  options: StoryCardOptions = {},
): Promise<string> {
  const [monoFont, displayFont] = await Promise.all([
    loadCanvasFont(600, 32, "--font-mono", "monospace"),
    loadCanvasFont(400, 56, "--font-display", "Georgia, serif"),
  ]);

  const width = 1080;
  const height = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  const vibe = STORY_VIBE_PALETTES[options.vibe ?? "night"];

  // Vibe background + ambient radial glow
  ctx.fillStyle = vibe.bg;
  ctx.fillRect(0, 0, width, height);

  const grad = ctx.createRadialGradient(
    width * 0.5,
    height * 0.36,
    40,
    width * 0.5,
    height * 0.36,
    780,
  );
  grad.addColorStop(0, vibe.glow);
  grad.addColorStop(1, "rgba(11, 13, 18, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Subtle decorative rounded border
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, 52, 52, width - 104, height - 104, 48);
  ctx.stroke();

  // Faint ASCII tree motif at ~20% opacity
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = vibe.ascii;
  ctx.font = `600 40px ${monoFont}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ASCII_MOTIF.forEach((row, index) => {
    ctx.fillText(row, width / 2, 1210 + index * 46);
  });
  ctx.restore();

  // Header brand + owner prompt
  const ornament = ORNAMENT_TYPES[message.ornamentType] ?? ORNAMENT_TYPES[0];
  const ornamentColor =
    ORNAMENT_COLORS[message.colorIdx % ORNAMENT_COLORS.length] ?? vibe.accent;
  const headerName = options.displayName?.trim() || "Hoho.xo";

  ctx.fillStyle = vibe.accent;
  ctx.font = `700 30px ${monoFont}`;
  ctx.textAlign = "center";
  ctx.fillText(`★  ${headerName.toUpperCase()}  ★`, width / 2, 156);

  ctx.save();
  ctx.font = `600 24px ${monoFont}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const subtitleLabel = `ANONYMOUS NOTE · ${ornament.name.toUpperCase()}`;
  const labelWidth = ctx.measureText(subtitleLabel).width;
  const badgeR = 16;
  const badgeGap = 12;
  const totalRowW = badgeR * 2 + badgeGap + labelWidth;
  const rowLeftX = (width - totalRowW) / 2;
  const badgeCenterX = rowLeftX + badgeR;
  const rowCenterY = 208;

  ctx.fillStyle = "rgba(11, 13, 18, 0.9)";
  ctx.beginPath();
  ctx.arc(badgeCenterX, rowCenterY, badgeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ornamentColor;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.save();
  ctx.translate(badgeCenterX, rowCenterY);
  drawOrnamentSilhouette(ctx, message.ornamentType, 11, ornamentColor);
  ctx.restore();

  ctx.fillStyle = ornamentColor;
  ctx.fillText(
    subtitleLabel,
    rowLeftX + badgeR * 2 + badgeGap + labelWidth / 2,
    rowCenterY,
  );
  ctx.restore();

  // Optional NGL-style Prompt Ribbon (never renders message timestamps or sender identity)
  const clampedReply = clampStoryReply(options.reply);
  const hasReply = Boolean(clampedReply);
  let cardTopY = 264;
  if (options.prompt?.trim()) {
    ctx.fillStyle = "#C9C4BA";
    ctx.font = '400 34px "Instrument Serif", Georgia, serif';
    const promptLines = wrapParagraphs(
      ctx,
      options.prompt.trim(),
      width - 260,
    ).slice(0, 2);
    promptLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, 268 + idx * 42);
    });
    cardTopY = 282 + promptLines.length * 44;
  }

  // Rounded social message card container
  const cardX = 104;
  const cardY = cardTopY;
  const cardW = width - 208;
  const cardH = hasReply ? 550 : 770;

  ctx.fillStyle = "rgba(18, 22, 32, 0.94)";
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 36);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Adaptive font sizing for up to 500 characters
  const textLen = message.body.length;
  const fontSize = hasReply
    ? textLen > 280
      ? 36
      : textLen > 140
        ? 44
        : 56
    : textLen > 320
      ? 44
      : textLen > 160
        ? 54
        : 66;
  const lineHeight = Math.round(fontSize * 1.3);

  ctx.fillStyle = "#F3EFE7";
  ctx.font = `400 ${fontSize}px ${displayFont}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lines = wrapParagraphs(ctx, `“${message.body}”`, cardW - 110);
  const blockHeight = lines.length * lineHeight;
  let startY = cardY + cardH / 2 - blockHeight / 2 + lineHeight / 2;
  const minY = cardY + 64;
  if (startY < minY) startY = minY;

  for (let i = 0; i < lines.length; i += 1) {
    const drawY = startY + i * lineHeight;
    if (drawY > cardY + cardH - 46) break;
    ctx.fillText(lines[i], width / 2, drawY);
  }

  // NGL-style Owner Reply Bubble below the note
  if (hasReply) {
    const replyY = cardY + cardH + 34;
    const replyH = 220;
    ctx.fillStyle = "#181C26";
    ctx.fillRect(cardX, replyY, cardW, replyH);
    ctx.strokeStyle = "#F5C451";
    ctx.lineWidth = 2;
    ctx.strokeRect(cardX, replyY, cardW, replyH);

    ctx.fillStyle = "#F5C451";
    ctx.font = `600 22px ${monoFont}`;
    ctx.fillText("OWNER REPLY", width / 2, replyY + 42);

    ctx.fillStyle = "#F2EDE4";
    ctx.font = `400 42px ${displayFont}`;
    const replyLines = wrapParagraphs(ctx, clampedReply, cardW - 100).slice(
      0,
      3,
    );
    replyLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, replyY + 98 + idx * 48);
    });
  }

  // Footer link and attribution
  ctx.fillStyle = "#9A968D";
  ctx.font = `500 26px ${monoFont}`;
  ctx.fillText("SEND AN ANONYMOUS NOTE TO MY TREE", width / 2, 1690);

  ctx.fillStyle = "#F5C451";
  ctx.font = `600 30px ${monoFont}`;
  const shortLink = treeUrl.replace(/^https?:\/\//, "").slice(0, 44);
  ctx.fillText(shortLink, width / 2, 1746);

  ctx.fillStyle = "#9A968D";
  ctx.font = `400 22px ${monoFont}`;
  ctx.fillText("hoho.xo · made by noodlestack", width / 2, 1815);

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
    link.download = `hoho-xo-note-${message.seq}.png`;
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
): Promise<string> {
  const [monoFont, displayFont, handFont] = await Promise.all([
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
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  ctx.fillStyle = "#0B0D12";
  ctx.fillRect(0, 0, width, height);

  const skyGlow = ctx.createRadialGradient(
    width * 0.5,
    height * 0.28,
    30,
    width * 0.5,
    height * 0.28,
    Math.round(height * 0.42),
  );
  skyGlow.addColorStop(0, `${theme.swatch}28`);
  skyGlow.addColorStop(1, "rgba(11, 13, 18, 0)");
  ctx.fillStyle = skyGlow;
  ctx.fillRect(0, 0, width, height);

  const framePad = isSquare ? 40 : 56;
  ctx.strokeStyle = "#232834";
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

  const headerTopY = isStory ? 158 : isSquare ? 96 : 112;
  const contentTopY = headerTopY + (isStory ? 116 : 92);
  const footerStartY = height - (isStory ? 224 : isSquare ? 118 : 138);

  if (
    template === "qr-forward" ||
    template === "big-prompt" ||
    template === "minimal"
  ) {
    ctx.save();
    ctx.globalAlpha = template === "minimal" ? 0.1 : 0.15;
    ctx.fillStyle = theme.qrDark;
    ctx.font = `600 30px ${monoFont}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const motifY = footerStartY - (isStory ? 245 : 210);
    ASCII_MOTIF.slice(0, isSquare ? 4 : 6).forEach((row, index) => {
      ctx.fillText(row, width / 2, motifY + index * 32);
    });
    ctx.restore();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = theme.swatch;
  ctx.font = `600 ${isSquare ? 24 : 28}px ${monoFont}`;
  ctx.fillText(
    `★  @${config.handle.toUpperCase()} · ${theme.label.toUpperCase()} TREE  ★`,
    width / 2,
    headerTopY,
  );

  ctx.fillStyle = "#F2EDE4";
  ctx.font = `700 ${isSquare ? 34 : 42}px ${monoFont}`;
  ctx.fillText(
    (config.displayName || `@${config.handle}`).slice(0, 32),
    width / 2,
    headerTopY + (isSquare ? 46 : 62),
  );

  const drawEmbeddedQr = (
    qrBoxSize: number,
    qrCenterX: number,
    qrTopY: number,
    borderColor = theme.swatch,
  ) => {
    const { modules } = QRCode.create(treeUrl, { errorCorrectionLevel: "M" });
    const n = modules.size;
    const quiet = 4;
    const qrX = qrCenterX - qrBoxSize / 2;
    const cell = qrBoxSize / (n + quiet * 2);

    ctx.fillStyle = "#0B0D12";
    drawRoundedRect(ctx, qrX, qrTopY, qrBoxSize, qrBoxSize, 22);
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    const isFinderCell = (r: number, c: number) =>
      (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

    for (let r = 0; r < n; r += 1) {
      for (let c = 0; c < n; c += 1) {
        if (!modules.data[r * n + c]) continue;
        ctx.fillStyle = isFinderCell(r, c) ? theme.qrFinder : theme.qrDark;
        const x = Math.floor(qrX + (c + quiet) * cell);
        const y = Math.floor(qrTopY + (r + quiet) * cell);
        const w = Math.ceil(qrX + (c + quiet + 1) * cell) - x;
        const h = Math.ceil(qrTopY + (r + quiet + 1) * cell) - y;
        ctx.fillRect(x, y, w, h);
      }
    }
  };

  const availH = Math.max(420, footerStartY - contentTopY - 24);

  if (template === "polaroid") {
    const cardW = isSquare ? 720 : 780;
    const cardH = Math.min(availH - 20, isStory ? 980 : 760);
    const cardX = -cardW / 2;
    const cardY = -cardH / 2;
    const centerY = contentTopY + availH / 2;

    ctx.save();
    ctx.translate(width / 2, centerY);
    ctx.rotate(-0.025);

    ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
    drawRoundedRect(ctx, cardX + 14, cardY + 22, cardW, cardH, 24);
    ctx.fill();

    ctx.fillStyle = "#F6F1E7";
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 22);
    ctx.fill();

    const insetPad = 38;
    const photoH = Math.round(cardH * 0.72);
    const photoW = cardW - insetPad * 2;
    ctx.fillStyle = "#0B0D12";
    drawRoundedRect(
      ctx,
      cardX + insetPad,
      cardY + insetPad,
      photoW,
      photoH,
      14,
    );
    ctx.fill();

    const qrSize = Math.min(isSquare ? 310 : 390, Math.round(photoH * 0.76));
    drawEmbeddedQr(
      qrSize,
      0,
      cardY + insetPad + (photoH - qrSize) / 2,
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
    ctx.fillText("01 ANONYMOUS NOTE ........... FREE", width / 2, paperY + 114);
    ctx.fillText("02 ZERO SIGN-IN ............. FREE", width / 2, paperY + 148);
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
    drawEmbeddedQr(qrSize, width / 2, qrTop, "#171A21");

    ctx.fillStyle = "#4B505E";
    ctx.font = `500 18px ${monoFont}`;
    ctx.fillText(
      `THANK YOU · @${config.handle.toUpperCase()}`,
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

    ctx.fillStyle = "#FFF1B8";
    drawRoundedRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 28);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.58)";
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
    drawEmbeddedQr(qrSize, 0, qrTop, "#241E14");
    ctx.restore();
  } else if (template === "big-prompt") {
    const boxH = isSquare ? 230 : 340;
    ctx.fillStyle = "rgba(18, 22, 32, 0.9)";
    drawRoundedRect(ctx, 100, contentTopY, width - 200, boxH, 36);
    ctx.fill();
    ctx.strokeStyle = `${theme.swatch}88`;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = "#F2EDE4";
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

    const qrSize = isStory ? 320 : isSquare ? 280 : 310;
    drawEmbeddedQr(qrSize, width / 2, contentTopY + boxH + 34);
  } else if (template === "minimal") {
    const boxH = isSquare ? 185 : 225;
    ctx.fillStyle = "rgba(18, 22, 32, 0.72)";
    drawRoundedRect(ctx, 128, contentTopY, width - 256, boxH, 30);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#F2EDE4";
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

    const qrSize = isStory ? 380 : isSquare ? 310 : 360;
    drawEmbeddedQr(qrSize, width / 2, contentTopY + boxH + 34);
  } else {
    const boxH = isSquare ? 180 : 210;
    ctx.fillStyle = "#12151C";
    drawRoundedRect(ctx, 112, contentTopY, width - 224, boxH, 28);
    ctx.fill();
    ctx.strokeStyle = "#32394A";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#F2EDE4";
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
    drawEmbeddedQr(qrSize, width / 2, contentTopY + boxH + 34);
  }

  ctx.fillStyle = "#F5C451";
  ctx.font = `600 ${isSquare ? 24 : 28}px ${monoFont}`;
  ctx.fillText("SCAN QR OR TAP MY LINK STICKER", width / 2, footerStartY + 18);

  ctx.fillStyle = "#F2EDE4";
  ctx.font = `500 ${isSquare ? 22 : 26}px ${monoFont}`;
  const shortLink = treeUrl.replace(/^https?:\/\//, "").slice(0, 48);
  ctx.fillText(shortLink, width / 2, footerStartY + (isSquare ? 52 : 68));

  ctx.fillStyle = "#9A968D";
  ctx.font = `400 ${isSquare ? 18 : 22}px ${monoFont}`;
  ctx.fillText(
    "hoho.xo · made by noodlestack",
    width / 2,
    footerStartY + (isSquare ? 82 : 122),
  );

  return canvas.toDataURL("image/png");
}

export async function exportInviteReelClip(
  treeUrl: string,
  theme: TreeTheme,
  config: Pick<TreeConfig, "handle" | "displayName" | "prompt">,
  template: InviteTemplateId = "qr-forward",
  durationMs = 3000,
): Promise<"downloaded" | "unsupported" | "failed"> {
  if (
    typeof document === "undefined" ||
    typeof MediaRecorder === "undefined" ||
    typeof HTMLCanvasElement === "undefined" ||
    typeof HTMLCanvasElement.prototype.captureStream !== "function"
  ) {
    return "unsupported";
  }

  const mimeType =
    ["video/webm;codecs=vp9", "video/webm"].find((m) =>
      MediaRecorder.isTypeSupported(m),
    ) ?? "";
  if (!mimeType) {
    return "unsupported";
  }

  try {
    const bgDataUrl = await renderInviteStoryCardDataUrl(
      treeUrl,
      theme,
      config,
      template,
      "story",
    );
    const bgImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = bgDataUrl;
    });

    const width = 540;
    const height = 960;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "failed";

    const flakes = Array.from({ length: 42 }, (_, idx) => ({
      x: ((idx * 137) % 1000) / 1000,
      y: ((idx * 293) % 1000) / 1000,
      speed: 0.14 + (idx % 5) * 0.04,
      size: 2 + (idx % 3),
      phase: idx * 0.7,
    }));

    const stream = canvas.captureStream(30);
    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data);
    };

    const done = new Promise<"downloaded" | "failed">((resolve) => {
      recorder.onstop = () => {
        try {
          const blob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `hoho-xo-${config.handle}-reel-${template}.webm`;
          link.click();
          window.setTimeout(() => URL.revokeObjectURL(url), 1500);
          resolve("downloaded");
        } catch {
          resolve("failed");
        }
      };
      recorder.onerror = () => resolve("failed");
    });

    recorder.start();
    const start = performance.now();

    const drawStep = (now: number) => {
      const elapsed = now - start;
      const tSec = elapsed / 1000;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(bgImg, 0, 0, width, height);

      ctx.save();
      ctx.fillStyle = theme.snowColor;
      for (const f of flakes) {
        const y = ((f.y + tSec * f.speed) % 1) * height;
        const x = (((f.x + Math.sin(tSec * 2 + f.phase) * 0.015) % 1) + 1) % 1;
        ctx.globalAlpha =
          0.25 + 0.35 * (0.5 + 0.5 * Math.sin(tSec * 3 + f.phase));
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
    return "failed";
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
    );
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `hoho-xo-${config.handle}-${aspect}-${template}.png`;
    link.click();
    return true;
  } catch {
    return false;
  }
}
