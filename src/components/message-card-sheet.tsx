"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  Flag,
  Gift,
  PenLine,
  Share2,
  Star,
  Trash2,
  Type,
  X,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { Drawer } from "vaul";
import { OrnamentSpriteIcon } from "@/components/ornament-sprite-icon";
import { Flip } from "@/lib/gsap-init";
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
  messages?: TreeMessage[];
  treeUrl: string;
  displayName?: string;
  prompt?: string;
  christmasLock?: boolean;
  onClose: () => void;
  onSelectMessage?: (message: TreeMessage) => void;
  onDelete: (id: string) => void;
  onReport: (id: string, reason: ReportReason) => void;
  onToggleStar?: (id: string, starred: boolean) => void;
  onMarkReplied?: (id: string) => void;
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
  messages,
  treeUrl,
  displayName,
  prompt,
  christmasLock = false,
  onClose,
  onSelectMessage,
  onDelete,
  onReport,
  onToggleStar,
  onMarkReplied,
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
  const [handwritingMode, setHandwritingMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("hoho:note-font") === "handwriting";
    } catch {
      return false;
    }
  });
  const [swipeOffset, setSwipeOffset] = useState(0);
  const readingBoxRef = useRef<HTMLDivElement | null>(null);
  const swipeStartRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);

  const deckList = useMemo(() => {
    if (!messages || messages.length === 0) {
      return message ? [message] : [];
    }
    return [...messages].sort((a, b) => b.seq - a.seq);
  }, [messages, message]);

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
  const isStarred = Boolean(message.starred);

  const deckIdx = deckList.findIndex((item) => item.id === message.id);
  const hasPrev = deckIdx > 0 && Boolean(onSelectMessage);
  const hasNext =
    deckIdx >= 0 && deckIdx < deckList.length - 1 && Boolean(onSelectMessage);

  function selectDeckMessage(target: TreeMessage) {
    setConfirmDelete(false);
    setShowReportPicker(false);
    setReplyDraft("");
    setSharePreviewUrl(null);
    setFeedback("");
    setSwipeOffset(0);
    onSelectMessage?.(target);
  }

  function handleToggleHandwriting() {
    setHandwritingMode((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(
          "hoho:note-font",
          next ? "handwriting" : "editorial",
        );
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }

  function handleUnwrapNote() {
    if (!message) return;
    const box = readingBoxRef.current;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let state: ReturnType<typeof Flip.getState> | null = null;
    if (box && !reduced) {
      try {
        state = Flip.getState(box);
      } catch {
        state = null;
      }
    }
    const targetId = message.id;
    setUnwrappedIds((prev) => new Set(prev).add(targetId));
    if (state) {
      window.requestAnimationFrame(() => {
        if (!readingBoxRef.current) return;
        try {
          Flip.from(state, {
            targets: readingBoxRef.current,
            duration: 0.42,
            ease: "power2.out",
            simple: true,
          });
        } catch {
          // Ignore transition failure
        }
      });
    }
  }

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
      onMarkReplied?.(message.id);
      setFeedback("Opened system share sheet.");
    } else if (outcome === "downloaded") {
      onMarkReplied?.(message.id);
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
                className="sheet-eyebrow inline-flex items-center gap-1.5"
                style={{ color: ornamentColor }}
              >
                <OrnamentSpriteIcon
                  typeId={message.ornamentType}
                  color={ornamentColor}
                  size={20}
                  unread={!message.readAt}
                />
                <span>
                  {ornament.name} · Note #{message.seq}
                </span>
              </Drawer.Description>
              <Drawer.Title className="sheet-title" id="msg-card-title">
                Anonymous Note
              </Drawer.Title>
            </div>
            <div className="note-deck-header-actions">
              {onToggleStar ? (
                <button
                  type="button"
                  className="note-deck-btn"
                  aria-label={isStarred ? "Unstar note" : "Star note"}
                  aria-pressed={isStarred}
                  onClick={() => onToggleStar(message.id, !isStarred)}
                >
                  <Star
                    size={15}
                    strokeWidth={2.1}
                    fill={isStarred ? "#F5C451" : "none"}
                    aria-hidden="true"
                  />
                </button>
              ) : null}
              <button
                type="button"
                className="note-deck-btn"
                aria-label={
                  handwritingMode
                    ? "Switch note font to editorial serif"
                    : "Switch note font to handwriting"
                }
                aria-pressed={handwritingMode}
                onClick={handleToggleHandwriting}
              >
                {handwritingMode ? (
                  <PenLine size={14} strokeWidth={2} aria-hidden="true" />
                ) : (
                  <Type size={14} strokeWidth={2} aria-hidden="true" />
                )}
                <span>{handwritingMode ? "Hand" : "Serif"}</span>
              </button>
              <button
                type="button"
                className="icon-close-btn"
                aria-label="Close note"
                onClick={onClose}
              >
                <X size={16} strokeWidth={2.2} aria-hidden="true" />
              </button>
            </div>
          </div>

          {deckList.length > 1 && onSelectMessage ? (
            <div className="note-deck-nav" aria-label="Note deck navigation">
              <button
                type="button"
                className="note-deck-btn"
                disabled={!hasPrev}
                onClick={() => {
                  if (hasPrev) selectDeckMessage(deckList[deckIdx - 1]);
                }}
              >
                <ChevronLeft size={15} strokeWidth={2.1} aria-hidden="true" />
                <span>Prev</span>
              </button>
              <span className="note-deck-counter">
                {deckIdx >= 0 ? deckIdx + 1 : 1} / {deckList.length}
              </span>
              <button
                type="button"
                className="note-deck-btn"
                disabled={!hasNext}
                onClick={() => {
                  if (hasNext) selectDeckMessage(deckList[deckIdx + 1]);
                }}
              >
                <span>Next</span>
                <ChevronRight size={15} strokeWidth={2.1} aria-hidden="true" />
              </button>
            </div>
          ) : null}

          {isWrapped ? (
            <div
              ref={readingBoxRef}
              data-flip-id="note-reading-card"
              className="message-reading-box flex flex-col items-start gap-3"
            >
              <p className="sheet-eyebrow">Wrapped until Dec 25</p>
              <p className="tree-meta-line">
                This ornament gift is wrapped under your Christmas lock setting.
              </p>
              <button
                type="button"
                className="secondary-btn"
                onClick={handleUnwrapNote}
              >
                <Gift size={14} strokeWidth={2} aria-hidden="true" />
                <span>Unwrap &amp; peek anyway</span>
              </button>
            </div>
          ) : (
            <div
              ref={readingBoxRef}
              data-flip-id="note-reading-card"
              className="message-reading-box"
              style={
                swipeOffset !== 0
                  ? { transform: `translateX(${swipeOffset}px)` }
                  : undefined
              }
              onPointerDown={(event) => {
                if (deckList.length <= 1 || !onSelectMessage) return;
                const target = event.target as HTMLElement | null;
                if (target?.closest("button, input, textarea, select, a")) {
                  return;
                }
                swipeStartRef.current = {
                  pointerId: event.pointerId,
                  x: event.clientX,
                  y: event.clientY,
                };
              }}
              onPointerMove={(event) => {
                const start = swipeStartRef.current;
                if (!start || start.pointerId !== event.pointerId) return;
                const dx = event.clientX - start.x;
                const dy = event.clientY - start.y;
                if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
                  setSwipeOffset(Math.max(-44, Math.min(44, dx * 0.45)));
                }
              }}
              onPointerUp={(event) => {
                const start = swipeStartRef.current;
                swipeStartRef.current = null;
                setSwipeOffset(0);
                if (!start || start.pointerId !== event.pointerId) return;
                const dx = event.clientX - start.x;
                const dy = event.clientY - start.y;
                if (Math.abs(dx) >= 56 && Math.abs(dx) > Math.abs(dy) * 1.25) {
                  if (dx < 0 && hasNext) {
                    selectDeckMessage(deckList[deckIdx + 1]);
                  } else if (dx > 0 && hasPrev) {
                    selectDeckMessage(deckList[deckIdx - 1]);
                  }
                }
              }}
              onPointerCancel={() => {
                swipeStartRef.current = null;
                setSwipeOffset(0);
              }}
            >
              <p
                className={[
                  "message-reading-body",
                  handwritingMode ? "is-handwriting" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {message.body}
              </p>
            </div>
          )}

          <div className="message-meta-row">
            <span title={exactTimestamp}>
              Received {formatRelativeTime(message.createdAt)} ({exactTimestamp}
              )
            </span>
            <span>
              {message.status === "reported"
                ? "Reported · hidden from tree"
                : message.repliedAt
                  ? "Replied · on tree if in latest 100"
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
              <div
                className="vibe-pill-row"
                role="group"
                aria-label="Story card vibe"
              >
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
                <strong>Public share warning:</strong> Anyone who views your
                Story or downloaded PNG can read this anonymous note.
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
              <label
                htmlFor="report-reason-select"
                className="section-label m-0"
              >
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
