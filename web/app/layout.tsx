import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { publicEnv } from "@/lib/env";

// Each font is exposed as a CSS custom property so Tailwind's font-heading/font-body/font-data
// utilities (tailwind.config.ts) can reference it — weights match design-system.md §2.1.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-data",
  display: "swap",
});

export const metadata: Metadata = {
  // Without this, Next.js silently falls back to localhost:3000 for relative OG/Twitter image URLs in production.
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_APP_URL),
  title: "WasteWise",
  description: "Digital recycling logistics platform for Bangladesh",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${ibmPlexMono.variable}`}
    >
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
