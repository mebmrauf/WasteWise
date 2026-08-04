// Populates process.env from server/.env.test before any test file (and the
// application modules it imports, like src/lib/env.ts) is evaluated.
//
// server/.env.test.local (gitignored, not committed) is loaded after and
// overrides it — use it to point DATABASE_URL at a real Neon test database
// for running tests that need a live DB (e.g. tests/resetDatabase.test.ts)
// on your own machine.
import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, ".env.test") });

const localOverride = path.resolve(__dirname, ".env.test.local");
if (fs.existsSync(localOverride)) {
  dotenv.config({ path: localOverride, override: true });
}
