"use client";

import { Copy, Mail, Share2, Sparkles } from "lucide-react";
import Link from "next/link";
import { Drawer } from "vaul";
import type { StudioTab } from "@/components/hoho/experience-helpers";
import type { TreeConfig } from "@/lib/tree-config";
import { TREE_THEME_LIST } from "@/lib/tree-themes";

interface MobileOwnerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOnline: boolean;
  studioTab: StudioTab;
  setStudioTab: (tab: StudioTab) => void;
  activeHandle: string;
  config: TreeConfig;
  updateConfig: (patch: Partial<TreeConfig>) => void;
  avatarGlyph: string;
  copiedLink: boolean;
  onCopyLink: () => void;
  messagesCount: number;
  onOpenInviteSheet: () => void;
  onOpenMail: () => void;
  handleDraft: string;
  setHandleDraft: (next: string) => void;
  commitHandleChange: (nextHandle: string) => Promise<void>;
  onOpenSupport: () => void;
}

/** Mobile bottom sheet trigger and Vaul drawer for Owner Studio actions. */
export function MobileOwnerSheet({
  open,
  onOpenChange,
  isOnline,
  studioTab,
  setStudioTab,
  activeHandle,
  config,
  updateConfig,
  avatarGlyph,
  copiedLink,
  onCopyLink,
  messagesCount,
  onOpenInviteSheet,
  onOpenMail,
  handleDraft,
  setHandleDraft,
  commitHandleChange,
  onOpenSupport,
}: MobileOwnerSheetProps) {
  return (
    <>
      <button
        type="button"
        className="mobile-sheet-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => onOpenChange(true)}
      >
        <Sparkles size={15} strokeWidth={2.2} aria-hidden="true" />
        <span>Studio</span>
      </button>
      <Drawer.Root open={open} onOpenChange={onOpenChange}>
        <Drawer.Portal>
          <Drawer.Overlay className="drawer-backdrop" />
          <Drawer.Content
            className="sheet-panel vaul-sheet-panel mobile-panel-drawer"
            aria-label="Owner tree creator hub"
          >
            <div className="vaul-drag-handle" aria-hidden="true" />
            <Drawer.Title className="sr-only">Creator Studio</Drawer.Title>
            <div className="mobile-drawer-scroll">
              {!isOnline ? (
                <div className="offline-pill" role="status">
                  Offline — changes will sync when reconnected
                </div>
              ) : null}
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
                      (studioTab === "share"
                        ? 0
                        : studioTab === "style"
                          ? 1
                          : 2) * 100
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
                  Prompt
                </button>
              </div>

              {studioTab === "share" ? (
                <div className="edit-stack">
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
                          <span>·</span>
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
                            {config.pauseInbox ? "Paused" : "Accepting notes"}
                          </span>
                        </p>
                      </div>
                    </div>
                    <p className="bio-prompt-text">{config.prompt}</p>
                  </div>

                  <div className="share-cta-stack">
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() => {
                        onOpenChange(false);
                        onOpenInviteSheet();
                      }}
                    >
                      <Share2 size={15} strokeWidth={2} aria-hidden="true" />
                      <span>Share to Story</span>
                    </button>
                    <div className="share-secondary-row">
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={onCopyLink}
                      >
                        <Copy size={14} strokeWidth={2} aria-hidden="true" />
                        <span>{copiedLink ? "Copied" : "Copy Link"}</span>
                      </button>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => {
                          onOpenChange(false);
                          onOpenMail();
                        }}
                      >
                        <Mail size={14} strokeWidth={2} aria-hidden="true" />
                        <span>Mail ({messagesCount})</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : studioTab === "style" ? (
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
                            className="theme-swatch-dot"
                            style={{ background: item.swatch }}
                            aria-hidden="true"
                          />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="edit-stack">
                  <label
                    htmlFor="mobile-owner-handle"
                    className="section-label"
                  >
                    Public handle
                  </label>
                  <div className="url-row">
                    <input
                      id="mobile-owner-handle"
                      type="text"
                      className="social-input is-mono"
                      value={handleDraft}
                      maxLength={20}
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
                      Save
                    </button>
                  </div>
                  <label
                    htmlFor="mobile-owner-prompt"
                    className="section-label"
                  >
                    Prompt question
                  </label>
                  <input
                    id="mobile-owner-prompt"
                    type="text"
                    className="social-input"
                    maxLength={120}
                    value={config.prompt}
                    onChange={(event) =>
                      updateConfig({ prompt: event.target.value })
                    }
                  />
                </div>
              )}
              <footer className="panel-footer">
                <span className="credit-badge">
                  made by <strong>noodlestack</strong> · <span>Hoho.xo</span>
                </span>
                <span className="inline-flex items-center gap-2 text-[12px] opacity-85">
                  <button
                    type="button"
                    className="footer-support-btn"
                    onClick={() => {
                      onOpenChange(false);
                      onOpenSupport();
                    }}
                  >
                    Support
                  </button>
                  <span aria-hidden="true">·</span>
                  <Link href="/privacy" className="hover:underline">
                    Privacy
                  </Link>
                  <span aria-hidden="true">·</span>
                  <Link href="/terms" className="hover:underline">
                    Terms
                  </Link>
                </span>
              </footer>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
