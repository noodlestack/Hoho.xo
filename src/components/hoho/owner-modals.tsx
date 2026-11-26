"use client";

import dynamic from "next/dynamic";
import type { Dispatch, SetStateAction } from "react";
import type { ReportReason, TreeMessage } from "@/lib/messages";
import { saveTreeConfig, type TreeConfig } from "@/lib/tree-config";
import type { TreeTheme } from "@/lib/tree-themes";

const MailDrawer = dynamic(
  () => import("@/components/mail-drawer").then((m) => m.MailDrawer),
  { ssr: false },
);

const MessageCardSheet = dynamic(
  () =>
    import("@/components/message-card-sheet").then((m) => m.MessageCardSheet),
  { ssr: false },
);

const InviteStorySheet = dynamic(
  () =>
    import("@/components/invite-story-sheet").then((m) => m.InviteStorySheet),
  { ssr: false },
);

const SupportSheet = dynamic(
  () => import("@/components/support-sheet").then((m) => m.SupportSheet),
  { ssr: false },
);

interface OwnerModalsProps {
  mailOpen: boolean;
  setMailOpen: Dispatch<SetStateAction<boolean>>;
  activeMessage: TreeMessage | null;
  setActiveMessageId: Dispatch<SetStateAction<string | null>>;
  inviteSheetOpen: boolean;
  setInviteSheetOpen: Dispatch<SetStateAction<boolean>>;
  supportOpen: boolean;
  setSupportOpen: Dispatch<SetStateAction<boolean>>;
  messages: TreeMessage[];
  activeOrnamentIds: Set<string>;
  shareUrl: string;
  theme: TreeTheme;
  activeHandle: string;
  config: TreeConfig;
  setConfig: Dispatch<SetStateAction<TreeConfig>>;
  onOpenMessage: (msg: TreeMessage) => void;
  onCopyShareLink: () => void;
  onMarkAllRead: () => Promise<void>;
  onExportKeepsake: () => void;
  onDelete: (id: string) => void;
  onReport: (id: string, reason: ReportReason) => void;
  onToggleStar: (id: string, starred: boolean) => void;
  onMarkReplied: (id: string) => void;
  showToast: (message: string, variant?: "success" | "info" | "error") => void;
}

/** Lazy-loaded owner modals and sheets for Mail, Message Card unwrap, Story Invite, and Support. */
export function OwnerModals({
  mailOpen,
  setMailOpen,
  activeMessage,
  setActiveMessageId,
  inviteSheetOpen,
  setInviteSheetOpen,
  supportOpen,
  setSupportOpen,
  messages,
  activeOrnamentIds,
  shareUrl,
  theme,
  activeHandle,
  config,
  setConfig,
  onOpenMessage,
  onCopyShareLink,
  onMarkAllRead,
  onExportKeepsake,
  onDelete,
  onReport,
  onToggleStar,
  onMarkReplied,
  showToast,
}: OwnerModalsProps) {
  return (
    <>
      <MailDrawer
        open={mailOpen}
        messages={messages}
        activeOrnamentIds={activeOrnamentIds}
        onClose={() => setMailOpen(false)}
        onOpenMessage={(msg) => {
          setMailOpen(false);
          onOpenMessage(msg);
        }}
        onCopyShareLink={onCopyShareLink}
        onMarkAllRead={onMarkAllRead}
        onExportKeepsake={onExportKeepsake}
      />
      <MessageCardSheet
        message={activeMessage}
        messages={messages}
        treeUrl={shareUrl}
        displayName={config.displayName}
        prompt={config.prompt}
        christmasLock={config.christmasLock}
        onClose={() => setActiveMessageId(null)}
        onSelectMessage={onOpenMessage}
        onDelete={onDelete}
        onReport={onReport}
        onToggleStar={onToggleStar}
        onMarkReplied={onMarkReplied}
      />
      <InviteStorySheet
        open={inviteSheetOpen}
        treeUrl={shareUrl}
        theme={theme}
        config={{
          handle: activeHandle,
          displayName: config.displayName,
          prompt: config.prompt,
        }}
        onClose={() => setInviteSheetOpen(false)}
        onResult={(outcome) => {
          if (outcome === "shared") {
            showToast("Opened Story share sheet");
          } else if (outcome === "downloaded") {
            showToast("Downloaded 1080×1920 IG Story Invite");
          } else {
            showToast("Story invite share cancelled", "info");
          }
        }}
      />
      <SupportSheet
        open={supportOpen}
        handle={activeHandle}
        supporter={Boolean(config.supporter)}
        onClose={() => setSupportOpen(false)}
        onSupporterUnlocked={() => {
          setConfig((prev) => {
            const next = { ...prev, supporter: true };
            if (activeHandle) saveTreeConfig(activeHandle, next);
            return next;
          });
          showToast("Golden Star Supporter halo unlocked!");
        }}
      />
    </>
  );
}
