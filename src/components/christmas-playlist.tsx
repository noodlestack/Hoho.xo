"use client";

import {
  Disc3,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Drawer } from "vaul";
import {
  CHRISTMAS_TRACKS,
  getPlaylistSnapshot,
  nextChristmasTrack,
  prevChristmasTrack,
  seekChristmasMusic,
  selectChristmasTrack,
  setChristmasAudioMode,
  setChristmasLoopOne,
  setChristmasShuffle,
  setChristmasVolume,
  subscribePlaylist,
  toggleChristmasMusic,
  type PlaylistSnapshot,
} from "@/lib/sound";

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export interface ChristmasPlaylistSheetProps {
  open: boolean;
  onClose: () => void;
}

/** Full 10-track Christmas song playlist drawer with orchestral stream & celesta music-box modes. */
export function ChristmasPlaylistSheet({
  open,
  onClose,
}: ChristmasPlaylistSheetProps) {
  const [snap, setSnap] = useState<PlaylistSnapshot>(() =>
    getPlaylistSnapshot(),
  );

  useEffect(() => {
    return subscribePlaylist(setSnap);
  }, []);

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
          className="sheet-panel vaul-sheet-panel playlist-sheet-panel"
          aria-labelledby="christmas-playlist-title"
        >
          <div className="vaul-drag-handle" aria-hidden="true" />
          <div className="sheet-header">
            <div>
              <Drawer.Description className="sheet-eyebrow">
                Holiday Soundtrack · {CHRISTMAS_TRACKS.length} Classics
              </Drawer.Description>
              <Drawer.Title
                className="sheet-title"
                id="christmas-playlist-title"
              >
                Christmas Playlist
              </Drawer.Title>
            </div>
            <button
              type="button"
              className="icon-close-btn"
              aria-label="Close Christmas Playlist"
              onClick={onClose}
            >
              <X size={16} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>

          <div className="playlist-now-card">
            <div className="playlist-now-top">
              <div
                className={["playlist-vinyl", snap.playing ? "is-spinning" : ""]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden="true"
              >
                <Disc3 size={24} strokeWidth={1.9} />
              </div>
              <div className="playlist-now-meta">
                <span className="playlist-now-badge">
                  {snap.loading
                    ? "Loading stream..."
                    : snap.playing
                      ? "Now Playing"
                      : "Paused"}
                </span>
                <p className="playlist-now-title">{snap.track.title}</p>
                <p className="playlist-now-artist">
                  {snap.mode === "recorded"
                    ? `${snap.track.artist} · ${snap.track.license}`
                    : "Celesta Music Box Arrangement"}
                </p>
              </div>
            </div>

            {snap.mode === "recorded" ? (
              <div className="playlist-scrubber-row">
                <span className="playlist-time-label">
                  {formatClock(snap.currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(1, Math.floor(snap.duration || 100))}
                  value={Math.min(
                    Math.max(1, Math.floor(snap.duration || 100)),
                    Math.floor(snap.currentTime),
                  )}
                  aria-label="Seek track position"
                  className="playlist-range"
                  onChange={(e) => seekChristmasMusic(Number(e.target.value))}
                />
                <span className="playlist-time-label">
                  {snap.duration > 0
                    ? formatClock(snap.duration)
                    : snap.track.durationHint}
                </span>
              </div>
            ) : null}

            <div className="playlist-transport-row">
              <button
                type="button"
                className="playlist-icon-btn"
                aria-label="Shuffle playlist"
                aria-pressed={snap.shuffle}
                onClick={() => setChristmasShuffle(!snap.shuffle)}
              >
                <Shuffle size={15} strokeWidth={2} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="playlist-icon-btn"
                aria-label="Previous Christmas song"
                onClick={() => prevChristmasTrack()}
              >
                <SkipBack size={17} strokeWidth={2.1} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="playlist-play-btn"
                aria-label={
                  snap.playing
                    ? `Pause ${snap.track.title}`
                    : `Play ${snap.track.title}`
                }
                onClick={() => toggleChristmasMusic()}
              >
                {snap.playing ? (
                  <Pause size={20} strokeWidth={2.3} aria-hidden="true" />
                ) : (
                  <Play
                    size={20}
                    strokeWidth={2.3}
                    style={{ marginLeft: 2 }}
                    aria-hidden="true"
                  />
                )}
              </button>
              <button
                type="button"
                className="playlist-icon-btn"
                aria-label="Next Christmas song"
                onClick={() => nextChristmasTrack()}
              >
                <SkipForward size={17} strokeWidth={2.1} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="playlist-icon-btn"
                aria-label="Repeat current song"
                aria-pressed={snap.loopOne}
                onClick={() => setChristmasLoopOne(!snap.loopOne)}
              >
                <Repeat size={15} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>

            <div className="playlist-footer-bar">
              <div
                className="playlist-mode-pills"
                role="group"
                aria-label="Audio source"
              >
                <button
                  type="button"
                  className="playlist-mode-btn"
                  aria-pressed={snap.mode === "recorded"}
                  onClick={() => setChristmasAudioMode("recorded")}
                >
                  <ListMusic size={13} strokeWidth={2} aria-hidden="true" />
                  <span>Full Ensemble</span>
                </button>
                <button
                  type="button"
                  className="playlist-mode-btn"
                  aria-pressed={snap.mode === "musicbox"}
                  onClick={() => setChristmasAudioMode("musicbox")}
                >
                  <Sparkles size={13} strokeWidth={2} aria-hidden="true" />
                  <span>Music Box</span>
                </button>
              </div>

              <div className="playlist-volume-wrap">
                <button
                  type="button"
                  className="playlist-mute-btn"
                  aria-label={snap.volume === 0 ? "Unmute music" : "Mute music"}
                  onClick={() =>
                    setChristmasVolume(snap.volume === 0 ? 0.72 : 0)
                  }
                >
                  {snap.volume === 0 ? (
                    <VolumeX size={15} strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <Volume2 size={15} strokeWidth={2} aria-hidden="true" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(snap.volume * 100)}
                  aria-label="Music volume"
                  className="playlist-volume-range"
                  onChange={(e) =>
                    setChristmasVolume(Number(e.target.value) / 100)
                  }
                />
              </div>
            </div>
          </div>

          <div
            className="playlist-track-list"
            role="listbox"
            aria-label="Christmas songs"
          >
            {CHRISTMAS_TRACKS.map((item, idx) => {
              const isCurrent = idx === snap.trackIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={isCurrent}
                  className={[
                    "playlist-track-item",
                    isCurrent ? "is-active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => selectChristmasTrack(idx)}
                >
                  <span className="playlist-track-num" aria-hidden="true">
                    {isCurrent && snap.playing ? (
                      <span className="eq-bars">
                        <i />
                        <i />
                        <i />
                      </span>
                    ) : (
                      String(idx + 1).padStart(2, "0")
                    )}
                  </span>
                  <span className="playlist-track-info">
                    <span className="playlist-track-name">{item.title}</span>
                    <span className="playlist-track-sub">{item.artist}</span>
                  </span>
                  <span className="playlist-track-dur">
                    {item.durationHint}
                  </span>
                </button>
              );
            })}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
