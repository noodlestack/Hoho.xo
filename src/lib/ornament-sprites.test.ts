import { afterEach, describe, expect, it, vi } from "vitest";
import { ORNAMENT_COLORS, ORNAMENT_TYPES } from "./tree-themes";
import {
  clearOrnamentSpriteCache,
  drawOrnamentSilhouette,
  getOrnamentSpriteCacheSize,
  getOrnamentSpriteCanvas,
  hasOrnamentSprite,
  ORNAMENT_SPRITE_IDS,
} from "./ornament-sprites";

function makeMockCtx() {
  const fillText = vi.fn();
  const strokeText = vi.fn();
  const calls: string[] = [];

  const ctx = {
    fillStyle: "#000000",
    strokeStyle: "#000000",
    lineWidth: 1,
    lineJoin: "round",
    lineCap: "round",
    save: vi.fn(() => calls.push("save")),
    restore: vi.fn(() => calls.push("restore")),
    translate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(() => calls.push("beginPath")),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(() => calls.push("arc")),
    ellipse: vi.fn(() => calls.push("ellipse")),
    rect: vi.fn(() => calls.push("rect")),
    bezierCurveTo: vi.fn(() => calls.push("bezierCurveTo")),
    quadraticCurveTo: vi.fn(() => calls.push("quadraticCurveTo")),
    fill: vi.fn(() => calls.push("fill")),
    stroke: vi.fn(() => calls.push("stroke")),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    fillText,
    strokeText,
  };

  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    fillText,
    strokeText,
    calls,
  };
}

describe("ornament-sprites", () => {
  afterEach(() => {
    clearOrnamentSpriteCache();
    vi.unstubAllGlobals();
  });

  it("covers every ORNAMENT_TYPES id without missing sprites", () => {
    expect(ORNAMENT_SPRITE_IDS.length).toBe(ORNAMENT_TYPES.length);
    for (const item of ORNAMENT_TYPES) {
      expect(hasOrnamentSprite(item.id)).toBe(true);
    }
    expect(hasOrnamentSprite(99)).toBe(false);
  });

  it("renders pure vector silhouettes for all 16 types without calling fillText", () => {
    for (const item of ORNAMENT_TYPES) {
      const { ctx, fillText, strokeText, calls } = makeMockCtx();
      drawOrnamentSilhouette(
        ctx,
        item.id,
        14,
        ORNAMENT_COLORS[item.id % ORNAMENT_COLORS.length],
      );
      expect(fillText).not.toHaveBeenCalled();
      expect(strokeText).not.toHaveBeenCalled();
      expect(calls).toContain("beginPath");
      expect(calls.some((call) => call === "fill" || call === "stroke")).toBe(
        true,
      );
    }
  });

  it("caches DPR-aware offscreen canvases and differentiates unread/hovered state", () => {
    const createElement = vi.fn(() => {
      const { ctx } = makeMockCtx();
      return {
        width: 0,
        height: 0,
        getContext: vi.fn(() => ctx),
      };
    });
    vi.stubGlobal("document", { createElement });

    const first = getOrnamentSpriteCanvas({
      typeId: 0,
      color: "#F5C451",
      radius: 14,
      unread: false,
      hovered: false,
      dpr: 2,
    });
    const second = getOrnamentSpriteCanvas({
      typeId: 0,
      color: "#F5C451",
      radius: 14,
      unread: false,
      hovered: false,
      dpr: 2,
    });
    const unread = getOrnamentSpriteCanvas({
      typeId: 0,
      color: "#F5C451",
      radius: 14,
      unread: true,
      hovered: false,
      dpr: 2,
    });

    expect(first).not.toBeNull();
    expect(second).toBe(first);
    expect(unread).not.toBe(first);
    expect(createElement).toHaveBeenCalledTimes(2);
    expect(getOrnamentSpriteCacheSize()).toBe(2);
  });
});
