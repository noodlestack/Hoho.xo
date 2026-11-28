"use client";

import { Dices, Mail, Send } from "lucide-react";
import Link from "next/link";
import type {
  Dispatch,
  FormEvent,
  MutableRefObject,
  RefObject,
  SetStateAction,
} from "react";
import { writeVisitorDraft } from "@/components/hoho/experience-helpers";
import { OrnamentPickerStrip } from "@/components/hoho/ornament-picker-strip";
import { OrnamentSpriteIcon } from "@/components/ornament-sprite-icon";
import type { TreeMessage } from "@/lib/messages";
import { VISITOR_IDEA_PROMPTS, type TreeConfig } from "@/lib/tree-config";
import type { OrnamentStyle, TreeTheme } from "@/lib/tree-themes";

interface VisitorComposePanelProps {
  activeHandle: string;
  config: TreeConfig;
  theme: TreeTheme;
  avatarGlyph: string;
  daysToChristmas: number | null;
  visibleCount: number;
  visitorSentOrnament: TreeMessage | null;
  setVisitorSentOrnament: Dispatch<SetStateAction<TreeMessage | null>>;
  sentOrnamentColor: string;
  sentOrnamentMeta: OrnamentStyle | null;
  noteBody: string;
  setNoteBody: Dispatch<SetStateAction<string>>;
  honeypot: string;
  setHoneypot: Dispatch<SetStateAction<string>>;
  selectedOrnament: number | null;
  setSelectedOrnament: Dispatch<SetStateAction<number | null>>;
  submittingNote: boolean;
  submitError: string;
  setSubmitError: Dispatch<SetStateAction<string>>;
  composeSubmitKeyRef: MutableRefObject<string | null>;
  visitorInputRef: RefObject<HTMLTextAreaElement | null>;
  visitorSubmitBtnRef: RefObject<HTMLButtonElement | null>;
  onVisitorDice: () => void;
  onSubmit: (event: FormEvent) => Promise<void>;
}

