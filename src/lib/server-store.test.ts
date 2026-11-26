import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import robots from "../app/robots";
import { CRISIS_RESOURCES, getDefaultCrisisResource } from "./crisis-resources";
import { checkExternalModeration } from "./external-moderation";
import { classifyMessage, normalizeForModeration } from "./messages";
import { EXTRA_BLOCKED_TERMS } from "./moderation-lexicon";
import { FileTreeStore, KvTreeStore, MemoryTreeStore } from "./store";
import { defaultTreeConfig } from "./tree-config";
import {
  addAnonymousMessage,
  assertSameOrigin,
  buildOwnerCookie,
  checkRateLimit,
  claimOrVerifyTree,
  deleteMessage,
  getClientIpHash,
  getOwnerCookieName,
  getOwnerTokenFromRequest,
  getTreeRecord,
  markAllMessagesRead,
  markMessageRead,
  RATE_LIMIT_POLICY,
  reportMessage,
  resetMemoryStoreForTests,
  toPublicTreeData,
  updateTreeConfig,
  verifyTreeOwner,
} from "./server-store";
import {
  claimTreeSchema,
  createMessageSchema,
  formatZodError,
  patchMailSchema,
  patchMessageSchema,
  updateConfigSchema,
} from "./validation";

const tempDir = path.join(os.tmpdir(), `hoho-xo-test-${process.pid}`);
const tempStoreFile = path.join(tempDir, "store.json");

beforeEach(async () => {
  process.env.HOHO_STORE_FILE = tempStoreFile;
  resetMemoryStoreForTests();
  await fs.rm(tempDir, { recursive: true, force: true });
});

