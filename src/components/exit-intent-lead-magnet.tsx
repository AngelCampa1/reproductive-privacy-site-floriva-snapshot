import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import {
  canShowLeadMagnetPopup,
  getLeadMagnetSuppression,
  leadMagnetPopupStorageKeys,
  readSuppressionValue,
} from "@/site/lead-magnet-popup";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { florivaKnowledge } from "@/site/knowledge";
import { selectLeadMagnetForPath } from "@/site/lead-magnets";

type SubmissionState = "idle" | "submitting" | "success" | "error";

function getLocalSuppression(key: string): number | null {
  try {
    return readSuppressionValue(window.localStorage, key);
  } catch {
    return null;
  }
}

function setLocalSuppression(key: string, value: number): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Storage access is optional; the popup still works without persistence.
  }
}

function hasSessionShown(): boolean {
  try {
    return window.sessionStorage.getItem(leadMagnetPopupStorageKeys.sessionShown) === "true";
  } catch {
    return false;
  }
}

function markSessionShown(): void {
  try {
    window.sessionStorage.setItem(leadMagnetPopupStorageKeys.sessionShown, "true");
  } catch {
    // Storage access is optional.
  }
}

export function ExitIntentLeadMagnet() {
  const location = useLocation();
  const copy = florivaKnowledge.leadMagnetUi.form;
  const resource = useMemo(() => selectLeadMagnetForPath(location.pathname), [location.pathname]);
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmissionState>("idle");
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const dismiss = useCallback(
    () => {
      setIsOpen(false);
      setLocalSuppression(leadMagnetPopupStorageKeys.dismissedUntil, getLeadMagnetSuppression("dismissed"));
    },
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined" || hasSessionShown()) {
      return;
    }

    const dismissedUntil = getLocalSuppression(leadMagnetPopupStorageKeys.dismissedUntil);
    const submittedUntil = getLocalSuppression(leadMagnetPopupStorageKeys.submittedUntil);

    if (!canShowLeadMagnetPopup({ pathname: location.pathname, dismissedUntil, submittedUntil })) {
      return;
    }

    let eligible = false;
    let lastScrollY = window.scrollY;
    const timer = window.setTimeout(() => {
      eligible = true;
    }, 10_000);

    const openPopup = () => {
      if (!eligible || hasSessionShown()) {
        return;
      }

      markSessionShown();
      setIsOpen(true);
    };

    const onMouseOut = (event: MouseEvent) => {
      if (event.clientY <= 4 && !event.relatedTarget) {
        openPopup();
      }
    };

    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
      const scrollingUp = window.scrollY < lastScrollY - 80 && window.scrollY > 240;
      lastScrollY = window.scrollY;

      if (progress >= 0.6 || scrollingUp) {
        openPopup();
      }
    };

    document.addEventListener("mouseout", onMouseOut);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("scroll", onScroll);
    };
  }, [location.pathname, resource.slug]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Move focus into the dialog, but to the panel rather than the email
    // field: focusing an input raises the software keyboard the instant the
    // popup appears, burying a near-full-height panel on a phone.
    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismiss();
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled])"),
      );
      const first = focusable[0];
      const last = focusable.at(-1);

      if (!first || !last) {
        return;
      }

      // The panel itself holds focus on open and is not in `focusable` (it is
      // tabindex="-1"), so it has to count as the leading boundary too —
      // otherwise Shift+Tab as the very first keystroke walks backward out of
      // the dialog and into the page behind the scrim.
      const atStart =
        document.activeElement === first || document.activeElement === dialogRef.current;

      if (event.shiftKey && atStart) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [dismiss, isOpen]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("submitting");
    setError("");

    const form = new FormData(event.currentTarget);
    const honeypot = String(form.get("company") ?? "");

    try {
      const response = await fetch("/api/lead-magnet/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          honeypot,
          leadMagnetSlug: resource.slug,
          sourcePath: location.pathname,
          turnstileToken,
        }),
      });

      if (!response.ok) {
        throw new Error("Subscription failed.");
      }

      setState("success");
      setLocalSuppression(leadMagnetPopupStorageKeys.submittedUntil, getLeadMagnetSuppression("submitted"));
    } catch {
      setState("error");
      setError(copy.errorMessage);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-labelledby="lead-magnet-title"
      aria-modal="true"
      className="lead-magnet-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          dismiss();
        }
      }}
      role="dialog"
    >
      <div ref={dialogRef} className="lead-magnet-modal__panel" tabIndex={-1}>
        <button
          aria-label={copy.closeLabel}
          className="lead-magnet-modal__close"
          onClick={dismiss}
          type="button"
        >
          &times;
        </button>
        <p className="section-eyebrow">{copy.popupEyebrow}</p>
        <h2 id="lead-magnet-title">{resource.title}</h2>
        <p>{resource.description}</p>

        {state === "success" ? (
          <div className="lead-magnet-modal__success" role="status">
            <h3>{copy.successHeading}</h3>
            <p>{copy.successBody}</p>
          </div>
        ) : (
          <form className="lead-magnet-modal__form" onSubmit={onSubmit}>
            <label htmlFor="lead-magnet-email">{copy.emailLabel}</label>
            <input
              autoComplete="email"
              id="lead-magnet-email"
              inputMode="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder={copy.placeholder}
              required
              type="email"
              value={email}
              aria-describedby={error ? "lead-magnet-modal-error" : undefined}
              aria-invalid={state === "error" ? true : undefined}
            />
            <label className="lead-magnet-modal__honeypot" htmlFor="lead-magnet-company">
              {copy.honeypotLabel}
              <input id="lead-magnet-company" name="company" tabIndex={-1} type="text" />
            </label>
            <TurnstileWidget onTokenChange={setTurnstileToken} />
            <button disabled={state === "submitting"} type="submit">
              {state === "submitting" ? copy.submittingLabel : copy.submitLabel}
            </button>
            {error ? (
              <p className="lead-magnet-modal__error" id="lead-magnet-modal-error" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
