"use client";

import { Download, Flag, Gift, Share2, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Drawer } from "vaul";
import {
  formatRelativeTime,
  type ReportReason,
  type TreeMessage,
} from "@/lib/messages";
import {
  renderStoryCardDataUrl,
  shareOrDownloadPngDataUrl,
  STORY_REPLY_MAX_LENGTH,
  type StoryVibe,
} from "@/lib/share-card";
import { ORNAMENT_COLORS, ORNAMENT_TYPES } from "@/lib/tree-themes";

interface MessageCardSheetProps {
  message: TreeMessage | null;
  treeUrl: string;
  displayName?: string;
  prompt?: string;
  christmasLock?: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onReport: (id: string, reason: ReportReason) => void;
}

const REPORT_REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: "harassment", label: "Harassment or bullying" },
  { value: "threat", label: "Threat or intimidation" },
  { value: "sexual", label: "Unwanted sexual content" },
  { value: "spam", label: "Spam or repetitive abuse" },
  { value: "self_harm", label: "Self-harm concern" },
  { value: "other", label: "Other safety concern" },
];

const STORY_VIBES: Array<{ id: StoryVibe; label: string }> = [
  { id: "night", label: "Night" },
  { id: "pine", label: "Pine" },
  { id: "ember", label: "Ember" },
  { id: "blush", label: "Blush" },
];

