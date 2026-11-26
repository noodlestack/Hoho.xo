"use client";

import {
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent,
  type RefObject,
} from "react";
import type {
  CameraViewMode,
  ProjectedOrnamentHit,
  ResolvedOrnament,
} from "@/components/tree/canvas-types";

interface UseCanvasPointersOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  viewMode: CameraViewMode;
  ornaments: ResolvedOrnament[];
  isOwnerMode: boolean;
  reducedMotion: boolean;
  internalZoomRef: MutableRefObject<number>;
  onZoomChangeRef: MutableRefObject<((nextZoom: number) => void) | undefined>;
  yawRef: MutableRefObject<number>;
  projectedOrnamentsRef: MutableRefObject<ProjectedOrnamentHit[]>;
  hoveredIdRef: MutableRefObject<string | null>;
  wiggleRef: MutableRefObject<{ id: string | null; startedAt: number }>;
  drawNowRef: MutableRefObject<() => void>;
  onSelectOrnament: (ornament: ResolvedOrnament) => void;
  onToggleQrView: () => void;
}

/** Handles drag rotation, pinch zoom, hover detection, and ornament tap hit-testing on the canvas. */
export function useCanvasPointers({
  canvasRef,
  viewMode,
  ornaments,
  isOwnerMode,
  reducedMotion,
  internalZoomRef,
  onZoomChangeRef,
  yawRef,
  projectedOrnamentsRef,
  hoveredIdRef,
  wiggleRef,
  drawNowRef,
  onSelectOrnament,
  onToggleQrView,
}: UseCanvasPointersOptions) {
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(
    new Map(),
  );
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);
  const wasPinchingRef = useRef(false);
  const dragStateRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    lastX: 0,
    moved: false,
  });

  const [hoveredInfo, setHoveredInfo] = useState<{
    ornament: ResolvedOrnament;
    x: number;
    y: number;
  } | null>(null);

  const findOrnamentAt = (
    clientX: number,
    clientY: number,
    pointerType = "mouse",
  ): { ornament: ResolvedOrnament; hit: ProjectedOrnamentHit } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const hits = projectedOrnamentsRef.current;
    let best: { hit: ProjectedOrnamentHit; dist: number } | null = null;
    for (let i = hits.length - 1; i >= 0; i -= 1) {
      const hit = hits[i];
      const hitRadius = Math.max(hit.r, pointerType === "touch" ? 24 : 15);
      const d = Math.hypot(x - hit.x, y - hit.y);
      if (d <= hitRadius && (!best || d < best.dist)) {
        best = { hit, dist: d };
      }
    }
    if (!best) return null;
    const found = ornaments.find((item) => item.id === best.hit.id);
    return found ? { ornament: found, hit: best.hit } : null;
  };

  const clearPointerHover = (pointerId: number) => {
    activePointersRef.current.delete(pointerId);
    if (activePointersRef.current.size < 2) pinchStartDistRef.current = null;
    if (activePointersRef.current.size === 0) wasPinchingRef.current = false;
    dragStateRef.current.active = false;
    if (hoveredIdRef.current !== null) {
      hoveredIdRef.current = null;
      if (reducedMotion) drawNowRef.current();
    }
    setHoveredInfo(null);
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (activePointersRef.current.size === 2 && viewMode !== "qr") {
      const pts = Array.from(activePointersRef.current.values());
      pinchStartDistRef.current = Math.hypot(
        pts[0].x - pts[1].x,
        pts[0].y - pts[1].y,
      );
      pinchStartZoomRef.current = internalZoomRef.current;
      wasPinchingRef.current = true;
      dragStateRef.current.active = false;
      return;
    }
    dragStateRef.current = {
      active: viewMode !== "qr" && activePointersRef.current.size === 1,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      moved: false,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (activePointersRef.current.has(event.pointerId)) {
      activePointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
    }
    if (
      activePointersRef.current.size === 2 &&
      pinchStartDistRef.current &&
      pinchStartDistRef.current > 0 &&
      viewMode !== "qr"
    ) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const nextZoom = Math.max(
        0.72,
        Math.min(
          1.45,
          Number(
            (
              pinchStartZoomRef.current *
              (dist / pinchStartDistRef.current)
            ).toFixed(3),
          ),
        ),
      );
      internalZoomRef.current = nextZoom;
      onZoomChangeRef.current?.(nextZoom);
      if (reducedMotion) drawNowRef.current();
      return;
    }
    if (
      dragStateRef.current.active &&
      dragStateRef.current.pointerId === event.pointerId
    ) {
      const dx = event.clientX - dragStateRef.current.lastX;
      if (
        Math.hypot(
          event.clientX - dragStateRef.current.startX,
          event.clientY - dragStateRef.current.startY,
        ) > 6
      ) {
        dragStateRef.current.moved = true;
      }
      yawRef.current += dx * 0.008;
      dragStateRef.current.lastX = event.clientX;
      if (reducedMotion) drawNowRef.current();
      return;
    }
    if (event.pointerType === "mouse") {
      const hovered = findOrnamentAt(
        event.clientX,
        event.clientY,
        event.pointerType,
      );
      const nextHoveredId = hovered ? hovered.ornament.id : null;
      if (hoveredIdRef.current !== nextHoveredId) {
        hoveredIdRef.current = nextHoveredId;
        if (reducedMotion) drawNowRef.current();
      }
      setHoveredInfo(
        hovered
          ? {
              ornament: hovered.ornament,
              x: hovered.hit.x,
              y: hovered.hit.y,
            }
          : null,
      );
    }
  };

  const onPointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(event.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchStartDistRef.current = null;
    }
    if (wasPinchingRef.current) {
      dragStateRef.current.active = false;
      if (activePointersRef.current.size === 0) {
        wasPinchingRef.current = false;
      }
      return;
    }
    const wasMoved = dragStateRef.current.moved;
    dragStateRef.current.active = false;
    if (wasMoved) return;

    const found = findOrnamentAt(
      event.clientX,
      event.clientY,
      event.pointerType,
    );
    if (found) {
      if (!isOwnerMode) {
        wiggleRef.current = {
          id: found.ornament.id,
          startedAt: performance.now(),
        };
      }
      onSelectOrnament(found.ornament);
      return;
    }
    onToggleQrView();
  };

  return {
    dragStateRef,
    hoveredInfo,
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerLeave: (event: PointerEvent<HTMLCanvasElement>) =>
        clearPointerHover(event.pointerId),
      onPointerCancel: (event: PointerEvent<HTMLCanvasElement>) =>
        clearPointerHover(event.pointerId),
    },
  };
}
