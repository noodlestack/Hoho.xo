import { describe, expect, it } from "vitest";
import { TREE_THEME_LIST, TREE_THEMES } from "./tree-themes";

function parseHexRgb(hex: string): [number, number, number] {
  const clean = hex.trim().replace(/^#/, "");
  if (clean.length === 3) {
    return [
      Number.parseInt(clean[0] + clean[0], 16),
      Number.parseInt(clean[1] + clean[1], 16),
      Number.parseInt(clean[2] + clean[2], 16),
    ];
  }
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
  ];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHexRgb(hex).map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = relativeLuminance(fgHex);
  const l2 = relativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("tree-themes WCAG AA contrast and cohesive Classic palette", () => {
  it("meets WCAG AA contrast across all 10 themes against qrBg", () => {
    expect(TREE_THEME_LIST).toHaveLength(10);

    for (const theme of TREE_THEME_LIST) {
      expect(
        contrastRatio(theme.qrDark, theme.qrBg),
        `${theme.id}.qrDark`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(theme.qrFinder, theme.qrBg),
        `${theme.id}.qrFinder`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(theme.star, theme.qrBg),
        `${theme.id}.star`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(theme.garland, theme.qrBg),
        `${theme.id}.garland`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(theme.snowColor, theme.qrBg),
        `${theme.id}.snowColor`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(theme.foliage[3], theme.qrBg),
        `${theme.id}.foliage[3]`,
      ).toBeGreaterThanOrEqual(4.5);

      expect(
        contrastRatio(theme.swatch, theme.qrBg),
        `${theme.id}.swatch`,
      ).toBeGreaterThanOrEqual(3.0);
      expect(
        contrastRatio(theme.foliage[2], theme.qrBg),
        `${theme.id}.foliage[2]`,
      ).toBeGreaterThanOrEqual(3.0);

      for (const light of theme.lights) {
        expect(
          contrastRatio(light, theme.qrBg),
          `${theme.id}.light(${light})`,
        ).toBeGreaterThanOrEqual(3.0);
      }
    }
  });

  it("uses cohesive warm gold lights and pine foliage on Classic", () => {
    const classic = TREE_THEMES.classic;
    expect(classic.swatch).toBe("#F5C451");
    expect(classic.lights).toEqual([
      "#F5C451",
      "#FFE394",
      "#FFD166",
      "#FFF2C2",
    ]);
    expect(classic.foliage).toEqual([
      "#1A4A36",
      "#2A6D50",
      "#3E9B70",
      "#7EF0B4",
    ]);
    expect(classic.qrBg).toBe("#0B0D12");
  });
});
