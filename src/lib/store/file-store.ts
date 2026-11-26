import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { TreeMessage } from "../messages";
import { parseHandle, type TreeConfig } from "../tree-config";
import {
  applyAppendToRecord,
  applyMarkAllReadToRecord,
  applyPatchToRecord,
  computeRecordSummary,
  toTreeMeta,
} from "./memory-store";
import { AsyncMutex } from "./mutex";
import type {
  AppendMessageInput,
  AppendMessageOptions,
  AppendMessageResult,
  IdempotencyEntry,
  MailSummary,
  MessagePatch,
  StoreFileSnapshot,
  StoredTreeRecord,
  TreeMeta,
  TreeStore,
} from "./types";

export class FileTreeStore implements TreeStore {
  private readonly mutex = new AsyncMutex();

  constructor(
    private readonly getFilePath: () => string,
    private readonly memoryTrees: Map<string, StoredTreeRecord>,
    private readonly idempotency: Map<string, Map<string, IdempotencyEntry>>,
    private readonly markFsUnavailable: () => void,
  ) {}

  private getIdemMap(handle: string): Map<string, IdempotencyEntry> {
    let map = this.idempotency.get(handle);
    if (!map) {
      map = new Map<string, IdempotencyEntry>();
      this.idempotency.set(handle, map);
    }
    return map;
  }

