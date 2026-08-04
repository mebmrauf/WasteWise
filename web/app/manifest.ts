import type { MetadataRoute } from "next";
import { colors } from "@/lib/tokens";

// Colors pulled from lib/tokens.ts rather than hardcoded, per design-system.md.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WasteWise",
    short_name: "WasteWise",
    description:
      "WasteWise digitizes recycling logistics in Bangladesh — verified collectors, weight-verified pickups, real-time tracking, and complaint resolution for households, businesses, collectors, recycling companies, and municipalities.",
    start_url: "/",
    display: "standalone",
    background_color: colors.neutral[50],
    theme_color: colors.primary[600],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "32x32",
        type: "image/x-icon",
      },
    ],
  };
}
