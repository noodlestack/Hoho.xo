import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import {
  classifyMessage,
  type ReportReason,
  type TreeMessage,
} from "./messages";
import { resolveTreeOrnaments } from "./qr-tree";
import {
  createStoreAdapters,
  getMaxMessagesPerTree,
  selectTreeStore,
  type IdempotencyEntry,
  type MailSummary,
  type StoreAdapters,
  type StoredTreeRecord,
  type TreeMeta,
  type TreeStore,
} from "./store";
import {
  defaultTreeConfig,
  isTreeSceneryId,
  isTreeShapeId,
  isTreeTopperId,
  parseHandle,
  type TreeConfig,
} from "./tree-config";
import { isTreeThemeId } from "./tree-themes";

export const OWNER_COOKIE_PREFIX = "hoho_owner_";

export type { StoredTreeRecord, MailSummary };

export interface PublicOrnamentStub {
  id: string;
  seq: number;
  ornamentType: number;
  colorIdx: number;
  seed: number;
  status: "visible";
  readAt: null;
  createdAt: string;
}

export interface PublicTreeData {
  handle: string;
  claimed: boolean;
  config: TreeConfig;
  ornaments: PublicOrnamentStub[];
  totalVisible: number;
}

const VALID_REPORT_REASONS = new Set<ReportReason>([
  "harassment",
  "threat",
  "sexual",
  "spam",
  "self_harm",
  "other",
]);

interface SharedStoreState {
  memoryTrees: Map<string, StoredTreeRecord>;
  idempotency: Map<string, Map<string, IdempotencyEntry>>;
  rateBuckets: Map<string, number[]>;
  fsUnavailable: boolean;
  adapters?: StoreAdapters;
}

const globalForHohoStore = globalThis as typeof globalThis & {
  __hohoSharedStore?: SharedStoreState;
};

function getKvEnv(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";
  if (url && token) {
    return { url: url.replace(/\/$/, ""), token };
  }
  return null;
}

function getStoreFilePath(): string {
  if (process.env.HOHO_STORE_FILE) {
    return process.env.HOHO_STORE_FILE;
  }
  // Keep dev persistence outside process.cwd() so Turbopack watcher never loops on store writes
  if (process.env.NODE_ENV !== "production") {
    return path.join(os.tmpdir(), "hoho-xo-dev-store.json");
  }
  return path.join(process.cwd(), ".data", "hoho-store.json");
}

function getSharedState(): SharedStoreState {
  if (!globalForHohoStore.__hohoSharedStore) {
    globalForHohoStore.__hohoSharedStore = {
      memoryTrees: new Map<string, StoredTreeRecord>(),
      idempotency: new Map<string, Map<string, IdempotencyEntry>>(),
      rateBuckets: new Map<string, number[]>(),
      fsUnavailable: false,
    };
  }
  if (!globalForHohoStore.__hohoSharedStore.adapters) {
    const state = globalForHohoStore.__hohoSharedStore;
    state.adapters = createStoreAdapters({
      getKvEnv,
      getFilePath: getStoreFilePath,
      memoryTrees: state.memoryTrees,
      idempotency: state.idempotency,
      markFsUnavailable: () => {
        state.fsUnavailable = true;
      },
    });
  }
  return globalForHohoStore.__hohoSharedStore;
}

export function getActiveTreeStore(): TreeStore {
  const state = getSharedState();
  return selectTreeStore(getStorageMode(), state.adapters!);
}

export function getStorageMode(): "kv" | "file" | "memory" {
  if (getKvEnv()) return "kv";
  return getSharedState().fsUnavailable ? "memory" : "file";
}

export function resetMemoryStoreForTests(): void {
  const state = getSharedState();
  state.memoryTrees.clear();
  state.idempotency.clear();
  state.rateBuckets.clear();
  state.fsUnavailable = false;
}

