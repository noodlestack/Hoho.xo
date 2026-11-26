import type { MetadataRoute } from "next";
import { getSiteOriginString } from "@/lib/site-origin";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOriginString();
  const lastModified = new Date();

  return [
    {
      url: `${origin}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${origin}/privacy`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${origin}/terms`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
