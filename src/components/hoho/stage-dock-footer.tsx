"use client";

import {
  Download,
  HelpCircle,
  QrCode,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  Fragment,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import type {
  CameraViewMode,
  ResolvedOrnament,
} from "@/components/ascii-tree-canvas";
import { getKeyboardShortcuts } from "@/components/hoho/experience-helpers";
import { OrnamentSpriteIcon } from "@/components/ornament-sprite-icon";
import type { TreeMessage } from "@/lib/messages";
import { SLOT_COUNT } from "@/lib/qr-tree";
import { ORNAMENT_COLORS, type TreeTheme } from "@/lib/tree-themes";

interface StageDockFooterProps {
  viewMode: CameraViewMode;
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  shortcutsOpen: boolean;
  setShortcutsOpen: Dispatch<SetStateAction<boolean>>;
  shortcutsWrapRef: RefObject<HTMLDivElement | null>;
  isOwnerMode: boolean;
  theme: TreeTheme;
  showOrnaments: boolean;
  resolvedOrnaments: ResolvedOrnament[];
  onDownloadQr: () => Promise<void>;
  onToggleQr: () => void;
  onOpenMessage: (msg: TreeMessage) => void;
}

/** Bottom overlay dock for zoom controls, keyboard shortcut help, QR export, and recent ornaments. */
export function StageDockFooter({
  viewMode,
  zoom,
  setZoom,
  shortcutsOpen,
  setShortcutsOpen,
  shortcutsWrapRef,
  isOwnerMode,
  theme,
  showOrnaments,
  resolvedOrnaments,
  onDownloadQr,
  onToggleQr,
  onOpenMessage,
}: StageDockFooterProps) {
  return (
    <div className="stage-footer">
      <div className="stage-footer-left">
        {viewMode !== "qr" ? (
          <div className="stage-controls" role="group" aria-label="Tree zoom">
            <button
              type="button"
              className="stage-zoom-btn"
              aria-label="Zoom out tree"
              title="Zoom out"
              onClick={() =>
                setZoom((z) => Math.max(0.72, Number((z - 0.12).toFixed(2))))
              }
            >
              <ZoomOut size={15} strokeWidth={2.1} aria-hidden="true" />
            </button>
            <span className="stage-zoom-pct" aria-hidden="true">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              className="stage-zoom-btn"
              aria-label="Zoom in tree"
              title="Zoom in"
              onClick={() =>
                setZoom((z) => Math.min(1.45, Number((z + 0.12).toFixed(2))))
              }
            >
              <ZoomIn size={15} strokeWidth={2.1} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="stage-zoom-btn"
              aria-label="Reset zoom"
              title="Reset view"
              onClick={() => setZoom(1)}
            >
              <RotateCcw size={14} strokeWidth={2.1} aria-hidden="true" />
            </button>
          </div>
        ) : null}

        <div
          ref={shortcutsWrapRef}
          className="shortcuts-wrap"
          data-hide-mobile="true"
        >
          <button
            type="button"
            className="shortcuts-btn"
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
            aria-expanded={shortcutsOpen}
            onClick={() => setShortcutsOpen((prev) => !prev)}
          >
            <HelpCircle size={14} strokeWidth={2} aria-hidden="true" />
          </button>
          {shortcutsOpen ? (
            <div
              className="shortcuts-popover"
              role="dialog"
              aria-label="Keyboard shortcuts"
            >
              <p className="shortcuts-title">Shortcuts</p>
              <div className="shortcuts-grid">
                {getKeyboardShortcuts(isOwnerMode).map((item) => (
                  <Fragment key={item.key}>
                    <kbd>{item.key}</kbd>
                    <span>{item.label}</span>
                  </Fragment>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="stage-footer-center">
        {viewMode === "qr" ? (
          <button
            type="button"
            className="qr-download-pill"
            onClick={() => void onDownloadQr()}
          >
            <Download size={14} strokeWidth={2.1} aria-hidden="true" />
            <span>Save {theme.label} QR PNG</span>
          </button>
        ) : (
          <button type="button" className="hint-pill" onClick={onToggleQr}>
            <QrCode size={14} strokeWidth={2} aria-hidden="true" />
            <span>Tap tree for QR</span>
          </button>
        )}
      </div>

      {isOwnerMode &&
      resolvedOrnaments.length > 0 &&
      showOrnaments &&
      viewMode !== "qr" ? (
        <div className="ornament-dock-bar" aria-label="Recent tree ornaments">
          <span className="ornament-dock-label">
            On tree ({resolvedOrnaments.length}/{SLOT_COUNT})
          </span>
          <div className="ornament-chip-row">
            {resolvedOrnaments.slice(0, 18).map((item) => {
              const color =
                ORNAMENT_COLORS[item.colorIdx] ?? ORNAMENT_COLORS[0];
              const isUnread = item.readAt === null;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={["ornament-chip", isUnread ? "is-unread" : ""]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onOpenMessage(item)}
                >
                  {isUnread ? (
                    <span className="ornament-chip-dot" aria-hidden="true" />
                  ) : null}
                  <OrnamentSpriteIcon
                    typeId={item.ornamentType}
                    color={color}
                    size={18}
                    unread={isUnread}
                  />
                  <span>#{item.seq}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <span aria-hidden="true" />
      )}
    </div>
  );
}
