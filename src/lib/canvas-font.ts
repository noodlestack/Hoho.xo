export type CanvasFontCssVar = "--font-mono" | "--font-display" | "--font-sans";

/**
 * Resolve a `next/font` generated CSS custom property to a real font-family
 * string usable by `<canvas>` 2D contexts.
 */
export function resolveCssFontFamily(
  cssVar: CanvasFontCssVar,
  fallback: string,
): string {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return fallback;
  }

  const rootVal = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar)
    .trim();
  const bodyVal =
    !rootVal && document.body
      ? getComputedStyle(document.body).getPropertyValue(cssVar).trim()
      : "";
  const resolved = rootVal || bodyVal;

  if (!resolved) {
    return fallback;
  }

  const fallbackLower = fallback.toLowerCase();
  if (resolved.toLowerCase().includes(fallbackLower)) {
    return resolved;
  }
  return `${resolved}, ${fallback}`;
}

/**
 * Resolve and explicitly trigger `document.fonts.load` + `document.fonts.ready`
 * so canvas rendering does not measure or draw with an unstyled fallback font.
 */
export async function loadCanvasFont(
  weight: number | string,
  sizePx: number,
  cssVar: CanvasFontCssVar,
  fallback: string,
): Promise<string> {
  const family = resolveCssFontFamily(cssVar, fallback);
  if (typeof document !== "undefined" && "fonts" in document) {
    try {
      await document.fonts.load(`${weight} ${sizePx}px ${family}`);
    } catch {
      // Fall through cleanly if the browser rejects custom load strings
    }
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font readiness rejections
    }
  }
  return family;
}
