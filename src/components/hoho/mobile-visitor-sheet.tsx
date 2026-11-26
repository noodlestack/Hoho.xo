"use client";

import { Dices } from "lucide-react";
import Link from "next/link";
import type {
  Dispatch,
  FormEvent,
  MutableRefObject,
  SetStateAction,
} from "react";
import { Drawer } from "vaul";
import { writeVisitorDraft } from "@/components/hoho/experience-helpers";
import { OrnamentPickerStrip } from "@/components/hoho/ornament-picker-strip";
import { VISITOR_SNAP_POINTS } from "@/components/hoho/use-visitor-composer";
import { OrnamentSpriteIcon } from "@/components/ornament-sprite-icon";
import type { TreeMessage } from "@/lib/messages";
import { VISITOR_IDEA_PROMPTS, type TreeConfig } from "@/lib/tree-config";
import {
  ORNAMENT_COLORS,
  ORNAMENT_TYPES,
  type OrnamentStyle,
  type TreeTheme,
} from "@/lib/tree-themes";

interface MobileVisitorSheetProps {
  activeHandle: string;
  config: TreeConfig;
  theme: TreeTheme;
  isOnline: boolean;
  visitorSnap: number | string | null;
  onVisitorSnapChange: (snap: number | string | null) => void;
  keyboardOffset: number;
  selectedOrnament: number | null;
  setSelectedOrnament: Dispatch<SetStateAction<number | null>>;
  visitorSentOrnament: TreeMessage | null;
  setVisitorSentOrnament: Dispatch<SetStateAction<TreeMessage | null>>;
  sentOrnamentColor: string;
  sentOrnamentMeta: OrnamentStyle | null;
  noteBody: string;
  setNoteBody: Dispatch<SetStateAction<string>>;
  honeypot: string;
  setHoneypot: Dispatch<SetStateAction<string>>;
  submittingNote: boolean;
  submitError: string;
  setSubmitError: Dispatch<SetStateAction<string>>;
  composeSubmitKeyRef: MutableRefObject<string | null>;
  onVisitorDice: () => void;
  onSubmit: (event: FormEvent) => Promise<void>;
}

