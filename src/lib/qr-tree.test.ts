import { describe, expect, it } from "vitest";
import { classifyMessage, normalizeForModeration } from "./messages";
import {
  createQrMatrix,
  createTreeGlyphTargets,
  generateQrTreeCloud,
  normalizeWebUrl,
  resolveTreeOrnaments,
  SLOT_COUNT,
  slotFor,
  slotPosition3D,
} from "./qr-tree";
import {
  buildDesignShareUrl,
  defaultTreeConfig,
  isTreeSceneryId,
  isTreeShapeId,
  isTreeTopperId,
  OWNER_PROMPT_PRESETS,
  parseDesignFromSearchParams,
  TREE_AVATARS,
  TREE_SCENERIES,
  TREE_SHAPES,
  TREE_TOPPERS,
  VISITOR_IDEA_PROMPTS,
} from "./tree-config";
import {
  CHRISTMAS_TRACKS,
  getCurrentChristmasTrack,
  isChristmasMusicPlaying,
  nextChristmasTrack,
  playOrnamentChime,
  startChristmasMusic,
  stopChristmasMusic,
} from "./sound";
import {
  isTreeThemeId,
  ORNAMENT_COLORS,
  ORNAMENT_TYPES,
  TREE_THEME_LIST,
} from "./tree-themes";

describe("createQrMatrix", () => {
  it("creates a QR matrix with grid for a normal link", () => {
    const result = createQrMatrix("https://hoho.xo/t/noodlestack");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.size).toBeGreaterThan(0);
      expect(result.grid).toHaveLength(result.size * result.size);
      expect(result.cells.length).toBeLessThanOrEqual(4096);
      expect(result.cells.length).toBeGreaterThan(0);
    }
  });

  it("rejects links too dense for a responsive tree animation", () => {
    const result = createQrMatrix(`https://example.com/${"a".repeat(900)}`);

    expect(result).toEqual({ ok: false, reason: "too-dense" });
  });

  it("reports links beyond the QR encoder capacity", () => {
    const result = createQrMatrix(`https://example.com/${"a".repeat(2500)}`);

    expect(result).toEqual({ ok: false, reason: "too-long" });
  });
});

describe("normalizeWebUrl", () => {
  it("accepts and normalizes HTTP and HTTPS links", () => {
    expect(normalizeWebUrl(" https://example.com/tree ")).toBe(
      "https://example.com/tree",
    );
    expect(normalizeWebUrl("http://localhost:3000/t/preview")).toBe(
      "http://localhost:3000/t/preview",
    );
  });

  it("rejects unsafe protocols, credentials, malformed, and oversized input", () => {
    expect(normalizeWebUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeWebUrl("ftp://example.com")).toBeNull();
    expect(normalizeWebUrl("https://user:pass@example.com")).toBeNull();
    expect(normalizeWebUrl("not a url")).toBeNull();
    expect(
      normalizeWebUrl(`https://example.com/${"a".repeat(2048)}`),
    ).toBeNull();
  });
});

describe("tree slots and ornament collision rules", () => {
  it("maps sequence numbers stably into 100 slots", () => {
    expect(SLOT_COUNT).toBe(100);
    expect(slotFor(0)).toBe(0);
    expect(slotFor(100)).toBe(0);
    expect(slotFor(142)).toBe(42);
    expect(slotFor(-1)).toBe(99);
  });

  it("produces 100 distinct 3D slot coordinates within tree bounds", () => {
    const coords = Array.from({ length: SLOT_COUNT }, (_, idx) =>
      slotPosition3D(idx),
    );
    const keys = new Set(
      coords.map((c) => `${c.x.toFixed(3)},${c.y.toFixed(3)},${c.z.toFixed(3)}`),
    );
    expect(keys.size).toBe(SLOT_COUNT);
    expect(coords.every((c) => c.y >= 0.7 && c.y <= 9.2)).toBe(true);
  });

  it("keeps the newest eligible message on slot collision and excludes reported", () => {
    const messages = [
      { id: "m1", seq: 1, status: "visible" },
      { id: "m101", seq: 101, status: "visible" },
      { id: "m2", seq: 2, status: "reported" },
      { id: "m3", seq: 3, status: "visible" },
    ];

    const resolved = resolveTreeOrnaments(messages);
    expect(resolved.map((m) => m.id)).toEqual(["m101", "m3"]);
    expect(resolved[0].slot).toBe(1);
    expect(resolved[1].slot).toBe(3);
  });
});

