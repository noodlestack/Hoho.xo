"use client";

import {
  ExternalLink,
  ListMusic,
  LogIn,
  Mail,
  Music,
  Pause,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { CameraViewMode } from "@/components/ascii-tree-canvas";
import type { ChristmasTrack } from "@/lib/sound";

interface NavChromeProps {
  isOwnerMode: boolean;
  isAuthenticated: boolean;
  visitorRelativeHref: string;
  messagesCount: number;
  unreadCount: number;
  unreadTickSeq: number;
  musicPlaying: boolean;
  currentTrack: ChristmasTrack;
  onToggleMusic: () => void;
  onOpenPlaylist: () => void;
  onOpenMail: () => void;
  onOpenMobileAuth?: () => void;
}

function MusicPillGroup({
  musicPlaying,
  currentTrack,
  onToggleMusic,
  onOpenPlaylist,
}: Pick<
  NavChromeProps,
  "musicPlaying" | "currentTrack" | "onToggleMusic" | "onOpenPlaylist"
>) {
  return (
    <div className="music-pill-cluster" role="group" aria-label="Holiday music">
      <button
        type="button"
        className={["audio-pill-btn", musicPlaying ? "is-playing" : ""]
          .filter(Boolean)
          .join(" ")}
        aria-pressed={musicPlaying}
        aria-label={
          musicPlaying
            ? `Pause ${currentTrack.title}`
            : `Play ${currentTrack.title}`
        }
        title={
          musicPlaying
            ? `Playing: ${currentTrack.title}`
            : `Play: ${currentTrack.title}`
        }
        onClick={onToggleMusic}
      >
        {musicPlaying ? (
          <Pause size={14} strokeWidth={2.3} aria-hidden="true" />
        ) : (
          <Music size={14} strokeWidth={2.2} aria-hidden="true" />
        )}
        <span className="audio-pill-title" data-hide-mobile="true">
          {currentTrack.title}
        </span>
      </button>
      <button
        type="button"
        className="playlist-trigger-btn"
        aria-label="Open Christmas Playlist (10 songs)"
        title="Open Christmas Playlist"
        onClick={onOpenPlaylist}
      >
        <ListMusic size={15} strokeWidth={2.1} aria-hidden="true" />
      </button>
    </div>
  );
}

function MailNavButton({
  messagesCount,
  unreadCount,
  unreadTickSeq,
  onOpenMail,
}: Pick<
  NavChromeProps,
  "messagesCount" | "unreadCount" | "unreadTickSeq" | "onOpenMail"
>) {
  return (
    <button type="button" className="pill-nav-btn" onClick={onOpenMail}>
      <Mail size={14} strokeWidth={2} aria-hidden="true" />
      <span>Mail ({messagesCount})</span>
      {unreadCount > 0 ? (
        <span
          key={unreadTickSeq}
          className={["unread-pill", unreadTickSeq > 0 ? "is-ticking" : ""]
            .filter(Boolean)
            .join(" ")}
        >
          {unreadCount} new
        </span>
      ) : null}
    </button>
  );
}

interface StageHeaderProps extends NavChromeProps {
  viewMode: CameraViewMode;
  onChangeViewMode: (next: CameraViewMode) => void;
}

/** Top stage navigation bar with brand mark, camera mode tabs, playlist controls, and mail/auth actions. */
export function StageHeader({
  viewMode,
  onChangeViewMode,
  isOwnerMode,
  isAuthenticated,
  visitorRelativeHref,
  messagesCount,
  unreadCount,
  unreadTickSeq,
  musicPlaying,
  currentTrack,
  onToggleMusic,
  onOpenPlaylist,
  onOpenMail,
  onOpenMobileAuth,
}: StageHeaderProps) {
  return (
    <header className="stage-header">
      <Link href="/" className="brand">
        <span className="brand-star" aria-hidden="true">
          <Sparkles size={15} strokeWidth={2.2} />
        </span>
        <span>
          Hoho.<span className="brand-accent">xo</span>
        </span>
      </Link>
      <div className="view-tabs" role="group" aria-label="Canvas mode">
        {(["tree", "top", "qr"] as const).map((tabMode) => (
          <button
            key={tabMode}
            type="button"
            className="view-tab"
            aria-pressed={viewMode === tabMode}
            onClick={() => onChangeViewMode(tabMode)}
          >
            {tabMode === "tree"
              ? "Tree"
              : tabMode === "top"
                ? "Top"
                : "QR Code"}
          </button>
        ))}
      </div>
      <div className="stage-header-actions">
        <MusicPillGroup
          musicPlaying={musicPlaying}
          currentTrack={currentTrack}
          onToggleMusic={onToggleMusic}
          onOpenPlaylist={onOpenPlaylist}
        />
        {isOwnerMode ? (
          isAuthenticated ? (
            <>
              <Link
                href={visitorRelativeHref}
                prefetch={false}
                className="pill-nav-btn"
                data-hide-mobile="true"
              >
                <span>Visitor</span>
                <ExternalLink size={13} strokeWidth={2.2} aria-hidden="true" />
              </Link>
              <MailNavButton
                messagesCount={messagesCount}
                unreadCount={unreadCount}
                unreadTickSeq={unreadTickSeq}
                onOpenMail={onOpenMail}
              />
            </>
          ) : onOpenMobileAuth ? (
            <button
              type="button"
              className="pill-nav-btn"
              onClick={onOpenMobileAuth}
            >
              <LogIn size={14} strokeWidth={2.1} aria-hidden="true" />
              <span>Log In</span>
            </button>
          ) : null
        ) : (
          <Link href="/" className="make-tree-link">
            <span>Make yours</span>
            <Sparkles size={14} strokeWidth={2.2} aria-hidden="true" />
          </Link>
        )}
      </div>
    </header>
  );
}

/** Desktop right-column top action strip (playlist player, visitor preview/make-yours, and Mail). */
export function SidebarTopbar({
  isOwnerMode,
  isAuthenticated,
  visitorRelativeHref,
  messagesCount,
  unreadCount,
  unreadTickSeq,
  musicPlaying,
  currentTrack,
  onToggleMusic,
  onOpenPlaylist,
  onOpenMail,
}: NavChromeProps) {
  return (
    <div className="sidebar-topbar">
      <MusicPillGroup
        musicPlaying={musicPlaying}
        currentTrack={currentTrack}
        onToggleMusic={onToggleMusic}
        onOpenPlaylist={onOpenPlaylist}
      />
      {isOwnerMode ? (
        isAuthenticated ? (
          <>
            <Link
              href={visitorRelativeHref}
              prefetch={false}
              className="pill-nav-btn"
            >
              <span>Visitor</span>
              <ExternalLink size={13} strokeWidth={2.2} aria-hidden="true" />
            </Link>
            <MailNavButton
              messagesCount={messagesCount}
              unreadCount={unreadCount}
              unreadTickSeq={unreadTickSeq}
              onOpenMail={onOpenMail}
            />
          </>
        ) : null
      ) : (
        <Link href="/" className="make-tree-link">
          <span>Make yours</span>
          <Sparkles size={14} strokeWidth={2.2} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

interface PanelFooterProps {
  isOwnerMode: boolean;
  onOpenSupport: () => void;
}

/** Quiet desktop sidebar footer with maker credit, owner-only Support button, and legal links. */
export function PanelFooter({ isOwnerMode, onOpenSupport }: PanelFooterProps) {
  return (
    <footer className="panel-footer">
      <span className="credit-badge">
        made by <strong>noodlestack</strong> · <span>Hoho.xo</span>
      </span>
      <span className="footer-links-row">
        {isOwnerMode ? (
          <>
            <button
              type="button"
              className="footer-support-btn"
              onClick={onOpenSupport}
            >
              Support
            </button>
            <span aria-hidden="true">·</span>
          </>
        ) : null}
        <Link href="/privacy" className="footer-nav-link">
          Privacy
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/terms" className="footer-nav-link">
          Terms
        </Link>
      </span>
    </footer>
  );
}
