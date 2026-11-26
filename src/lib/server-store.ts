import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  classifyMessage,
  createMessageRecord,
  type ReportReason,
  type TreeMessage,
} from "./messages";
import { resolveTreeOrnaments } from "./qr-tree";
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

export interface StoredTreeRecord {
  handle: string;
  ownerTokenHash: string;
  config: TreeConfig;
  messages: TreeMessage[];
  createdAt: string;
  updatedAt: string;
}

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

interface StoreFileSnapshot {
  trees: Record<string, StoredTreeRecord>;
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
  rateBuckets: Map<string, number[]>;
  fileWriteQueue: Promise<void>;
  fsUnavailable: boolean;
}

const globalForHohoStore = globalThis as typeof globalThis & {
  __hohoSharedStore?: SharedStoreState;
};

function getSharedState(): SharedStoreState {
  if (!globalForHohoStore.__hohoSharedStore) {
    globalForHohoStore.__hohoSharedStore = {
      memoryTrees: new Map<string, StoredTreeRecord>(),
      rateBuckets: new Map<string, number[]>(),
      fileWriteQueue: Promise.resolve(),
      fsUnavailable: false,
    };
  }
  return globalForHohoStore.__hohoSharedStore;
}

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

export function getStorageMode(): "kv" | "file" | "memory" {
  if (getKvEnv()) return "kv";
  return getSharedState().fsUnavailable ? "memory" : "file";
}

export function resetMemoryStoreForTests(): void {
  const state = getSharedState();
  state.memoryTrees.clear();
  state.rateBuckets.clear();
  state.fsUnavailable = false;
  state.fileWriteQueue = Promise.resolve();
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

export function getClientIpHash(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const rawIp = fwd?.split(",")[0]?.trim() || realIp?.trim() || "local";
  return crypto.createHash("sha256").update(rawIp).digest("hex").slice(0, 16);
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
      // Fall through to process-local rate bucket cleanly
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

async function readSnapshotFromFile(): Promise<StoreFileSnapshot> {
  const filePath = getStoreFilePath();
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
      getSharedState().fsUnavailable = true;
    }
    return { trees: {} };
  }
}

async function readTreeFromStore(
  handle: string,
): Promise<StoredTreeRecord | null> {
  const clean = parseHandle(handle);
  if (!clean) return null;
  const kv = getKvEnv();
  if (kv) {
    const raw = await kvCommand(["GET", `hoho:tree:${clean}`]);
    if (typeof raw !== "string") return null;
    try {
      return JSON.parse(raw) as StoredTreeRecord;
    } catch {
      return null;
    }
  }

  const state = getSharedState();
  if (!state.fsUnavailable) {
    await state.fileWriteQueue;
    const snap = await readSnapshotFromFile();
    const record = snap.trees[clean] ?? null;
    if (record) {
      state.memoryTrees.set(clean, record);
      return record;
    }
    return null;
  }

  return state.memoryTrees.get(clean) ?? null;
}

