import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    testTimeout: 15000,
    // Test files share one remote (Neon) test database with no per-file
    // isolation — running files in parallel races truncate/insert calls
    // against each other (reproduced as resetDatabase.test.ts failing
    // intermittently under the default parallel file execution). Serialize
    // instead of building real DB isolation, since this project's test count
    // is small enough that the runtime cost is negligible.
    fileParallelism: false,
  },
});
