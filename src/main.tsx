import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/app";
import { initSentry } from "@/site/sentry";
import "./index.css";

initSentry();

// Deliberately createRoot, not hydrateRoot. scripts/prerender-html.mjs emits
// hand-written markup (<main class="prerendered-page">) rather than React
// output, so hydration can never match App's tree and React would discard the
// server HTML anyway — at extra cost plus console errors. Switching to
// hydrateRoot requires the React-based prerender rewrite tracked in
// docs/superpowers/plans/route-equivalent-rendering-and-visual-quality.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
