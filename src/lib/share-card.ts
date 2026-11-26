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
export type InviteTemplateId = "minimal" | "big-prompt" | "qr-forward";

export const INVITE_TEMPLATES: ReadonlyArray<{
  id: InviteTemplateId;
  label: string;
  caption: string;
}> = [
  { id: "qr-forward", label: "QR Forward", caption: "Scannable QR + prompt" },
  { id: "big-prompt", label: "Big Prompt", caption: "Editorial NGL headline" },
  { id: "minimal", label: "Minimal", caption: "Quiet luxury card" },
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
): Promise<string> {
  const [monoFont, displayFont] = await Promise.all([
    loadCanvasFont(600, 32, "--font-mono", "monospace"),
    loadCanvasFont(400, 68, "--font-display", "Georgia, serif"),
  ]);

  const width = 1080;
  const height = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  // Night sky background with warm ambient radial wash above the link-sticker zone
  ctx.fillStyle = "#0B0D12";
  ctx.fillRect(0, 0, width, height);

  const skyGlow = ctx.createRadialGradient(
    width * 0.5,
    height * 0.28,
    30,
    width * 0.5,
    height * 0.28,
    680,
  );
  skyGlow.addColorStop(0, `${theme.swatch}28`);
  skyGlow.addColorStop(1, "rgba(11, 13, 18, 0)");
  ctx.fillStyle = skyGlow;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#232834";
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, 56, 56, width - 112, height - 112, 48);
  ctx.stroke();

  // Subtle ASCII motif placed gently near lower footer so center-lower sticker zone stays clear
  ctx.save();
  ctx.globalAlpha = template === "minimal" ? 0.1 : 0.16;
  ctx.fillStyle = theme.qrDark;
  ctx.font = `600 32px ${monoFont}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ASCII_MOTIF.slice(0, 6).forEach((row, index) => {
    ctx.fillText(row, width / 2, 1455 + index * 36);
  });
  ctx.restore();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = theme.swatch;
  ctx.font = `600 28px ${monoFont}`;
  ctx.fillText(
    `★  @${config.handle.toUpperCase()} · ${theme.label.toUpperCase()} TREE  ★`,
    width / 2,
    158,
  );

  ctx.fillStyle = "#F2EDE4";
  ctx.font = `700 42px ${monoFont}`;
  ctx.fillText(
    (config.displayName || `@${config.handle}`).slice(0, 32),
    width / 2,
    224,
  );

  const drawEmbeddedQr = (qrBoxSize: number, qrY: number) => {
    const { modules } = QRCode.create(treeUrl, { errorCorrectionLevel: "M" });
    const n = modules.size;
    const quiet = 4;
    const qrX = (width - qrBoxSize) / 2;
    const cell = qrBoxSize / (n + quiet * 2);

    ctx.fillStyle = "#0B0D12";
    drawRoundedRect(ctx, qrX, qrY, qrBoxSize, qrBoxSize, 24);
    ctx.fill();
    ctx.strokeStyle = theme.swatch;
    ctx.lineWidth = 3;
    ctx.stroke();

    const isFinderCell = (r: number, c: number) =>
      (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

    for (let r = 0; r < n; r += 1) {
      for (let c = 0; c < n; c += 1) {
        if (!modules.data[r * n + c]) continue;
        ctx.fillStyle = isFinderCell(r, c) ? theme.qrFinder : theme.qrDark;
        const x = Math.floor(qrX + (c + quiet) * cell);
        const y = Math.floor(qrY + (r + quiet) * cell);
        const w = Math.ceil(qrX + (c + quiet + 1) * cell) - x;
        const h = Math.ceil(qrY + (r + quiet + 1) * cell) - y;
        ctx.fillRect(x, y, w, h);
      }
    }
  };

  if (template === "big-prompt") {
    // Bold NGL editorial prompt headline + compact QR above link-sticker safe zone
    ctx.fillStyle = "rgba(18, 22, 32, 0.9)";
    drawRoundedRect(ctx, 100, 290, width - 200, 390, 36);
    ctx.fill();
    ctx.strokeStyle = `${theme.swatch}88`;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = "#F2EDE4";
    ctx.font = `400 68px ${displayFont}`;
    const promptLines = wrapParagraphs(ctx, config.prompt, width - 290).slice(
      0,
      4,
    );
    const pStartY = 485 - ((promptLines.length - 1) * 78) / 2;
    promptLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, pStartY + idx * 78);
    });

    drawEmbeddedQr(310, 725);
  } else if (template === "minimal") {
    // Minimal hairline prompt + crisp medium QR in upper half, open quiet center below
    ctx.fillStyle = "rgba(18, 22, 32, 0.72)";
    drawRoundedRect(ctx, 128, 290, width - 256, 230, 30);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#F2EDE4";
    ctx.font = `400 50px ${displayFont}`;
    const promptLines = wrapParagraphs(ctx, config.prompt, width - 340).slice(
      0,
      3,
    );
    const pStartY = 405 - ((promptLines.length - 1) * 58) / 2;
    promptLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, pStartY + idx * 58);
    });

    drawEmbeddedQr(380, 575);
  } else {
    // qr-forward: large scannable QR card in upper-middle, lower-middle kept quiet for link sticker
    ctx.fillStyle = "#12151C";
    drawRoundedRect(ctx, 112, 274, width - 224, 210, 28);
    ctx.fill();
    ctx.strokeStyle = "#32394A";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#F2EDE4";
    ctx.font = `400 50px ${displayFont}`;
    const promptLines = wrapParagraphs(ctx, config.prompt, width - 300).slice(
      0,
      3,
    );
    const pStartY = 379 - ((promptLines.length - 1) * 58) / 2;
    promptLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, pStartY + idx * 58);
    });

    drawEmbeddedQr(490, 525);
  }

  // Lower-middle area (y ~1080..1380) intentionally left calm and clear for IG/TikTok link stickers
  ctx.fillStyle = "#F5C451";
  ctx.font = `600 28px ${monoFont}`;
  ctx.fillText("SCAN QR OR TAP MY LINK STICKER", width / 2, 1696);

  ctx.fillStyle = "#F2EDE4";
  ctx.font = `500 26px ${monoFont}`;
  const shortLink = treeUrl.replace(/^https?:\/\//, "").slice(0, 48);
  ctx.fillText(shortLink, width / 2, 1752);

  ctx.fillStyle = "#9A968D";
  ctx.font = `400 22px ${monoFont}`;
  ctx.fillText("hoho.xo · made by noodlestack", width / 2, 1816);

  return canvas.toDataURL("image/png");
}

export async function downloadInviteStoryCardPng(
  treeUrl: string,
  theme: TreeTheme,
  config: Pick<TreeConfig, "handle" | "displayName" | "prompt">,
  template: InviteTemplateId = "qr-forward",
): Promise<boolean> {
  try {
    const dataUrl = await renderInviteStoryCardDataUrl(
      treeUrl,
      theme,
      config,
      template,
    );
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `hoho-xo-${config.handle}-story-${template}.png`;
    link.click();
    return true;
  } catch {
    return false;
  }
}