afterAll(async () => {
  delete process.env.HOHO_STORE_FILE;
  resetMemoryStoreForTests();
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("server-store persistence, auth, moderation, and restrictions", () => {

  it("claims handles once, rejects unauthorized claims with 409, and verifies matching keys", async () => {
    const first = await claimOrVerifyTree("kai_2026", null, {
      themeId: "aurora",
      scenery: "hearth",
      mutedWords: "secretword",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.created).toBe(true);
    expect(first.ownerToken).toBeTruthy();

    const wrong = await claimOrVerifyTree("kai_2026", "wrong-key");
    expect(wrong.ok).toBe(false);
    if (wrong.ok) return;
    expect(wrong.status).toBe(409);

    const noKey = await claimOrVerifyTree("kai_2026", null);
    expect(noKey.ok).toBe(false);

    const verified = await claimOrVerifyTree(
      "kai_2026",
      first.ownerToken ?? null,
    );
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    expect(verified.created).toBe(false);
    expect(verified.record.config.scenery).toBe("hearth");

    expect(await verifyTreeOwner("kai_2026", "bad")).toBeNull();
    expect(await verifyTreeOwner("kai_2026", first.ownerToken ?? null)).not.toBeNull();
  });

  it("strips private note bodies, mutedWords, and reported notes in public projections", async () => {
    const claim = await claimOrVerifyTree("publictest", null, {
      mutedWords: "spoiler",
    });
    expect(claim.ok).toBe(true);
    if (!claim.ok) return;

    const added = await addAnonymousMessage(
      "publictest",
      "Secret message for owner only!",
      3,
    );
    expect(added.ok).toBe(true);
    if (!added.ok) return;

    const record = await getTreeRecord("publictest");
    expect(record).not.toBeNull();
    if (!record) return;

    const pub = toPublicTreeData(record);
    expect(pub.claimed).toBe(true);
    expect(pub.config.mutedWords).toBe("");
    expect(pub.totalVisible).toBe(1);
    expect(pub.ornaments).toHaveLength(1);
    expect("body" in pub.ornaments[0]).toBe(false);
    expect(pub.ornaments[0].readAt).toBeNull();

    await markMessageRead("publictest", added.ornament.id);
    const updatedRecord = await getTreeRecord("publictest");
    expect(updatedRecord?.messages[0].readAt).not.toBeNull();
    expect(toPublicTreeData(updatedRecord!).ornaments[0].readAt).toBeNull();

    await reportMessage("publictest", added.ornament.id, "spam");
    const afterReport = await getTreeRecord("publictest");
    expect(toPublicTreeData(afterReport!).totalVisible).toBe(0);
    expect(toPublicTreeData(afterReport!).ornaments).toHaveLength(0);

    const deleted = await deleteMessage("publictest", added.ornament.id);
    expect(deleted).toBe(true);
    const afterDelete = await getTreeRecord("publictest");
    expect(afterDelete?.messages).toHaveLength(0);
  });

  it("enforces owner mutedWords and pauseInbox on anonymous submissions", async () => {
    const claim = await claimOrVerifyTree("modtest", null, {
      mutedWords: "pineapple",
    });
    expect(claim.ok).toBe(true);

    const muted = await addAnonymousMessage(
      "modtest",
      "You deserve a p1neapple surprise!",
      0,
    );
    expect(muted.ok).toBe(false);
    if (!muted.ok) {
      expect(muted.status).toBe(400);
    }

    await updateTreeConfig("modtest", { pauseInbox: true });
    const paused = await addAnonymousMessage("modtest", "Happy holidays!", 0);
    expect(paused.ok).toBe(false);
    if (!paused.ok) {
      expect(paused.status).toBe(403);
    }
  });

  it("blocks sliding-window bursts in checkRateLimit", async () => {
    const key = "rl-test-bucket";
    expect((await checkRateLimit(key, 2, 60_000)).allowed).toBe(true);
    expect((await checkRateLimit(key, 2, 60_000)).allowed).toBe(true);
    const third = await checkRateLimit(key, 2, 60_000);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSec).toBeGreaterThanOrEqual(1);
  });

  it("marks all unread visible messages read with markAllMessagesRead", async () => {
    await claimOrVerifyTree("bulkread", null, {});
    const first = await addAnonymousMessage("bulkread", "First holiday wish", 1);
    const second = await addAnonymousMessage("bulkread", "Second wish", 2);
    expect(first.ok && second.ok).toBe(true);

    const updatedCount = await markAllMessagesRead("bulkread");
    expect(updatedCount).toBe(2);

    const record = await getTreeRecord("bulkread");
    expect(record?.messages.every((m) => Boolean(m.readAt))).toBe(true);

    const secondPass = await markAllMessagesRead("bulkread");
    expect(secondPass).toBe(0);
  });
});

describe("zod request validation schemas", () => {
  it("validates claimTreeSchema and rejects invalid handle/config", () => {
    const valid = claimTreeSchema.safeParse({
      handle: "noodlestack",
      config: { themeId: "fairy", showSnow: true, mutedWords: "spam" },
    });
    expect(valid.success).toBe(true);

    const invalid = claimTreeSchema.safeParse({
      handle: 123,
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(formatZodError(invalid.error).length).toBeGreaterThan(0);
    }
  });

  it("validates updateConfigSchema enum fields", () => {
    expect(
      updateConfigSchema.safeParse({
        themeId: "midnight",
        topper: "star",
        shape: "classic",
        scenery: "aurora",
        pauseInbox: false,
      }).success,
    ).toBe(true);

    expect(
      updateConfigSchema.safeParse({ themeId: "unknown-theme" }).success,
    ).toBe(false);
  });

  it("validates createMessageSchema bounds and ornamentType", () => {
    expect(
      createMessageSchema.safeParse({ body: "Happy holidays!", ornamentType: 3 })
        .success,
    ).toBe(true);
    expect(createMessageSchema.safeParse({ body: "   " }).success).toBe(false);
    expect(
      createMessageSchema.safeParse({ body: "Hi", ornamentType: 99 }).success,
    ).toBe(false);
  });

  it("validates patchMessageSchema and patchMailSchema", () => {
    expect(patchMessageSchema.safeParse({ action: "read" }).success).toBe(true);
    expect(
      patchMessageSchema.safeParse({ action: "report", reason: "spam" })
        .success,
    ).toBe(true);
    expect(
      patchMessageSchema.safeParse({ action: "invalid" }).success,
    ).toBe(false);

    expect(
      patchMailSchema.safeParse({ action: "mark_all_read" }).success,
    ).toBe(true);
    expect(patchMailSchema.safeParse({ action: "delete_all" }).success).toBe(
      false,
    );
  });
});

describe("SSR privacy sanitization and robots policy", () => {
  it("strips mutedWords and message bodies in toPublicTreeData for SSR props", async () => {
    await claimOrVerifyTree("ssrpriv", null, {
      prompt: "Custom SSR Tree Question",
      mutedWords: "secret-word, spoiler",
    });
    await addAnonymousMessage("ssrpriv", "Super secret private message!", 4);
    const record = await getTreeRecord("ssrpriv");
    expect(record).not.toBeNull();

    const pub = toPublicTreeData(record!);
    expect(pub.config.prompt).toBe("Custom SSR Tree Question");
    expect(pub.config.mutedWords).toBe("");
    expect(pub.totalVisible).toBe(1);
    expect(pub.ornaments).toHaveLength(1);
    expect("body" in pub.ornaments[0]).toBe(false);
  });

  it("configures robots policy allowing / and disallowing /api/ and /t/", () => {
    const config = robots();
    const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
    expect(rules.userAgent).toBe("*");
    expect(rules.allow).toBe("/");
    expect(rules.disallow).toEqual(["/api/", "/t/"]);
  });

  it("rejects invalid and reserved handles without creating or touching records", async () => {
    const claimRes = await claimOrVerifyTree("noodlestack", null, {});
    expect(claimRes.ok).toBe(true);

    for (const bad of ["ab", "!!", "@", "@@abc", "api", "hoho", "hohoxo", "a".repeat(21), "k\u0430i"]) {
      const badClaim = await claimOrVerifyTree(bad, null, {});
      expect(badClaim.ok).toBe(false);
      if (!badClaim.ok) {
        expect(badClaim.status).toBe(400);
      }

      const badMsg = await addAnonymousMessage(bad, "Hello!", 0);
      expect(badMsg.ok).toBe(false);
      if (!badMsg.ok) {
        expect(badMsg.status).toBe(404);
      }

      expect(await getTreeRecord(bad)).toBeNull();
    }

    const realRecord = await getTreeRecord("noodlestack");
    expect(realRecord?.messages).toHaveLength(0);
  });
});

const hasKvCredentials = Boolean(
  (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
    (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN),
);

describe("Task 1.2 atomic storage adapters, concurrency, cap, and idempotency", () => {
  it("persists 50 concurrent appendMessage calls with unique 1..50 seq on MemoryTreeStore", async () => {
    const trees = new Map();
    const idem = new Map();
    const mem = new MemoryTreeStore(trees, idem);
    const now = new Date().toISOString();
    const created = await mem.createTreeIfAbsent({
      handle: "mem50",
      ownerTokenHash: "hash123",
      config: defaultTreeConfig("mem50"),
      createdAt: now,
      updatedAt: now,
    });
    expect(created).toBe(true);

    const results = await Promise.all(
      Array.from({ length: 50 }, (_, idx) =>
        mem.appendMessage(
          "mem50",
          { body: `Concurrent wish #${idx + 1}`, ornamentType: idx % 16 },
          { cap: 1000 },
        ),
      ),
    );
    expect(results.every((r) => r.ok)).toBe(true);

    const list = await mem.listMessages("mem50");
    expect(list).toHaveLength(50);
    const seqs = list.map((m) => m.seq).sort((a, b) => a - b);
    expect(seqs).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });

  it("persists 50 concurrent appendMessage calls with unique 1..50 seq on FileTreeStore", async () => {
    const trees = new Map();
    const idem = new Map();
    const fileStore = new FileTreeStore(
      () => tempStoreFile,
      trees,
      idem,
      () => {},
    );
    const now = new Date().toISOString();
    expect(
      await fileStore.createTreeIfAbsent({
        handle: "file50",
        ownerTokenHash: "hash456",
        config: defaultTreeConfig("file50"),
        createdAt: now,
        updatedAt: now,
      }),
    ).toBe(true);

    const results = await Promise.all(
      Array.from({ length: 50 }, (_, idx) =>
        fileStore.appendMessage(
          "file50",
          { body: `File wish #${idx + 1}`, ornamentType: idx % 16 },
          { cap: 1000 },
        ),
      ),
    );
    expect(results.every((r) => r.ok)).toBe(true);

    const list = await fileStore.listMessages("file50");
    expect(list).toHaveLength(50);
    const seqs = list.map((m) => m.seq).sort((a, b) => a - b);
    expect(seqs).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });

  it.skipIf(!hasKvCredentials)(
    "persists 50 concurrent appendMessage calls on live KvTreeStore (skipped without KV creds)",
    async () => {
      const kv = new KvTreeStore(() => ({
        url: (
          process.env.UPSTASH_REDIS_REST_URL ||
          process.env.KV_REST_API_URL ||
          ""
        ).replace(/\/$/, ""),
        token:
          process.env.UPSTASH_REDIS_REST_TOKEN ||
          process.env.KV_REST_API_TOKEN ||
          "",
      }));
      const handle = `kvtest_${Date.now().toString(36).slice(-6)}`;
      const now = new Date().toISOString();
      await kv.createTreeIfAbsent({
        handle,
        ownerTokenHash: "hashkv",
        config: defaultTreeConfig(handle),
        createdAt: now,
        updatedAt: now,
      });
      const results = await Promise.all(
        Array.from({ length: 50 }, (_, idx) =>
          kv.appendMessage(
            handle,
            { body: `KV wish #${idx + 1}`, ornamentType: idx % 16 },
            { cap: 1000 },
          ),
        ),
      );
      expect(results.every((r) => r.ok)).toBe(true);
      const list = await kv.listMessages(handle);
      expect(list.map((m) => m.seq).sort((a, b) => a - b)).toEqual(
        Array.from({ length: 50 }, (_, i) => i + 1),
      );
    },
  );

  it("allows only one winner for two concurrent claims of the same handle", async () => {
    const [a, b] = await Promise.all([
      claimOrVerifyTree("raced_tree", null, { displayName: "First" }),
      claimOrVerifyTree("raced_tree", null, { displayName: "Second" }),
    ]);

    const wins = [a, b].filter((r) => r.ok);
    const losses = [a, b].filter((r) => !r.ok);
    expect(wins).toHaveLength(1);
    expect(losses).toHaveLength(1);
    if (!losses[0].ok) {
      expect(losses[0].status).toBe(409);
    }
  });

  it("deduplicates repeated idempotencyKey without creating duplicate ornaments", async () => {
    await claimOrVerifyTree("idem_tree", null, {});
    const first = await addAnonymousMessage("idem_tree", "Warm wishes!", 2, {
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
    });
    const second = await addAnonymousMessage("idem_tree", "Warm wishes!", 2, {
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.ornament.id).toBe(first.ornament.id);
      expect(second.totalVisible).toBe(1);
    }
    const rec = await getTreeRecord("idem_tree");
    expect(rec?.messages).toHaveLength(1);
  });

  it("enforces HOHO_MAX_MESSAGES_PER_TREE cap with 429 response", async () => {
    const prevCap = process.env.HOHO_MAX_MESSAGES_PER_TREE;
    process.env.HOHO_MAX_MESSAGES_PER_TREE = "3";
    try {
      await claimOrVerifyTree("capped_tree", null, {});
      for (let i = 1; i <= 3; i += 1) {
        const res = await addAnonymousMessage("capped_tree", `Message ${i}`, 1);
        expect(res.ok).toBe(true);
      }
      const fourth = await addAnonymousMessage("capped_tree", "Message 4", 1);
      expect(fourth.ok).toBe(false);
      if (!fourth.ok) {
        expect(fourth.status).toBe(429);
        expect(fourth.error).toBe("This tree is full for now.");
      }
    } finally {
      if (prevCap === undefined) delete process.env.HOHO_MAX_MESSAGES_PER_TREE;
      else process.env.HOHO_MAX_MESSAGES_PER_TREE = prevCap;
    }
  });

  it("rejects anonymous messages to unclaimed handles and legacy empty-hash records", async () => {
    const missing = await addAnonymousMessage("nobody_here", "Hello!", 0);
    expect(missing).toEqual({
      ok: false,
      status: 404,
      error: "Tree not found.",
    });
    expect(await getTreeRecord("nobody_here")).toBeNull();

    // Seed a legacy unclaimed record directly into FileTreeStore
    const trees = new Map();
    const idem = new Map();
    const fileStore = new FileTreeStore(
      () => tempStoreFile,
      trees,
      idem,
      () => {},
    );
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(
      tempStoreFile,
      JSON.stringify({
        trees: {
          legacyunclaimed: {
            handle: "legacyunclaimed",
            ownerTokenHash: "",
            config: defaultTreeConfig("legacyunclaimed"),
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      }),
      "utf8",
    );
    const appendLegacy = await fileStore.appendMessage(
      "legacyunclaimed",
      { body: "Should not land", ornamentType: 1 },
      { cap: 1000 },
    );
    expect(appendLegacy).toEqual({ ok: false, reason: "missing" });
  });

  it("lazily migrates a legacy hoho:tree:{h} KV blob into hoho:v2 keys with 7-day EXPIRE", async () => {
    const kvState = new Map<string, unknown>();
    const hashes = new Map<string, Map<string, string>>();
    const zsets = new Map<string, Map<string, number>>();
    const sets = new Map<string, Set<string>>();
    const expires = new Map<string, number>();

    kvState.set(
      "hoho:tree:legacykv",
      JSON.stringify({
        handle: "legacykv",
        ownerTokenHash: "deadbeef1234",
        config: defaultTreeConfig("legacykv"),
        createdAt: "2026-12-01T00:00:00.000Z",
        updatedAt: "2026-12-01T00:00:00.000Z",
        messages: [
          {
            id: "msg-1",
            seq: 4,
            body: "Old holiday cheer",
            ornamentType: 2,
            colorIdx: 0,
            seed: 42,
            status: "visible",
            readAt: null,
            createdAt: "2026-12-01T01:00:00.000Z",
          },
        ],
      }),
    );

    const runCmd = (args: Array<string | number>): unknown => {
      const cmd = String(args[0]).toUpperCase();
      const key = String(args[1]);
      if (cmd === "GET") return kvState.get(key) ?? null;
      if (cmd === "SET") {
        const val = String(args[2]);
        const hasNx = args.includes("NX");
        if (hasNx && kvState.has(key)) return null;
        kvState.set(key, val);
        return "OK";
      }
      if (cmd === "HSET") {
        const h = hashes.get(key) ?? new Map<string, string>();
        for (let i = 2; i < args.length; i += 2) {
          h.set(String(args[i]), String(args[i + 1]));
        }
        hashes.set(key, h);
        return 1;
      }
      if (cmd === "ZADD") {
        const z = zsets.get(key) ?? new Map<string, number>();
        for (let i = 2; i < args.length; i += 2) {
          z.set(String(args[i + 1]), Number(args[i]));
        }
        zsets.set(key, z);
        return 1;
      }
      if (cmd === "ZRANGE") {
        const z = zsets.get(key) ?? new Map<string, number>();
        return [...z.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id);
      }
      if (cmd === "HMGET") {
        const h = hashes.get(key) ?? new Map<string, string>();
        return args.slice(2).map((field) => h.get(String(field)) ?? null);
      }
      if (cmd === "SADD") {
        const s = sets.get(key) ?? new Set<string>();
        for (let i = 2; i < args.length; i += 1) s.add(String(args[i]));
        sets.set(key, s);
        return s.size;
      }
      if (cmd === "SCARD") return (sets.get(key) ?? new Set()).size;
      if (cmd === "ZCARD") return (zsets.get(key) ?? new Map()).size;
      if (cmd === "EXPIRE") {
        expires.set(key, Number(args[2]));
        return 1;
      }
      return null;
    };

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input, init) => {
        const url = String(input);
        const body = JSON.parse(String(init?.body ?? "[]"));
        if (url.endsWith("/pipeline")) {
          const results = (body as Array<Array<string | number>>).map((cmd) => ({
            result: runCmd(cmd),
          }));
          return new Response(JSON.stringify(results), { status: 200 });
        }
        return new Response(
          JSON.stringify({ result: runCmd(body as Array<string | number>) }),
          { status: 200 },
        );
      });

    try {
      const kv = new KvTreeStore(() => ({
        url: "https://mock.upstash.io",
        token: "tok",
      }));
      const meta = await kv.getTree("legacykv");
      expect(meta?.handle).toBe("legacykv");
      expect(meta?.ownerTokenHash).toBe("deadbeef1234");
      expect(kvState.has("hoho:tree:legacykv")).toBe(true);
      expect(expires.get("hoho:tree:legacykv")).toBe(604_800);

      const migratedMsgs = await kv.listMessages("legacykv");
      expect(migratedMsgs).toHaveLength(1);
      expect(migratedMsgs[0].body).toBe("Old holiday cheer");

      const sum = await kv.summary("legacykv");
      expect(sum).toEqual({ unread: 1, latestSeq: 4, total: 1 });
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

describe("Task 1.3 trusted proxy IP resolution and salted HMAC hashing", () => {
  const savedProxy = process.env.HOHO_TRUSTED_PROXY;
  const savedSalt = process.env.HOHO_IP_SALT;
  const savedNodeEnv = process.env.NODE_ENV;

  afterAll(() => {
    if (savedProxy === undefined) delete process.env.HOHO_TRUSTED_PROXY;
    else process.env.HOHO_TRUSTED_PROXY = savedProxy;
    if (savedSalt === undefined) delete process.env.HOHO_IP_SALT;
    else process.env.HOHO_IP_SALT = savedSalt;
    if (savedNodeEnv === undefined) {
      delete (process.env as Record<string, string | undefined>).NODE_ENV;
    } else {
      (process.env as Record<string, string | undefined>).NODE_ENV =
        savedNodeEnv;
    }
  });

  beforeEach(() => {
    delete process.env.HOHO_TRUSTED_PROXY;
    delete process.env.HOHO_IP_SALT;
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
  });

  it("ignores spoofed leading x-forwarded-for entries under vercel, cloudflare, and none", () => {
    process.env.HOHO_IP_SALT = "test-salt-1";

    process.env.HOHO_TRUSTED_PROXY = "vercel";
    const v1 = getClientIpHash(
      new Request("http://localhost/", {
        headers: {
          "x-forwarded-for": "1.1.1.1",
          "x-vercel-forwarded-for": "203.0.113.10",
        },
      }),
    );
    const v2 = getClientIpHash(
      new Request("http://localhost/", {
        headers: {
          "x-forwarded-for": "9.9.9.9",
          "x-vercel-forwarded-for": "203.0.113.10",
        },
      }),
    );
    expect(v1).toBe(v2);
    expect(v1).toMatch(/^[a-f0-9]{32}$/);

    process.env.HOHO_TRUSTED_PROXY = "cloudflare";
    const c1 = getClientIpHash(
      new Request("http://localhost/", {
        headers: {
          "x-forwarded-for": "1.1.1.1",
          "cf-connecting-ip": "198.51.100.7",
        },
      }),
    );
    const c2 = getClientIpHash(
      new Request("http://localhost/", {
        headers: {
          "x-forwarded-for": "8.8.8.8",
          "cf-connecting-ip": "198.51.100.7",
        },
      }),
    );
    expect(c1).toBe(c2);

    process.env.HOHO_TRUSTED_PROXY = "none";
    const n1 = getClientIpHash(
      new Request("http://localhost/", {
        headers: { "x-forwarded-for": "1.2.3.4, 203.0.113.25" },
      }),
    );
    const n2 = getClientIpHash(
      new Request("http://localhost/", {
        headers: { "x-forwarded-for": "5.6.7.8, 203.0.113.25" },
      }),
    );
    expect(n1).toBe(n2);

    const unknown1 = getClientIpHash(new Request("http://localhost/"));
    process.env.HOHO_TRUSTED_PROXY = "vercel";
    const unknown2 = getClientIpHash(
      new Request("http://localhost/", {
        headers: { "x-forwarded-for": "1.2.3.4" },
      }),
    );
    expect(unknown1).toBe(unknown2);
  });

  it("produces distinct hashes when HOHO_IP_SALT changes and throws if missing in production", () => {
    const req = new Request("http://localhost/", {
      headers: { "x-forwarded-for": "203.0.113.99" },
    });
    process.env.HOHO_IP_SALT = "salt-alpha";
    const hashA = getClientIpHash(req);
    process.env.HOHO_IP_SALT = "salt-beta";
    const hashB = getClientIpHash(req);
    expect(hashA).not.toBe(hashB);

    delete process.env.HOHO_IP_SALT;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    expect(() => getClientIpHash(req)).toThrow(/HOHO_IP_SALT/);
  });
});

describe("Task 1.4 sliding-window rate limiter and fail-closed KV policy", () => {
  const savedUrl = process.env.UPSTASH_REDIS_REST_URL;
  const savedToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const savedKvUrl = process.env.KV_REST_API_URL;
  const savedKvToken = process.env.KV_REST_API_TOKEN;
  const savedNodeEnv = process.env.NODE_ENV;

  afterAll(() => {
    vi.useRealTimers();
    if (savedUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = savedUrl;
    if (savedToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = savedToken;
    if (savedKvUrl === undefined) delete process.env.KV_REST_API_URL;
    else process.env.KV_REST_API_URL = savedKvUrl;
    if (savedKvToken === undefined) delete process.env.KV_REST_API_TOKEN;
    else process.env.KV_REST_API_TOKEN = savedKvToken;
    if (savedNodeEnv === undefined) {
      delete (process.env as Record<string, string | undefined>).NODE_ENV;
    } else {
      (process.env as Record<string, string | undefined>).NODE_ENV =
        savedNodeEnv;
    }
    resetMemoryStoreForTests();
  });

  beforeEach(() => {
    vi.useRealTimers();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    resetMemoryStoreForTests();
  });

  it("enforces sliding window allow/deny and accurate retryAfterSec", async () => {
    expect(RATE_LIMIT_POLICY.kvFailureBehavior).toBe("fail_closed_503");

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-20T00:00:00.000Z"));

    expect(await checkRateLimit("slide:k1", 2, 10_000)).toEqual({
      allowed: true,
    });
    vi.advanceTimersByTime(4_000);
    expect(await checkRateLimit("slide:k1", 2, 10_000)).toEqual({
      allowed: true,
    });

    // At t=4s, oldest hit was t=0 -> 6s remaining
    const blocked = await checkRateLimit("slide:k1", 2, 10_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.unavailable).toBeUndefined();
    expect(blocked.retryAfterSec).toBe(6);

    // Advance past t=10s so the first hit slides out while second hit (t=4s) remains
    vi.advanceTimersByTime(6_100);
    expect(await checkRateLimit("slide:k1", 2, 10_000)).toEqual({
      allowed: true,
    });
  });

  it("fails closed with unavailable=true and retryAfterSec=5 when KV errors in production", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.KV_REST_API_URL = "https://mock-rl.upstash.io";
    process.env.KV_REST_API_TOKEN = "mock-token";
    resetMemoryStoreForTests();

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Upstash outage"));

    try {
      const res = await checkRateLimit("prod:outage", 6, 60_000);
      expect(res).toEqual({
        allowed: false,
        unavailable: true,
        retryAfterSec: 5,
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

describe("Task 1.5 cookie-only auth and same-origin checks", () => {
  const savedNodeEnv = process.env.NODE_ENV;
  const savedSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  afterAll(() => {
    if (savedNodeEnv === undefined) {
      delete (process.env as Record<string, string | undefined>).NODE_ENV;
    } else {
      (process.env as Record<string, string | undefined>).NODE_ENV =
        savedNodeEnv;
    }
    if (savedSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = savedSiteUrl;
  });

  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it("uses __Host- cookie prefix in production and builds strict cookie attributes", () => {
    expect(getOwnerCookieName("kai_2026")).toBe("hoho_owner_kai_2026");

    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    expect(getOwnerCookieName("kai_2026")).toBe("__Host-hoho_owner_kai_2026");
    const cookie = buildOwnerCookie("kai_2026", "secret_tok");
    expect(cookie).toContain("__Host-hoho_owner_kai_2026=secret_tok");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Secure");
    expect(cookie).not.toContain("Domain=");
  });

  it("authenticates only via HttpOnly cookie and ignores x-owner-key header", () => {
    const headerOnlyReq = new Request("http://localhost/api/trees/kai/mail", {
      headers: { "x-owner-key": "secret_tok" },
    });
    expect(getOwnerTokenFromRequest(headerOnlyReq, "kai")).toBeNull();

    const cookieReq = new Request("http://localhost/api/trees/kai/mail", {
      headers: {
        cookie: "hoho_owner_kai=cookie_secret_tok; other=1",
        "x-owner-key": "spoofed",
      },
    });
    expect(getOwnerTokenFromRequest(cookieReq, "kai")).toBe(
      "cookie_secret_tok",
    );
  });

  it("rejects missing Origin, foreign Origin, and non-JSON Content-Type in assertSameOrigin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://tree.example.com";
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";

    expect(
      assertSameOrigin(
        new Request("https://tree.example.com/api/trees/kai", {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            origin: "https://tree.example.com",
          },
        }),
      ),
    ).toEqual({ ok: true });

    expect(
      assertSameOrigin(
        new Request("https://tree.example.com/api/trees/kai", {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            origin: "https://evil.example.com",
          },
        }).clone(),
      ).ok,
    ).toBe(false);

    expect(
      assertSameOrigin(
        new Request("https://tree.example.com/api/trees/kai", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
        }),
      ).ok,
    ).toBe(false);

    expect(
      assertSameOrigin(
        new Request("https://tree.example.com/api/trees/kai", {
          method: "PATCH",
          headers: {
            "content-type": "text/plain",
            origin: "https://tree.example.com",
          },
        }),
      ).ok,
    ).toBe(false);

    // Referer fallback works for same origin
    expect(
      assertSameOrigin(
        new Request("https://tree.example.com/api/trees/kai", {
          method: "DELETE",
          headers: {
            "content-type": "application/json; charset=utf-8",
            referer: "https://tree.example.com/t/kai",
          },
        }),
      ).ok,
    ).toBe(true);
  });
});

describe("Task 1.6 self-harm support notice and crisis resources", () => {
  it("provides a default guidance entry without unverified region phone numbers", () => {
    const def = getDefaultCrisisResource();
    expect(def.label.length).toBeGreaterThan(0);
    expect(def.guidance.toLowerCase()).toContain("emergency");
    expect(Object.keys(CRISIS_RESOURCES.regions)).toHaveLength(0);
  });

  it("sets selfHarmNotice=true while still delivering the note to the owner", async () => {
    await claimOrVerifyTree("supporttree", null, {});
    const res = await addAnonymousMessage(
      "supporttree",
      "I want to end my life",
      0,
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.selfHarmNotice).toBe(true);
      expect(res.totalVisible).toBe(1);
    }
    const rec = await getTreeRecord("supporttree");
    expect(rec?.messages).toHaveLength(1);
    expect(rec?.messages[0].body).toBe("I want to end my life");
  });
});

describe("Task 2.1 moderation phone vs date refinement, lexicon hook, and optional OpenAI layer", () => {
  it("allows holiday dates and benign numbers while blocking real and obfuscated phone numbers", () => {
    const allowed = [
      "see you 25 12 2026",
      "Merry Christmas 2026!",
      "Dec 25, 2026",
      "I got 100 out of 100",
      "2026-12-25",
      "12/25",
    ];
    for (const text of allowed) {
      expect(classifyMessage(text).decision).toBe("allow");
    }

    const blockedPhones = [
      "call 0917 123 4567",
      "+63 917 123 4567",
      "09171234567",
      "0 9 1 7 1 2 3 4 5 6 7",
    ];
    for (const text of blockedPhones) {
      expect(classifyMessage(text).decision).toBe("reject");
    }
  });

  it("preserves existing moderation patterns and normalizeForModeration", () => {
    expect(normalizeForModeration("h\u200be\u0301lllooo 133054@$")).toBe(
      "helloo ieeosaas",
    );
    expect(classifyMessage("https://example.com").decision).toBe("reject");
    expect(classifyMessage("dm me test@example.com").decision).toBe("reject");
    expect(classifyMessage("go d0xx someone").decision).toBe("reject");
  });

  it("enforces EXTRA_BLOCKED_TERMS with word boundaries while allowing unrelated substrings", () => {
    EXTRA_BLOCKED_TERMS.push("flarp");
    try {
      expect(classifyMessage("You are a flarp!").decision).toBe("reject");
      expect(classifyMessage("Notice the flarpwood ornament").decision).toBe(
        "allow",
      );
    } finally {
      EXTRA_BLOCKED_TERMS.pop();
    }
  });

  it("keeps external moderation off by default, rejects flagged categories when enabled, and fails open on timeout", async () => {
    const prevProvider = process.env.HOHO_MODERATION_PROVIDER;
    const prevKey = process.env.OPENAI_API_KEY;
    delete process.env.HOHO_MODERATION_PROVIDER;
    delete process.env.OPENAI_API_KEY;

    expect(await checkExternalModeration("Hello")).toEqual({ reject: false });

    process.env.HOHO_MODERATION_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "sk-test";

    const rejectSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [{ categories: { harassment: true, sexual: false } }],
        }),
        { status: 200 },
      ),
    );
    try {
      const flagged = await checkExternalModeration("mean text");
      expect(flagged.reject).toBe(true);
    } finally {
      rejectSpy.mockRestore();
    }

    const allowSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [{ categories: { harassment: false, violence: false } }],
        }),
        { status: 200 },
      ),
    );
    try {
      const clean = await checkExternalModeration("merry christmas");
      expect(clean).toEqual({ reject: false });
    } finally {
      allowSpy.mockRestore();
    }

    const timeoutSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("Request timed out"));
    try {
      const timedOut = await checkExternalModeration("merry christmas");
      expect(timedOut).toEqual({ reject: false });
    } finally {
      timeoutSpy.mockRestore();
      if (prevProvider === undefined) delete process.env.HOHO_MODERATION_PROVIDER;
      else process.env.HOHO_MODERATION_PROVIDER = prevProvider;
      if (prevKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = prevKey;
    }
  });
});
