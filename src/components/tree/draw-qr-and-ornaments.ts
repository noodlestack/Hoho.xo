import { getOrnamentSpriteCanvas } from "@/lib/ornament-sprites";
import {
  slotPosition3D,
  TREE_BASE_RADIUS,
  TREE_HEIGHT,
  type QrMatrixResult,
} from "@/lib/qr-tree";
import { ORNAMENT_COLORS, type TreeTheme } from "@/lib/tree-themes";
import {
  dampedBounce,
  isFinderCell,
  quadEaseInOut,
  type Project3DFn,
  type ProjectedOrnamentHit,
  type ResolvedOrnament,
} from "./canvas-types";

export interface DrawQrAndOrnamentsParams {
  now: number;
  tSec: number;
  dpr: number;
  isCompact: boolean;
  stageCenterX: number;
  stageCenterY: number;
  qrBoxSide: number;
  fontFamily: string;
  curHandle: string;
  curMatrix: QrMatrixResult;
  curTheme: TreeTheme;
  curOrnaments: ResolvedOrnament[];
  curShowOrnaments: boolean;
  curReduced: boolean;
  qrMix: number;
  targetQrMix: number;
  fromQrMix: number;
  inTransition: boolean;
  isQrMorph: boolean;
  qrElapsedSec: number;
  dropAnimRef: { current: { id: string | null; startedAt: number } };
  hoveredIdRef: { current: string | null };
  wiggleRef: { current: { id: string | null; startedAt: number } };
  project3D: Project3DFn;
  debugHud: boolean;
  perf: { lastFps: number; emaMs: number };
  activeTier: "high" | "medium" | "low";
  snowLimit: number;
  cloudCount: number;
}

