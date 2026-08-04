// WasteWise design tokens — typed export mirroring docs/design-system.md.
//
// This is the single source of truth consumed by web/tailwind.config.ts.
// Do NOT hand-edit tailwind.config.ts with literal values — add/change values here
// (and in docs/design-system.md) first, then let tailwind.config.ts reference them.

/** 10-step ramp used for the primary brand color and the neutral scale. */
export interface ColorRamp {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

/** Reduced 4-step ramp used for semantic colors and role accents (tint / base / dark / surface). */
export interface AccentRamp {
  50: string;
  500: string;
  700: string;
  900: string;
}

/** 3-step ramp used for category-only colors that don't need a dark "surface" shade. */
export interface CategoryRamp {
  50: string;
  500: string;
  700: string;
}

export const colors = {
  primary: {
    50: "#EAF3EE",
    100: "#D3E7DC",
    200: "#A8CFB9",
    300: "#7CB696",
    400: "#519E73",
    500: "#2F6B4F",
    600: "#275A42",
    700: "#1F4834",
    800: "#163627",
    900: "#0E2419",
  } satisfies ColorRamp,

  // NOTE (docs/design-system.md §1.2): `neutral-400` fails WCAG AA as a text color (2.88:1 on
  // white) — restrict it to non-text/decorative uses (icon-muted, disabled borders). Any
  // placeholder/disabled/caption *text* must use `neutral-500` (5.09:1 on white, passes AA)
  // or darker.
  neutral: {
    0: "#FFFFFF",
    50: "#F7F6F3",
    100: "#EEEDE8",
    200: "#DEDCD3",
    300: "#C4C1B6",
    400: "#9C988C",
    500: "#726E63",
    600: "#524F47",
    700: "#3A3833",
    800: "#262420",
    900: "#161512",
  },

  semantic: {
    success: { 50: "#E9F6EE", 500: "#3F8F5F", 700: "#256641" } satisfies CategoryRamp,
    warning: { 50: "#FCEEDA", 500: "#C2760F", 700: "#8A5209" } satisfies CategoryRamp,
    error: { 50: "#FBEAE8", 500: "#C6392F", 700: "#8F241C" } satisfies CategoryRamp,
    info: { 50: "#E8F1FA", 500: "#2C6FB0", 700: "#1E4E7D" } satisfies CategoryRamp,
  },

  /** One accent ramp per platform role. Each includes a `900` "surface" shade used for that
   * role's sidebar/app-shell background. */
  role: {
    user: { 50: "#EAF3EE", 500: "#2F6B4F", 700: "#1F4834", 900: "#0E2419" } satisfies AccentRamp,
    collector: { 50: "#F7ECE3", 500: "#B5652F", 700: "#82461E", 900: "#3D2413" } satisfies AccentRamp,
    recyclingCompany: { 50: "#E3F2F4", 500: "#1F7A8C", 700: "#14515D", 900: "#0D2E34" } satisfies AccentRamp,
    admin: { 50: "#EAEAF6", 500: "#4A4E9E", 700: "#33366E", 900: "#23244F" } satisfies AccentRamp,
  },

  /** Additional hue families that exist only to support waste-category chip colors — not
   * exposed as general-purpose brand/semantic colors. */
  categoryOnly: {
    slate: { 50: "#E9EBEE", 500: "#5B6472", 700: "#3F4653" } satisfies CategoryRamp,
    violet: { 50: "#F1E9F7", 500: "#7C4FA6", 700: "#6B3F94" } satisfies CategoryRamp,
  },
} as const;

/** Waste-category chip colors. Deliberately a separate namespace from `colors.role` — see
 * docs/design-system.md §1.5 for why `organic` and `glass` intentionally reuse other ramps. */
export const wasteCategoryColors = {
  plastic: { bg: colors.semantic.info[50], text: colors.semantic.info[700] },
  paper: { bg: colors.semantic.warning[50], text: colors.semantic.warning[700] },
  organic: { bg: colors.primary[50], text: colors.primary[700] },
  glass: { bg: colors.role.recyclingCompany[50], text: colors.role.recyclingCompany[700] },
  metal: { bg: colors.categoryOnly.slate[50], text: colors.categoryOnly.slate[700] },
  eWaste: { bg: colors.categoryOnly.violet[50], text: colors.categoryOnly.violet[700] },
} as const;

export const fontFamily = {
  heading: ["Space Grotesk", "Segoe UI", "sans-serif"],
  body: ["Inter", "system-ui", "-apple-system", "sans-serif"],
  data: ["IBM Plex Mono", "SFMono-Regular", "ui-monospace", "monospace"],
} as const;

interface TypeStyle {
  fontSize: string; // rem
  lineHeight: string; // px
  fontWeight: number;
  letterSpacing?: string;
  textTransform?: "uppercase";
}

export const typeScale = {
  // Headings & eyebrows — Space Grotesk
  overline: { fontSize: "0.75rem", lineHeight: "16px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" } satisfies TypeStyle,
  display: { fontSize: "2.5rem", lineHeight: "48px", fontWeight: 700 } satisfies TypeStyle,
  h1: { fontSize: "2rem", lineHeight: "40px", fontWeight: 700 } satisfies TypeStyle,
  h2: { fontSize: "1.5rem", lineHeight: "32px", fontWeight: 600 } satisfies TypeStyle,
  h3: { fontSize: "1.25rem", lineHeight: "28px", fontWeight: 600 } satisfies TypeStyle,
  h4: { fontSize: "1.125rem", lineHeight: "26px", fontWeight: 600 } satisfies TypeStyle,

  // Body — Inter
  bodyLg: { fontSize: "1.125rem", lineHeight: "28px", fontWeight: 400 } satisfies TypeStyle,
  body: { fontSize: "1rem", lineHeight: "24px", fontWeight: 400 } satisfies TypeStyle,
  bodySm: { fontSize: "0.875rem", lineHeight: "20px", fontWeight: 400 } satisfies TypeStyle,
  label: { fontSize: "0.8125rem", lineHeight: "18px", fontWeight: 500 } satisfies TypeStyle,
  caption: { fontSize: "0.75rem", lineHeight: "16px", fontWeight: 500 } satisfies TypeStyle,

  // Data / numeric — IBM Plex Mono
  dataXl: { fontSize: "1.75rem", lineHeight: "32px", fontWeight: 600 } satisfies TypeStyle,
  dataLg: { fontSize: "1.25rem", lineHeight: "26px", fontWeight: 600 } satisfies TypeStyle,
  dataBase: { fontSize: "0.9375rem", lineHeight: "22px", fontWeight: 500 } satisfies TypeStyle,
  dataSm: { fontSize: "0.8125rem", lineHeight: "18px", fontWeight: 500 } satisfies TypeStyle,
} as const;

/** 4px base grid — deliberately a restricted subset, not the full arithmetic range.
 * NOTE: there is no `px` (1px) step here, which means Tailwind's implicit `px` spacing key
 * (used by `h-px`/`w-px`) is unavailable once this object fully replaces `theme.spacing` in
 * tailwind.config.ts. Hairline dividers must use `border-t`/`border`/`borderWidth` utilities
 * instead — see docs/design-system.md §3 and §9. */
export const spacing = {
  0: "0px",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
  24: "96px",
} as const;

export const borderRadius = {
  none: "0px",
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  "2xl": "24px",
  full: "9999px",
} as const;

export const boxShadow = {
  none: "none",
  sm: "0 1px 2px rgba(22,21,18,0.06)",
  md: "0 4px 12px rgba(22,21,18,0.08)",
  lg: "0 12px 32px rgba(22,21,18,0.12)",
  focus: "0 0 0 3px rgba(47,107,79,0.35)",
} as const;

/** Standard Tailwind breakpoint defaults — kept as-is, see docs/design-system.md §7. */
export const screens = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

/** Content max-width used inside the `xl` container — see docs/design-system.md §3. */
export const contentMaxWidth = "1280px";

/** Narrow reading-width container for form-heavy/settings-style pages (profile, account
 * settings, single-record edit screens) — see docs/design-system.md §3. Matches Tailwind's
 * stock `max-w-2xl` value (672px), but is now a named, documented token rather than an ad hoc
 * default. */
export const formMaxWidth = "672px";

/** Dashboard app-shell nav dimensions — see docs/design-system.md §6.4 (264px desktop
 * sidebar, 72px tablet icon-only rail). Neither sits on the 4px spacing grid (§3), so — like
 * `contentMaxWidth`/`formMaxWidth` above — these are named tokens rather than arbitrary
 * Tailwind values in a component file. Wired into `tailwind.config.ts` as `width`/`minWidth`
 * extensions (`w-sidebar`, `w-rail`). */
export const layout = {
  sidebarWidth: "264px",
  navRailWidth: "72px",
} as const;

/** Icon sizes (Lucide, see docs/design-system.md §6.5). Not a Tailwind core-plugin concept,
 * so this is exported for direct use by the shared `<Icon>` wrapper rather than wired into
 * tailwind.config.ts. */
export const iconSize = {
  sm: "16px",
  md: "20px",
  lg: "24px",
} as const;

/** Default Lucide stroke width — see docs/design-system.md §6.5. Set once on the shared
 * `<Icon>` wrapper; never override per-instance. */
export const iconStrokeWidth = 1.75;

export const tokens = {
  colors,
  wasteCategoryColors,
  fontFamily,
  typeScale,
  spacing,
  borderRadius,
  boxShadow,
  screens,
  contentMaxWidth,
  formMaxWidth,
  layout,
  iconSize,
  iconStrokeWidth,
} as const;

export type Tokens = typeof tokens;
export default tokens;
