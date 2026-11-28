"use client";

import {
  Dices,
  ListMusic,
  Lock,
  LogOut,
  Music,
  SkipForward,
} from "lucide-react";
import { useState, type FormEvent } from "react";
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

export interface OwnerCustomizeTabsProps {
  idPrefix?: string;
  studioTab: Exclude<StudioTab, "share">;
  activeHandle: string;
  config: TreeConfig;
  updateConfig: (patch: Partial<TreeConfig>) => void;
  currentTrack: ChristmasTrack;
  musicPlaying: boolean;
  onToggleMusic: () => void;
  onNextTrack: () => void;
  onOpenPlaylist: () => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  onCycleOwnerPrompt: () => void;
  hasPassword: boolean;
  onUpdatePassword: (newPassword: string) => Promise<boolean>;
  onLogout: () => Promise<void>;
}

/** Renders the owner Style (theme, topper, silhouette, scenery, playlist) and Settings (prompt, filters, password, sign-out) tabs. */
export function OwnerCustomizeTabs({
  idPrefix = "owner-",
  studioTab,
  activeHandle,
  config,
  updateConfig,
  currentTrack,
  musicPlaying,
  onToggleMusic,
  onNextTrack,
  onOpenPlaylist,
  soundEnabled,
  onToggleSound,
  onCycleOwnerPrompt,
  hasPassword,
  onUpdatePassword,
  onLogout,
}: OwnerCustomizeTabsProps) {
  const [newPassword, setNewPassword] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  async function handleSavePassword(event: FormEvent) {
    event.preventDefault();
    if (savingPw || newPassword.trim().length < 6) return;
    setSavingPw(true);
    try {
      const ok = await onUpdatePassword(newPassword);
      if (ok) setNewPassword("");
    } finally {
      setSavingPw(false);
    }
  }

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
                  style={
                    {
                      "--swatch-color": item.swatch,
                      backgroundColor: item.swatch,
                    } as React.CSSProperties
                  }
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

        <div className="playlist-studio-box">
          <div className="prompt-header-row">
            <span className="section-label m-0">
              Christmas Playlist · {currentTrack.title}
            </span>
            <button type="button" className="dice-btn" onClick={onOpenPlaylist}>
              <ListMusic size={14} strokeWidth={2} aria-hidden="true" />
              <span>All 10 songs</span>
            </button>
          </div>
          <div className="music-box-controls">
            <button
              type="button"
              className="secondary-btn"
              aria-pressed={musicPlaying}
              onClick={onToggleMusic}
            >
              <Music size={14} strokeWidth={2} aria-hidden="true" />
              <span>{musicPlaying ? "Pause Song" : "Play Song"}</span>
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={onNextTrack}
            >
              <SkipForward size={14} strokeWidth={2} aria-hidden="true" />
              <span>Next Song</span>
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
        <label htmlFor={`${idPrefix}name-input`} className="section-label">
          Display name
        </label>
        <input
          id={`${idPrefix}name-input`}
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
          <label htmlFor={`${idPrefix}prompt-input`} className="section-label">
            Greeting prompt for visitors
          </label>
          <button
            type="button"
            className="dice-btn"
            aria-label="Randomize prompt"
            onClick={onCycleOwnerPrompt}
          >
            <Dices size={14} strokeWidth={2} aria-hidden="true" />
            <span>Randomize</span>
          </button>
        </div>
        <textarea
          id={`${idPrefix}prompt-input`}
          className="edit-textarea"
          maxLength={140}
          value={config.prompt}
          onChange={(event) => updateConfig({ prompt: event.target.value })}
        />
      </div>

      <div className="edit-field">
        <label htmlFor={`${idPrefix}muted-words`} className="section-label">
          Hidden word filter (comma-separated)
        </label>
        <input
          id={`${idPrefix}muted-words`}
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
          <span className="section-label m-0">Account · @{activeHandle}</span>
          <button
            type="button"
            className="dice-btn"
            onClick={() => void onLogout()}
          >
            <LogOut size={13} strokeWidth={2} aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
        <p className="tree-meta-line">
          {hasPassword
            ? "Update your password anytime to log in across devices."
            : "Set a password so you can sign in easily without a secret key."}
        </p>
        <form className="url-row" onSubmit={(e) => void handleSavePassword(e)}>
          <label htmlFor={`${idPrefix}new-password`} className="sr-only">
            New account password
          </label>
          <input
            id={`${idPrefix}new-password`}
            type="password"
            className="social-input"
            placeholder={
              hasPassword ? "New password (min 6 chars)" : "Set password..."
            }
            minLength={6}
            maxLength={128}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <button
            type="submit"
            className="secondary-btn"
            disabled={savingPw || newPassword.trim().length < 6}
          >
            <Lock size={14} strokeWidth={2} aria-hidden="true" />
            <span>{savingPw ? "Saving..." : "Save"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
