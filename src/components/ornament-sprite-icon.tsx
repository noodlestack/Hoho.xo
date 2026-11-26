"use client";

import { useEffect, useRef } from "react";
import { drawOrnamentSilhouette } from "@/lib/ornament-sprites";

interface OrnamentSpriteIconProps {
  typeId: number;
  color: string;
  size?: number;
  unread?: boolean;
  className?: string;
}

export function OrnamentSpriteIcon({
  typeId,
  color,
  size = 20,
  unread = false,
  className,
}: OrnamentSpriteIconProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(size * dpr));
    canvas.height = Math.max(1, Math.round(size * dpr));

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const half = size / 2;
    const radius = Math.max(5, size * 0.44);

    const diskGrad = ctx.createRadialGradient(
      half - radius * 0.25,
      half - radius * 0.25,
      radius * 0.1,
      half,
      half,
      radius,
    );
    diskGrad.addColorStop(0, "#1c2734");
    diskGrad.addColorStop(1, "#0a1017");
    ctx.fillStyle = diskGrad;
    ctx.beginPath();
    ctx.arc(half, half, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = unread ? "#f5c451" : "rgba(255, 255, 255, 0.38)";
    ctx.lineWidth = unread ? 1.4 : 1;
    ctx.beginPath();
    ctx.arc(half, half, radius - 0.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.translate(half, half);
    drawOrnamentSilhouette(ctx, typeId, radius * 0.65, color);
    ctx.restore();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
    ctx.lineWidth = Math.max(0.8, radius * 0.09);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(half, half, radius * 0.78, Math.PI * 1.16, Math.PI * 1.44);
    ctx.stroke();
  }, [typeId, color, size, unread]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
      style={{
        width: size,
        height: size,
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}
