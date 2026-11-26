"use client";

import { Check, Coffee, ExternalLink, Heart, Sparkles, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Drawer } from "vaul";
import { getOptionalTipNote, getSupportChannels } from "@/lib/support-config";

interface SupportSheetProps {
  open: boolean;
  handle: string;
  supporter: boolean;
  onClose: () => void;
  onSupporterUnlocked: () => void;
}

export function SupportSheet({
  open,
  handle,
  supporter,
  onClose,
  onSupporterUnlocked,
}: SupportSheetProps) {
  const channels = getSupportChannels();
  const tipNote = getOptionalTipNote();
  const [codeDraft, setCodeDraft] = useState("");
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [redeemError, setRedeemError] = useState("");

  async function handleRedeemCode(event: FormEvent) {
    event.preventDefault();
    if (!handle || !codeDraft.trim() || redeemBusy) return;
    setRedeemBusy(true);
    setRedeemError("");
    try {
      const res = await fetch(
        `/api/trees/${encodeURIComponent(handle)}/supporter`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: codeDraft.trim() }),
        },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        supporter?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setRedeemError(data.error || "Could not verify supporter code.");
        return;
      }
      setCodeDraft("");
      onSupporterUnlocked();
    } catch {
      setRedeemError("Network error while verifying supporter code.");
    } finally {
      setRedeemBusy(false);
    }
  }

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
          className="sheet-panel vaul-sheet-panel"
          aria-labelledby="support-sheet-title"
        >
          <div className="vaul-drag-handle" aria-hidden="true" />
          <div className="sheet-header">
            <div>
              <Drawer.Description className="sheet-eyebrow">
                Optional Support · Zero Paywalls
              </Drawer.Description>
              <Drawer.Title className="sheet-title" id="support-sheet-title">
                Keep Hoho.xo running
              </Drawer.Title>
            </div>
            <button
              type="button"
              className="icon-close-btn"
              aria-label="Close Support sheet"
              onClick={onClose}
            >
              <X size={16} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>

          <div className="support-promise-card">
            <p className="support-promise-title">
              Every tree, note, theme, and Story export stays 100% free.
            </p>
            <p className="tree-meta-line">
              We never gate Mail behind a subscription, never sell anonymous
              sender hints or reveals, and never run tracking ads. Optional tips
              simply help cover server hosting &amp; Redis bills.
            </p>
          </div>

          {supporter ? (
            <div className="supporter-active-pill" role="status">
              <Sparkles size={14} strokeWidth={2.2} aria-hidden="true" />
              <span>Golden Star Supporter halo is active on @{handle}</span>
            </div>
          ) : null}

          {channels.length > 0 ? (
            <div className="support-channel-list">
              {channels.map((channel) => (
                <a
                  key={channel.id}
                  href={channel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="support-channel-item"
                >
                  <span className="support-channel-icon" aria-hidden="true">
                    {channel.id === "buymeacoffee" ? (
                      <Coffee size={17} strokeWidth={2} />
                    ) : (
                      <Heart size={17} strokeWidth={2} />
                    )}
                  </span>
                  <span className="support-channel-text">
                    <strong>{channel.label}</strong>
                    <span>{channel.description}</span>
                  </span>
                  <ExternalLink size={15} strokeWidth={2} aria-hidden="true" />
                </a>
              ))}
            </div>
          ) : (
            <div className="message-reading-box">
              <p className="tree-meta-line">
                External tip links are not configured on this host yet. Sharing
                your tree with friends and starring the project on GitHub helps
                keep Hoho.xo growing!
              </p>
            </div>
          )}

          {tipNote ? <p className="tree-meta-line">{tipNote}</p> : null}

          {!supporter && handle ? (
            <details className="bio-guide-details">
              <summary>Redeem a supporter thank-you code</summary>
              <form
                className="url-row mt-2"
                onSubmit={(event) => void handleRedeemCode(event)}
              >
                <label htmlFor="supporter-code-input" className="sr-only">
                  Supporter thank-you code
                </label>
                <input
                  id="supporter-code-input"
                  type="text"
                  className="social-input is-mono"
                  placeholder="Enter thank-you code..."
                  maxLength={64}
                  value={codeDraft}
                  onChange={(event) => setCodeDraft(event.target.value)}
                />
                <button
                  type="submit"
                  className="secondary-btn"
                  disabled={redeemBusy || !codeDraft.trim()}
                >
                  <Check size={14} strokeWidth={2} aria-hidden="true" />
                  <span>{redeemBusy ? "Checking..." : "Unlock halo"}</span>
                </button>
              </form>
              {redeemError ? (
                <p className="error-box mt-2" role="alert">
                  {redeemError}
                </p>
              ) : (
                <p className="tree-meta-line mt-2">
                  Supporter codes unlock a subtle golden star halo on your tree
                  — purely cosmetic.
                </p>
              )}
            </details>
          ) : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
