"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { OrnamentSpriteIcon } from "@/components/ornament-sprite-icon";
import { ORNAMENT_COLORS, ORNAMENT_TYPES } from "@/lib/tree-themes";

interface OrnamentPickerStripProps {
  selectedOrnament: number | null;
  onSelect: (ornamentId: number | null) => void;
}

/** Shared horizontal ornament style picker with explicit scroll affordance (fixes OBS-11). */
export function OrnamentPickerStrip({
  selectedOrnament,
  onSelect,
}: OrnamentPickerStripProps) {
  const stripRef = useRef<HTMLDivElement | null>(null);

  function scrollByOffset(dx: number) {
    stripRef.current?.scrollBy({ left: dx, behavior: "smooth" });
  }

  return (
    <div className="ornament-picker-section">
      <div className="ornament-picker-header">
        <span className="section-label m-0">
          Pick an ornament ({ORNAMENT_TYPES.length} decorations)
        </span>
        <div className="ornament-scroll-controls">
          <button
            type="button"
            className="ornament-scroll-btn"
            aria-label="Scroll ornaments left"
            onClick={() => scrollByOffset(-180)}
          >
            <ChevronLeft size={14} strokeWidth={2.2} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="ornament-scroll-btn"
            aria-label="Scroll ornaments right"
            onClick={() => scrollByOffset(180)}
          >
            <ChevronRight size={14} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        ref={stripRef}
        className="ornament-strip"
        role="group"
        aria-label="Choose ornament style"
      >
        <button
          type="button"
          className="ornament-pill is-picker-tile"
          aria-pressed={selectedOrnament === null}
          onClick={() => onSelect(null)}
        >
          {selectedOrnament === null ? (
            <span className="ornament-check-badge" aria-hidden="true">
              ✓
            </span>
          ) : null}
          <span className="ornament-pill-glyph" aria-hidden="true">
            ✨
          </span>
          <span>Surprise</span>
        </button>
        {ORNAMENT_TYPES.map((item) => (
          <button
            key={item.id}
            type="button"
            className="ornament-pill is-picker-tile"
            aria-pressed={selectedOrnament === item.id}
            onClick={() => onSelect(item.id)}
          >
            {selectedOrnament === item.id ? (
              <span className="ornament-check-badge" aria-hidden="true">
                ✓
              </span>
            ) : null}
            <span className="ornament-pill-glyph" aria-hidden="true">
              <OrnamentSpriteIcon
                typeId={item.id}
                color={
                  ORNAMENT_COLORS[item.id % ORNAMENT_COLORS.length] ?? "#F5C451"
                }
                size={20}
              />
            </span>
            <span>{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
