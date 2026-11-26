import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { getSiteOriginString } from "@/lib/site-origin";

describe("SEO & crawlability routes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolves NEXT_PUBLIC_SITE_URL cleanly and rejects placeholders", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://hoho-xo.vercel.app/");
    expect(getSiteOriginString()).toBe("https://hoho-xo.vercel.app");

    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://your-domain.example");
    vi.stubEnv("NODE_ENV", "production");
    expect(getSiteOriginString()).toBe("https://hoho-xo.vercel.app");
  });

  it("exposes sitemap URL and blocks /api/ and /t/ in robots.txt", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://hoho-xo.vercel.app");
    const cfg = robots();
    expect(cfg.sitemap).toBe("https://hoho-xo.vercel.app/sitemap.xml");
    const rule = Array.isArray(cfg.rules) ? cfg.rules[0] : cfg.rules;
    expect(rule.disallow).toContain("/api/");
    expect(rule.disallow).toContain("/t/");
  });

  it("lists only public indexable routes in sitemap.xml", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://hoho-xo.vercel.app");
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toEqual([
      "https://hoho-xo.vercel.app/",
      "https://hoho-xo.vercel.app/privacy",
      "https://hoho-xo.vercel.app/terms",
    ]);
    for (const url of urls) {
      expect(url).not.toContain("/api/");
      expect(url).not.toContain("/t/");
    }
  });
});
