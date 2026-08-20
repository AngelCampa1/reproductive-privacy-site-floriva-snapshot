import { useEffect, useId, useRef } from "react";
import { turnstileSiteKey } from "@/components/turnstile-config";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          callback: (token: string) => void;
          "error-callback": () => void;
          "expired-callback": () => void;
          sitekey: string;
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";

type TurnstileWidgetProps = {
  onTokenChange: (token: string) => void;
};

function loadTurnstileScript(): void {
  if (document.getElementById(TURNSTILE_SCRIPT_ID)) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.defer = true;
  script.id = TURNSTILE_SCRIPT_ID;
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  document.head.append(script);
}

export function TurnstileWidget({ onTokenChange }: TurnstileWidgetProps) {
  const id = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!turnstileSiteKey || !containerRef.current) {
      return;
    }

    let cancelled = false;
    let widgetId: string | null = null;
    let timer: number | undefined;

    loadTurnstileScript();

    const render = () => {
      if (cancelled || widgetId || !containerRef.current) {
        return;
      }

      if (!window.turnstile) {
        timer = window.setTimeout(render, 100);
        return;
      }

      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: turnstileSiteKey,
        callback: onTokenChange,
        "expired-callback": () => onTokenChange(""),
        "error-callback": () => onTokenChange(""),
      });
    };

    render();

    return () => {
      cancelled = true;
      onTokenChange("");

      if (timer) {
        window.clearTimeout(timer);
      }

      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
    };
  }, [onTokenChange]);

  if (!turnstileSiteKey) {
    return null;
  }

  return <div id={id} ref={containerRef} className="lead-magnet-modal__turnstile" />;
}
