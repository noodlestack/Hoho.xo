import { createMessageRecord, type TreeMessage } from "../messages";
import { parseHandle, type TreeConfig } from "../tree-config";
import { AsyncMutex } from "./mutex";
import type {
  AppendMessageInput,
  AppendMessageOptions,
  AppendMessageResult,
  IdempotencyEntry,
  MailSummary,
  MessagePatch,
  PushState,
  StoredPushSubscription,
  StoredTreeRecord,
  TreeMeta,
  TreeStore,
} from "./types";

const IDEM_TTL_MS = 600_000;

export function toTreeMeta(record: StoredTreeRecord): TreeMeta {
  return {
    handle: record.handle,
    ownerTokenHash: record.ownerTokenHash,
    ...(record.passwordHash ? { passwordHash: record.passwordHash } : {}),
    config: record.config,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function pruneExpiredIdempotency(
  bucket: Map<string, IdempotencyEntry>,
  nowMs: number,
): void {
  for (const [key, entry] of bucket.entries()) {
    if (entry.expiresAt <= nowMs) {
      bucket.delete(key);
    }
  }
}

export function applyAppendToRecord(
  record: StoredTreeRecord | undefined,
  input: AppendMessageInput,
  opts: AppendMessageOptions,
  idemMap: Map<string, IdempotencyEntry>,
): { nextRecord?: StoredTreeRecord; result: AppendMessageResult } {
  if (!record || record.ownerTokenHash.length === 0) {
    return { result: { ok: false, reason: "missing" } };
  }

  const nowMs = Date.now();
  pruneExpiredIdempotency(idemMap, nowMs);

  if (opts.idempotencyKey) {
    const existingEntry = idemMap.get(opts.idempotencyKey);
    if (existingEntry) {
      const matched = record.messages.find(
        (m) => m.id === existingEntry.messageId,
      );
      if (matched) {
        const totalVisible = record.messages.filter(
          (m) => m.status === "visible",
        ).length;
        return {
          result: { ok: true, message: matched, deduped: true, totalVisible },
        };
      }
    }
  }

  if (record.messages.length >= opts.cap) {
    return { result: { ok: false, reason: "cap" } };
  }

  const maxSeq = record.messages.reduce((acc, m) => Math.max(acc, m.seq), 0);
  const normalizedType =
    typeof input.ornamentType === "number" &&
    Number.isFinite(input.ornamentType)
      ? Math.max(0, Math.min(15, Math.floor(input.ornamentType)))
      : null;

  const created = createMessageRecord({
    body: input.body,
    ornamentType: normalizedType,
    nextSeq: maxSeq + 1,
  });

  if (opts.idempotencyKey) {
    idemMap.set(opts.idempotencyKey, {
      messageId: created.id,
      expiresAt: nowMs + IDEM_TTL_MS,
    });
  }

  const nextMessages = [...record.messages, created];
  const totalVisible = nextMessages.filter(
    (m) => m.status === "visible",
  ).length;
  const nextRecord: StoredTreeRecord = {
    ...record,
    messages: nextMessages,
    updatedAt: created.createdAt,
  };

  return {
    nextRecord,
    result: { ok: true, message: created, deduped: false, totalVisible },
  };
}

export function applyPatchToRecord(
  record: StoredTreeRecord | undefined,
  id: string,
  patch: MessagePatch,
): { nextRecord?: StoredTreeRecord; updated: TreeMessage | null } {
  if (!record) return { updated: null };
  let updatedMsg: TreeMessage | null = null;
  const nextMessages = record.messages.map((m) => {
    if (m.id !== id) return m;
    updatedMsg = {
      ...m,
      ...(patch.readAt !== undefined ? { readAt: patch.readAt } : {}),
      ...(patch.repliedAt !== undefined ? { repliedAt: patch.repliedAt } : {}),
      ...(patch.starred !== undefined ? { starred: patch.starred } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.reportReason !== undefined
        ? { reportReason: patch.reportReason }
        : {}),
    };
    return updatedMsg;
  });
  if (!updatedMsg) return { updated: null };
  return {
    updated: updatedMsg,
    nextRecord: {
      ...record,
      messages: nextMessages,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function applyMarkAllReadToRecord(
  record: StoredTreeRecord | undefined,
): { nextRecord?: StoredTreeRecord; changedCount: number } {
  if (!record) return { changedCount: 0 };
  let changedCount = 0;
  const now = new Date().toISOString();
  const nextMessages = record.messages.map((m) => {
    if (m.status === "visible" && m.readAt === null) {
      changedCount += 1;
      return { ...m, readAt: now };
    }
    return m;
  });
  if (changedCount === 0) return { changedCount: 0 };
  return {
    changedCount,
    nextRecord: {
      ...record,
      messages: nextMessages,
      updatedAt: now,
    },
  };
}

export function computeRecordSummary(
  record: StoredTreeRecord | undefined,
): MailSummary {
  if (!record) return { unread: 0, latestSeq: 0, total: 0 };
  let unread = 0;
  let latestSeq = 0;
  for (const m of record.messages) {
    if (m.seq > latestSeq) latestSeq = m.seq;
    if (m.status === "visible" && m.readAt === null) unread += 1;
  }
  return { unread, latestSeq, total: record.messages.length };
}

export class MemoryTreeStore implements TreeStore {
  private readonly mutex = new AsyncMutex();

  constructor(
    private readonly trees: Map<string, StoredTreeRecord>,
    private readonly idempotency: Map<string, Map<string, IdempotencyEntry>>,
    private readonly pushStates: Map<string, PushState> = new Map(),
  ) {}

  private getIdemMap(handle: string): Map<string, IdempotencyEntry> {
    let map = this.idempotency.get(handle);
    if (!map) {
      map = new Map<string, IdempotencyEntry>();
      this.idempotency.set(handle, map);
    }
    return map;
  }

  async getTree(handle: string): Promise<TreeMeta | null> {
    const clean = parseHandle(handle);
    if (!clean) return null;
    return this.mutex.runExclusive(async () => {
      const rec = this.trees.get(clean);
      return rec ? toTreeMeta(rec) : null;
    });
  }

  async createTreeIfAbsent(meta: TreeMeta): Promise<boolean> {
    const clean = parseHandle(meta.handle);
    if (!clean || meta.ownerTokenHash.length === 0) return false;
    return this.mutex.runExclusive(async () => {
      if (this.trees.has(clean)) return false;
      this.trees.set(clean, {
        ...meta,
        handle: clean,
        config: { ...meta.config, handle: clean },
        messages: [],
      });
      return true;
    });
  }

  async updateConfig(
    handle: string,
    nextConfig: TreeConfig,
  ): Promise<TreeMeta | null> {
    const clean = parseHandle(handle);
    if (!clean) return null;
    return this.mutex.runExclusive(async () => {
      const existing = this.trees.get(clean);
      if (!existing) return null;
      const updated: StoredTreeRecord = {
        ...existing,
        config: { ...nextConfig, handle: clean },
        updatedAt: new Date().toISOString(),
      };
      this.trees.set(clean, updated);
      return toTreeMeta(updated);
    });
  }

  async updateAuth(
    handle: string,
    patch: { ownerTokenHash?: string; passwordHash?: string },
  ): Promise<TreeMeta | null> {
    const clean = parseHandle(handle);
    if (!clean) return null;
    return this.mutex.runExclusive(async () => {
      const existing = this.trees.get(clean);
      if (!existing) return null;
      const updated: StoredTreeRecord = {
        ...existing,
        ...(patch.ownerTokenHash !== undefined
          ? { ownerTokenHash: patch.ownerTokenHash }
          : {}),
        ...(patch.passwordHash !== undefined
          ? { passwordHash: patch.passwordHash }
          : {}),
        updatedAt: new Date().toISOString(),
      };
      this.trees.set(clean, updated);
      return toTreeMeta(updated);
    });
  }

  async appendMessage(
    handle: string,
    input: AppendMessageInput,
    opts: AppendMessageOptions,
  ): Promise<AppendMessageResult> {
    const clean = parseHandle(handle);
    if (!clean) return { ok: false, reason: "missing" };
    return this.mutex.runExclusive(async () => {
      const existing = this.trees.get(clean);
      const { nextRecord, result } = applyAppendToRecord(
        existing,
        input,
        opts,
        this.getIdemMap(clean),
      );
      if (nextRecord) {
        this.trees.set(clean, nextRecord);
      }
      return result;
    });
  }

  async getMessage(handle: string, id: string): Promise<TreeMessage | null> {
    const clean = parseHandle(handle);
    if (!clean) return null;
    return this.mutex.runExclusive(async () => {
      const existing = this.trees.get(clean);
      return existing?.messages.find((m) => m.id === id) ?? null;
    });
  }

  async listMessages(handle: string): Promise<TreeMessage[]> {
    const clean = parseHandle(handle);
    if (!clean) return [];
    return this.mutex.runExclusive(async () => {
      const existing = this.trees.get(clean);
      return existing ? [...existing.messages] : [];
    });
  }

  async newestVisible(handle: string, n: number): Promise<TreeMessage[]> {
    const all = await this.listMessages(handle);
    const visible = all.filter((m) => m.status === "visible");
    return visible.slice(-Math.max(0, n));
  }

  async patchMessage(
    handle: string,
    id: string,
    patch: MessagePatch,
  ): Promise<TreeMessage | null> {
    const clean = parseHandle(handle);
    if (!clean) return null;
    return this.mutex.runExclusive(async () => {
      const existing = this.trees.get(clean);
      const { nextRecord, updated } = applyPatchToRecord(existing, id, patch);
      if (nextRecord) {
        this.trees.set(clean, nextRecord);
      }
      return updated;
    });
  }

  async deleteMessage(handle: string, id: string): Promise<boolean> {
    const clean = parseHandle(handle);
    if (!clean) return false;
    return this.mutex.runExclusive(async () => {
      const existing = this.trees.get(clean);
      if (!existing) return false;
      const nextMessages = existing.messages.filter((m) => m.id !== id);
      if (nextMessages.length === existing.messages.length) return false;
      this.trees.set(clean, {
        ...existing,
        messages: nextMessages,
        updatedAt: new Date().toISOString(),
      });
      return true;
    });
  }

  async markAllRead(handle: string): Promise<number> {
    const clean = parseHandle(handle);
    if (!clean) return 0;
    return this.mutex.runExclusive(async () => {
      const existing = this.trees.get(clean);
      const { nextRecord, changedCount } = applyMarkAllReadToRecord(existing);
      if (nextRecord) {
        this.trees.set(clean, nextRecord);
      }
      return changedCount;
    });
  }

  async summary(handle: string): Promise<MailSummary> {
    const clean = parseHandle(handle);
    if (!clean) return { unread: 0, latestSeq: 0, total: 0 };
    return this.mutex.runExclusive(async () => {
      return computeRecordSummary(this.trees.get(clean));
    });
  }

  async listPushSubscriptions(
    handle: string,
  ): Promise<StoredPushSubscription[]> {
    const clean = parseHandle(handle);
    if (!clean) return [];
    return this.mutex.runExclusive(async () => {
      return [...(this.pushStates.get(clean)?.subscriptions ?? [])];
    });
  }

  async upsertPushSubscription(
    handle: string,
    sub: StoredPushSubscription,
    maxDevices = 5,
  ): Promise<number> {
    const clean = parseHandle(handle);
    if (!clean) return 0;
    return this.mutex.runExclusive(async () => {
      const state = this.pushStates.get(clean) ?? {
        subscriptions: [],
        lastNotifiedAt: 0,
      };
      const filtered = state.subscriptions.filter(
        (item) => item.endpoint !== sub.endpoint,
      );
      const nextSubs = [...filtered, sub].slice(-Math.max(1, maxDevices));
      this.pushStates.set(clean, { ...state, subscriptions: nextSubs });
      return nextSubs.length;
    });
  }

  async removePushSubscription(
    handle: string,
    endpoint: string,
  ): Promise<number> {
    const clean = parseHandle(handle);
    if (!clean) return 0;
    return this.mutex.runExclusive(async () => {
      const state = this.pushStates.get(clean);
      if (!state) return 0;
      const nextSubs = state.subscriptions.filter(
        (item) => item.endpoint !== endpoint,
      );
      this.pushStates.set(clean, { ...state, subscriptions: nextSubs });
      return nextSubs.length;
    });
  }

  async claimPushCoalesceWindow(
    handle: string,
    windowMs = 60_000,
  ): Promise<boolean> {
    const clean = parseHandle(handle);
    if (!clean) return false;
    return this.mutex.runExclusive(async () => {
      const now = Date.now();
      const state = this.pushStates.get(clean) ?? {
        subscriptions: [],
        lastNotifiedAt: 0,
      };
      if (state.subscriptions.length === 0) return false;
      if (now - state.lastNotifiedAt < windowMs) return false;
      this.pushStates.set(clean, { ...state, lastNotifiedAt: now });
      return true;
    });
  }
}
