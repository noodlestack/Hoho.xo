"use client";

import { Share2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Drawer } from "vaul";
import {
  INVITE_TEMPLATES,
  renderInviteStoryCardDataUrl,
  shareOrDownloadPngDataUrl,
  type InviteTemplateId,
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setBusy(true);
    });
    void renderInviteStoryCardDataUrl(treeUrl, theme, config, template)
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
  ]);

  async function handleShareOrDownload() {
    setBusy(true);
    try {
      const dataUrl =
        previewUrl ??
        (await renderInviteStoryCardDataUrl(treeUrl, theme, config, template));
      const outcome = await shareOrDownloadPngDataUrl(
        dataUrl,
        `hoho-xo-${config.handle}-story-${template}.png`,
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
                1080×1920 IG / TikTok Story Invite
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

          <div
            className="vibe-pill-row"
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
              <Image
                src={previewUrl}
                alt="1080 by 1920 Story invite preview"
                className="share-preview-img"
                width={270}
                height={480}
                unoptimized
              />
            </div>
          ) : (
            <div className="message-reading-box">
              <p className="tree-meta-line">
                {busy ? "Rendering 1080×1920 Story invite..." : "Preview unavailable."}
              </p>
            </div>
          )}

          <p className="tree-meta-line">
            The lower-middle band stays quiet so you can drop your Instagram or
            TikTok link sticker cleanly.
          </p>

          <button
            type="button"
            className="primary-btn"
            disabled={busy}
            onClick={() => void handleShareOrDownload()}
          >
            <Share2 size={15} strokeWidth={2} aria-hidden="true" />
            <span>
              {busy ? "Preparing Story card..." : "Share / Save 1080×1920 PNG"}
            </span>
          </button>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
