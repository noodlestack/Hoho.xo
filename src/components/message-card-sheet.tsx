"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  Film,
  Flag,
  Gift,
  MailOpen,
  PenLine,
  RotateCcw,
  Share2,
  Sparkles,
  Star,
  Trash2,
  Type,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Drawer } from "vaul";
import { OrnamentSpriteIcon } from "@/components/ornament-sprite-icon";
import {
  formatRelativeTime,
  type ReportReason,
  type TreeMessage,
} from "@/lib/messages";
import {
  exportLetterVideoClip,
  renderStoryCardDataUrl,
  shareOrDownloadPngDataUrl,
  STORY_REPLY_MAX_LENGTH,
  type StoryVibe,
} from "@/lib/share-card";
import { playOrnamentChime } from "@/lib/sound";
import { ORNAMENT_COLORS, ORNAMENT_TYPES } from "@/lib/tree-themes";

type RevealStage = "ornament" | "envelope" | "opening" | "letter";

interface MessageCardSheetProps {
  message: TreeMessage | null;
  messages?: TreeMessage[];
  treeUrl: string;
  displayName?: string;
  prompt?: string;
  christmasLock?: boolean;
  unwrappedIds?: Set<string>;
  onUnwrapId?: (id: string) => void;
  soundEnabled?: boolean;
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
  unwrappedIds: externalUnwrappedIds,
  onUnwrapId,
  soundEnabled = true,
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
  const [exportingVideo, setExportingVideo] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [localUnwrappedIds, setLocalUnwrappedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const unwrappedIds = externalUnwrappedIds ?? localUnwrappedIds;
  const [beforeChristmas] = useState(
    () => Date.now() < Date.parse("2026-12-25T00:00:00"),
  );
  const [revealStage, setRevealStage] = useState<RevealStage>("letter");
  const [replayNonce, setReplayNonce] = useState<number>(0);
  const [handwritingMode, setHandwritingMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("hoho:note-font") === "handwriting";
    } catch {
      return false;
    }
  });
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeStartRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);

  const isWrapped = Boolean(
    message &&
    christmasLock &&
    beforeChristmas &&
    !unwrappedIds.has(message.id),
  );

  // Choreography: Ornament Decoration -> Sealed Holiday Mail -> Flap Opens -> Stationery Letter
  useEffect(() => {
    if (!message) return;
    let cancelled = false;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      queueMicrotask(() => {
        if (!cancelled) setRevealStage(isWrapped ? "envelope" : "letter");
      });
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (!cancelled) setRevealStage("ornament");
    });

    const t1 = window.setTimeout(() => {
      if (!cancelled) setRevealStage("envelope");
    }, 480);

    if (isWrapped) {
      return () => {
        cancelled = true;
        window.clearTimeout(t1);
      };
    }

    const t2 = window.setTimeout(() => {
      if (cancelled) return;
      setRevealStage("opening");
      if (soundEnabled) playOrnamentChime("seal");
    }, 1050);

    const t3 = window.setTimeout(() => {
      if (!cancelled) setRevealStage("letter");
    }, 1620);

    return () => {
      cancelled = true;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [message?.id, replayNonce, isWrapped, soundEnabled, message]);

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
  const isStarred = Boolean(message.starred);
  const recipientLabel = displayName?.trim() || "Friend";

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
    const targetId = message.id;
    if (soundEnabled) playOrnamentChime("seal");
    setRevealStage("opening");
    if (onUnwrapId) {
      onUnwrapId(targetId);
    } else {
      setLocalUnwrappedIds((prev) => new Set(prev).add(targetId));
    }
    window.setTimeout(() => {
      setRevealStage("letter");
    }, 520);
  }

  function handleReplayEnvelope() {
    setReplayNonce((n) => n + 1);
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
        supersample: 2,
      });
      setSharePreviewUrl(url);
    } catch {
      setFeedback("Could not generate 4K Story card in this browser.");
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
        supersample: 2,
      }));
    const outcome = await shareOrDownloadPngDataUrl(
      dataUrl,
      `hoho-xo-letter-${message.seq}-4k.png`,
      "Hoho.xo Holiday Letter",
      treeUrl,
    );
    if (outcome === "shared") {
      onMarkReplied?.(message.id);
      setFeedback("Opened system share sheet (4K PNG).");
    } else if (outcome === "downloaded") {
      onMarkReplied?.(message.id);
      setFeedback("Downloaded Ultra-HD 2160×3840 (4K) Letter PNG.");
    } else {
      setFeedback("Share cancelled.");
    }
  }

  async function handleExportAnimatedVideo() {
    if (!message || exportingVideo) return;
    setExportingVideo(true);
    setFeedback("Recording Full-HD 1080×1920 60fps Letter Reveal video...");
    try {
      const res = await exportLetterVideoClip(message, treeUrl, {
        displayName,
        prompt,
        reply: replyDraft,
        vibe,
      });
      if (res.status === "downloaded") {
        onMarkReplied?.(message.id);
        setFeedback(
          `Downloaded Full-HD 1080×1920 60fps Letter Video (.${res.ext ?? "webm"}).`,
        );
      } else if (res.status === "unsupported") {
        setFeedback(
          "Video capture is unsupported in this browser — export the 4K PNG card instead.",
        );
      } else {
        setFeedback("Could not export video right now.");
      }
    } finally {
      setExportingVideo(false);
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
          className="sheet-panel vaul-sheet-panel letter-modal-panel"
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
                  {ornament.name} Ornament · Letter #{message.seq}
                </span>
              </Drawer.Description>
              <Drawer.Title className="sheet-title" id="msg-card-title">
                Holiday Letter
              </Drawer.Title>
            </div>
            <div className="note-deck-header-actions">
              {!isWrapped ? (
                <button
                  type="button"
                  className="note-deck-btn"
                  aria-label="Replay ornament to mail animation"
                  title="Replay mail animation"
                  onClick={handleReplayEnvelope}
                >
                  <RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
                </button>
              ) : null}
              {onToggleStar ? (
                <button
                  type="button"
                  className="note-deck-btn"
                  aria-label={isStarred ? "Unstar letter" : "Star letter"}
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
                    ? "Switch letter font to editorial serif"
                    : "Switch letter font to handwriting"
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
                aria-label="Close letter"
                onClick={onClose}
              >
                <X size={16} strokeWidth={2.2} aria-hidden="true" />
              </button>
            </div>
          </div>

          {deckList.length > 1 && onSelectMessage ? (
            <div className="note-deck-nav" aria-label="Letter deck navigation">
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

          {/* Animated Decoration -> Holiday Mail Envelope -> Unfolding Stationery Stage */}
          {revealStage !== "letter" ? (
            <div
              className={["mail-morph-stage", `is-stage-${revealStage}`].join(
                " ",
              )}
              onClick={() => {
                if (!isWrapped) setRevealStage("letter");
              }}
              role={isWrapped ? "region" : "button"}
              tabIndex={isWrapped ? -1 : 0}
              aria-label={
                isWrapped
                  ? "Wrapped holiday envelope"
                  : "Opening holiday mail — tap to read immediately"
              }
              onKeyDown={(e) => {
                if (!isWrapped && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  setRevealStage("letter");
                }
              }}
            >
              {revealStage === "ornament" ? (
                <div className="morph-ornament-pod">
                  <div
                    className="morph-ornament-halo"
                    style={{
                      borderColor: ornamentColor,
                      boxShadow: `0 0 42px ${ornamentColor}55`,
                    }}
                  >
                    <OrnamentSpriteIcon
                      typeId={message.ornamentType}
                      color={ornamentColor}
                      size={54}
                      unread
                    />
                  </div>
                  <p className="morph-caption">
                    <Sparkles size={14} aria-hidden="true" />
                    <span>
                      Forming your {ornament.name.toLowerCase()} into mail...
                    </span>
                  </p>
                </div>
              ) : (
                <div className="holiday-envelope-wrap">
                  <div
                    className={[
                      "holiday-envelope",
                      revealStage === "opening" ? "is-opening" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="envelope-airmail-trim" aria-hidden="true" />
                    <div className="envelope-rising-sheet" aria-hidden="true">
                      <span>Dear {recipientLabel},</span>
                    </div>
                    <div className="envelope-pocket" aria-hidden="true" />
                    <div className="envelope-flap" aria-hidden="true" />
                    <div className="envelope-address">
                      <span className="envelope-postmark">
                        NORTH POLE POST · #{message.seq}
                      </span>
                      <span className="envelope-to">For {recipientLabel}</span>
                    </div>
                    <div
                      className="envelope-wax-seal"
                      style={{ borderColor: ornamentColor }}
                      aria-hidden="true"
                    >
                      <OrnamentSpriteIcon
                        typeId={message.ornamentType}
                        color="#FAF5EB"
                        size={22}
                      />
                    </div>
                  </div>

                  {isWrapped ? (
                    <div className="wrapped-envelope-actions">
                      <p className="tree-meta-line text-center">
                        Sealed under your <strong>Wrap until Dec 25</strong>{" "}
                        setting.
                      </p>
                      <button
                        type="button"
                        className="primary-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnwrapNote();
                        }}
                      >
                        <Gift size={15} strokeWidth={2} aria-hidden="true" />
                        <span>Break Wax Seal &amp; Unfold Early</span>
                      </button>
                    </div>
                  ) : (
                    <p className="morph-caption">
                      <MailOpen size={14} aria-hidden="true" />
                      <span>
                        Unfolding your holiday letter... (tap to skip)
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <article
              className="stationery-letter-card message-reading-box"
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
              <div className="stationery-airmail-bar" aria-hidden="true" />
              <div className="stationery-top-row">
                <div>
                  <span className="stationery-postmark">
                    NORTH POLE POST · LETTER #{message.seq}
                  </span>
                  <p className="stationery-salutation">
                    Dear {recipientLabel},
                  </p>
                </div>
                <div
                  className="stationery-stamp"
                  style={{ borderColor: ornamentColor }}
                  aria-hidden="true"
                >
                  <OrnamentSpriteIcon
                    typeId={message.ornamentType}
                    color={ornamentColor}
                    size={22}
                  />
                </div>
              </div>

              <p
                className={[
                  "message-reading-body stationery-body",
                  handwritingMode ? "is-handwriting" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {message.body}
              </p>

              <div className="stationery-signoff-row">
                <span className="stationery-signoff">
                  Warmly, A Secret Holiday Friend
                </span>
                <span className="stationery-seal-mini" aria-hidden="true">
                  ✦
                </span>
              </div>
              <div className="stationery-airmail-bar" aria-hidden="true" />
            </article>
          )}

          <div className="message-meta-row">
            <span>Received {formatRelativeTime(message.createdAt)}</span>
            <span>
              {message.status === "reported"
                ? "Reported · hidden from tree"
                : message.repliedAt
                  ? "Shared · hanging on tree"
                  : "Hanging on your tree"}
            </span>
          </div>

          {!isWrapped && (
            <div className="flex flex-col gap-2">
              <label htmlFor="story-reply-input" className="section-label m-0">
                Your reply for Story / Video export (optional ·{" "}
                {replyDraft.length}/{STORY_REPLY_MAX_LENGTH})
              </label>
              <input
                id="story-reply-input"
                type="text"
                className="social-input"
                maxLength={STORY_REPLY_MAX_LENGTH}
                placeholder="Write a warm reply to include on your Story card..."
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
                <strong>Public share note:</strong> Anyone viewing your exported
                image or video can read this anonymous letter.
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
                  onClick={() => void handleNativeOrDownloadShare()}
                >
                  <Download size={15} strokeWidth={2} aria-hidden="true" />
                  <span>Save 4K Image (2160×3840)</span>
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
                Delete this letter permanently? It will leave your tree and
                Mail.
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
                  Keep letter
                </button>
              </div>
            </div>
          ) : null}

          {feedback && (
            <p className="tree-meta-line" role="status">
              {feedback}
            </p>
          )}

          {!isWrapped ? (
            <div className="action-row">
              <button
                type="button"
                className="primary-btn"
                onClick={() => void handleGeneratePreview()}
                disabled={renderingCard || exportingVideo}
              >
                <Share2 size={15} strokeWidth={2} aria-hidden="true" />
                <span>
                  {renderingCard ? "Rendering 4K..." : "Share Story card"}
                </span>
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => void handleExportAnimatedVideo()}
                disabled={exportingVideo || renderingCard}
              >
                <Film size={15} strokeWidth={2} aria-hidden="true" />
                <span>
                  {exportingVideo ? "Recording HD..." : "Export HD Video"}
                </span>
              </button>
            </div>
          ) : null}

          <div className="action-row">
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
