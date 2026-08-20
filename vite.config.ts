import path from "node:path";
import { fileURLToPath } from "node:url";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, "");
  const shouldUploadSourcemaps = Boolean(
    env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT,
  );
  const sentryPlugin =
    shouldUploadSourcemaps
      ? [
          sentryVitePlugin({
            authToken: env.SENTRY_AUTH_TOKEN,
            org: env.SENTRY_ORG,
            project: env.SENTRY_PROJECT,
            telemetry: false,
            sourcemaps: {
              assets: "./dist/assets/**",
            },
          }),
        ]
      : [];

  return {
    plugins: [react(), ...sentryPlugin],
    resolve: {
      alias: {
        "@": path.resolve(projectRoot, "src"),
      },
    },
    build: {
      modulePreload: false,
      sourcemap: shouldUploadSourcemaps ? "hidden" : false,
    },
  };
});
