import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { ExitIntentLeadMagnet } from "@/components/exit-intent-lead-magnet";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function SiteShell() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    window.scrollTo(0, 0);

    if (hasMountedRef.current) {
      mainRef.current?.focus({ preventScroll: true });
    } else {
      hasMountedRef.current = true;
    }
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <SiteHeader />
      <main ref={mainRef} className="app-main" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <SiteFooter />
      <ExitIntentLeadMagnet />
    </div>
  );
}
