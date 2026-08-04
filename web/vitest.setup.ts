import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// vitest.config.mts sets `test.globals: false`, so @testing-library/react's
// built-in auto-cleanup (which detects the test framework via a global
// `afterEach`) never registers, and renders leak across tests in the same
// file. Wire it up explicitly here instead so every test file gets a clean
// DOM between tests without having to import `cleanup` itself.
afterEach(() => {
  cleanup();
});

// web/lib/env.ts computes an eager `publicEnv` singleton on import (so app
// code fails fast at build/render time). Tests that import anything from
// that module — even just the pure `loadPublicEnv` function — still trigger
// that top-level evaluation, so give it a valid ambient environment here.
// Individual tests exercise failure paths by calling `loadPublicEnv(...)`
// with an explicit fake source object instead of relying on process.env.
process.env.NEXT_PUBLIC_API_URL ||= "http://localhost:4000/api/v1";