describe("tree themes, ornaments, silhouettes, and design URLs", () => {
  it("exposes 10 curated themes, 16 ornament styles, and 10 colors", () => {
    expect(TREE_THEME_LIST).toHaveLength(10);
    expect(ORNAMENT_TYPES).toHaveLength(16);
    expect(ORNAMENT_COLORS).toHaveLength(10);
    expect(isTreeThemeId("ember")).toBe(true);
    expect(isTreeThemeId("mint")).toBe(true);
    expect(isTreeThemeId("unknown")).toBe(false);
  });

  it("exposes 6 toppers, 4 shapes, 5 sceneries, 7 avatars, and round-trips design URLs cleanly", () => {
    expect(TREE_TOPPERS).toHaveLength(6);
    expect(TREE_SHAPES).toHaveLength(4);
    expect(TREE_SCENERIES).toHaveLength(5);
    expect(TREE_AVATARS).toHaveLength(7);
    expect(isTreeTopperId("crown")).toBe(true);
    expect(isTreeTopperId("ribbon")).toBe(true);
    expect(isTreeShapeId("spire")).toBe(true);
    expect(isTreeSceneryId("aurora")).toBe(true);
    expect(isTreeSceneryId("hearth")).toBe(true);
    expect(OWNER_PROMPT_PRESETS.length).toBeGreaterThanOrEqual(6);
    expect(VISITOR_IDEA_PROMPTS.length).toBeGreaterThanOrEqual(6);

    const base = defaultTreeConfig("noodlestack");
    const customized = {
      ...base,
      themeId: "ember" as const,
      topper: "crown" as const,
      shape: "spire" as const,
      scenery: "aurora" as const,
      avatar: "★",
      displayName: "Kai",
      prompt: "Drop your honest 2026 recap!",
      showGarland: false,
      pauseInbox: true,
    };

    const shareUrl = buildDesignShareUrl(
      "https://hoho.xo",
      "noodlestack",
      customized,
    );
    const parsedUrl = new URL(shareUrl);
    expect(parsedUrl.pathname).toBe("/t/noodlestack");

    const restored = parseDesignFromSearchParams(
      parsedUrl.searchParams,
      defaultTreeConfig("noodlestack"),
    );
    expect(restored.themeId).toBe("ember");
    expect(restored.topper).toBe("crown");
    expect(restored.shape).toBe("spire");
    expect(restored.scenery).toBe("aurora");
    expect(restored.avatar).toBe("★");
    expect(restored.displayName).toBe("Kai");
    expect(restored.prompt).toBe("Drop your honest 2026 recap!");
    expect(restored.showGarland).toBe(false);
    expect(restored.pauseInbox).toBe(true);

    const shortUrl = buildDesignShareUrl(
      "https://hoho.xo",
      "noodlestack",
      customized,
      { short: true },
    );
    expect(shortUrl).toBe("https://hoho.xo/t/noodlestack");
  });

  it("generates deterministic dense clouds with lights across all 4 silhouettes", () => {
    const matrix = createQrMatrix("https://hoho.xo/t/noodlestack");
    expect(matrix.ok).toBe(true);
    if (!matrix.ok) return;

    const classic = generateQrTreeCloud(matrix, "seed", {
      dense: true,
      shape: "classic",
    });
    const spire = generateQrTreeCloud(matrix, "seed", {
      dense: true,
      shape: "spire",
    });
    const compact = generateQrTreeCloud(matrix, "seed", {
      dense: false,
      shape: "classic",
    });

    expect(classic.length).toBeGreaterThan(compact.length);
    expect(spire).not.toEqual(classic);
    expect(classic.some((pt) => pt.isLight)).toBe(true);
    expect(
      classic.every((pt) => Number.isFinite(pt.nx) && Number.isFinite(pt.nz)),
    ).toBe(true);
  });

  it("preserves legacy createTreeGlyphTargets determinism", () => {
    expect(createTreeGlyphTargets(32, "https://example.com/tree")).toEqual(
      createTreeGlyphTargets(32, "https://example.com/tree"),
    );
  });
});

describe("moderation normalization and classification", () => {
  it("normalizes zero-width chars, diacritics, repeats, and leetspeak", () => {
    expect(normalizeForModeration("H\u200beelllooo 4$5")).toBe("heelloo ass");
  });

  it("rejects empty notes, URLs, emails, phone numbers, and owner muted words", () => {
    expect(classifyMessage("   ").decision).toBe("reject");
    expect(classifyMessage("visit https://spam.example.com").decision).toBe(
      "reject",
    );
    expect(classifyMessage("email me test@example.com").decision).toBe("reject");
    expect(classifyMessage("call +1 555-234-5678").decision).toBe("reject");
    expect(
      classifyMessage("Here is a big spoiler alert", "spam, spoiler").decision,
    ).toBe("reject");
  });

  it("allows benign notes and attaches caring self-harm notice without rejecting", () => {
    expect(classifyMessage("Happy holidays! Wishing you warmth.")).toEqual({
      decision: "allow",
      selfHarmNotice: false,
    });
    expect(classifyMessage("Sometimes I hurt myself when alone")).toEqual({
      decision: "allow",
      selfHarmNotice: true,
    });
  });
});

describe("Christmas music box and festive chime safety", () => {
  it("exposes 4 public-domain holiday tracks with valid frequencies and beats", () => {
    expect(CHRISTMAS_TRACKS).toHaveLength(4);
    for (const track of CHRISTMAS_TRACKS) {
      expect(track.title.length).toBeGreaterThan(2);
      expect(track.tempoBpm).toBeGreaterThanOrEqual(70);
      expect(track.notes.length).toBeGreaterThan(10);
      expect(
        track.notes.every(([freq, beats]) => freq >= 0 && beats > 0),
      ).toBe(true);
    }
  });

  it("handles SSR / missing AudioContext gracefully without throwing", () => {
    expect(isChristmasMusicPlaying()).toBe(false);
    expect(startChristmasMusic(0)).toBe(false);
    const first = getCurrentChristmasTrack();
    const second = nextChristmasTrack();
    expect(second.id).not.toBe(first.id);
    expect(() => playOrnamentChime("drop")).not.toThrow();
    expect(() => playOrnamentChime("qr")).not.toThrow();
    expect(() => stopChristmasMusic()).not.toThrow();
    // Reset track index back to track 0 cleanly
    while (getCurrentChristmasTrack().id !== first.id) {
      nextChristmasTrack();
    }
  });
});