export function MessageCardSheet({
  message,
  treeUrl,
  displayName,
  prompt,
  christmasLock = false,
  onClose,
  onDelete,
  onReport,
}: MessageCardSheetProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showReportPicker, setShowReportPicker] = useState(false);
  const [selectedReason, setSelectedReason] =
    useState<ReportReason>("harassment");
  const [replyDraft, setReplyDraft] = useState("");
  const [vibe, setVibe] = useState<StoryVibe>("night");
  const [sharePreviewUrl, setSharePreviewUrl] = useState<string | null>(null);
  const [renderingCard, setRenderingCard] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [unwrappedIds, setUnwrappedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [beforeChristmas] = useState(
    () => Date.now() < Date.parse("2026-12-25T00:00:00"),
  );

  if (!message) {
    return (
      <Drawer.Root
        open={false}
        onOpenChange={(next) => {
          if (!next) onClose();
        }}
      />
    );
  }

  const ornament = ORNAMENT_TYPES[message.ornamentType] ?? ORNAMENT_TYPES[0];
  const ornamentColor =
    ORNAMENT_COLORS[message.colorIdx % ORNAMENT_COLORS.length] ?? "#F5C451";
  const exactTimestamp = new Date(message.createdAt).toLocaleString();
  const isWrapped =
    christmasLock && beforeChristmas && !unwrappedIds.has(message.id);

  async function handleGeneratePreview(overrideVibe?: StoryVibe) {
    if (!message || renderingCard) return;
    setRenderingCard(true);
    setFeedback("");
    try {
      const url = await renderStoryCardDataUrl(message, treeUrl, {
        displayName,
        prompt,
        reply: replyDraft,
        vibe: overrideVibe ?? vibe,
      });
      setSharePreviewUrl(url);
    } catch {
      setFeedback("Could not generate Story card in this browser.");
    } finally {
      setRenderingCard(false);
    }
  }

  async function handleNativeOrDownloadShare() {
    if (!message) return;
    setFeedback("");
    const dataUrl =
      sharePreviewUrl ??
      (await renderStoryCardDataUrl(message, treeUrl, {
        displayName,
        prompt,
        reply: replyDraft,
        vibe,
      }));
    const outcome = await shareOrDownloadPngDataUrl(
      dataUrl,
      `hoho-xo-note-${message.seq}.png`,
      "Hoho.xo anonymous note",
      treeUrl,
    );
    if (outcome === "shared") {
      setFeedback("Opened system share sheet.");
    } else if (outcome === "downloaded") {
      setFeedback("Downloaded 1080×1920 Story card PNG.");
    } else {
      setFeedback("Share cancelled.");
    }
  }

  return (
    <Drawer.Root
      open={Boolean(message)}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="drawer-backdrop" />
        <Drawer.Content
          className="sheet-panel vaul-sheet-panel"
          aria-labelledby="msg-card-title"
        >
          <div className="vaul-drag-handle" aria-hidden="true" />
          <div className="sheet-header">
            <div>
              <Drawer.Description
                className="sheet-eyebrow"
                style={{ color: ornamentColor }}
              >
                {ornament.glyph} {ornament.name} · Note #{message.seq}
              </Drawer.Description>
              <Drawer.Title className="sheet-title" id="msg-card-title">
                Anonymous Note
              </Drawer.Title>
            </div>
          <button
            type="button"
            className="icon-close-btn"
            aria-label="Close note"
            onClick={onClose}
          >
            <X size={16} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>

        {isWrapped ? (
          <div className="message-reading-box flex flex-col gap-3 items-start">
            <p className="sheet-eyebrow">Wrapped until Dec 25</p>
            <p className="tree-meta-line">
              This ornament gift is wrapped under your Christmas lock setting.
            </p>
            <button
              type="button"
              className="secondary-btn"
              onClick={() =>
                setUnwrappedIds((prev) => new Set(prev).add(message.id))
              }
            >
              <Gift size={14} strokeWidth={2} aria-hidden="true" />
              <span>Unwrap &amp; peek anyway</span>
            </button>
          </div>
        ) : (
          <div className="message-reading-box">
            <p className="message-reading-body">{message.body}</p>
          </div>
        )}

        <div className="message-meta-row">
          <span title={exactTimestamp}>
            Received {formatRelativeTime(message.createdAt)} ({exactTimestamp})
          </span>
          <span>
            {message.status === "reported"
              ? "Reported · hidden from tree"
              : "On tree if in latest 100"}
          </span>
        </div>

        {!isWrapped && (
          <div className="flex flex-col gap-2">
            <label htmlFor="story-reply-input" className="section-label m-0">
              Add your reply for Story card (optional · {replyDraft.length}/
              {STORY_REPLY_MAX_LENGTH})
            </label>
            <input
              id="story-reply-input"
              type="text"
              className="social-input"
              maxLength={STORY_REPLY_MAX_LENGTH}
              placeholder="Write a quick reply for your IG Story card..."
              value={replyDraft}
              onChange={(event) => {
                setReplyDraft(event.target.value);
                if (sharePreviewUrl) setSharePreviewUrl(null);
              }}
            />
            <div className="vibe-pill-row" role="group" aria-label="Story card vibe">
              {STORY_VIBES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="filter-tab"
                  aria-pressed={vibe === item.id}
                  onClick={() => {
                    setVibe(item.id);
                    if (sharePreviewUrl) void handleGeneratePreview(item.id);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {sharePreviewUrl ? (
          <div className="share-preview-card">
            <div className="disclosure-box">
              <strong>Public share warning:</strong> Anyone who views your Story
              or downloaded PNG can read this anonymous note.
            </div>
            <Image
              src={sharePreviewUrl}
              alt="1080 by 1920 Story share card preview"
              className="share-preview-img"
              width={270}
              height={480}
              unoptimized
            />
            <div className="action-row">
              <button
                type="button"
                className="primary-btn"
                onClick={handleNativeOrDownloadShare}
              >
                <Download size={15} strokeWidth={2} aria-hidden="true" />
                <span>Download / Share 1080×1920 PNG</span>
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setSharePreviewUrl(null)}
              >
                Hide preview
              </button>
            </div>
          </div>
        ) : null}

        {showReportPicker ? (
          <div className="share-preview-card">
            <label htmlFor="report-reason-select" className="section-label m-0">
              Report reason (removes ornament from tree)
            </label>
            <select
              id="report-reason-select"
              className="social-input"
              value={selectedReason}
              onChange={(event) =>
                setSelectedReason(event.target.value as ReportReason)
              }
            >
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <div className="action-row">
              <button
                type="button"
                className="danger-btn"
                onClick={() => {
                  onReport(message.id, selectedReason);
                  setShowReportPicker(false);
                }}
              >
                Confirm report
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowReportPicker(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {confirmDelete ? (
          <div className="error-box flex flex-col gap-2">
            <span>
              Delete this note permanently? It will leave your tree and Mail.
            </span>
            <div className="action-row">
              <button
                type="button"
                className="danger-btn"
                onClick={() => onDelete(message.id)}
              >
                Delete permanently
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setConfirmDelete(false)}
              >
                Keep note
              </button>
            </div>
          </div>
        ) : null}

        {feedback && (
          <p className="tree-meta-line" role="status">
            {feedback}
          </p>
        )}

        <div className="action-row">
          <button
            type="button"
            className="primary-btn"
            onClick={() => void handleGeneratePreview()}
            disabled={renderingCard}
          >
            <Share2 size={15} strokeWidth={2} aria-hidden="true" />
            <span>{renderingCard ? "Rendering..." : "Share Story card"}</span>
          </button>
          {message.status !== "reported" && (
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setShowReportPicker((prev) => !prev);
                setConfirmDelete(false);
              }}
            >
              <Flag size={15} strokeWidth={2} aria-hidden="true" />
              <span>Report</span>
            </button>
          )}
          <button
            type="button"
            className="danger-btn"
            onClick={() => {
              setConfirmDelete((prev) => !prev);
              setShowReportPicker(false);
            }}
          >
            <Trash2 size={15} strokeWidth={2} aria-hidden="true" />
            <span>Delete</span>
          </button>
        </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
