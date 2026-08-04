import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

// Public, indexable routes only — role dashboards behind auth should not be listed here.
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = publicEnv.NEXT_PUBLIC_APP_URL;

  return [
    {
      url: baseUrl,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${baseUrl}/signup`,
      changeFrequency: "yearly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/login`,
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];
}
