import * as Sentry from "@sentry/react";
import { RouterProvider } from "react-router-dom";
import { router } from "@/router";

function ErrorFallback() {
  return (
    <section className="shell page-hero page-hero--compact">
      <p className="section-eyebrow">Render failure</p>
      <h1>The page failed before it finished loading.</h1>
      <p>The browser error has been handed to Sentry when the DSN is configured.</p>
    </section>
  );
}

export default function App() {
  return (
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <RouterProvider router={router} />
    </Sentry.ErrorBoundary>
  );
}
