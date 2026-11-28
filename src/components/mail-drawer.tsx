"use client";

import { CheckCheck, Copy, Download, Gift, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Drawer } from "vaul";
import { OrnamentSpriteIcon } from "@/components/ornament-sprite-icon";
import { formatRelativeTime, type TreeMessage } from "@/lib/messages";
import { ORNAMENT_COLORS, ORNAMENT_TYPES } from "@/lib/tree-themes";

type MailFilter = "all" | "unread" | "replied" | "starred" | "reported";

interface MailDrawerProps {
  open: boolean;
  messages: TreeMessage[];
  activeOrnamentIds: Set<string>;
  christmasLock?: boolean;
  unwrappedIds?: Set<string>;
  onClose: () => void;
  onOpenMessage: (message: TreeMessage) => void;
  onCopyShareLink: () => void;
  onMarkAllRead?: () => void;
  onExportKeepsake?: () => void;
}

export function MailDrawer({
  open,
  messages,
  activeOrnamentIds,
  christmasLock = false,
  unwrappedIds,
  onClose,
  onOpenMessage,
  onCopyShareLink,
  onMarkAllRead,
  onExportKeepsake,
}: MailDrawerProps) {
  const [filter, setFilter] = useState<MailFilter>("all");
  const [search, setSearch] = useState("");
  const [beforeChristmas] = useState(
    () => Date.now() < Date.parse("2026-12-25T00:00:00"),
  );

  const isLockedPreview = christmasLock && beforeChristmas;

  // Ensure Escape closes the Mail drawer reliably (fixes OBS-09)
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const unreadCount = useMemo(
    () => messages.filter((m) => !m.readAt && m.status === "visible").length,
    [messages],
  );
  const repliedCount = useMemo(
    () =>
      messages.filter((m) => Boolean(m.repliedAt) && m.status === "visible")
        .length,
    [messages],
  );
  const starredCount = useMemo(
    () =>
      messages.filter((m) => Boolean(m.starred) && m.status === "visible")
        .length,
    [messages],
  );
  const reportedCount = useMemo(
    () => messages.filter((m) => m.status === "reported").length,
    [messages],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...messages]
      .sort((a, b) => b.seq - a.seq)
      .filter((msg) => {
        if (filter === "unread") {
          if (msg.readAt !== null || msg.status !== "visible") return false;
        } else if (filter === "replied") {
          if (!msg.repliedAt || msg.status !== "visible") return false;
        } else if (filter === "starred") {
          if (!msg.starred || msg.status !== "visible") return false;
        } else if (filter === "reported") {
          if (msg.status !== "reported") return false;
        }
        if (q) {
          if (isLockedPreview && !unwrappedIds?.has(msg.id)) {
            const ornamentName =
              ORNAMENT_TYPES[msg.ornamentType]?.name.toLowerCase() ?? "";
            return ornamentName.includes(q) || `#${msg.seq}`.includes(q);
          }
          if (!msg.body.toLowerCase().includes(q)) return false;
        }
        return true;
      });
  }, [messages, filter, search, isLockedPreview, unwrappedIds]);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      direction="right"
    >
      <Drawer.Portal>
        <Drawer.Overlay className="drawer-backdrop" />
        <Drawer.Content
          className="drawer-panel vaul-drawer-panel"
          aria-labelledby="mail-drawer-title"
        >
          <div className="sheet-header">
            <div>
              <Drawer.Description className="sheet-eyebrow">
                Private Letterbox · {unreadCount} Unread
              </Drawer.Description>
              <Drawer.Title className="sheet-title" id="mail-drawer-title">
                Mail ({messages.length})
              </Drawer.Title>
            </div>
            <button
              type="button"
              className="icon-close-btn"
              aria-label="Close Mail"
              onClick={onClose}
            >
              <X size={16} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>

          <p className="tree-meta-line">
            {messages.length > 100
              ? `${messages.length} total letters stored (${unreadCount} unread). The newest 100 visible letters hang as ornaments on your tree.`
              : `${messages.length} total ${
                  messages.length === 1 ? "letter" : "letters"
                } (${unreadCount} unread). Tap any item below to unfold its envelope and read it like a letter.`}
          </p>

          <div className="flex flex-col gap-2">
            <label htmlFor="mail-search-input" className="sr-only">
              Search Mail letters
            </label>
            <div className="mail-search-wrap">
              <Search
                size={14}
                strokeWidth={2}
                className="mail-search-icon"
                aria-hidden="true"
              />
              <input
                id="mail-search-input"
                type="search"
                className="social-input mail-search-input"
                placeholder={
                  isLockedPreview
                    ? "Search by ornament or #number..."
                    : "Search letters..."
                }
                maxLength={100}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            {onMarkAllRead || onExportKeepsake ? (
              <div className="mail-bulk-bar">
                {onMarkAllRead ? (
                  <button
                    type="button"
                    className="dice-btn mail-bulk-btn"
                    disabled={unreadCount === 0}
                    onClick={onMarkAllRead}
                  >
                    <CheckCheck size={14} strokeWidth={2} aria-hidden="true" />
                    <span>Mark all read</span>
                  </button>
                ) : null}
                {onExportKeepsake ? (
                  <button
                    type="button"
                    className="dice-btn mail-bulk-btn"
                    disabled={messages.length === 0 || isLockedPreview}
                    title={
                      isLockedPreview
                        ? "Unlock Wrap Dec 25 first to export full text"
                        : undefined
                    }
                    onClick={onExportKeepsake}
                  >
                    <Download size={14} strokeWidth={2} aria-hidden="true" />
                    <span>Export .txt</span>
                  </button>
                ) : null}
              </div>
            ) : null}
            <div
              className="mail-filter-row"
              role="group"
              aria-label="Mail filter"
            >
              <button
                type="button"
                className="filter-tab"
                aria-pressed={filter === "all"}
                onClick={() => setFilter("all")}
              >
                All ({messages.length})
              </button>
              <button
                type="button"
                className="filter-tab"
                aria-pressed={filter === "unread"}
                onClick={() => setFilter("unread")}
              >
                Unread ({unreadCount})
              </button>
              <button
                type="button"
                className="filter-tab"
                aria-pressed={filter === "replied"}
                onClick={() => setFilter("replied")}
              >
                Shared ({repliedCount})
              </button>
              <button
                type="button"
                className="filter-tab"
                aria-pressed={filter === "starred"}
                onClick={() => setFilter("starred")}
              >
                Starred ({starredCount})
              </button>
              <button
                type="button"
                className="filter-tab"
                aria-pressed={filter === "reported"}
                onClick={() => setFilter("reported")}
              >
                Reported{reportedCount > 0 ? ` (${reportedCount})` : ""}
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="mail-empty-box">
              <span
                aria-hidden="true"
                style={{ color: "#F5C451", fontSize: "1.4rem" }}
              >
                ✦
              </span>
              <p className="m-0 text-sm text-[#F2EDE4]">
                {messages.length === 0
                  ? "No holiday letters yet — share your QR or bio link!"
                  : "No letters match this filter."}
              </p>
              <p className="tree-meta-line">
                {messages.length === 0
                  ? "Every ornament on your tree comes from a real anonymous letter sent by a friend."
                  : "Try clearing your search or switching filter tabs."}
              </p>
              {messages.length === 0 && (
                <button
                  type="button"
                  className="secondary-btn mt-2"
                  onClick={() => {
                    onClose();
                    onCopyShareLink();
                  }}
                >
                  <Copy size={14} strokeWidth={2} aria-hidden="true" />
                  <span>Copy share link</span>
                </button>
              )}
            </div>
          ) : (
            <div className="mail-list">
              {filtered.map((msg) => {
                const ornament =
                  ORNAMENT_TYPES[msg.ornamentType] ?? ORNAMENT_TYPES[0];
                const color =
                  ORNAMENT_COLORS[msg.colorIdx % ORNAMENT_COLORS.length] ??
                  "#F5C451";
                const isUnread =
                  msg.readAt === null && msg.status === "visible";
                const onTree = activeOrnamentIds.has(msg.id);

                return (
                  <button
                    key={msg.id}
                    type="button"
                    className={["mail-item", isUnread ? "is-unread" : ""]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => onOpenMessage(msg)}
                  >
                    <div className="mail-item-top">
                      <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <OrnamentSpriteIcon
                          typeId={msg.ornamentType}
                          color={color}
                          size={22}
                          unread={isUnread}
                        />
                        <span>
                          {ornament.name} · #{msg.seq}
                        </span>
                        {isUnread && (
                          <span
                            style={{
                              color: "#F5C451",
                              fontWeight: 700,
                            }}
                          >
                            · NEW
                          </span>
                        )}
                        {msg.starred && (
                          <span
                            style={{
                              color: "#F5C451",
                              fontWeight: 700,
                            }}
                          >
                            · STARRED
                          </span>
                        )}
                        {msg.repliedAt && (
                          <span style={{ color: "#8FD3FF", fontWeight: 700 }}>
                            · SHARED
                          </span>
                        )}
                        {msg.status === "reported" && (
                          <span style={{ color: "#E5484D", fontWeight: 700 }}>
                            · REPORTED
                          </span>
                        )}
                        {onTree && (
                          <span style={{ color: "#5BD18B" }}>· ON TREE</span>
                        )}
                      </span>
                      <span>{formatRelativeTime(msg.createdAt)}</span>
                    </div>
                    {isLockedPreview && !unwrappedIds?.has(msg.id) ? (
                      <p className="mail-item-preview is-wrapped-preview">
                        <Gift
                          size={13}
                          strokeWidth={2}
                          style={{ display: "inline", marginRight: 6 }}
                          aria-hidden="true"
                        />
                        Wrapped until Dec 25 — tap to view sealed envelope
                      </p>
                    ) : (
                      <p className="mail-item-preview">{msg.body}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
