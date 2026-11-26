import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as healthGet } from "./health/route";
import { GET as mailGet, PATCH as mailPatch } from "./trees/[handle]/mail/route";
import {
  DELETE as messageDelete,
  PATCH as messagePatch,
} from "./trees/[handle]/messages/[id]/route";
import { POST as messagesPost } from "./trees/[handle]/messages/route";
import {
  DELETE as pushDelete,
  GET as pushGet,
  POST as pushPost,
} from "./trees/[handle]/push/route";
import { GET as treeGet, PATCH as treePatch } from "./trees/[handle]/route";
import { POST as treesPost } from "./trees/route";
import { resetMemoryStoreForTests } from "@/lib/server-store";
import {
  pushTransport,
  resetPushConfigForTests,
  sendOwnerNewOrnamentPush,
} from "@/lib/push";

const routesTempDir = path.join(os.tmpdir(), `hoho-xo-routes-${process.pid}`);
const routesTempFile = path.join(routesTempDir, "store.json");

function extractCookiePair(setCookie: string | null): string {
  expect(setCookie).toBeTruthy();
  return (setCookie ?? "").split(";")[0];
}

function ownerJsonRequest(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  options: {
    body?: unknown;
    cookie?: string;
    origin?: string | null;
    contentType?: string;
    extraHeaders?: Record<string, string>;
  } = {},
): Request {
  const headers: Record<string, string> = {};
  if (options.contentType !== undefined) {
    if (options.contentType) headers["content-type"] = options.contentType;
  } else {
    headers["content-type"] = "application/json";
  }
  if (options.origin !== null) {
    headers.origin = options.origin ?? "http://localhost:3000";
  }
  if (options.cookie) {
    headers.cookie = options.cookie;
  }
  if (options.extraHeaders) {
    Object.assign(headers, options.extraHeaders);
  }
  return new Request(url, {
    method,
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
}

describe("Task 3.1 API route handler integration tests", () => {
  const savedStoreFile = process.env.HOHO_STORE_FILE;

  beforeEach(async () => {
    process.env.HOHO_STORE_FILE = routesTempFile;
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    delete process.env.VERCEL;
    delete process.env.HOHO_REQUIRE_DURABLE;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.HOHO_IP_SALT;
    delete process.env.HOHO_TRUSTED_PROXY;
    delete process.env.HOHO_MAX_MESSAGES_PER_TREE;
    resetMemoryStoreForTests();
    await fs.rm(routesTempDir, { recursive: true, force: true });
  });

  afterAll(async () => {
    if (savedStoreFile === undefined) delete process.env.HOHO_STORE_FILE;
    else process.env.HOHO_STORE_FILE = savedStoreFile;
    resetMemoryStoreForTests();
    await fs.rm(routesTempDir, { recursive: true, force: true });
  });

  it("handles claim, cookie re-verify without leaking ownerKey, public GET isolation, and owner mail CRUD", async () => {
    const claimRes = await treesPost(
      ownerJsonRequest("http://localhost:3000/api/trees", "POST", {
        body: { handle: "wintertree", config: { mutedWords: "spoilers" } },
      }),
    );
    expect(claimRes.status).toBe(201);
    const claimJson = (await claimRes.json()) as {
      ok: boolean;
      created: boolean;
      ownerKey?: string;
    };
    expect(claimJson.ok).toBe(true);
    expect(claimJson.created).toBe(true);
    expect(claimJson.ownerKey).toBeTruthy();

    const ownerCookie = extractCookiePair(claimRes.headers.get("set-cookie"));

    // Subsequent cookie-verified POST /api/trees omits ownerKey from JSON body
    const reverifyRes = await treesPost(
      ownerJsonRequest("http://localhost:3000/api/trees", "POST", {
        cookie: ownerCookie,
        body: { handle: "wintertree" },
      }),
    );
    expect(reverifyRes.status).toBe(200);
    const reverifyJson = (await reverifyRes.json()) as {
      ok: boolean;
      created: boolean;
      ownerKey?: string;
    };
    expect(reverifyJson.created).toBe(false);
    expect("ownerKey" in reverifyJson).toBe(false);

    // Send anonymous message
    const sendRes = await messagesPost(
      new Request("http://localhost:3000/api/trees/wintertree/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: "Merry Christmas!", ornamentType: 5 }),
      }),
      { params: Promise.resolve({ handle: "wintertree" }) },
    );
    expect(sendRes.status).toBe(201);
    const sendJson = (await sendRes.json()) as {
      ok: boolean;
      ornament: Record<string, unknown>;
      totalVisible: number;
    };
    expect(sendJson.ok).toBe(true);
    expect(sendJson.totalVisible).toBe(1);
    expect("body" in sendJson.ornament).toBe(false);
    expect(sendJson.ornament.readAt).toBeNull();

    // Public GET hides message bodies, read state, and mutedWords
    const pubRes = await treeGet(
      new Request("http://localhost:3000/api/trees/wintertree"),
      { params: Promise.resolve({ handle: "wintertree" }) },
    );
    expect(pubRes.status).toBe(200);
    const pubJson = (await pubRes.json()) as {
      config: { mutedWords: string };
      ornaments: Array<Record<string, unknown>>;
      totalVisible: number;
    };
    expect(pubJson.config.mutedWords).toBe("");
    expect(pubJson.totalVisible).toBe(1);
    expect("body" in pubJson.ornaments[0]).toBe(false);
    expect(pubJson.ornaments[0].readAt).toBeNull();

    // Mail requires cookie auth and rejects x-owner-key alone
    const unauthMail = await mailGet(
      new Request("http://localhost:3000/api/trees/wintertree/mail"),
      { params: Promise.resolve({ handle: "wintertree" }) },
    );
    expect(unauthMail.status).toBe(401);

    const headerKeyMail = await mailGet(
      new Request("http://localhost:3000/api/trees/wintertree/mail", {
        headers: { "x-owner-key": claimJson.ownerKey! },
      }),
      { params: Promise.resolve({ handle: "wintertree" }) },
    );
    expect(headerKeyMail.status).toBe(401);

    // Mail ?summary=1 returns O(1) summary
    const sumRes = await mailGet(
      new Request("http://localhost:3000/api/trees/wintertree/mail?summary=1", {
        headers: { cookie: ownerCookie },
      }),
      { params: Promise.resolve({ handle: "wintertree" }) },
    );
    expect(sumRes.status).toBe(200);
    expect(await sumRes.json()).toEqual({
      ok: true,
      unreadCount: 1,
      latestSeq: 1,
      total: 1,
    });

    // Full mail returns body
    const fullMailRes = await mailGet(
      new Request("http://localhost:3000/api/trees/wintertree/mail", {
        headers: { cookie: ownerCookie },
      }),
      { params: Promise.resolve({ handle: "wintertree" }) },
    );
    expect(fullMailRes.status).toBe(200);
    const fullMail = (await fullMailRes.json()) as {
      messages: Array<{ id: string; body: string }>;
    };
    expect(fullMail.messages).toHaveLength(1);
    expect(fullMail.messages[0].body).toBe("Merry Christmas!");
    const msgId = fullMail.messages[0].id;

    // Owner config PATCH, message read PATCH, and DELETE
    const cfgPatchRes = await treePatch(
      ownerJsonRequest("http://localhost:3000/api/trees/wintertree", "PATCH", {
        cookie: ownerCookie,
        body: { pauseInbox: false, displayName: "Winter Host" },
      }),
      { params: Promise.resolve({ handle: "wintertree" }) },
    );
    expect(cfgPatchRes.status).toBe(200);

    const readRes = await messagePatch(
      ownerJsonRequest(
        `http://localhost:3000/api/trees/wintertree/messages/${msgId}`,
        "PATCH",
        {
          cookie: ownerCookie,
          body: { action: "read" },
        },
      ),
      { params: Promise.resolve({ handle: "wintertree", id: msgId }) },
    );
    expect(readRes.status).toBe(200);

    const delRes = await messageDelete(
      ownerJsonRequest(
        `http://localhost:3000/api/trees/wintertree/messages/${msgId}`,
        "DELETE",
        { cookie: ownerCookie },
      ),
      { params: Promise.resolve({ handle: "wintertree", id: msgId }) },
    );
    expect(delRes.status).toBe(200);
  });

  it("enforces Origin and Content-Type on all owner mutating routes", async () => {
    const claimRes = await treesPost(
      ownerJsonRequest("http://localhost:3000/api/trees", "POST", {
        body: { handle: "csrfguard" },
      }),
    );
    const ownerCookie = extractCookiePair(claimRes.headers.get("set-cookie"));

    const foreignClaim = await treesPost(
      ownerJsonRequest("http://localhost:3000/api/trees", "POST", {
        origin: "https://evil.example.com",
        body: { handle: "csrfguard2" },
      }),
    );
    expect(foreignClaim.status).toBe(403);

    const missingOriginPatch = await treePatch(
      ownerJsonRequest("http://localhost:3000/api/trees/csrfguard", "PATCH", {
        origin: null,
        cookie: ownerCookie,
        body: { displayName: "Blocked" },
      }),
      { params: Promise.resolve({ handle: "csrfguard" }) },
    );
    expect(missingOriginPatch.status).toBe(403);

    const badContentMailPatch = await mailPatch(
      ownerJsonRequest(
        "http://localhost:3000/api/trees/csrfguard/mail",
        "PATCH",
        {
          contentType: "text/plain",
          cookie: ownerCookie,
          body: { action: "mark_all_read" },
        },
      ),
      { params: Promise.resolve({ handle: "csrfguard" }) },
    );
    expect(badContentMailPatch.status).toBe(403);

    const foreignMsgPatch = await messagePatch(
      ownerJsonRequest(
        "http://localhost:3000/api/trees/csrfguard/messages/nonexistent",
        "PATCH",
        {
          origin: "https://evil.example.com",
          cookie: ownerCookie,
          body: { action: "read" },
        },
      ),
      { params: Promise.resolve({ handle: "csrfguard", id: "nonexistent" }) },
    );
    expect(foreignMsgPatch.status).toBe(403);

    const foreignMsgDel = await messageDelete(
      ownerJsonRequest(
        "http://localhost:3000/api/trees/csrfguard/messages/nonexistent",
        "DELETE",
        {
          origin: "https://evil.example.com",
          cookie: ownerCookie,
        },
      ),
      { params: Promise.resolve({ handle: "csrfguard", id: "nonexistent" }) },
    );
    expect(foreignMsgDel.status).toBe(403);
  });

  it("handles honeypot, idempotent replay, message cap 429, invalid/unclaimed 404, and rate-limit 429", async () => {
    await treesPost(
      ownerJsonRequest("http://localhost:3000/api/trees", "POST", {
        body: { handle: "ratetree" },
      }),
    );

    // Invalid & reserved & unclaimed handles return 404
    const invalidPub = await treeGet(
      new Request("http://localhost:3000/api/trees/ab"),
      { params: Promise.resolve({ handle: "ab" }) },
    );
    expect(invalidPub.status).toBe(404);

    const unclaimedSend = await messagesPost(
      new Request("http://localhost:3000/api/trees/unclaimed99/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: "Anyone home?" }),
      }),
      { params: Promise.resolve({ handle: "unclaimed99" }) },
    );
    expect(unclaimedSend.status).toBe(404);

    // Honeypot returns 200 { ok: true, ignored: true } without persisting
    const honeyRes = await messagesPost(
      new Request("http://localhost:3000/api/trees/ratetree/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: "Buy now", website: "http://bot.example" }),
      }),
      { params: Promise.resolve({ handle: "ratetree" }) },
    );
    expect(honeyRes.status).toBe(200);
    expect(await honeyRes.json()).toEqual({ ok: true, ignored: true });

    // Idempotent replay creates only 1 ornament
    const idemKey = "22222222-2222-4222-8222-222222222222";
    const first = await messagesPost(
      new Request("http://localhost:3000/api/trees/ratetree/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idemKey,
        },
        body: JSON.stringify({ body: "First wish", ornamentType: 1 }),
      }),
      { params: Promise.resolve({ handle: "ratetree" }) },
    );
    const second = await messagesPost(
      new Request("http://localhost:3000/api/trees/ratetree/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idemKey,
        },
        body: JSON.stringify({ body: "First wish", ornamentType: 1 }),
      }),
      { params: Promise.resolve({ handle: "ratetree" }) },
    );
    const firstJson = (await first.json()) as {
      ornament: { id: string };
      totalVisible: number;
    };
    const secondJson = (await second.json()) as {
      ornament: { id: string };
      totalVisible: number;
    };
    expect(second.status).toBe(201);
    expect(secondJson.ornament.id).toBe(firstJson.ornament.id);
    expect(secondJson.totalVisible).toBe(1);

    // Cap enforcement returns 429
    process.env.HOHO_MAX_MESSAGES_PER_TREE = "2";
    const msg2 = await messagesPost(
      new Request("http://localhost:3000/api/trees/ratetree/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: "Second wish" }),
      }),
      { params: Promise.resolve({ handle: "ratetree" }) },
    );
    expect(msg2.status).toBe(201);

    const msg3Cap = await messagesPost(
      new Request("http://localhost:3000/api/trees/ratetree/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: "Third over cap" }),
      }),
      { params: Promise.resolve({ handle: "ratetree" }) },
    );
    expect(msg3Cap.status).toBe(429);
    delete process.env.HOHO_MAX_MESSAGES_PER_TREE;

    // Exhaust 6/min per-IP+handle rate limit (3 messages sent above already + 3 more)
    for (let i = 0; i < 3; i += 1) {
      await messagesPost(
        new Request("http://localhost:3000/api/trees/ratetree/messages", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body: `Burst note ${i}` }),
        }),
        { params: Promise.resolve({ handle: "ratetree" }) },
      );
    }
    const rateBlocked = await messagesPost(
      new Request("http://localhost:3000/api/trees/ratetree/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: "Should be rate limited" }),
      }),
      { params: Promise.resolve({ handle: "ratetree" }) },
    );
    expect(rateBlocked.status).toBe(429);
    expect(Number(rateBlocked.headers.get("retry-after"))).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("returns 503 fail-closed when KV errors and when production Vercel lacks KV", async () => {
    // 1) Nondurable Vercel in production -> 503 on claim, message, health
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.VERCEL = "1";
    process.env.HOHO_IP_SALT = "prod-salt";
    process.env.NEXT_PUBLIC_SITE_URL = "https://trees.example.org";

    const healthFail = await healthGet();
    expect(healthFail.status).toBe(503);
    expect(await healthFail.json()).toMatchObject({
      ok: false,
      durable: false,
      siteUrlConfigured: true,
    });

    const prodClaim503 = await treesPost(
      ownerJsonRequest("https://trees.example.org/api/trees", "POST", {
        origin: "https://trees.example.org",
        body: { handle: "vercelno" },
      }),
    );
    expect(prodClaim503.status).toBe(503);

    const prodMsg503 = await messagesPost(
      new Request("https://trees.example.org/api/trees/vercelno/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: "Hello!" }),
      }),
      { params: Promise.resolve({ handle: "vercelno" }) },
    );
    expect(prodMsg503.status).toBe(503);

    // 2) KV configured in production but fails -> rate limiter fails closed with 503 Retry-After: 5
    process.env.UPSTASH_REDIS_REST_URL = "https://mock-kv.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "mock-tok";
    resetMemoryStoreForTests();

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("KV unreachable"));
    try {
      const rl503 = await messagesPost(
        new Request("https://trees.example.org/api/trees/vercelno/messages", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body: "Hello KV outage!" }),
        }),
        { params: Promise.resolve({ handle: "vercelno" }) },
      );
      expect(rl503.status).toBe(503);
      expect(rl503.headers.get("retry-after")).toBe("5");
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("enforces auth, origin, 5-device cap, coalescing, and generic payload on Web Push", async () => {
    const claimRes = await treesPost(
      ownerJsonRequest("http://localhost:3000/api/trees", "POST", {
        body: { handle: "pushtree" },
      }),
    );
    expect(claimRes.status).toBe(201);
    const ownerCookie = extractCookiePair(claimRes.headers.get("set-cookie"));

    // Unauthenticated requests fail closed
    const unauthGet = await pushGet(
      new Request("http://localhost:3000/api/trees/pushtree/push"),
      { params: Promise.resolve({ handle: "pushtree" }) },
    );
    expect(unauthGet.status).toBe(401);

    const foreignPost = await pushPost(
      ownerJsonRequest("http://localhost:3000/api/trees/pushtree/push", "POST", {
        origin: "https://evil.example.com",
        cookie: ownerCookie,
        body: {
          endpoint: "https://push.example.org/sub/1",
          keys: { p256dh: "p256dh_key_1", auth: "auth_key_1" },
        },
      }),
      { params: Promise.resolve({ handle: "pushtree" }) },
    );
    expect(foreignPost.status).toBe(403);

    // Subscribe 6 devices -> capped cleanly at 5 newest
    for (let i = 1; i <= 6; i += 1) {
      const subRes = await pushPost(
        ownerJsonRequest("http://localhost:3000/api/trees/pushtree/push", "POST", {
          cookie: ownerCookie,
          body: {
            endpoint: `https://push.example.org/sub/${i}`,
            keys: { p256dh: `p256dh_key_${i}`, auth: `auth_key_${i}` },
          },
        }),
        { params: Promise.resolve({ handle: "pushtree" }) },
      );
      expect(subRes.status).toBe(200);
      const json = (await subRes.json()) as { count: number };
      expect(json.count).toBeLessThanOrEqual(5);
    }

    const listRes = await pushGet(
      new Request("http://localhost:3000/api/trees/pushtree/push", {
        headers: { cookie: ownerCookie },
      }),
      { params: Promise.resolve({ handle: "pushtree" }) },
    );
    expect(listRes.status).toBe(200);
    expect((await listRes.json()) as { count: number; subscribed: boolean }).toEqual({
      ok: true,
      count: 5,
      subscribed: true,
    });

    // Mock webpush and verify 1/min coalescing + zero note text in push payload
    process.env.VAPID_PUBLIC_KEY =
      "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
    process.env.VAPID_PRIVATE_KEY = "test-private-key-placeholder";
    resetPushConfigForTests();

    const setVapidSpy = vi
      .spyOn(pushTransport, "setVapidDetails")
      .mockImplementation(() => {});
    const sendSpy = vi
      .spyOn(pushTransport, "sendNotification")
      .mockResolvedValue({ statusCode: 201, headers: {}, body: "" });
    try {
      const firstSend = await sendOwnerNewOrnamentPush("pushtree");
      expect(firstSend).toEqual({ sent: 5, skipped: false });
      expect(setVapidSpy).toHaveBeenCalledTimes(1);
      expect(sendSpy).toHaveBeenCalledTimes(5);
      const sentPayload = String(sendSpy.mock.calls[0]?.[1] ?? "");
      expect(sentPayload).toContain("New ornament on your Hoho.xo tree");
      expect(sentPayload).not.toContain("SecretVisitorNote");

      // Immediate second push within 60s window is coalesced
      const secondSend = await sendOwnerNewOrnamentPush("pushtree");
      expect(secondSend).toEqual({ sent: 0, skipped: true });
      expect(sendSpy).toHaveBeenCalledTimes(5);
    } finally {
      setVapidSpy.mockRestore();
      sendSpy.mockRestore();
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;
      resetPushConfigForTests();
    }

    const delRes = await pushDelete(
      ownerJsonRequest("http://localhost:3000/api/trees/pushtree/push", "DELETE", {
        cookie: ownerCookie,
        body: { endpoint: "https://push.example.org/sub/6" },
      }),
      { params: Promise.resolve({ handle: "pushtree" }) },
    );
    expect(delRes.status).toBe(200);
    expect((await delRes.json()) as { count: number }).toMatchObject({ count: 4 });
  });
});
