import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("PWA service worker privacy & offline shell", () => {
  it("keeps /api/ excluded from caching and provides static /offline.html fallback", () => {
    const swPath = path.resolve(process.cwd(), "public/sw.js");
    const offlinePath = path.resolve(process.cwd(), "public/offline.html");
    const sw = fs.readFileSync(swPath, "utf8");
    const offlineHtml = fs.readFileSync(offlinePath, "utf8");

    expect(sw).toContain('"/offline.html"');
    expect(sw).toContain('url.pathname.startsWith("/api/")');
    expect(sw).not.toContain('caches.match("/api/');
    expect(offlineHtml).toContain("Connection paused");
    expect(offlineHtml).not.toMatch(/https?:\/\//i);
  });
});
