import { createMessageRecord, type TreeMessage } from "../messages";
import { parseHandle, type TreeConfig } from "../tree-config";
import type {
  AppendMessageInput,
  AppendMessageOptions,
  AppendMessageResult,
  MailSummary,
  MessagePatch,
  StoredPushSubscription,
  StoredTreeRecord,
  TreeMeta,
  TreeStore,
} from "./types";

const KV_V2_PREFIX = "hoho:v2:";
const LEGACY_PREFIX = "hoho:tree:";
const LEGACY_RETENTION_SEC = 604_800; // 7 days
const IDEM_TTL_SEC = 600; // 10 minutes

export interface KvCredentials {
  url: string;
  token: string;
}

function kTree(h: string): string {
  return `${KV_V2_PREFIX}tree:${h}`;
}
function kSeq(h: string): string {
  return `${KV_V2_PREFIX}seq:${h}`;
}
function kIdx(h: string): string {
  return `${KV_V2_PREFIX}idx:${h}`;
}
function kMsg(h: string): string {
  return `${KV_V2_PREFIX}msg:${h}`;
}
function kUnread(h: string): string {
  return `${KV_V2_PREFIX}unread:${h}`;
}
function kIdem(h: string, key: string): string {
  return `${KV_V2_PREFIX}idem:${h}:${key}`;
}
function kPush(h: string): string {
  return `${KV_V2_PREFIX}push:${h}`;
}
function kPushCooldown(h: string): string {
  return `${KV_V2_PREFIX}push_cd:${h}`;
}

export class KvTreeStore implements TreeStore {
  constructor(private readonly getEnv: () => KvCredentials | null) {}

  private requireEnv(): KvCredentials {
    const env = this.getEnv();
    if (!env) {
      throw new Error("KV credentials missing");
    }
    return env;
  }

