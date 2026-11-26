import { describe, expect, it } from "vitest";
import {
  computeTreeLayout,
  TREE_MAX_FONT_SIZE,
  TREE_MIN_FONT_SIZE,
} from "./tree-layout";

describe("computeTreeLayout", () => {
  const TARGET_VIEWPORTS = [
    { name: "360x640", w: 360, h: 640 },
    { name: "390x844", w: 390, h: 844 },
    { name: "768x1024", w: 768, h: 1024 },
    { name: "1024x768", w: 1024, h: 768 },
    { name: "1440x900", w: 1020, h: 820 }, // remaining stage beside ~420px studio panel
    { name: "1920x1080", w: 1500, h: 1000 },
    { name: "2560x1440", w: 2140, h: 1360 },
  ] as const;

  it("computes valid positive metrics across all target viewports", () => {
    for (const vp of TARGET_VIEWPORTS) {
      const m = computeTreeLayout({
        containerWidth: vp.w,
        containerHeight: vp.h,
      });

      expect(m.fontSize).toBeGreaterThanOrEqual(TREE_MIN_FONT_SIZE);
      expect(m.fontSize).toBeLessThanOrEqual(TREE_MAX_FONT_SIZE);
      expect(m.cellW).toBeGreaterThan(0);
      expect(m.cellH).toBeGreaterThan(0);
      expect(m.cols).toBeGreaterThan(20);
      expect(m.rows).toBeGreaterThan(20);
      expect(m.treeScale).toBeGreaterThan(0);
      expect(m.qrBoxSide).toBeGreaterThanOrEqual(150);
      expect(m.fittedWidth).toBeLessThanOrEqual(m.usableWidth + 0.01);
      expect(m.fittedHeight).toBeLessThanOrEqual(m.usableHeight + 0.01);
    }
  });

  it("clamps fontSize between 8px minimum and 16px maximum on extreme boxes", () => {
    const tiny = computeTreeLayout({
      containerWidth: 220,
      containerHeight: 260,
    });
    expect(tiny.fontSize).toBe(TREE_MIN_FONT_SIZE);

    const fourK = computeTreeLayout({
      containerWidth: 3840,
      containerHeight: 2160,
    });
    expect(fourK.fontSize).toBe(TREE_MAX_FONT_SIZE);
  });

  it("is width-limited in portrait containers and height-limited in wide containers", () => {
    const portrait = computeTreeLayout({
      containerWidth: 360,
      containerHeight: 800,
    });
    expect(portrait.fittedWidth).toBeCloseTo(portrait.usableWidth, 2);
    expect(portrait.fittedHeight).toBeLessThan(portrait.usableHeight);

    const landscape = computeTreeLayout({
      containerWidth: 1600,
      containerHeight: 700,
    });
    expect(landscape.fittedHeight).toBeCloseTo(landscape.usableHeight, 2);
    expect(landscape.fittedWidth).toBeLessThan(landscape.usableWidth);
  });

  it("applies measured glyph width and line height ratios dynamically", () => {
    const narrow = computeTreeLayout({
      containerWidth: 1000,
      containerHeight: 800,
      measuredGlyphRatio: 0.55,
      measuredLineRatio: 1.1,
    });
    const wide = computeTreeLayout({
      containerWidth: 1000,
      containerHeight: 800,
      measuredGlyphRatio: 0.72,
      measuredLineRatio: 1.1,
    });

    expect(narrow.cellW).toBeLessThan(wide.cellW);
    expect(narrow.cols).toBeGreaterThan(wide.cols);
  });

  it("assigns container-area quality tiers from low on small phones to high on desktop", () => {
    expect(
      computeTreeLayout({ containerWidth: 360, containerHeight: 480 }).quality,
    ).toBe("low");
    expect(
      computeTreeLayout({ containerWidth: 500, containerHeight: 700 }).quality,
    ).toBe("medium");
    expect(
      computeTreeLayout({ containerWidth: 1020, containerHeight: 820 }).quality,
    ).toBe("high");
  });
});
