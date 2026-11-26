import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  claimOrVerifyTree,
  getTreeRecord,
  resetMemoryStoreForTests,
  setTreeSupporter,
  updateTreeConfig,
} from "./server-store";
import {
  getOptionalTipNote,
  getSupportChannels,
  parseHttpsUrl,
} from "./support-config";
import { isSupporterCodeEnabled, verifySupporterCode } from "./supporter-codes";

const tempDir = path.join(os.tmpdir(), `hoho-xo-support-${process.pid}`);
const tempStoreFile = path.join(tempDir, "store.json");

beforeEach(async () => {
  process.env.HOHO_STORE_FILE = tempStoreFile;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  resetMemoryStoreForTests();
  await fs.rm(tempDir, { recursive: true, force: true });
});

afterAll(async () => {
  delete process.env.HOHO_STORE_FILE;
  resetMemoryStoreForTests();
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("support-config and supporter perk safety", () => {
  it("accepts only strict https channel URLs and omits unset or unsafe values", () => {
    expect(parseHttpsUrl("")).toBeNull();
    expect(parseHttpsUrl("http://ko-fi.com/test")).toBeNull();
    expect(parseHttpsUrl("javascript:alert(1)")).toBeNull();
    expect(parseHttpsUrl("https://user:pass@ko-fi.com/test")).toBeNull();
    expect(parseHttpsUrl(" https://ko-fi.com/hohoxo ")).toBe(
      "https://ko-fi.com/hohoxo",
    );

    const channels = getSupportChannels({
      NEXT_PUBLIC_KOFI_URL: "https://ko-fi.com/hohoxo",
      NEXT_PUBLIC_BUYMEACOFFEE_URL: "http://insecure.example.com/x",
      NEXT_PUBLIC_PAYPAL_URL: "https://paypal.me/hohoxo",
      NEXT_PUBLIC_PATREON_URL: "https://patreon.com/hohoxo",
      NEXT_PUBLIC_GITHUB_SPONSORS_URL:
        "https://github.com/sponsors/noodlestack",
      NEXT_PUBLIC_CUSTOM_SUPPORT_URL: "https://tips.example.com/hoho",
      NEXT_PUBLIC_CUSTOM_SUPPORT_LABEL: `  ${"A".repeat(60)}  `,
      NEXT_PUBLIC_CUSTOM_SUPPORT_DESC: `  ${"B".repeat(120)}  `,
    });
    expect(channels.map((c) => c.id)).toEqual([
      "kofi",
      "paypal",
      "patreon",
      "github-sponsors",
      "custom",
    ]);
    const customChannel = channels.find((c) => c.id === "custom");
    expect(customChannel?.label).toBe("A".repeat(48));
    expect(customChannel?.description).toBe("B".repeat(100));

    const defaultCustom = getSupportChannels({
      NEXT_PUBLIC_CUSTOM_SUPPORT_URL: "https://tips.example.com/hoho",
    });
    expect(defaultCustom).toEqual([
      {
        id: "custom",
        label: "Support Hoho.xo",
        description: "Optional direct tip to help keep Hoho.xo free",
        url: "https://tips.example.com/hoho",
      },
    ]);

    expect(getSupportChannels({})).toEqual([]);
    expect(getOptionalTipNote({})).toBeNull();
    expect(
      getOptionalTipNote({
        NEXT_PUBLIC_SUPPORT_TIP_NOTE: "  GCash thank you!  ",
      }),
    ).toBe("GCash thank you!");
  });

  it("validates supporter thank-you codes with constant-time hash comparison", () => {
    expect(isSupporterCodeEnabled({ HOHO_SUPPORTER_CODES: "" })).toBe(false);
    expect(
      isSupporterCodeEnabled({ HOHO_SUPPORTER_CODES: "HOHO-2026, STAR-GOLD" }),
    ).toBe(true);

    expect(
      verifySupporterCode("  hoho-2026  ", {
        HOHO_SUPPORTER_CODES: "HOHO-2026, STAR-GOLD",
      }),
    ).toBe(true);
    expect(
      verifySupporterCode("STAR-GOLD", {
        HOHO_SUPPORTER_CODES: "HOHO-2026, STAR-GOLD",
      }),
    ).toBe(true);
    expect(
      verifySupporterCode("WRONG-CODE", {
        HOHO_SUPPORTER_CODES: "HOHO-2026, STAR-GOLD",
      }),
    ).toBe(false);
  });

  it("allows cosmetic supporter activation only via setTreeSupporter and prevents patch spoofing", async () => {
    await claimOrVerifyTree("support_perk", null, {});
    await updateTreeConfig("support_perk", {
      supporter: true,
      displayName: "Patched",
    } as Record<string, unknown>);
    const afterPatch = await getTreeRecord("support_perk");
    expect(afterPatch?.config.supporter).toBe(false);
    expect(afterPatch?.config.displayName).toBe("Patched");

    const activated = await setTreeSupporter("support_perk", true);
    expect(activated?.config.supporter).toBe(true);

    // Subsequent config updates keep supporter=true intact
    await updateTreeConfig("support_perk", { prompt: "Updated prompt" });
    const persisted = await getTreeRecord("support_perk");
    expect(persisted?.config.supporter).toBe(true);
  });
});