async function writeTreeToStore(record: StoredTreeRecord): Promise<void> {
  const clean = parseHandle(record.handle);
  if (!clean) return;
  const state = getSharedState();
  const nextRecord: StoredTreeRecord = { ...record, handle: clean };
  state.memoryTrees.set(clean, nextRecord);

  const kv = getKvEnv();
  if (kv) {
    await kvCommand(["SET", `hoho:tree:${clean}`, JSON.stringify(nextRecord)]);
    return;
  }

  if (state.fsUnavailable) return;

  const task = state.fileWriteQueue.then(async () => {
    try {
      const filePath = getStoreFilePath();
      const dir = path.dirname(filePath);
      await fs.mkdir(/*turbopackIgnore: true*/ dir, { recursive: true });
      const snap = await readSnapshotFromFile();
      snap.trees[clean] = nextRecord;
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
      state.fsUnavailable = true;
    }
  });

  state.fileWriteQueue = task.catch(() => {});
  await task;
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
  return readTreeFromStore(handle);
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
  const existing = await readTreeFromStore(handle);
  const now = new Date().toISOString();

  if (!existing) {
    const ownerToken = generateOwnerToken();
    const baseCfg = defaultTreeConfig(handle);
    const config = sanitizeConfigPatch(initialConfig, baseCfg);
    const created: StoredTreeRecord = {
      handle,
      ownerTokenHash: hashOwnerToken(ownerToken),
      config,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    await writeTreeToStore(created);
    return { ok: true, created: true, ownerToken, record: created };
  }

  // An auto-initialized tree from early visitor messages (unclaimed) can be claimed once cleanly
  if (existing.ownerTokenHash.length === 0) {
    const ownerToken = generateOwnerToken();
    const updated: StoredTreeRecord = {
      ...existing,
      ownerTokenHash: hashOwnerToken(ownerToken),
      config: initialConfig
        ? sanitizeConfigPatch(initialConfig, existing.config)
        : existing.config,
      updatedAt: now,
    };
    await writeTreeToStore(updated);
    return { ok: true, created: true, ownerToken, record: updated };
  }

  if (providedToken && verifyOwnerToken(providedToken, existing.ownerTokenHash)) {
    return { ok: true, created: false, record: existing };
  }

  return {
    ok: false,
    status: 409,
    error:
      "This handle is already claimed. Enter its Owner Access Key to unlock Mail.",
  };
}

export async function verifyTreeOwner(
  handle: string,
  providedToken: string | null,
): Promise<StoredTreeRecord | null> {
  const existing = await readTreeFromStore(handle);
  if (!existing || existing.ownerTokenHash.length === 0 || !providedToken) {
    return null;
  }
  return verifyOwnerToken(providedToken, existing.ownerTokenHash)
    ? existing
    : null;
}

export async function updateTreeConfig(
  handle: string,
  patch: unknown,
): Promise<StoredTreeRecord | null> {
  const existing = await readTreeFromStore(handle);
  if (!existing) return null;
  const nextConfig = sanitizeConfigPatch(patch, existing.config);
  const updated: StoredTreeRecord = {
    ...existing,
    config: nextConfig,
    updatedAt: new Date().toISOString(),
  };
  await writeTreeToStore(updated);
  return updated;
}

export async function addAnonymousMessage(
  rawHandle: string,
  rawBody: string,
  ornamentType: number | null,
): Promise<
  | {
      ok: true;
      ornament: PublicOrnamentStub;
      totalVisible: number;
      selfHarmNotice?: boolean;
    }
  | { ok: false; status: 400 | 403 | 404; error: string }
> {
  const handle = parseHandle(rawHandle);
  if (!handle) {
    return {
      ok: false,
      status: 404,
      error: "Tree not found.",
    };
  }
  const now = new Date().toISOString();
  let existing = await readTreeFromStore(handle);

  if (!existing) {
    existing = {
      handle,
      ownerTokenHash: "",
      config: defaultTreeConfig(handle),
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  if (existing.config.pauseInbox) {
    return {
      ok: false,
      status: 403,
      error: `@${handle} paused new anonymous notes for now.`,
    };
  }

  const verdict = classifyMessage(rawBody, existing.config.mutedWords);
  if (verdict.decision === "reject") {
    return {
      ok: false,
      status: 400,
      error: verdict.reason ?? "Please adjust your message.",
    };
  }

  const maxSeq = existing.messages.reduce((acc, m) => Math.max(acc, m.seq), 0);
  const normalizedOrnamentType =
    typeof ornamentType === "number" && Number.isFinite(ornamentType)
      ? Math.max(0, Math.min(15, Math.floor(ornamentType)))
      : null;

  const record = createMessageRecord({
    body: rawBody,
    ornamentType: normalizedOrnamentType,
    nextSeq: maxSeq + 1,
  });

  const nextMessages = [...existing.messages, record];
  const updated: StoredTreeRecord = {
    ...existing,
    messages: nextMessages,
    updatedAt: now,
  };
  await writeTreeToStore(updated);

  const totalVisible = nextMessages.filter((m) => m.status === "visible").length;
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
    totalVisible,
    selfHarmNotice: verdict.selfHarmNotice,
  };
}

export async function markMessageRead(
  handle: string,
  id: string,
): Promise<TreeMessage | null> {
  const existing = await readTreeFromStore(handle);
  if (!existing) return null;
  let updatedMsg: TreeMessage | null = null;
  const now = new Date().toISOString();
  const nextMessages = existing.messages.map((m) => {
    if (m.id !== id) return m;
    updatedMsg = m.readAt ? m : { ...m, readAt: now };
    return updatedMsg;
  });
  if (!updatedMsg) return null;
  await writeTreeToStore({
    ...existing,
    messages: nextMessages,
    updatedAt: now,
  });
  return updatedMsg;
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

  const existing = await readTreeFromStore(handle);
  if (!existing) return null;
  let updatedMsg: TreeMessage | null = null;
  const now = new Date().toISOString();
  const nextMessages = existing.messages.map((m) => {
    if (m.id !== id) return m;
    updatedMsg = {
      ...m,
      status: "reported",
      reportReason: reason,
      readAt: m.readAt ?? now,
    };
    return updatedMsg;
  });
  if (!updatedMsg) return null;
  await writeTreeToStore({
    ...existing,
    messages: nextMessages,
    updatedAt: now,
  });
  return updatedMsg;
}

export async function deleteMessage(
  handle: string,
  id: string,
): Promise<boolean> {
  const existing = await readTreeFromStore(handle);
  if (!existing) return false;
  const nextMessages = existing.messages.filter((m) => m.id !== id);
  if (nextMessages.length === existing.messages.length) return false;
  await writeTreeToStore({
    ...existing,
    messages: nextMessages,
    updatedAt: new Date().toISOString(),
  });
  return true;
}

export async function markAllMessagesRead(handle: string): Promise<number> {
  const existing = await readTreeFromStore(handle);
  if (!existing) return 0;

  let changedCount = 0;
  const now = new Date().toISOString();
  const nextMessages = existing.messages.map((m) => {
    if (m.status === "visible" && m.readAt === null) {
      changedCount += 1;
      return { ...m, readAt: now };
    }
    return m;
  });

  if (changedCount > 0) {
    await writeTreeToStore({
      ...existing,
      messages: nextMessages,
      updatedAt: now,
    });
  }
  return changedCount;
}
