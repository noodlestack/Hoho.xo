"use client";

import { OrnamentSpriteIcon } from "@/components/ornament-sprite-icon";
import { ORNAMENT_COLORS, ORNAMENT_TYPES } from "@/lib/tree-themes";

interface OrnamentPickerStripProps {
  selectedOrnament: number | null;
  onSelect: (ornamentId: number | null) => void;
}

/** Shared horizontal ornament style picker used on desktop and mobile visitor composers. */
export function OrnamentPickerStrip({
  selectedOrnament,
  onSelect,
}: OrnamentPickerStripProps) {
  return (
    <div>
      <span className="section-label">
        Pick an ornament ({ORNAMENT_TYPES.length} styles)
      </span>
      <div
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