/** Desktop visitor panel showing owner recipient card, clear guided composer, ornament picker, and envelope celebration. */
export function VisitorComposePanel({
  activeHandle,
  config,
  theme,
  avatarGlyph,
  daysToChristmas,
  visibleCount,
  visitorSentOrnament,
  setVisitorSentOrnament,
  sentOrnamentColor,
  sentOrnamentMeta,
  noteBody,
  setNoteBody,
  honeypot,
  setHoneypot,
  selectedOrnament,
  setSelectedOrnament,
  submittingNote,
  submitError,
  setSubmitError,
  composeSubmitKeyRef,
  visitorInputRef,
  visitorSubmitBtnRef,
  onVisitorDice,
  onSubmit,
}: VisitorComposePanelProps) {
  const recipientDisplay = config.displayName || `@${activeHandle}`;

  return (
    <>
      <div className="bio-hero-card">
        <div className="visitor-eyebrow-pill">
          <Mail size={13} strokeWidth={2.2} aria-hidden="true" />
          <span>Send an anonymous holiday letter</span>
        </div>
        <div className="bio-identity-row">
          <div className="avatar-ring" aria-hidden="true">
            {avatarGlyph}
          </div>
          <div className="bio-identity-text">
            <p className="bio-name">{recipientDisplay}</p>
            <p className="bio-handle-line">
              <span>@{activeHandle}</span>
              <span>·</span>
              <span>{theme.label}</span>
              <span>·</span>
              <span className="bio-status-inline">
                <span
                  className={[
                    "status-dot",
                    config.pauseInbox ? "is-paused" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-hidden="true"
                />
                <span>{config.pauseInbox ? "Paused" : "Open"}</span>
              </span>
            </p>
          </div>
        </div>
        <p className="bio-prompt-text">{config.prompt}</p>
        <div className="visitor-meta-pills">
          {daysToChristmas !== null ? (
            <span className="countdown-pill">
              🎄{" "}
              {daysToChristmas === 0
                ? "Merry Christmas!"
                : `${daysToChristmas} ${daysToChristmas === 1 ? "day" : "days"} to Christmas`}
            </span>
          ) : null}
          <span className="tree-count-pill">
            {visibleCount} {visibleCount === 1 ? "letter" : "letters"} on tree
          </span>
        </div>
      </div>

      {config.pauseInbox ? (
        <div className="paused-banner">
          <strong>Letterbox paused</strong>
          <span>@{activeHandle} has paused new holiday letters right now.</span>
          <Link href="/" className="make-tree-link">
            Plant your own tree →
          </Link>
        </div>
      ) : visitorSentOrnament ? (
        <div className="celebrate-box">
          <div
            className="avatar-ring"
            style={{
              margin: "0 auto",
              color: sentOrnamentColor,
              borderColor: sentOrnamentColor,
            }}
            aria-hidden="true"
          >
            <OrnamentSpriteIcon
              typeId={visitorSentOrnament.ornamentType}
              color={sentOrnamentColor}
              size={32}
            />
          </div>
          <p className="celebrate-title">
            Ornament hung on @{activeHandle}&apos;s tree!
          </p>
          <p className="anonymity-note">
            Your letter was sealed inside a{" "}
            <strong>{sentOrnamentMeta?.name ?? "Bauble"}</strong> ornament. Only
            @{activeHandle} can unfold and read it.
          </p>
          <Link href="/" className="primary-btn celebrate-hero-cta">
            <span>Plant your own holiday tree →</span>
          </Link>
          <button
            type="button"
            className="secondary-btn celebrate-again-btn"
            onClick={() => {
              setVisitorSentOrnament(null);
              window.setTimeout(() => visitorInputRef.current?.focus(), 60);
            }}
          >
            Write another letter
          </button>
        </div>
      ) : (
        <form className="compose-box" onSubmit={(e) => void onSubmit(e)}>
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="honeypot-field"
          />
          <label htmlFor="visitor-note-input" className="section-label m-0">
            1. Write your letter (100% anonymous)
          </label>
          <div className="compose-textarea-wrap">
            <textarea
              id="visitor-note-input"
              ref={visitorInputRef}
              className="compose-textarea"
              placeholder={`Dear ${recipientDisplay}, write a holiday wish, favorite memory, or secret note...`}
              maxLength={500}
              value={noteBody}
              onChange={(event) => {
                const nextVal = event.target.value;
                setNoteBody(nextVal);
                writeVisitorDraft(activeHandle, nextVal);
                composeSubmitKeyRef.current = null;
                if (submitError) setSubmitError("");
              }}
              onKeyDown={(event) => {
                if (
                  (event.ctrlKey || event.metaKey) &&
                  event.key === "Enter" &&
                  noteBody.trim().length > 0 &&
                  !submittingNote
                ) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <div className="compose-corner-bar">
              <button
                type="button"
                className="dice-btn is-touch-pill"
                aria-label="Insert a letter starter idea"
                onClick={onVisitorDice}
              >
                <Dices size={14} strokeWidth={2} aria-hidden="true" />
                <span>Idea</span>
              </button>
              <span
                className={[
                  "char-counter",
                  noteBody.length >= 500
                    ? "is-limit"
                    : noteBody.length >= 450
                      ? "is-warn"
                      : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {noteBody.length}/500
              </span>
            </div>
          </div>
          <div className="compose-progress-track" aria-hidden="true">
            <div
              className={[
                "compose-progress-fill",
                noteBody.length >= 450 ? "is-near-limit" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                width: `${Math.min(100, (noteBody.length / 500) * 100)}%`,
              }}
            />
          </div>

          <div className="prompt-chip-row" aria-label="Letter starter prompts">
            {VISITOR_IDEA_PROMPTS.slice(0, 5).map((starter) => (
              <button
                key={starter}
                type="button"
                className="prompt-chip"
                onClick={() => {
                  setNoteBody(starter);
                  writeVisitorDraft(activeHandle, starter);
                  composeSubmitKeyRef.current = null;
                  if (submitError) setSubmitError("");
                  visitorInputRef.current?.focus();
                }}
              >
                {starter}
              </button>
            ))}
          </div>

          <OrnamentPickerStrip
            selectedOrnament={selectedOrnament}
            onSelect={setSelectedOrnament}
          />

          {submitError ? (
            <div className="error-box" role="alert">
              {submitError}
            </div>
          ) : null}

          <button
            ref={visitorSubmitBtnRef}
            type="submit"
            className="primary-btn"
            disabled={noteBody.trim().length === 0 || submittingNote}
          >
            <Send size={15} strokeWidth={2.1} aria-hidden="true" />
            <span>
              {submittingNote ? "Sealing & hanging..." : "Send anonymous note"}
            </span>
          </button>

          <p className="anonymity-note">
            No sign-in needed · Sealed in an envelope for @{activeHandle}
          </p>
        </form>
      )}
    </>
  );
}
