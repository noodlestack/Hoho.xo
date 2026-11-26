"use client";

import { Eye, Film, Share2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Drawer } from "vaul";
import {
  exportInviteReelClip,
  INVITE_TEMPLATES,
  renderInviteStoryCardDataUrl,
  shareOrDownloadPngDataUrl,
  STORY_ASPECT_FORMATS,
  type InviteTemplateId,
  type StoryAspectId,
} from "@/lib/share-card";
import type { TreeConfig } from "@/lib/tree-config";
import type { TreeTheme } from "@/lib/tree-themes";

interface InviteStorySheetProps {
  open: boolean;
  treeUrl: string;
  theme: TreeTheme;
  config: Pick<TreeConfig, "handle" | "displayName" | "prompt">;
  onClose: () => void;
  onResult?: (outcome: "shared" | "downloaded" | "failed") => void;
}

export function InviteStorySheet({
  open,
  treeUrl,
  theme,
  config,
  onClose,
  onResult,
}: InviteStorySheetProps) {
  const [template, setTemplate] = useState<InviteTemplateId>("qr-forward");
  const [aspect, setAspect] = useState<StoryAspectId>("story");
  const [showSafeZone, setShowSafeZone] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reelBusy, setReelBusy] = useState(false);
  const [reelStatus, setReelStatus] = useState("");

  const activeFormat =
    STORY_ASPECT_FORMATS.find((f) => f.id === aspect) ??
    STORY_ASPECT_FORMATS[0];

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setBusy(true);
    });
    void renderInviteStoryCardDataUrl(treeUrl, theme, config, template, aspect)
      .then((url) => {
        if (!cancelled) setPreviewUrl(url);
      })
      .catch(() => {
        if (!cancelled) setPreviewUrl(null);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    open,
    treeUrl,
    theme,
    config.handle,
    config.displayName,
    config.prompt,
    config,
    template,
    aspect,
  ]);

  async function handleShareOrDownload() {
    setBusy(true);
    setReelStatus("");
    try {
      const dataUrl =
        previewUrl ??
        (await renderInviteStoryCardDataUrl(
          treeUrl,
          theme,
          config,
          template,
          aspect,
        ));
      const outcome = await shareOrDownloadPngDataUrl(
        dataUrl,
        `hoho-xo-${config.handle}-${aspect}-${template}.png`,
        `Send an anonymous note to @${config.handle}`,
        treeUrl,
      );
      onResult?.(outcome);
    } catch {
      onResult?.("failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleExportReel() {
    setReelBusy(true);
    setReelStatus("Recording 3s looping Story Reel...");
    try {
      const result = await exportInviteReelClip(
        treeUrl,
        theme,
        config,
        template,
      );
      if (result === "downloaded") {
        setReelStatus("Downloaded 3s looping Reel (.webm).");
      } else if (result === "unsupported") {
        setReelStatus(
          "Video Reel recording is unavailable in this browser — export PNG above instead.",
        );
      } else {
        setReelStatus("Could not record Reel clip.");
      }
    } finally {
      setReelBusy(false);
    }
  }

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="drawer-backdrop" />
        <Drawer.Content
          className="sheet-panel vaul-sheet-panel"
          aria-labelledby="invite-story-title"
        >
          <div className="vaul-drag-handle" aria-hidden="true" />
          <div className="sheet-header">
            <div>
              <Drawer.Description className="sheet-eyebrow">
                {activeFormat.width}×{activeFormat.height} IG / TikTok Share
              </Drawer.Description>
              <Drawer.Title className="sheet-title" id="invite-story-title">
                Share to Story
              </Drawer.Title>
            </div>
            <button
              type="button"
              className="icon-close-btn"
              aria-label="Close Story invite preview"
              onClick={onClose}
            >
              <X size={16} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>

          <div className="invite-aspect-row">
            <div
              role="group"
              aria-label="Story format"
              className="invite-aspect-pills"
            >
              {STORY_ASPECT_FORMATS.map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  className="filter-tab"
                  aria-pressed={aspect === fmt.id}
                  onClick={() => setAspect(fmt.id)}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
            {aspect === "story" ? (
              <button
                type="button"
                className="note-deck-btn"
                aria-pressed={showSafeZone}
                onClick={() => setShowSafeZone((prev) => !prev)}
              >
                <Eye size={14} strokeWidth={2} aria-hidden="true" />
                <span>Safe zone</span>
              </button>
            ) : null}
          </div>

          <div
            className="invite-template-grid"
            role="group"
            aria-label="Story invite template"
          >
            {INVITE_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                className="filter-tab"
                aria-pressed={template === tpl.id}
                onClick={() => setTemplate(tpl.id)}
              >
                {tpl.label}
              </button>
            ))}
          </div>

          {previewUrl ? (
            <div className="share-preview-card">
              <div
                className={[
                  "share-preview-stage",
                  aspect === "story"
                    ? "is-story"
                    : aspect === "portrait"
                      ? "is-portrait"
                      : "is-square",
                ].join(" ")}
              >
                <Image
                  src={previewUrl}
                  alt={`${activeFormat.width} by ${activeFormat.height} ${template} invite preview`}
                  className="share-preview-img"
                  width={Math.round(activeFormat.width / 4)}
                  height={Math.round(activeFormat.height / 4)}
                  unoptimized
                />
                {showSafeZone && aspect === "story" ? (
                  <div className="ig-safe-zone-overlay" aria-hidden="true">
                    <div className="ig-safe-band is-top">IG UI · TOP 14%</div>
                    <div className="ig-safe-sticker">LINK STICKER ZONE</div>
                    <div className="ig-safe-band is-bottom">
                      REPLY BAR · BOTTOM 18%
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="message-reading-box">
              <p className="tree-meta-line">
                {busy
                  ? `Rendering ${activeFormat.width}×${activeFormat.height} card...`
                  : "Preview unavailable."}
              </p>
            </div>
          )}

          {reelStatus ? (
            <p className="tree-meta-line" role="status">
              {reelStatus}
            </p>
          ) : (
            <p className="tree-meta-line">
              {aspect === "story"
                ? "Lower-middle band stays quiet so you can drop your Instagram or TikTok link sticker cleanly."
                : `${activeFormat.label} export ready for Instagram Feed, carousel, or link-in-bio post.`}
            </p>
          )}

          <div className="action-row">
            <button
              type="button"
              className="primary-btn"
              disabled={busy}
              onClick={() => void handleShareOrDownload()}
            >
              <Share2 size={15} strokeWidth={2} aria-hidden="true" />
              <span>
                {busy
                  ? "Preparing..."
                  : `Share / Save ${activeFormat.width}×${activeFormat.height}`}
              </span>
            </button>
            <button
              type="button"
              className="secondary-btn"
              disabled={reelBusy || busy}
              onClick={() => void handleExportReel()}
            >
              <Film size={15} strokeWidth={2} aria-hidden="true" />
              <span>{reelBusy ? "Recording..." : "3s Reel (.webm)"}</span>
            </button>
          </div>

          <details className="bio-guide-details">
            <summary>How to post to IG Story / TikTok Bio</summary>
            <ol>
              <li>
                Tap <strong>Copy</strong> on your tree link in Studio, then save
                your favorite template above.
              </li>
              <li>
                In Instagram Story, upload the PNG, tap the{" "}
                <strong>Link sticker</strong>, and drop it into the lower quiet
                zone.
              </li>
              <li>
                On TikTok or X, paste your tree URL into your profile Bio and
                pin the 3s Reel clip.
              </li>
            </ol>
          </details>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
