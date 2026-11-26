"use client";

import { Copy, Dices, KeyRound, Music, SkipForward } from "lucide-react";
import type { FormEvent } from "react";
import type { StudioTab } from "@/components/hoho/experience-helpers";
import type { ChristmasTrack } from "@/lib/sound";
import {
  TREE_AVATARS,
  TREE_SCENERIES,
  TREE_SHAPES,
  TREE_TOPPERS,
  type TreeConfig,
} from "@/lib/tree-config";
import { TREE_THEME_LIST } from "@/lib/tree-themes";

interface OwnerCustomizeTabsProps {
  studioTab: Exclude<StudioTab, "share">;
  activeHandle: string;
  config: TreeConfig;
  updateConfig: (patch: Partial<TreeConfig>) => void;
  currentTrack: ChristmasTrack;
  musicPlaying: boolean;
  onToggleMusic: () => void;
  onNextTrack: () => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  handleDraft: string;
  setHandleDraft: (next: string) => void;
  commitHandleChange: (nextHandle: string) => Promise<void>;
  hasInvalidHandleDraft: boolean;
  hasPendingHandleChange: boolean;
  pendingHandleSlug: string | null;
  onCycleOwnerPrompt: () => void;
  ownerKey: string;
  onCopyText: (text: string, label: string) => Promise<boolean>;
  unlockDraft: string;
  setUnlockDraft: (next: string) => void;
  handleUnlockWithKey: (event: FormEvent) => Promise<void>;
}

