import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import robots from "../app/robots";
import {
  addAnonymousMessage,
  checkRateLimit,
  claimOrVerifyTree,
  deleteMessage,
  getTreeRecord,
  markAllMessagesRead,
  markMessageRead,
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