  private async readSnapshot(): Promise<StoreFileSnapshot> {
    const filePath = this.getFilePath();
    try {
      const raw = await fs.readFile(/*turbopackIgnore: true*/ filePath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (
        parsed &&
        typeof parsed === "object" &&
        "trees" in parsed &&
        parsed.trees &&
        typeof parsed.trees === "object"
      ) {
        return parsed as StoreFileSnapshot;
      }
      return { trees: {} };
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code?: string }).code)
          : "";
      if (code && code !== "ENOENT") {
        this.markFsUnavailable();
      }
      return { trees: {} };
    }
  }

  private async writeSnapshot(snap: StoreFileSnapshot): Promise<void> {
    const filePath = this.getFilePath();
    const dir = path.dirname(filePath);
    try {
      await fs.mkdir(/*turbopackIgnore: true*/ dir, { recursive: true });
      const tmpPath = `${filePath}.${crypto.randomBytes(4).toString("hex")}.tmp`;
      await fs.writeFile(
        /*turbopackIgnore: true*/ tmpPath,
        JSON.stringify(snap, null, 2),
        "utf8",
      );
      await fs.rename(
        /*turbopackIgnore: true*/ tmpPath,
        /*turbopackIgnore: true*/ filePath,
      );
    } catch {
      this.markFsUnavailable();
    }
  }

  async getTree(handle: string): Promise<TreeMeta | null> {
    const clean = parseHandle(handle);
    if (!clean) return null;
    return this.mutex.runExclusive(async () => {
      const snap = await this.readSnapshot();
      const rec = snap.trees[clean] ?? this.memoryTrees.get(clean);
      if (rec) this.memoryTrees.set(clean, rec);
      return rec ? toTreeMeta(rec) : null;
    });
  }

  async createTreeIfAbsent(meta: TreeMeta): Promise<boolean> {
    const clean = parseHandle(meta.handle);
    if (!clean || meta.ownerTokenHash.length === 0) return false;
    return this.mutex.runExclusive(async () => {
      const snap = await this.readSnapshot();
      if (snap.trees[clean] || this.memoryTrees.has(clean)) {
        return false;
      }
      const nextRecord: StoredTreeRecord = {
        ...meta,
        handle: clean,
        config: { ...meta.config, handle: clean },
        messages: [],
      };
      this.memoryTrees.set(clean, nextRecord);
      snap.trees[clean] = nextRecord;
      await this.writeSnapshot(snap);
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
      const snap = await this.readSnapshot();
      const existing = snap.trees[clean] ?? this.memoryTrees.get(clean);
      if (!existing) return null;
      const updated: StoredTreeRecord = {
        ...existing,
        config: { ...nextConfig, handle: clean },
        updatedAt: new Date().toISOString(),
      };
      this.memoryTrees.set(clean, updated);
      snap.trees[clean] = updated;
      await this.writeSnapshot(snap);
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
      const snap = await this.readSnapshot();
      const existing = snap.trees[clean] ?? this.memoryTrees.get(clean);
      const { nextRecord, result } = applyAppendToRecord(
        existing,
        input,
        opts,
        this.getIdemMap(clean),
      );
      if (nextRecord) {
        this.memoryTrees.set(clean, nextRecord);
        snap.trees[clean] = nextRecord;
        await this.writeSnapshot(snap);
      }
      return result;
    });
  }

  async getMessage(handle: string, id: string): Promise<TreeMessage | null> {
    const clean = parseHandle(handle);
    if (!clean) return null;
    return this.mutex.runExclusive(async () => {
      const snap = await this.readSnapshot();
      const existing = snap.trees[clean] ?? this.memoryTrees.get(clean);
      return existing?.messages.find((m) => m.id === id) ?? null;
    });
  }

  async listMessages(handle: string): Promise<TreeMessage[]> {
    const clean = parseHandle(handle);
    if (!clean) return [];
    return this.mutex.runExclusive(async () => {
      const snap = await this.readSnapshot();
      const existing = snap.trees[clean] ?? this.memoryTrees.get(clean);
      return existing ? [...existing.messages] : [];
    });
  }

  async newestVisible(handle: string, n: number): Promise<TreeMessage[]> {
    const all = await this.listMessages(handle);
    return all.filter((m) => m.status === "visible").slice(-Math.max(0, n));
  }

  async patchMessage(
    handle: string,
    id: string,
    patch: MessagePatch,
  ): Promise<TreeMessage | null> {
    const clean = parseHandle(handle);
    if (!clean) return null;
    return this.mutex.runExclusive(async () => {
      const snap = await this.readSnapshot();
      const existing = snap.trees[clean] ?? this.memoryTrees.get(clean);
      const { nextRecord, updated } = applyPatchToRecord(existing, id, patch);
      if (nextRecord) {
        this.memoryTrees.set(clean, nextRecord);
        snap.trees[clean] = nextRecord;
        await this.writeSnapshot(snap);
      }
      return updated;
    });
  }

  async deleteMessage(handle: string, id: string): Promise<boolean> {
    const clean = parseHandle(handle);
    if (!clean) return false;
    return this.mutex.runExclusive(async () => {
      const snap = await this.readSnapshot();
      const existing = snap.trees[clean] ?? this.memoryTrees.get(clean);
      if (!existing) return false;
      const nextMessages = existing.messages.filter((m) => m.id !== id);
      if (nextMessages.length === existing.messages.length) return false;
      const updated: StoredTreeRecord = {
        ...existing,
        messages: nextMessages,
        updatedAt: new Date().toISOString(),
      };
      this.memoryTrees.set(clean, updated);
      snap.trees[clean] = updated;
      await this.writeSnapshot(snap);
      return true;
    });
  }

  async markAllRead(handle: string): Promise<number> {
    const clean = parseHandle(handle);
    if (!clean) return 0;
    return this.mutex.runExclusive(async () => {
      const snap = await this.readSnapshot();
      const existing = snap.trees[clean] ?? this.memoryTrees.get(clean);
      const { nextRecord, changedCount } = applyMarkAllReadToRecord(existing);
      if (nextRecord) {
        this.memoryTrees.set(clean, nextRecord);
        snap.trees[clean] = nextRecord;
        await this.writeSnapshot(snap);
      }
      return changedCount;
    });
  }

  async summary(handle: string): Promise<MailSummary> {
    const clean = parseHandle(handle);
    if (!clean) return { unread: 0, latestSeq: 0, total: 0 };
    return this.mutex.runExclusive(async () => {
      const snap = await this.readSnapshot();
      const existing = snap.trees[clean] ?? this.memoryTrees.get(clean);
      return computeRecordSummary(existing);
    });
  }
}