/** Renders the owner Style (theme, topper, silhouette, scenery, music) and Prompt (identity, filter, access key) tabs. */
export function OwnerCustomizeTabs({
  studioTab,
  activeHandle,
  config,
  updateConfig,
  currentTrack,
  musicPlaying,
  onToggleMusic,
  onNextTrack,
  soundEnabled,
  onToggleSound,
  handleDraft,
  setHandleDraft,
  commitHandleChange,
  hasInvalidHandleDraft,
  hasPendingHandleChange,
  pendingHandleSlug,
  onCycleOwnerPrompt,
  ownerKey,
  onCopyText,
  unlockDraft,
  setUnlockDraft,
  handleUnlockWithKey,
}: OwnerCustomizeTabsProps) {
  if (studioTab === "style") {
    return (
      <div className="edit-stack">
        <div>
          <span className="section-label">
            Color theme ({TREE_THEME_LIST.length})
          </span>
          <div
            className="theme-grid"
            role="group"
            aria-label="Tree color theme"
          >
            {TREE_THEME_LIST.map((item) => (
              <button
                key={item.id}
                type="button"
                className="theme-swatch-btn"
                aria-pressed={config.themeId === item.id}
                onClick={() => updateConfig({ themeId: item.id })}
              >
                <span
                  className="theme-dot"
                  style={{ backgroundColor: item.swatch }}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="section-label">
            Apex topper ({TREE_TOPPERS.length})
          </span>
          <div className="topper-grid" role="group" aria-label="Tree topper">
            {TREE_TOPPERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="topper-btn"
                aria-pressed={config.topper === item.id}
                onClick={() => updateConfig({ topper: item.id })}
              >
                <span className="topper-glyph" aria-hidden="true">
                  {item.glyph}
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="section-label">
            Tree silhouette ({TREE_SHAPES.length})
          </span>
          <div className="shape-grid" role="group" aria-label="Tree silhouette">
            {TREE_SHAPES.map((item) => (
              <button
                key={item.id}
                type="button"
                className="shape-btn"
                aria-pressed={config.shape === item.id}
                onClick={() => updateConfig({ shape: item.id })}
              >
                <strong>{item.label}</strong>
                <span>{item.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="section-label">
            Winter scenery ({TREE_SCENERIES.length})
          </span>
          <div
            className="scenery-grid"
            role="group"
            aria-label="Winter scenery"
          >
            {TREE_SCENERIES.map((item) => (
              <button
                key={item.id}
                type="button"
                className="shape-btn"
                aria-pressed={config.scenery === item.id}
                onClick={() => updateConfig({ scenery: item.id })}
              >
                <strong>{item.label}</strong>
                <span>{item.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="section-label">
            Christmas Music Box · {currentTrack.title}
          </span>
          <div className="music-box-controls">
            <button
              type="button"
              className="secondary-btn"
              aria-pressed={musicPlaying}
              onClick={onToggleMusic}
            >
              <Music size={14} strokeWidth={2} aria-hidden="true" />
              <span>{musicPlaying ? "Pause Carol" : "Play Carol"}</span>
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={onNextTrack}
            >
              <SkipForward size={14} strokeWidth={2} aria-hidden="true" />
              <span>Next Carol</span>
            </button>
          </div>
        </div>

        <div>
          <span className="section-label">Canvas effects</span>
          <div className="toggle-grid">
            <label className="switch-label">
              <span>Atmosphere</span>
              <input
                type="checkbox"
                className="sr-only"
                checked={config.showSnow}
                onChange={(event) =>
                  updateConfig({ showSnow: event.target.checked })
                }
              />
              <span className="switch-track" aria-hidden="true" />
            </label>
            <label className="switch-label">
              <span>Lights</span>
              <input
                type="checkbox"
                className="sr-only"
                checked={config.showGarland}
                onChange={(event) =>
                  updateConfig({ showGarland: event.target.checked })
                }
              />
              <span className="switch-track" aria-hidden="true" />
            </label>
            <label className="switch-label">
              <span>Ornaments</span>
              <input
                type="checkbox"
                className="sr-only"
                checked={config.showOrnaments}
                onChange={(event) =>
                  updateConfig({ showOrnaments: event.target.checked })
                }
              />
              <span className="switch-track" aria-hidden="true" />
            </label>
            <label className="switch-label">
              <span>Chimes</span>
              <input
                type="checkbox"
                className="sr-only"
                checked={soundEnabled}
                onChange={(event) => onToggleSound(event.target.checked)}
              />
              <span className="switch-track" aria-hidden="true" />
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-stack">
      <div>
        <span className="section-label">Avatar emblem</span>
        <div
          className="avatar-picker-row"
          role="group"
          aria-label="Avatar emblem"
        >
          {TREE_AVATARS.map((item) => (
            <button
              key={item.id || "initial"}
              type="button"
              className="avatar-choice-btn"
              aria-label={item.label}
              title={item.label}
              aria-pressed={config.avatar === item.id}
              onClick={() => updateConfig({ avatar: item.id })}
            >
              {item.id || config.displayName.trim()[0]?.toUpperCase() || "A"}
            </button>
          ))}
        </div>
      </div>

      <div className="edit-field">
        <label htmlFor="owner-handle-input" className="section-label">
          {activeHandle
            ? `Tree handle (/t/${activeHandle})`
            : "Choose your tree handle (/t/...)"}
        </label>
        <div className="url-row">
          <input
            id="owner-handle-input"
            type="text"
            className="social-input is-mono"
            placeholder="e.g. santa_2026"
            maxLength={21}
            value={handleDraft}
            onChange={(event) => setHandleDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void commitHandleChange(handleDraft);
              }
            }}
          />
          <button
            type="button"
            className="secondary-btn"
            onClick={() => void commitHandleChange(handleDraft)}
          >
            Set
          </button>
        </div>
        {hasInvalidHandleDraft ? (
          <p className="handle-pending-hint">
            Handles use 3–20 letters, numbers, or underscores.
          </p>
        ) : hasPendingHandleChange && pendingHandleSlug ? (
          <p className="handle-pending-hint">
            Click Set to switch to @{pendingHandleSlug}
          </p>
        ) : null}
      </div>

      <div className="edit-field">
        <label htmlFor="owner-name-input" className="section-label">
          Display name
        </label>
        <input
          id="owner-name-input"
          type="text"
          className="social-input"
          maxLength={28}
          value={config.displayName}
          onChange={(event) =>
            updateConfig({ displayName: event.target.value })
          }
        />
      </div>

      <div className="edit-field">
        <div className="prompt-header-row">
          <label htmlFor="owner-prompt-input" className="section-label">
            Bio question prompt
          </label>
          <button
            type="button"
            className="dice-btn"
            onClick={onCycleOwnerPrompt}
          >
            <Dices size={14} strokeWidth={2} aria-hidden="true" />
            <span>Prompt</span>
          </button>
        </div>
        <textarea
          id="owner-prompt-input"
          className="edit-textarea"
          maxLength={140}
          value={config.prompt}
          onChange={(event) => updateConfig({ prompt: event.target.value })}
        />
      </div>

      <div className="edit-field">
        <label htmlFor="owner-muted-words" className="section-label">
          Hidden word filter (comma-separated)
        </label>
        <input
          id="owner-muted-words"
          type="text"
          className="social-input"
          maxLength={200}
          placeholder="e.g. spoiler, ex-name"
          value={config.mutedWords}
          onChange={(event) => updateConfig({ mutedWords: event.target.value })}
        />
      </div>

      <div className="toggle-grid">
        <label className="switch-label">
          <span>Pause inbox</span>
          <input
            type="checkbox"
            className="sr-only"
            checked={config.pauseInbox}
            onChange={(event) =>
              updateConfig({ pauseInbox: event.target.checked })
            }
          />
          <span className="switch-track" aria-hidden="true" />
        </label>
        <label className="switch-label">
          <span>Wrap Dec 25</span>
          <input
            type="checkbox"
            className="sr-only"
            checked={config.christmasLock}
            onChange={(event) =>
              updateConfig({ christmasLock: event.target.checked })
            }
          />
          <span className="switch-track" aria-hidden="true" />
        </label>
      </div>

      <div className="key-box">
        <div className="prompt-header-row">
          <span className="section-label m-0">Owner Access Key</span>
          {ownerKey ? (
            <button
              type="button"
              className="dice-btn"
              onClick={() => void onCopyText(ownerKey, "Owner Access Key")}
            >
              <Copy size={13} strokeWidth={2} aria-hidden="true" />
              <span>Copy Key</span>
            </button>
          ) : null}
        </div>
        <p className="tree-meta-line">
          {ownerKey
            ? "Save this now, it can't be shown again. Your session is protected by an HttpOnly cookie."
            : "Enter the Owner Access Key for an existing handle to unlock Mail here."}
        </p>
        <form className="url-row" onSubmit={handleUnlockWithKey}>
          <label htmlFor="owner-unlock-key" className="sr-only">
            Owner Access Key
          </label>
          <input
            id="owner-unlock-key"
            type="password"
            className="social-input is-mono"
            placeholder="Paste key to unlock..."
            value={unlockDraft}
            onChange={(event) => setUnlockDraft(event.target.value)}
          />
          <button type="submit" className="secondary-btn">
            <KeyRound size={14} strokeWidth={2} aria-hidden="true" />
            <span>Unlock</span>
          </button>
        </form>
      </div>
    </div>
  );
}
