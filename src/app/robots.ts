import type { MetadataRoute } from "next";
import { getSiteOriginString } from "@/lib/site-origin";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOriginString();

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacy", "/terms"],
      disallow: ["/api/", "/t/"],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