  private async exec(args: Array<string | number>): Promise<unknown> {
    const env = this.requireEnv();
    const res = await fetch(env.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`KV command failed (${res.status})`);
    }
    const json = (await res.json()) as { result?: unknown; error?: string };
    if (json.error) {
      throw new Error(`KV error: ${json.error}`);
    }
    return json.result ?? null;
  }

  private async pipeline(
    commands: Array<Array<string | number>>,
  ): Promise<unknown[]> {
    if (commands.length === 0) return [];
    const env = this.requireEnv();
    const res = await fetch(`${env.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`KV pipeline failed (${res.status})`);
    }
    const list = (await res.json()) as Array<{
      result?: unknown;
      error?: string;
    }>;
    return list.map((item) => {
      if (item?.error) {
        throw new Error(`KV pipeline error: ${item.error}`);
      }
      return item?.result ?? null;
    });
  }

  private async migrateLegacyIfNeeded(clean: string): Promise<TreeMeta | null> {
    const legacyRaw = await this.exec(["GET", `${LEGACY_PREFIX}${clean}`]);
    if (typeof legacyRaw !== "string") return null;

    let legacy: StoredTreeRecord;
    try {
      legacy = JSON.parse(legacyRaw) as StoredTreeRecord;
    } catch {
      return null;
    }

    // Ignore legacy unclaimed records
    if (!legacy || !legacy.ownerTokenHash || legacy.ownerTokenHash.length === 0) {
      return null;
    }

    const meta: TreeMeta = {
      handle: clean,
      ownerTokenHash: legacy.ownerTokenHash,
      config: { ...legacy.config, handle: clean },
      createdAt: legacy.createdAt,
      updatedAt: legacy.updatedAt,
    };

    const messages = Array.isArray(legacy.messages) ? legacy.messages : [];
    const maxSeq = messages.reduce((acc, m) => Math.max(acc, m.seq), 0);

    const claimed = await this.exec([
      "SET",
      kTree(clean),
      JSON.stringify(meta),
      "NX",
    ]);

    if (claimed === "OK") {
      const cmds: Array<Array<string | number>> = [
        ["SET", kSeq(clean), maxSeq, "NX"],
      ];
      if (messages.length > 0) {
        const hsetCmd: Array<string | number> = ["HSET", kMsg(clean)];
        const zaddCmd: Array<string | number> = ["ZADD", kIdx(clean)];
        const unreadIds: string[] = [];
        for (const msg of messages) {
          hsetCmd.push(msg.id, JSON.stringify(msg));
          zaddCmd.push(msg.seq, msg.id);
          if (msg.status === "visible" && msg.readAt === null) {
            unreadIds.push(msg.id);
          }
        }
        cmds.push(hsetCmd, zaddCmd);
        if (unreadIds.length > 0) {
          cmds.push(["SADD", kUnread(clean), ...unreadIds]);
        }
      }
      // Retain legacy blob for 7 days rather than deleting immediately
      cmds.push(["EXPIRE", `${LEGACY_PREFIX}${clean}`, LEGACY_RETENTION_SEC]);
      await this.pipeline(cmds);
      return meta;
    }

    // Another worker migrated concurrently; read the canonical v2 meta
    const v2Raw = await this.exec(["GET", kTree(clean)]);
    if (typeof v2Raw !== "string") return null;
    try {
      return JSON.parse(v2Raw) as TreeMeta;
    } catch {
      return null;
    }
  }

  async getTree(handle: string): Promise<TreeMeta | null> {
    const clean = parseHandle(handle);
    if (!clean) return null;
    const raw = await this.exec(["GET", kTree(clean)]);
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw) as TreeMeta;
      } catch {
        return null;
      }
    }
    return this.migrateLegacyIfNeeded(clean);
  }

  async createTreeIfAbsent(meta: TreeMeta): Promise<boolean> {
    const clean = parseHandle(meta.handle);
    if (!clean || meta.ownerTokenHash.length === 0) return false;
    const existing = await this.getTree(clean);
    if (existing) return false;
    const normalized: TreeMeta = {
      ...meta,
      handle: clean,
      config: { ...meta.config, handle: clean },
    };
    const res = await this.exec([
      "SET",
      kTree(clean),
      JSON.stringify(normalized),
      "NX",
    ]);
    return res === "OK";
  }

  async updateConfig(
    handle: string,
    nextConfig: TreeConfig,
  ): Promise<TreeMeta | null> {
    const clean = parseHandle(handle);
    if (!clean) return null;
    const existing = await this.getTree(clean);
    if (!existing) return null;
    const updated: TreeMeta = {
      ...existing,
      config: { ...nextConfig, handle: clean },
      updatedAt: new Date().toISOString(),
    };
    await this.exec(["SET", kTree(clean), JSON.stringify(updated)]);
    return updated;
  }

  async appendMessage(
    handle: string,
    input: AppendMessageInput,
    opts: AppendMessageOptions,
  ): Promise<AppendMessageResult> {
    const clean = parseHandle(handle);
    if (!clean) return { ok: false, reason: "missing" };
    const meta = await this.getTree(clean);
    if (!meta || meta.ownerTokenHash.length === 0) {
      return { ok: false, reason: "missing" };
    }

    if (opts.idempotencyKey) {
      const existingId = await this.exec([
        "GET",
        kIdem(clean, opts.idempotencyKey),
      ]);
      if (typeof existingId === "string" && existingId.length > 0) {
        const [rawMsg, totalCards] = await this.pipeline([
          ["HGET", kMsg(clean), existingId],
          ["ZCARD", kIdx(clean)],
        ]);
        if (typeof rawMsg === "string") {
          try {
            const msg = JSON.parse(rawMsg) as TreeMessage;
            return {
              ok: true,
              message: msg,
              deduped: true,
              totalVisible: Number(totalCards) || 1,
            };
          } catch {
            // Fall through if corrupted
          }
        }
      }
    }

    const currentTotal = Number(await this.exec(["ZCARD", kIdx(clean)])) || 0;
    if (currentTotal >= opts.cap) {
      return { ok: false, reason: "cap" };
    }

    const normalizedType =
      typeof input.ornamentType === "number" && Number.isFinite(input.ornamentType)
        ? Math.max(0, Math.min(15, Math.floor(input.ornamentType)))
        : null;

    const draft = createMessageRecord({
      body: input.body,
      ornamentType: normalizedType,
      nextSeq: 0,
    });

    if (opts.idempotencyKey) {
      const lock = await this.exec([
        "SET",
        kIdem(clean, opts.idempotencyKey),
        draft.id,
        "NX",
        "EX",
        IDEM_TTL_SEC,
      ]);
      if (lock !== "OK") {
        const winnerId = await this.exec([
          "GET",
          kIdem(clean, opts.idempotencyKey),
        ]);
        if (typeof winnerId === "string" && winnerId.length > 0) {
          for (let attempt = 0; attempt < 3; attempt += 1) {
            const [rawWinner, totalCards] = await this.pipeline([
              ["HGET", kMsg(clean), winnerId],
              ["ZCARD", kIdx(clean)],
            ]);
            if (typeof rawWinner === "string") {
              try {
                return {
                  ok: true,
                  message: JSON.parse(rawWinner) as TreeMessage,
                  deduped: true,
                  totalVisible: Number(totalCards) || 1,
                };
              } catch {
                break;
              }
            }
            await new Promise((r) => setTimeout(r, 15));
          }
        }
      }
    }

    const nextSeq = Number(await this.exec(["INCR", kSeq(clean)]));
    const message: TreeMessage = { ...draft, seq: nextSeq };
    const nextMeta: TreeMeta = { ...meta, updatedAt: message.createdAt };

    const [, , , allVals] = await this.pipeline([
      ["HSET", kMsg(clean), message.id, JSON.stringify(message)],
      ["ZADD", kIdx(clean), nextSeq, message.id],
      ["SADD", kUnread(clean), message.id],
      ["HVALS", kMsg(clean)],
      ["SET", kTree(clean), JSON.stringify(nextMeta)],
    ]);

    let totalVisible = 1;
    if (Array.isArray(allVals)) {
      totalVisible = 0;
      for (const item of allVals) {
        if (typeof item !== "string") continue;
        try {
          const parsed = JSON.parse(item) as TreeMessage;
          if (parsed.status === "visible") totalVisible += 1;
        } catch {
          // Ignore malformed entry
        }
      }
    }

    return { ok: true, message, deduped: false, totalVisible };
  }

  async getMessage(handle: string, id: string): Promise<TreeMessage | null> {
    const clean = parseHandle(handle);
    if (!clean) return null;
    const raw = await this.exec(["HGET", kMsg(clean), id]);
    if (typeof raw !== "string") return null;
    try {
      return JSON.parse(raw) as TreeMessage;
    } catch {
      return null;
    }
  }

  async listMessages(handle: string): Promise<TreeMessage[]> {
    const clean = parseHandle(handle);
    if (!clean) return [];
    await this.getTree(clean);
    const idsRaw = await this.exec(["ZRANGE", kIdx(clean), 0, -1]);
    if (!Array.isArray(idsRaw) || idsRaw.length === 0) return [];
    const ids = idsRaw.filter((v): v is string => typeof v === "string");
    if (ids.length === 0) return [];
    const rawValues = await this.exec(["HMGET", kMsg(clean), ...ids]);
    if (!Array.isArray(rawValues)) return [];
    const out: TreeMessage[] = [];
    for (const item of rawValues) {
      if (typeof item !== "string") continue;
      try {
        out.push(JSON.parse(item) as TreeMessage);
      } catch {
        // Skip invalid entry
      }
    }
    return out;
  }

  async newestVisible(handle: string, n: number): Promise<TreeMessage[]> {
    const clean = parseHandle(handle);
    if (!clean || n <= 0) return [];
    const idsRaw = await this.exec(["ZREVRANGE", kIdx(clean), 0, n + 24]);
    if (!Array.isArray(idsRaw) || idsRaw.length === 0) return [];
    const ids = idsRaw.filter((v): v is string => typeof v === "string");
    const rawValues = await this.exec(["HMGET", kMsg(clean), ...ids]);
    if (!Array.isArray(rawValues)) return [];
    const visible: TreeMessage[] = [];
    for (const item of rawValues) {
      if (typeof item !== "string") continue;
      try {
        const parsed = JSON.parse(item) as TreeMessage;
        if (parsed.status === "visible") visible.push(parsed);
      } catch {
        // Ignore
      }
    }
    if (visible.length >= n || ids.length < n + 25) {
      return visible.slice(0, n).reverse();
    }
    const all = await this.listMessages(clean);
    return all.filter((m) => m.status === "visible").slice(-n);
  }

  async patchMessage(
    handle: string,
    id: string,
    patch: MessagePatch,
  ): Promise<TreeMessage | null> {
    const clean = parseHandle(handle);
    if (!clean) return null;
    const existing = await this.getMessage(clean, id);
    if (!existing) return null;

    const updated: TreeMessage = {
      ...existing,
      ...(patch.readAt !== undefined ? { readAt: patch.readAt } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.reportReason !== undefined
        ? { reportReason: patch.reportReason }
        : {}),
    };

    const cmds: Array<Array<string | number>> = [
      ["HSET", kMsg(clean), id, JSON.stringify(updated)],
    ];
    if (updated.readAt !== null || updated.status !== "visible") {
      cmds.push(["SREM", kUnread(clean), id]);
    } else {
      cmds.push(["SADD", kUnread(clean), id]);
    }
    await this.pipeline(cmds);
    return updated;
  }

  async deleteMessage(handle: string, id: string): Promise<boolean> {
    const clean = parseHandle(handle);
    if (!clean) return false;
    const [removedCount] = await this.pipeline([
      ["HDEL", kMsg(clean), id],
      ["ZREM", kIdx(clean), id],
      ["SREM", kUnread(clean), id],
    ]);
    return Number(removedCount) > 0;
  }

  async markAllRead(handle: string): Promise<number> {
    const clean = parseHandle(handle);
    if (!clean) return 0;
    const unreadIdsRaw = await this.exec(["SMEMBERS", kUnread(clean)]);
    if (!Array.isArray(unreadIdsRaw) || unreadIdsRaw.length === 0) return 0;
    const unreadIds = unreadIdsRaw.filter(
      (v): v is string => typeof v === "string",
    );
    if (unreadIds.length === 0) return 0;

    const rawMsgs = await this.exec(["HMGET", kMsg(clean), ...unreadIds]);
    if (!Array.isArray(rawMsgs)) return 0;

    const now = new Date().toISOString();
    const hsetCmd: Array<string | number> = ["HSET", kMsg(clean)];
    let changed = 0;

    for (let i = 0; i < rawMsgs.length; i += 1) {
      const raw = rawMsgs[i];
      if (typeof raw !== "string") continue;
      try {
        const msg = JSON.parse(raw) as TreeMessage;
        if (msg.status === "visible" && msg.readAt === null) {
          changed += 1;
          hsetCmd.push(msg.id, JSON.stringify({ ...msg, readAt: now }));
        }
      } catch {
        // Ignore
      }
    }

    const cmds: Array<Array<string | number>> = [];
    if (changed > 0) cmds.push(hsetCmd);
    cmds.push(["DEL", kUnread(clean)]);
    await this.pipeline(cmds);
    return changed;
  }

  async summary(handle: string): Promise<MailSummary> {
    const clean = parseHandle(handle);
    if (!clean) return { unread: 0, latestSeq: 0, total: 0 };
    await this.getTree(clean);
    const [unreadRaw, seqRaw, totalRaw] = await this.pipeline([
      ["SCARD", kUnread(clean)],
      ["GET", kSeq(clean)],
      ["ZCARD", kIdx(clean)],
    ]);
    return {
      unread: Number(unreadRaw) || 0,
      latestSeq: Number(seqRaw) || 0,
      total: Number(totalRaw) || 0,
    };
  }

  async listPushSubscriptions(
    handle: string,
  ): Promise<StoredPushSubscription[]> {
    const clean = parseHandle(handle);
    if (!clean) return [];
    const raw = await this.exec(["GET", kPush(clean)]);
    if (typeof raw !== "string") return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as StoredPushSubscription[]) : [];
    } catch {
      return [];
    }
  }

  async upsertPushSubscription(
    handle: string,
    sub: StoredPushSubscription,
    maxDevices = 5,
  ): Promise<number> {
    const clean = parseHandle(handle);
    if (!clean) return 0;
    const existing = await this.listPushSubscriptions(clean);
    const filtered = existing.filter((item) => item.endpoint !== sub.endpoint);
    const nextSubs = [...filtered, sub].slice(-Math.max(1, maxDevices));
    await this.exec(["SET", kPush(clean), JSON.stringify(nextSubs)]);
    return nextSubs.length;
  }

  async removePushSubscription(
    handle: string,
    endpoint: string,
  ): Promise<number> {
    const clean = parseHandle(handle);
    if (!clean) return 0;
    const existing = await this.listPushSubscriptions(clean);
    const nextSubs = existing.filter((item) => item.endpoint !== endpoint);
    await this.exec(["SET", kPush(clean), JSON.stringify(nextSubs)]);
    return nextSubs.length;
  }

  async claimPushCoalesceWindow(
    handle: string,
    windowMs = 60_000,
  ): Promise<boolean> {
    const clean = parseHandle(handle);
    if (!clean) return false;
    const subs = await this.listPushSubscriptions(clean);
    if (subs.length === 0) return false;
    const res = await this.exec([
      "SET",
      kPushCooldown(clean),
      "1",
      "PX",
      Math.max(1000, windowMs),
      "NX",
    ]);
    return res === "OK";
  }
}