/** Persistent non-modal Vaul bottom sheet with Peek/Half/Full snaps for mobile visitors. */
export function MobileVisitorSheet({
  activeHandle,
  config,
  theme,
  isOnline,
  visitorSnap,
  onVisitorSnapChange,
  keyboardOffset,
  selectedOrnament,
  setSelectedOrnament,
  visitorSentOrnament,
  setVisitorSentOrnament,
  sentOrnamentColor,
  sentOrnamentMeta,
  noteBody,
  setNoteBody,
  honeypot,
  setHoneypot,
  submittingNote,
  submitError,
  setSubmitError,
  composeSubmitKeyRef,
  onVisitorDice,
  onSubmit,
}: MobileVisitorSheetProps) {
  return (
    <Drawer.Root
      open
      modal={false}
      dismissible={false}
      snapPoints={[...VISITOR_SNAP_POINTS]}
      activeSnapPoint={visitorSnap}
      setActiveSnapPoint={onVisitorSnapChange}
    >
      <Drawer.Portal>
        <Drawer.Content
          className="sheet-panel vaul-sheet-panel visitor-mobile-sheet"
          aria-label={`Send an anonymous note to @${activeHandle}`}
          style={
            keyboardOffset > 0
              ? { paddingBottom: `${keyboardOffset + 16}px` }
              : undefined
          }
        >
          <div className="visitor-sheet-topbar">
            <span className="visitor-mini-preview">
              <span
                style={{
                  color:
                    selectedOrnament !== null
                      ? (ORNAMENT_COLORS[
                          selectedOrnament % ORNAMENT_COLORS.length
                        ] ?? theme.swatch)
                      : theme.swatch,
                  fontWeight: 700,
                }}
                aria-hidden="true"
              >
                {selectedOrnament !== null ? (
                  <OrnamentSpriteIcon
                    typeId={selectedOrnament}
                    color={
                      ORNAMENT_COLORS[
                        selectedOrnament % ORNAMENT_COLORS.length
                      ] ?? theme.swatch
                    }
                    size={18}
                  />
                ) : (
                  "✨"
                )}
              </span>
              <span>
                {selectedOrnament !== null
                  ? (ORNAMENT_TYPES[selectedOrnament]?.name ?? "Ornament")
                  : "Surprise"}
              </span>
            </span>
            <div className="vaul-drag-handle" aria-hidden="true" />
            <div
              className="visitor-snap-pills"
              role="group"
              aria-label="Composer sheet height"
            >
              <button
                type="button"
                className="visitor-snap-btn"
                aria-pressed={visitorSnap === 0.28}
                onClick={() => onVisitorSnapChange(0.28)}
              >
                Peek
              </button>
              <button
                type="button"
                className="visitor-snap-btn"
                aria-pressed={visitorSnap === 0.55}
                onClick={() => onVisitorSnapChange(0.55)}
              >
                Half
              </button>
              <button
                type="button"
                className="visitor-snap-btn"
                aria-pressed={visitorSnap === 0.92}
                onClick={() => onVisitorSnapChange(0.92)}
              >
                Full
              </button>
            </div>
          </div>
          <Drawer.Title className="sr-only">
            Send anonymous note to @{activeHandle}
          </Drawer.Title>
          <div className="mobile-drawer-scroll">
            {!isOnline ? (
              <div className="offline-pill" role="status">
                Offline — changes will sync when reconnected
              </div>
            ) : null}
            {config.pauseInbox ? (
              <div className="paused-banner">
                <strong>Inbox paused</strong>
                <span>
                  @{activeHandle} has paused new anonymous notes right now.
                </span>
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
                  Sent anonymously as a {sentOrnamentMeta?.name ?? "Bauble"}.
                  Only @{activeHandle} can unwrap it in Mail.
                </p>
                <Link href="/" className="primary-btn celebrate-hero-cta">
                  <span>Get your own tree →</span>
                </Link>
                <button
                  type="button"
                  className="secondary-btn celebrate-again-btn"
                  onClick={() => setVisitorSentOrnament(null)}
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
                <div className="compose-textarea-wrap">
                  <label htmlFor="mobile-visitor-note" className="sr-only">
                    Send an anonymous note
                  </label>
                  <textarea
                    id="mobile-visitor-note"
                    className="compose-textarea visitor-mobile-textarea"
                    placeholder={config.prompt}
                    maxLength={500}
                    value={noteBody}
                    onChange={(event) => {
                      const nextVal = event.target.value;
                      setNoteBody(nextVal);
                      writeVisitorDraft(activeHandle, nextVal);
                      composeSubmitKeyRef.current = null;
                      if (submitError) setSubmitError("");
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
                {submitError ? (
                  <div className="error-box" role="alert">
                    {submitError}
                  </div>
                ) : null}
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={noteBody.trim().length === 0 || submittingNote}
                >
                  {submittingNote
                    ? "Hanging ornament..."
                    : "Send anonymous note"}
                </button>
                <div>
                  <span className="section-label">
                    Prompt starters · @{activeHandle}
                  </span>
                  <div
                    className="prompt-chip-row"
                    role="group"
                    aria-label="Prompt starter ideas"
                  >
                    {VISITOR_IDEA_PROMPTS.map((starter) => (
                      <button
                        key={starter}
                        type="button"
                        className="prompt-chip"
                        onClick={() => {
                          setNoteBody(starter);
                          writeVisitorDraft(activeHandle, starter);
                          composeSubmitKeyRef.current = null;
                          if (submitError) setSubmitError("");
                        }}
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                </div>
                <OrnamentPickerStrip
                  selectedOrnament={selectedOrnament}
                  onSelect={setSelectedOrnament}
                />
                <p className="anonymity-note">
                  100% anonymous · No sign-in · Private to @{activeHandle}
                </p>
              </form>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
