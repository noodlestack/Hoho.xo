"use client";

import { Copy, LogIn, LogOut, Mail, Share2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Drawer } from "vaul";
import type { StudioTab } from "@/components/hoho/experience-helpers";
import {
  OwnerCustomizeTabs,
  type OwnerCustomizeTabsProps,
} from "@/components/hoho/owner-customize-tabs";
import {
  OwnerOnboardingCard,
  type OwnerOnboardingCardProps,
} from "@/components/hoho/owner-onboarding-card";

interface MobileOwnerSheetProps extends Omit<
  OwnerCustomizeTabsProps,
  "idPrefix" | "studioTab"
> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthenticated: boolean;
  isOnline: boolean;
  studioTab: StudioTab;
  setStudioTab: (tab: StudioTab) => void;
  avatarGlyph: string;
  copiedLink: boolean;
  onCopyLink: () => void;
  messagesCount: number;
  onOpenInviteSheet: () => void;
  onOpenMail: () => void;
  onOpenSupport: () => void;
  onboardingProps: Omit<OwnerOnboardingCardProps, "idPrefix">;
}

/** Mobile bottom sheet trigger and Vaul drawer for Owner onboarding/login and Creator Studio. */
export function MobileOwnerSheet({
  open,
  onOpenChange,
  isAuthenticated,
  isOnline,
  studioTab,
  setStudioTab,
  activeHandle,
  config,
  avatarGlyph,
  copiedLink,
  onCopyLink,
  messagesCount,
  onOpenInviteSheet,
  onOpenMail,
  onOpenSupport,
  onboardingProps,
  ...customizeProps
}: MobileOwnerSheetProps) {
  const [hasOpened, setHasOpened] = useState(open);

  return (
    <>
      <button
        type="button"
        className="mobile-sheet-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setHasOpened(true);
          onOpenChange(true);
        }}
      >
        {isAuthenticated ? (
          <>
            <Sparkles size={15} strokeWidth={2.2} aria-hidden="true" />
            <span>My Tree (@{activeHandle})</span>
          </>
        ) : (
          <>
            <LogIn size={15} strokeWidth={2.2} aria-hidden="true" />
            <span>Create Tree / Log In</span>
          </>
        )}
      </button>
      {hasOpened || open ? (
        <Drawer.Root open={open} onOpenChange={onOpenChange}>
          <Drawer.Portal>
            <Drawer.Overlay className="drawer-backdrop" />
            <Drawer.Content
              className="sheet-panel vaul-sheet-panel mobile-panel-drawer"
              aria-label="Owner tree creator hub"
            >
              <div className="vaul-drag-handle" aria-hidden="true" />
              <Drawer.Title className="sr-only">
                {isAuthenticated ? "Creator Studio" : "Create or Log In"}
              </Drawer.Title>
              <div className="mobile-drawer-scroll">
                {!isOnline ? (
                  <div className="offline-pill" role="status">
                    Offline — changes will sync when reconnected
                  </div>
                ) : null}

                {!isAuthenticated ? (
                  <OwnerOnboardingCard
                    idPrefix="mobile-owner-"
                    {...onboardingProps}
                  />
                ) : (
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
                        Settings
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
                                {config.supporter ? (
                                  <span className="supporter-badge">
                                    ★ Supporter
                                  </span>
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
                                    {config.pauseInbox
                                      ? "Paused"
                                      : "Accepting letters"}
                                  </span>
                                </span>
                              </p>
                            </div>
                            <button
                              type="button"
                              className="account-signout-pill"
                              aria-label="Sign out or switch tree"
                              onClick={() => {
                                onOpenChange(false);
                                void customizeProps.onLogout();
                              }}
                            >
                              <LogOut
                                size={14}
                                strokeWidth={2}
                                aria-hidden="true"
                              />
                            </button>
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
                            <Share2
                              size={15}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                            <span>Export 4K Card &amp; HD Video</span>
                          </button>
                          <div className="share-secondary-row">
                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={onCopyLink}
                            >
                              <Copy
                                size={14}
                                strokeWidth={2}
                                aria-hidden="true"
                              />
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
                              <Mail
                                size={14}
                                strokeWidth={2}
                                aria-hidden="true"
                              />
                              <span>Mail ({messagesCount})</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <OwnerCustomizeTabs
                        idPrefix="mobile-owner-"
                        studioTab={studioTab}
                        activeHandle={activeHandle}
                        config={config}
                        {...customizeProps}
                      />
                    )}
                  </>
                )}

                <footer className="panel-footer">
                  <span className="credit-badge">
                    made by <strong>noodlestack</strong> · <span>Hoho.xo</span>
                  </span>
                  <span className="footer-links-row">
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
                    <Link href="/privacy" className="footer-nav-link">
                      Privacy
                    </Link>
                    <span aria-hidden="true">·</span>
                    <Link href="/terms" className="footer-nav-link">
                      Terms
                    </Link>
                  </span>
                </footer>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      ) : null}
    </>
  );
}
