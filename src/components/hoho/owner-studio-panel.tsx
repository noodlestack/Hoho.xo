"use client";

import {
  Bell,
  BellOff,
  Check,
  Copy,
  ExternalLink,
  LogOut,
  MailOpen,
  QrCode,
  Share2,
  TreePine,
} from "lucide-react";
import Link from "next/link";
import type { CameraViewMode } from "@/components/ascii-tree-canvas";
import {
  formatDisplayShareUrl,
  type StudioTab,
} from "@/components/hoho/experience-helpers";
import { OwnerCustomizeTabs } from "@/components/hoho/owner-customize-tabs";
import { VAPID_PUBLIC_KEY } from "@/components/hoho/use-push-subscription";
import type { TreeMessage } from "@/lib/messages";
import type { ChristmasTrack } from "@/lib/sound";
import type { TreeConfig } from "@/lib/tree-config";

interface OwnerStudioPanelProps {
  studioTab: StudioTab;
  setStudioTab: (tab: StudioTab) => void;
  activeHandle: string;
  config: TreeConfig;
  updateConfig: (patch: Partial<TreeConfig>) => void;
  avatarGlyph: string;
  daysToChristmas: number | null;
  shareUrl: string;
  visitorRelativeHref: string;
  copiedLink: boolean;
  onCopyLink: () => void;
  onOpenInviteSheet: () => void;
  viewMode: CameraViewMode;
  onToggleQrView: () => void;
  pushSubscribed: boolean;
  pushBusy: boolean;
  iosNeedsStandalone: boolean;
  onTogglePush: () => Promise<void>;
  unreadCount: number;
  newestUnread: TreeMessage | null;
  onOpenMessage: (msg: TreeMessage) => void;
  messagesCount: number;
  visibleCount: number;
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

/** Authenticated desktop creator hub tabs for sharing/exporting, styling, and account settings. */
export function OwnerStudioPanel({
  studioTab,
  setStudioTab,
  activeHandle,
  config,
  updateConfig,
  avatarGlyph,
  daysToChristmas,
  shareUrl,
  visitorRelativeHref,
  copiedLink,
  onCopyLink,
  onOpenInviteSheet,
  viewMode,
  onToggleQrView,
  pushSubscribed,
  pushBusy,
  iosNeedsStandalone,
  onTogglePush,
  unreadCount,
  newestUnread,
  onOpenMessage,
  messagesCount,
  visibleCount,
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
}: OwnerStudioPanelProps) {
  return (
    <>
      <div
        className="studio-tabs"
        role="tablist"
        aria-label="Creator studio sections"
      >
        <span
          className="studio-tabs-indicator"
          aria-hidden="true"
          style={{
            transform: `translateX(${
              (studioTab === "share" ? 0 : studioTab === "style" ? 1 : 2) * 100
            }%)`,
          }}
        />
        <button
          type="button"
          role="tab"
          aria-selected={studioTab === "share"}
          className="studio-tab"
          onClick={() => setStudioTab("share")}
        >
          Share
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={studioTab === "style"}
          className="studio-tab"
          onClick={() => setStudioTab("style")}
        >
          Style
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={studioTab === "prompt"}
          className="studio-tab"
          onClick={() => setStudioTab("prompt")}
        >
          Settings
        </button>
      </div>

      {studioTab === "share" ? (
        <>
          <div className="bio-profile-flat">
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
                  {config.supporter ? (
                    <span className="supporter-badge">★ Supporter</span>
                  ) : null}
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
                    <span>
                      {config.pauseInbox ? "Paused" : "Accepting letters"}
                    </span>
                  </span>
                </p>
              </div>
              <button
                type="button"
                className="account-signout-pill"
                aria-label="Sign out or switch tree"
                title="Sign out / Switch account"
                onClick={() => void onLogout()}
              >
                <LogOut size={14} strokeWidth={2} aria-hidden="true" />
              </button>
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

          <div className="share-row-wrap">
            <span className="section-label">
              Your personal letter link &amp; QR destination
            </span>
            <div className="share-link-pill">
              <span className="share-link-display" title={shareUrl}>
                {formatDisplayShareUrl(shareUrl, 40)}
              </span>
              <button
                type="button"
                className={[
                  "share-copy-icon-btn",
                  copiedLink ? "is-copied" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={copiedLink ? "Copied tree link" : "Copy tree link"}
                onClick={onCopyLink}
              >
                <span
                  className={[
                    "copy-glyph",
                    copiedLink ? "is-hidden" : "is-visible",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  <Copy size={14} strokeWidth={2} />
                </span>
                <span
                  className={[
                    "copy-glyph",
                    copiedLink ? "is-visible" : "is-hidden",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  <Check size={14} strokeWidth={2.2} />
                </span>
              </button>
            </div>
          </div>

          <div className="share-cta-stack">
            <button
              type="button"
              className="primary-btn"
              onClick={onOpenInviteSheet}
            >
              <Share2 size={15} strokeWidth={2} aria-hidden="true" />
              <span>Export 4K Card &amp; HD Video</span>
            </button>
            <div className="share-secondary-row">
              <button
                type="button"
                className="secondary-btn"
                onClick={onToggleQrView}
              >
                {viewMode === "qr" ? (
                  <>
                    <TreePine size={15} strokeWidth={2} aria-hidden="true" />
                    <span>Show Tree</span>
                  </>
                ) : (
                  <>
                    <QrCode size={15} strokeWidth={2} aria-hidden="true" />
                    <span>Show QR</span>
                  </>
                )}
              </button>
              <Link
                href={visitorRelativeHref}
                prefetch={false}
                className="secondary-btn"
              >
                <span>Preview Page</span>
                <ExternalLink size={14} strokeWidth={2} aria-hidden="true" />
              </Link>
            </div>
            {VAPID_PUBLIC_KEY ? (
              <>
                <button
                  type="button"
                  className="secondary-btn"
                  aria-pressed={pushSubscribed}
                  disabled={pushBusy}
                  onClick={() => void onTogglePush()}
                >
                  {pushSubscribed ? (
                    <>
                      <Bell size={14} strokeWidth={2} aria-hidden="true" />
                      <span>Notify me: On</span>
                    </>
                  ) : (
                    <>
                      <BellOff size={14} strokeWidth={2} aria-hidden="true" />
                      <span>Notify me</span>
                    </>
                  )}
                </button>
                {iosNeedsStandalone ? (
                  <p className="tree-meta-line">
                    On iPhone, add Hoho.xo to your Home Screen first to enable
                    Web Push.
                  </p>
                ) : null}
              </>
            ) : null}
          </div>

          {unreadCount > 0 && newestUnread ? (
            <button
              type="button"
              className="unread-spotlight-btn"
              onClick={() => onOpenMessage(newestUnread)}
            >
              <MailOpen size={15} strokeWidth={2.1} aria-hidden="true" />
              <span>Unfold newest unread letter ({unreadCount})</span>
            </button>
          ) : null}

          {messagesCount === 0 ? (
            <p className="share-empty-state">
              Share your QR or bio link — each friend&apos;s letter hangs on
              your tree as a glowing ornament.
            </p>
          ) : (
            <div className="share-stats-row">
              <div className="share-stat-cell">
                <span className="share-stat-value">{visibleCount}</span>
                <span className="share-stat-label">On tree</span>
              </div>
              <div className="share-stat-cell">
                <span className="share-stat-value">{messagesCount}</span>
                <span className="share-stat-label">Letters</span>
              </div>
              <div className="share-stat-cell">
                <span className="share-stat-value">
                  {unreadCount > 0 ? (
                    <span className="unread-stat-dot" aria-hidden="true" />
                  ) : null}
                  <span>{unreadCount}</span>
                </span>
                <span className="share-stat-label">Unread</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <OwnerCustomizeTabs
          studioTab={studioTab}
          activeHandle={activeHandle}
          config={config}
          updateConfig={updateConfig}
          currentTrack={currentTrack}
          musicPlaying={musicPlaying}
          onToggleMusic={onToggleMusic}
          onNextTrack={onNextTrack}
          onOpenPlaylist={onOpenPlaylist}
          soundEnabled={soundEnabled}
          onToggleSound={onToggleSound}
          onCycleOwnerPrompt={onCycleOwnerPrompt}
          hasPassword={hasPassword}
          onUpdatePassword={onUpdatePassword}
          onLogout={onLogout}
        />
      )}
    </>
  );
}
