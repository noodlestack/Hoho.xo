"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { loadCanvasFont } from "@/lib/canvas-font";
import { computeTreeLayout, type TreeLayoutMetrics } from "@/lib/tree-layout";

export interface UseTreeLayoutResult extends TreeLayoutMetrics {
  fontFamily: string;
  fontLoaded: boolean;
}

function measureMonoGlyphRatios(fontFamily: string): {
  glyphRatio: number;
  lineRatio: number;
} {
  if (typeof document === "undefined") {
    return { glyphRatio: 0.6, lineRatio: 1.15 };
  }
  const sampleCanvas = document.createElement("canvas");
  const ctx = sampleCanvas.getContext("2d");
  if (!ctx) {
    return { glyphRatio: 0.6, lineRatio: 1.15 };
  }

  const sampleSize = 24;
  ctx.font = `600 ${sampleSize}px ${fontFamily}`;
  const metrics = ctx.measureText("M");
  const rawGlyphRatio = metrics.width > 0 ? metrics.width / sampleSize : 0.6;
  const glyphRatio = Math.max(0.45, Math.min(0.8, rawGlyphRatio));

  const ascent = metrics.fontBoundingBoxAscent;
  const descent = metrics.fontBoundingBoxDescent;
  const rawLineRatio =
    Number.isFinite(ascent) && Number.isFinite(descent) && ascent + descent > 0
      ? (ascent + descent) / sampleSize
      : 1.15;
  const lineRatio = Math.max(1.05, Math.min(1.35, rawLineRatio));

  return { glyphRatio, lineRatio };
}

/**
 * Measure canvas container bounds with ResizeObserver + live font metrics,
 * debounced at 100ms on resize/orientation/zoom changes.
 */
export function useTreeLayout(
  containerRef: RefObject<HTMLElement | null>,
): UseTreeLayoutResult {
  const [box, setBox] = useState<{ width: number; height: number }>({
    width: 390,
    height: 600,
  });
  const [fontState, setFontState] = useState<{
    fontFamily: string;
    fontLoaded: boolean;
    glyphRatio: number;
    lineRatio: number;
  }>({
    fontFamily: "monospace",
    fontLoaded: false,
    glyphRatio: 0.6,
    lineRatio: 1.15,
  });
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadCanvasFont(600, 12, "--font-mono", "monospace").then(
      (loadedFamily) => {
        if (cancelled) return;
        const { glyphRatio, lineRatio } = measureMonoGlyphRatios(loadedFamily);
        setFontState({
          fontFamily: loadedFamily,
          fontLoaded: true,
          glyphRatio,
          lineRatio,
        });
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const readSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nextW = Math.round(rect.width);
      const nextH = Math.round(rect.height);
      setBox((prev) =>
        prev.width === nextW && prev.height === nextH
          ? prev
          : { width: nextW, height: nextH },
      );
    };

    const scheduleSize = () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = null;
        readSize();
      }, 100);
    };

    readSize();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(scheduleSize);
      ro.observe(el);
    }

    window.addEventListener("orientationchange", scheduleSize);
    window.addEventListener("resize", scheduleSize);
    window.visualViewport?.addEventListener("resize", scheduleSize);

    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
      ro?.disconnect();
      window.removeEventListener("orientationchange", scheduleSize);
      window.removeEventListener("resize", scheduleSize);
      window.visualViewport?.removeEventListener("resize", scheduleSize);
    };
  }, [containerRef]);

  return useMemo(() => {
    const metrics = computeTreeLayout({
      containerWidth: box.width,
      containerHeight: box.height,
      measuredGlyphRatio: fontState.glyphRatio,
      measuredLineRatio: fontState.lineRatio,
    });
    return {
      ...metrics,
      fontFamily: fontState.fontFamily,
      fontLoaded: fontState.fontLoaded,
    };
  }, [box.height, box.width, fontState]);
}