export function drawQrPlateAndOrnaments(
  ctx: CanvasRenderingContext2D,
  p: DrawQrAndOrnamentsParams,
): ProjectedOrnamentHit[] {
  const {
    now,
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
    qrMix,
    targetQrMix,
    fromQrMix,
    inTransition,
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
    cloudCount,
  } = p;

  // 5. Seamless Dark-Canvas Scannable QR Plate
  if (curMatrix.ok && qrMix > 0.04) {
    const quietModules = 4;
    const totalModules = curMatrix.size + quietModules * 2;
    const modulePx = qrBoxSide / totalModules;
    const footerH = Math.round(qrBoxSide * 0.16);
    const cardH = qrBoxSide + footerH;
    const qrLeft = stageCenterX - qrBoxSide / 2;
    const qrTop = stageCenterY - cardH / 2;

    ctx.save();
    ctx.globalAlpha = Math.min(1, qrMix * 1.25);
    ctx.fillStyle = curTheme.qrBg;
    ctx.fillRect(qrLeft, qrTop, qrBoxSide, cardH);

    ctx.strokeStyle = "#232834";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(qrLeft, qrTop, qrBoxSide, cardH);

    const n = curMatrix.size;
    const halfN = (n - 1) / 2;
    const morphingToQrPlate = targetQrMix > fromQrMix;
    const usePlateWave = inTransition && isQrMorph && !curReduced;
    for (let i = 0; i < curMatrix.cells.length; i += 1) {
      const { row, column } = curMatrix.cells[i];
      const finder = isFinderCell(row, column, n);
      const normDist = Math.min(
        1,
        Math.hypot(column - halfN, row - halfN) / (halfN * 1.414),
      );
      let cellReveal: number;
      if (usePlateWave) {
        const delay = morphingToQrPlate
          ? normDist * 0.45
          : (1 - normDist) * 0.45;
        const localT = Math.max(0, Math.min(1, (qrElapsedSec - delay) / 0.7));
        const waveMix = quadEaseInOut(localT);
        cellReveal = morphingToQrPlate ? waveMix : 1 - waveMix;
      } else {
        const threshold = finder ? 0.15 : 0.25 + normDist * 0.55;
        cellReveal = Math.max(
          0,
          Math.min(1, (qrMix - threshold * 0.55) / 0.45),
        );
      }
      if (cellReveal <= 0.01) continue;

      ctx.fillStyle = finder ? curTheme.qrFinder : curTheme.qrDark;
      ctx.globalAlpha = cellReveal;

      const x0 = qrLeft + (column + quietModules) * modulePx;
      const y0 = qrTop + (row + quietModules) * modulePx;

      if (qrMix > 0.96) {
        const ix = Math.floor(x0);
        const iy = Math.floor(y0);
        const iw = Math.ceil(x0 + modulePx) - ix;
        const ih = Math.ceil(y0 + modulePx) - iy;
        ctx.fillRect(ix, iy, iw, ih);
      } else {
        const scale = 0.4 + 0.6 * cellReveal;
        const pad = (modulePx * (1 - scale)) / 2;
        ctx.fillRect(x0 + pad, y0 + pad, modulePx * scale, modulePx * scale);
      }
    }

    const captionFade = Math.max(0, (qrMix - 0.55) / 0.45);
    if (captionFade > 0.01) {
      ctx.globalAlpha = captionFade;
      const stripY = qrTop + qrBoxSide;

      ctx.strokeStyle = "#232834";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(qrLeft + 14, stripY);
      ctx.lineTo(qrLeft + qrBoxSide - 14, stripY);
      ctx.stroke();

      ctx.fillStyle = "#F2EDE4";
      ctx.font = `700 ${Math.max(10, Math.round(qrBoxSide * 0.04))}px ${fontFamily}`;
      ctx.fillText(
        `hoho.xo · @${curHandle}`.slice(0, 28),
        stageCenterX,
        stripY + footerH * 0.36,
      );

      ctx.fillStyle = "#9A968D";
      ctx.font = `500 ${Math.max(8, Math.round(qrBoxSide * 0.03))}px ${fontFamily}`;
      ctx.fillText(
        "SCAN TO SEND AN ANONYMOUS NOTE",
        stageCenterX,
        stripY + footerH * 0.72,
      );
    }

    ctx.restore();
  }

  // 6. Active Message Ornaments
  const hitList: ProjectedOrnamentHit[] = [];
  if (curShowOrnaments && qrMix < 0.28 && curOrnaments.length > 0) {
    const ornamentAlpha = Math.max(0, 1 - qrMix / 0.28);
    const isDenseOrnaments = curOrnaments.length > 24;
    const projected = curOrnaments
      .map((item) => {
        const pos = slotPosition3D(item.slot, TREE_HEIGHT, TREE_BASE_RADIUS);
        const proj = project3D(pos.x, pos.y, pos.z);
        let drawSy = proj.sy;
        let dropFlashAlpha = 0;
        let pendulumAngle = 0;

        if (!curReduced && dropAnimRef.current.id === item.id) {
          const elapsedMs = Math.max(0, now - dropAnimRef.current.startedAt);
          const dropDurMs = 900;
          const swingDurMs = 2200;
          if (elapsedMs >= dropDurMs + swingDurMs) {
            dropAnimRef.current.id = null;
          } else if (elapsedMs < dropDurMs) {
            const easedDrop = dampedBounce(elapsedMs / dropDurMs);
            const startSy = proj.sy - 120;
            drawSy = startSy + (proj.sy - startSy) * easedDrop;
            if (elapsedMs > dropDurMs - 90) {
              dropFlashAlpha = (elapsedMs - (dropDurMs - 90)) / 90;
            }
          } else {
            const afterLandMs = elapsedMs - dropDurMs;
            if (afterLandMs < 90) {
              dropFlashAlpha = 1 - afterLandMs / 90;
            }
            const swingSec = afterLandMs / 1000;
            pendulumAngle =
              ((7 * Math.PI) / 180) *
              Math.exp(-swingSec * 1.45) *
              Math.sin(swingSec * Math.PI * 3.1);
          }
        }

        return {
          item,
          sx: proj.sx,
          sy: drawSy,
          dz: proj.dz,
          dropFlashAlpha,
          pendulumAngle,
        };
      })
      .sort((a, b) => a.dz - b.dz);

    for (let i = 0; i < projected.length; i += 1) {
      const { item, sx, sy, dz, dropFlashAlpha, pendulumAngle } = projected[i];
      const color =
        ORNAMENT_COLORS[item.colorIdx % ORNAMENT_COLORS.length] ?? "#F5C451";
      const isUnread = !item.readAt;
      const isHovered = hoveredIdRef.current === item.id;
      const depthDim = dz < -0.6 ? 0.78 : 1;

      let wiggleOffset = 0;
      if (wiggleRef.current.id === item.id) {
        const wElapsed = tSec - wiggleRef.current.startedAt * 0.001;
        if (wElapsed < 0.65) {
          wiggleOffset =
            Math.sin(wElapsed * 28) * Math.exp(-wElapsed * 5.2) * 8;
        } else {
          wiggleRef.current.id = null;
        }
      }

      const ox = sx + wiggleOffset;
      const oy = sy;
      const diskR = isDenseOrnaments ? 9 : isCompact ? 12 : 14;

      ctx.save();
      ctx.globalAlpha = ornamentAlpha * depthDim * (isUnread ? 1 : 0.86);

      ctx.translate(ox, oy - diskR);
      if (Math.abs(pendulumAngle) > 0.0005) {
        ctx.rotate(pendulumAngle);
      }
      ctx.translate(0, diskR);

      if (dropFlashAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, dropFlashAlpha) * 0.85;
        ctx.strokeStyle = "#F5C451";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, diskR + 4 + (1 - dropFlashAlpha) * 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      const sprite = getOrnamentSpriteCanvas({
        typeId: item.ornamentType,
        color,
        radius: diskR,
        unread: isUnread,
        hovered: isHovered,
        dpr,
      });
      if (sprite) {
        const halfSprite = sprite.logicalSize / 2;
        ctx.drawImage(
          sprite.canvas,
          -halfSprite,
          -halfSprite,
          sprite.logicalSize,
          sprite.logicalSize,
        );
      }

      ctx.restore();

      hitList.push({
        id: item.id,
        x: ox,
        y: oy,
        r: isDenseOrnaments ? (isCompact ? 22 : 16) : isCompact ? 28 : 22,
      });
    }
  }

  if (debugHud) {
    ctx.save();
    const hudX = 14;
    const hudY = 72;
    const hudW = 280;
    const hudH = 44;
    ctx.fillStyle = "rgba(11, 13, 18, 0.88)";
    ctx.strokeStyle = "#F5C451";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(hudX, hudY, hudW, hudH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = `600 11px ${fontFamily}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#F2EDE4";
    ctx.fillText(
      `FPS ${perf.lastFps} · ${perf.emaMs.toFixed(1)}ms · tier:${activeTier}`,
      hudX + 10,
      hudY + 14,
    );
    ctx.fillStyle = "#F5C451";
    ctx.fillText(
      `dpr:${dpr.toFixed(2)} · snow:${snowLimit} · pts:${cloudCount} · orn:${curOrnaments.length}`,
      hudX + 10,
      hudY + 30,
    );
    ctx.restore();
  }

  return hitList;
}
