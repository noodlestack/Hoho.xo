const PLACEHOLDER_HOSTS = new Set(["your-domain.example", "hoho.xo"]);

/** Resolves the configured canonical site origin URL for metadata, sitemaps, and structured data. */
export function getSiteOriginUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (!PLACEHOLDER_HOSTS.has(parsed.hostname.toLowerCase())) {
        return new URL(parsed.origin);
      }
    } catch {
      // Ignore invalid URL and fall back safely below
    }
  }

  return process.env.NODE_ENV === "production"
    ? new URL("https://hoho-xo.vercel.app")
    : new URL("http://localhost:3000");
}

/** Returns the canonical origin without a trailing slash (e.g. "https://hoho-xo.vercel.app"). */
export function getSiteOriginString(): string {
  return getSiteOriginUrl().origin;
}
