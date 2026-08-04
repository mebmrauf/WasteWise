import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Mirrors the `@/*` -> `./*` path alias declared in tsconfig.json. tsc/Next.js
// already resolve this via tsconfig `paths`; Vitest's Vite-based resolver
// needs it declared explicitly too, so components can use `@/lib/...`
// imports (per Next.js convention) and still be unit-testable.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": dirname,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["__tests__/**/*.test.{ts,tsx}"],
    globals: false,
  },
});
