import type { Config } from "tailwindcss";
import {
  colors,
  wasteCategoryColors,
  fontFamily,
  spacing,
  borderRadius,
  boxShadow,
  screens,
  contentMaxWidth,
  formMaxWidth,
  layout,
  mapHeight,
} from "./lib/tokens";

// Wired directly to docs/design-system.md via web/lib/tokens.ts — the single source of
// truth for every design token in this project. Do NOT add literal color/spacing/radius
// values below. If a token is missing, add it to lib/tokens.ts (and docs/design-system.md)
// first, then reference it here.

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    screens,
    // Full override (not `extend`) — see docs/design-system.md §3: the 4px-grid
    // spacing scale is deliberately restricted, and merging it under
    // `extend.spacing` would leave Tailwind's default fractional keys (0.5,
    // 1.5, 2.5, 3.5, ...) available, which are exactly the off-grid values
    // this scale exists to make impossible. Only the documented steps in
    // `tokens.spacing` are valid spacing utilities project-wide.
    // CONSEQUENCE (docs/design-system.md §3/§9): this override also removes Tailwind's
    // implicit `px` (1px) key, so `h-px`/`w-px` resolve to nothing here. Hairline dividers
    // must use `border-t`/`border-b`/`border` (Tailwind's separate `borderWidth` scale)
    // instead, never `h-px`/`w-px`.
    spacing,
    extend: {
      colors: {
        primary: colors.primary,
        neutral: colors.neutral,
        success: colors.semantic.success,
        warning: colors.semantic.warning,
        error: colors.semantic.error,
        info: colors.semantic.info,
        // Role accents — one per WasteWise role, see docs/design-system.md §1.4
        "role-user": colors.role.user,
        "role-collector": colors.role.collector,
        "role-recycler": colors.role.recyclingCompany,
        "role-admin": colors.role.admin,
        // Category-only hue families that back waste-category chips, see §1.5
        slate: colors.categoryOnly.slate,
        violet: colors.categoryOnly.violet,
        // Waste-category chip bg/text pairs, e.g. bg-category-plastic-bg text-category-plastic-text
        "category-plastic": { bg: wasteCategoryColors.plastic.bg, text: wasteCategoryColors.plastic.text },
        "category-paper": { bg: wasteCategoryColors.paper.bg, text: wasteCategoryColors.paper.text },
        "category-organic": { bg: wasteCategoryColors.organic.bg, text: wasteCategoryColors.organic.text },
        "category-glass": { bg: wasteCategoryColors.glass.bg, text: wasteCategoryColors.glass.text },
        "category-metal": { bg: wasteCategoryColors.metal.bg, text: wasteCategoryColors.metal.text },
        "category-ewaste": { bg: wasteCategoryColors.eWaste.bg, text: wasteCategoryColors.eWaste.text },
      },
      // `var(--font-*)` is populated by next/font in web/app/layout.tsx; the remaining entries
      // are the fallback stack from web/lib/tokens.ts (docs/design-system.md §2.1), unchanged.
      fontFamily: {
        heading: ["var(--font-heading)", ...fontFamily.heading.slice(1)],
        body: ["var(--font-body)", ...fontFamily.body.slice(1)],
        data: ["var(--font-data)", ...fontFamily.data.slice(1)],
      },
      fontSize: {
        // Headings & eyebrows — Space Grotesk (see docs/design-system.md §2.2)
        overline: ["0.75rem", { lineHeight: "16px", fontWeight: "600", letterSpacing: "0.08em" }],
        display: ["2.5rem", { lineHeight: "48px", fontWeight: "700" }],
        h1: ["2rem", { lineHeight: "40px", fontWeight: "700" }],
        h2: ["1.5rem", { lineHeight: "32px", fontWeight: "600" }],
        h3: ["1.25rem", { lineHeight: "28px", fontWeight: "600" }],
        h4: ["1.125rem", { lineHeight: "26px", fontWeight: "600" }],
        // Body — Inter
        "body-lg": ["1.125rem", { lineHeight: "28px", fontWeight: "400" }],
        body: ["1rem", { lineHeight: "24px", fontWeight: "400" }],
        "body-sm": ["0.875rem", { lineHeight: "20px", fontWeight: "400" }],
        label: ["0.8125rem", { lineHeight: "18px", fontWeight: "500" }],
        caption: ["0.75rem", { lineHeight: "16px", fontWeight: "500" }],
        // Data / numeric — IBM Plex Mono
        "data-xl": ["1.75rem", { lineHeight: "32px", fontWeight: "600" }],
        "data-lg": ["1.25rem", { lineHeight: "26px", fontWeight: "600" }],
        "data-base": ["0.9375rem", { lineHeight: "22px", fontWeight: "500" }],
        "data-sm": ["0.8125rem", { lineHeight: "18px", fontWeight: "500" }],
      },
      borderRadius,
      boxShadow,
      maxWidth: {
        content: contentMaxWidth,
        // Narrow reading-width container for form-heavy/settings-style pages (profile,
        // account settings, single-record edit screens) — see docs/design-system.md §3.
        // Use `max-w-form` instead of reaching for Tailwind's stock `max-w-2xl`.
        form: formMaxWidth,
      },
      // Dashboard app-shell nav dimensions — see docs/design-system.md §6.4.
      // `w-sidebar` = desktop fixed sidebar (264px), `w-rail` = tablet
      // icon-only collapsed rail (72px).
      width: {
        sidebar: layout.sidebarWidth,
        rail: layout.navRailWidth,
      },
      minWidth: {
        sidebar: layout.sidebarWidth,
        rail: layout.navRailWidth,
      },
      // Same tokens, reused so dashboard-shell content wrappers can offset
      // around the fixed sidebar/rail (`lg:pl-sidebar`, `md:pl-rail`).
      padding: {
        sidebar: layout.sidebarWidth,
        rail: layout.navRailWidth,
      },
      margin: {
        sidebar: layout.sidebarWidth,
        rail: layout.navRailWidth,
      },
      // Large-media block height (currently just `Map`) — see docs/design-system.md §9.
      // `h-map` = base/mobile/tablet height (320px), `h-map-lg` = height from `lg` up (448px).
      height: {
        map: mapHeight.DEFAULT,
        "map-lg": mapHeight.lg,
      },
    },
  },
  plugins: [],
};

export default config;