export function generateOwnerToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function hashOwnerToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function verifyOwnerToken(token: string, expectedHash: string): boolean {
  if (!token || !expectedHash) return false;
  try {
    const actualHash = hashOwnerToken(token);
    const a = Buffer.from(actualHash, "hex");
    const b = Buffer.from(expectedHash, "hex");
    if (a.length === 0 || a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function getOwnerCookieName(handle: string): string {
  const clean = parseHandle(handle) ?? "";
  return `${OWNER_COOKIE_PREFIX}${clean}`;
}

export function buildOwnerCookie(handle: string, token: string): string {
  const name = getOwnerCookieName(handle);
  const securePart = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${securePart}`;
}

export function getOwnerTokenFromRequest(
  request: Request,
  handle: string,
): string | null {
  const headerKey = request.headers.get("x-owner-key")?.trim();
  if (headerKey) return headerKey;

  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const targetName = getOwnerCookieName(handle);
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    if (key === targetName) {
      const rawVal = part.slice(eqIdx + 1).trim();
      try {
        return decodeURIComponent(rawVal);
      } catch {
        return rawVal;
      }
    }
  }
  return null;
}

function getIpSalt(): string {
  const configured = process.env.HOHO_IP_SALT?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("HOHO_IP_SALT must be configured in production.");
  }
  return "hoho-xo-dev-ip-salt";
}

function resolveTrustedClientIp(request: Request): string {
  const mode = (process.env.HOHO_TRUSTED_PROXY || "none").trim().toLowerCase();

  if (mode === "vercel") {
    const vercelFwd = request.headers.get("x-vercel-forwarded-for");
    const first = vercelFwd
      ?.split(",")
      .map((s) => s.trim())
      .find((s) => s.length > 0);
    return first || "unknown";
  }

  if (mode === "cloudflare") {
    const cfIp = request.headers.get("cf-connecting-ip")?.trim();
    return cfIp && cfIp.length > 0 ? cfIp : "unknown";
  }

  // "none": take the last proxy-appended entry, never the spoofable leading entry
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const entries = fwd
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (entries.length > 0) {
      return entries[entries.length - 1];
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp && realIp.length > 0) {
    return realIp;
  }

  return "unknown";
}

export function getClientIpHash(request: Request): string {
  const ip = resolveTrustedClientIp(request);
  const salt = getIpSalt();
  return crypto.createHmac("sha256", salt).update(ip).digest("hex").slice(0, 32);
}

async function kvCommand(args: Array<string | number>): Promise<unknown> {
  const env = getKvEnv();
  if (!env) return null;
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
  const json = (await res.json()) as { result?: unknown };
  return json.result ?? null;
}

export async function checkRateLimit(
  bucketKey: string,
  maxHits: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  const kv = getKvEnv();
  if (kv) {
    try {
      const key = `hoho:rl:${bucketKey}:${Math.floor(Date.now() / windowMs)}`;
      const count = Number(await kvCommand(["INCR", key]));
      if (count === 1) {
        await kvCommand(["PEXPIRE", key, windowMs]);
      }
      if (count > maxHits) {
        return {
          allowed: false,
          retryAfterSec: Math.max(1, Math.ceil(windowMs / 1000)),
        };
      }
      return { allowed: true };
    } catch {
      // Replaced by sliding-window limiter in Task 1.4
    }
  }

  const state = getSharedState();
  const now = Date.now();
  const cutoff = now - windowMs;
  const existing = (state.rateBuckets.get(bucketKey) ?? []).filter(
    (ts) => ts > cutoff,
  );
  if (existing.length >= maxHits) {
    const oldest = existing[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    state.rateBuckets.set(bucketKey, existing);
    return { allowed: false, retryAfterSec };
  }
  existing.push(now);
  state.rateBuckets.set(bucketKey, existing);
  return { allowed: true };
}

export function sanitizeConfigPatch(
  patch: unknown,
  base: TreeConfig,
): TreeConfig {
  if (!patch || typeof patch !== "object") return { ...base };
  const obj = patch as Record<string, unknown>;
  const candidateTheme =
    typeof obj.themeId === "string" ? obj.themeId : null;

  return {
    handle: base.handle,
    displayName:
      typeof obj.displayName === "string" && obj.displayName.trim().length > 0
        ? obj.displayName.trim().slice(0, 40)
        : base.displayName,
    avatar:
      typeof obj.avatar === "string" ? obj.avatar.slice(0, 4) : base.avatar,
    prompt:
      typeof obj.prompt === "string" && obj.prompt.trim().length > 0
        ? obj.prompt.trim().slice(0, 140)
        : base.prompt,
    mutedWords:
      typeof obj.mutedWords === "string"
        ? obj.mutedWords.slice(0, 240)
        : base.mutedWords,
    themeId: isTreeThemeId(candidateTheme) ? candidateTheme : base.themeId,
    topper: isTreeTopperId(obj.topper) ? obj.topper : base.topper,
    shape: isTreeShapeId(obj.shape) ? obj.shape : base.shape,
    scenery: isTreeSceneryId(obj.scenery) ? obj.scenery : base.scenery,
    showSnow:
      typeof obj.showSnow === "boolean" ? obj.showSnow : base.showSnow,
    showGarland:
      typeof obj.showGarland === "boolean"
        ? obj.showGarland
        : base.showGarland,
    showOrnaments:
      typeof obj.showOrnaments === "boolean"
        ? obj.showOrnaments
        : base.showOrnaments,
    pauseInbox:
      typeof obj.pauseInbox === "boolean" ? obj.pauseInbox : base.pauseInbox,
    christmasLock:
      typeof obj.christmasLock === "boolean"
        ? obj.christmasLock
        : base.christmasLock,
  };
}

export function toPublicTreeData(
  handleOrRecord: string | StoredTreeRecord,
): PublicTreeData {
  if (typeof handleOrRecord === "string") {
    const clean = parseHandle(handleOrRecord) ?? "";
    return {
      handle: clean,
      claimed: false,
      config: { ...defaultTreeConfig(clean), mutedWords: "" },
      ornaments: [],
      totalVisible: 0,
    };
  }

  const record = handleOrRecord;
  const totalVisible = record.messages.filter(
    (m) => m.status === "visible",
  ).length;
  const resolved = resolveTreeOrnaments(record.messages);
  const ornaments: PublicOrnamentStub[] = resolved.map((m) => ({
    id: m.id,
    seq: m.seq,
    ornamentType: m.ornamentType,
    colorIdx: m.colorIdx,
    seed: m.seed,
    status: "visible",
    readAt: null,
    createdAt: m.createdAt,
  }));

  return {
    handle: record.handle,
    claimed: record.ownerTokenHash.length > 0,
    config: {
      ...record.config,
      mutedWords: "",
    },
    ornaments,
    totalVisible,
  };
}

export async function getTreeRecord(
  handle: string,
): Promise<StoredTreeRecord | null> {
  const store = getActiveTreeStore();
  const meta = await store.getTree(handle);
  if (!meta) return null;
  const messages = await store.listMessages(handle);
  return { ...meta, messages };
}

export async function claimOrVerifyTree(
  rawHandle: string,
  providedToken: string | null,
  initialConfig?: unknown,
): Promise<
  | {
      ok: true;
      created: boolean;
      ownerToken?: string;
      record: StoredTreeRecord;
    }
  | { ok: false; status: 400 | 409; error: string }
> {
  const handle = parseHandle(rawHandle);
  if (!handle) {
    return {
      ok: false,
      status: 400,
      error: "Handles use 3–20 letters, numbers, or underscores.",
    };
  }

  const store = getActiveTreeStore();
  const existing = await store.getTree(handle);

  if (existing) {
    if (
      existing.ownerTokenHash.length > 0 &&
      providedToken &&
      verifyOwnerToken(providedToken, existing.ownerTokenHash)
    ) {
      const messages = await store.listMessages(handle);
      return { ok: true, created: false, record: { ...existing, messages } };
    }
    return {
      ok: false,
      status: 409,
      error:
        "This handle is already claimed. Enter its Owner Access Key to unlock Mail.",
    };
  }

  const now = new Date().toISOString();
  const ownerToken = generateOwnerToken();
  const baseCfg = defaultTreeConfig(handle);
  const config = sanitizeConfigPatch(initialConfig, baseCfg);
  const meta: TreeMeta = {
    handle,
    ownerTokenHash: hashOwnerToken(ownerToken),
    config,
    createdAt: now,
    updatedAt: now,
  };

  const createdOk = await store.createTreeIfAbsent(meta);
  if (!createdOk) {
    const raced = await store.getTree(handle);
    if (
      raced &&
      raced.ownerTokenHash.length > 0 &&
      providedToken &&
      verifyOwnerToken(providedToken, raced.ownerTokenHash)
    ) {
      const messages = await store.listMessages(handle);
      return { ok: true, created: false, record: { ...raced, messages } };
    }
    return {
      ok: false,
      status: 409,
      error:
        "This handle is already claimed. Enter its Owner Access Key to unlock Mail.",
    };
  }

  return {
    ok: true,
    created: true,
    ownerToken,
    record: { ...meta, messages: [] },
  };
}

export async function verifyTreeOwner(
  handle: string,
  providedToken: string | null,
): Promise<StoredTreeRecord | null> {
  if (!providedToken) return null;
  const store = getActiveTreeStore();
  const existing = await store.getTree(handle);
  if (!existing || existing.ownerTokenHash.length === 0) {
    return null;
  }
  if (!verifyOwnerToken(providedToken, existing.ownerTokenHash)) {
    return null;
  }
  const messages = await store.listMessages(handle);
  return { ...existing, messages };
}

export async function updateTreeConfig(
  handle: string,
  patch: unknown,
): Promise<StoredTreeRecord | null> {
  const store = getActiveTreeStore();
  const existing = await store.getTree(handle);
  if (!existing) return null;
  const nextConfig = sanitizeConfigPatch(patch, existing.config);
  const updated = await store.updateConfig(handle, nextConfig);
  if (!updated) return null;
  const messages = await store.listMessages(handle);
  return { ...updated, messages };
}

export async function addAnonymousMessage(
  rawHandle: string,
  rawBody: string,
  ornamentType: number | null,
  options?: { idempotencyKey?: string },
): Promise<
  | {
      ok: true;
      ornament: PublicOrnamentStub;
      totalVisible: number;
      selfHarmNotice?: boolean;
    }
  | { ok: false; status: 400 | 403 | 404 | 429; error: string }
> {
  const handle = parseHandle(rawHandle);
  if (!handle) {
    return { ok: false, status: 404, error: "Tree not found." };
  }

  const store = getActiveTreeStore();
  const meta = await store.getTree(handle);
  if (!meta || meta.ownerTokenHash.length === 0) {
    return { ok: false, status: 404, error: "Tree not found." };
  }

  if (meta.config.pauseInbox) {
    return {
      ok: false,
      status: 403,
      error: `@${handle} paused new anonymous notes for now.`,
    };
  }

  const verdict = classifyMessage(rawBody, meta.config.mutedWords);
  if (verdict.decision === "reject") {
    return {
      ok: false,
      status: 400,
      error: verdict.reason ?? "Please adjust your message.",
    };
  }

  const appended = await store.appendMessage(
    handle,
    { body: rawBody, ornamentType },
    {
      idempotencyKey: options?.idempotencyKey,
      cap: getMaxMessagesPerTree(),
    },
  );

  if (!appended.ok) {
    if (appended.reason === "cap") {
      return { ok: false, status: 429, error: "This tree is full for now." };
    }
    return { ok: false, status: 404, error: "Tree not found." };
  }

  const record = appended.message;
  return {
    ok: true,
    ornament: {
      id: record.id,
      seq: record.seq,
      ornamentType: record.ornamentType,
      colorIdx: record.colorIdx,
      seed: record.seed,
      status: "visible",
      readAt: null,
      createdAt: record.createdAt,
    },
    totalVisible: appended.totalVisible,
    selfHarmNotice: verdict.selfHarmNotice,
  };
}

export async function markMessageRead(
  handle: string,
  id: string,
): Promise<TreeMessage | null> {
  const store = getActiveTreeStore();
  const existing = await store.getMessage(handle, id);
  if (!existing) return null;
  if (existing.readAt) return existing;
  return store.patchMessage(handle, id, { readAt: new Date().toISOString() });
}

export async function reportMessage(
  handle: string,
  id: string,
  rawReason: unknown,
): Promise<TreeMessage | null> {
  const reason: ReportReason =
    typeof rawReason === "string" &&
    VALID_REPORT_REASONS.has(rawReason as ReportReason)
      ? (rawReason as ReportReason)
      : "other";

  const store = getActiveTreeStore();
  const existing = await store.getMessage(handle, id);
  if (!existing) return null;
  const now = new Date().toISOString();
  return store.patchMessage(handle, id, {
    status: "reported",
    reportReason: reason,
    readAt: existing.readAt ?? now,
  });
}

export async function deleteMessage(
  handle: string,
  id: string,
): Promise<boolean> {
  return getActiveTreeStore().deleteMessage(handle, id);
}

export async function markAllMessagesRead(handle: string): Promise<number> {
  return getActiveTreeStore().markAllRead(handle);
}

export async function getMailSummary(handle: string): Promise<MailSummary> {
  return getActiveTreeStore().summary(handle);
}
