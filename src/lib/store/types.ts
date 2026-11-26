import type { MessageStatus, ReportReason, TreeMessage } from "../messages";
import type { TreeConfig } from "../tree-config";

export interface TreeMeta {
  handle: string;
  ownerTokenHash: string;
  config: TreeConfig;
  createdAt: string;
  updatedAt: string;
}

export interface StoredTreeRecord extends TreeMeta {
  messages: TreeMessage[];
}

export interface StoredPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: string;
}

export interface PushState {
  subscriptions: StoredPushSubscription[];
  lastNotifiedAt: number;
}

export interface StoreFileSnapshot {
  trees: Record<string, StoredTreeRecord>;
  push?: Record<string, PushState>;
}

export interface MailSummary {
  unread: number;
  latestSeq: number;
  total: number;
}

export interface AppendMessageInput {
  body: string;
  ornamentType: number | null;
}

export interface AppendMessageOptions {
  idempotencyKey?: string;
  cap: number;
}

export type AppendMessageResult =
  | {
      ok: true;
      message: TreeMessage;
      deduped: boolean;
      totalVisible: number;
    }
  | { ok: false; reason: "missing" | "cap" };

export interface MessagePatch {
  readAt?: string | null;
  repliedAt?: string | null;
  starred?: boolean;
  status?: MessageStatus;
  reportReason?: ReportReason;
}

export interface TreeStore {
  getTree(handle: string): Promise<TreeMeta | null>;
  createTreeIfAbsent(meta: TreeMeta): Promise<boolean>;
  updateConfig(
    handle: string,
    nextConfig: TreeConfig,
  ): Promise<TreeMeta | null>;
  appendMessage(
    handle: string,
    input: AppendMessageInput,
    opts: AppendMessageOptions,
  ): Promise<AppendMessageResult>;
  getMessage(handle: string, id: string): Promise<TreeMessage | null>;
  listMessages(handle: string): Promise<TreeMessage[]>;
  newestVisible(handle: string, n: number): Promise<TreeMessage[]>;
  patchMessage(
    handle: string,
    id: string,
    patch: MessagePatch,
  ): Promise<TreeMessage | null>;
  deleteMessage(handle: string, id: string): Promise<boolean>;
  markAllRead(handle: string): Promise<number>;
  summary(handle: string): Promise<MailSummary>;
  listPushSubscriptions(handle: string): Promise<StoredPushSubscription[]>;
  upsertPushSubscription(
    handle: string,
    sub: StoredPushSubscription,
    maxDevices?: number,
  ): Promise<number>;
  removePushSubscription(handle: string, endpoint: string): Promise<number>;
  claimPushCoalesceWindow(handle: string, windowMs?: number): Promise<boolean>;
}

export interface IdempotencyEntry {
  messageId: string;
  expiresAt: number;
}

export function getMaxMessagesPerTree(): number {
  const raw = Number(process.env.HOHO_MAX_MESSAGES_PER_TREE);
  if (Number.isFinite(raw) && raw >= 1 && raw <= 50_000) {
    return Math.floor(raw);
  }
  return 1000;
}
