import path from "node:path";
import { fileURLToPath } from "node:url";
import { coverageConfigDefaults, defineConfig } from "vitest/config";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "src"),
      // Workers-only virtual module; stubbed for unit tests (wrangler provides the real one).
      "cloudflare:email": path.resolve(projectRoot, "worker/test/cloudflare-email-stub.ts"),
    },
  },
  test: {
    environment: "jsdom",
    /* Several suites shell out to real git, encrypt and restore real archives,
       or run the real prerender against dist/. Two rollback cases alone take
       ~40s each. Under the default 60s limit they pass in isolation and time
       out when 59 files compete for I/O, which reads as a broken suite on a
       fresh clone rather than a slow one. */
    testTimeout: 180_000,
    hookTimeout: 180_000,
    /* Vitest's default globs walk the whole repo, including gitignored working
       directories that happen to sit inside it. Both of these hold real `.test.ts`
       files that are not part of this project's suite:
         - `.floriva-private/` archives abandoned harnesses. Its tests pin
           package.json versions that have since moved on, so they fail on a
           clean checkout and hide genuine failures in the noise.
         - `.claude/worktrees/` holds agent checkouts of this same repo, which
           doubles every test and reports phantom failures from other branches.
       Neither is in git, so neither should be in the suite.

       The scripts .test.mjs entry below is excluded for a different reason:
       those are written against the `node:test` runner, not Vitest. Vitest's
       default glob matches .test.mjs, then fails at import because `node:test`
       needs a real file-scheme URL that the transform pipeline does not hand
       it. `pnpm test:scripts` runs them instead. */
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      ".floriva-private/**",
      ".claude/worktrees/**",
      "scripts/**/*.test.mjs",
    ],
    coverage: {
      provider: "v8",
      /* Naming `reporter` replaces the default array rather than extending it,
         so text and html have to be restated. json-summary is what
         scripts/portfolio-metrics.mjs reads, so a published coverage number
         always traces back to a real run. */
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./coverage",
      /* Coverage defaults to `all: true` with no include, which pulls in the
         449 generated modules under src/site/generated (~111k lines, one file
         of 5MB) and all of scripts/. That takes the run from minutes to tens
         of minutes and reports a percentage for a corpus nobody wrote. Scope
         it to hand-written application code instead. Build and audit tooling
         under scripts/ is measured separately; see portfolio/TESTING.md. */
      include: ["src/**/*.{ts,tsx}", "functions/**/*.ts", "worker/src/**/*.ts"],
      exclude: [
        ...coverageConfigDefaults.exclude,
        "src/site/generated/**",
        "src/site/content-manifest.ts",
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/pages/lazy-pages.tsx",
        "worker/test/**",
      ],
    },
  },
});
