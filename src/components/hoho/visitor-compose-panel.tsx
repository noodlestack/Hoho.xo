"use client";

import { Dices } from "lucide-react";
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
import type { TreeConfig } from "@/lib/tree-config";
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

/** Desktop visitor panel showing owner card, ornament count, pause banner, celebration state, and note composer. */
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
  return (
    <>
      <div className="bio-hero-card">
        <div className="bio-identity-row">
          <div className="avatar-ring" aria-hidden="true">
            {avatarGlyph}
          </div>
          <div className="bio-identity-text">
            <p className="bio-name">
              {config.displayName || `@${activeHandle}`}
            </p>
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
                <span>{config.pauseInbox ? "Paused" : "Active"}</span>
              </span>
            </p>
          </div>
        </div>
        <p className="bio-prompt-text">{config.prompt}</p>
        {daysToChristmas !== null ? (
          <span className="countdown-pill">
            🎄{" "}
            {daysToChristmas === 0
              ? "Merry Christmas!"
              : `${daysToChristmas} ${daysToChristmas === 1 ? "day" : "days"} to Christmas`}
          </span>
        ) : null}
      </div>

      <p className="tree-meta-line">
        {visibleCount} {visibleCount === 1 ? "ornament" : "ornaments"} hanging
        on @{activeHandle}&apos;s tree
      </p>

      {config.pauseInbox ? (
        <div className="paused-banner">
          <strong>Inbox paused</strong>
          <span>@{activeHandle} has paused new anonymous notes right now.</span>
          <Link href="/" className="make-tree-link">
            Make your own tree →
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
            Sent anonymously as a {sentOrnamentMeta?.name ?? "Bauble"}. Only @
            {activeHandle} can unwrap it in Mail.
          </p>
          <Link href="/" className="primary-btn celebrate-hero-cta">
            <span>Get your own tree →</span>
          </Link>
          <button
            type="button"
            className="secondary-btn celebrate-again-btn"
            onClick={() => {
              setVisitorSentOrnament(null);
              window.setTimeout(() => visitorInputRef.current?.focus(), 60);
            }}
          >
            Send another
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
          <label htmlFor="visitor-note-input" className="sr-only">
            Send an anonymous note
          </label>
          <div className="compose-textarea-wrap">
            <textarea
              id="visitor-note-input"
              ref={visitorInputRef}
              className="compose-textarea"
              placeholder="Send an anonymous note to hang on this tree..."
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
                className="dice-btn"
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
            {submittingNote ? "Hanging ornament..." : "Send anonymous note"}
          </button>

          <p className="anonymity-note">
            100% anonymous · No sign-in · Private to @{activeHandle}
          </p>
        </form>
      )}
    </>
  );
}
