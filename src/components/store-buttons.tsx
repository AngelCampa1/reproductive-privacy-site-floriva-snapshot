import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  defaultStoreRedirectAvailability,
  getStoreRedirectAvailability,
  getStoreRedirectHref,
  storeTargets,
  type StoreRedirectAvailability,
  type StoreTargetKey,
} from "@/site/store-targets";

/* Brand pills, not official badge artwork: Apple/Google badge SVGs can't be
   reshaped into pill geometry under their brand terms, so live store links
   render as our own solid pills (icon + two-line label) instead. Apple's
   guidelines still ask for the App Store link to appear first when both are
   shown. */
const STORE_ORDER: readonly StoreTargetKey[] = ["ios", "android"];

const storePillCopy: Record<StoreTargetKey, { eyebrow: string }> = {
  ios: { eyebrow: "Download on the" },
  android: { eyebrow: "Get it on" },
};

function AppleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="store-pill__icon"
      viewBox="0 0 384 512"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="currentColor"
        d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"
      />
    </svg>
  );
}

function GooglePlayIcon() {
  return (
    <svg
      aria-hidden="true"
      className="store-pill__icon"
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#34a853"
        d="M71 30.6 318.4 256 71 481.4c-7-4.6-11-12.6-11-22.6V53.2c0-10 4-18 11-22.6z"
      />
      <path
        fill="#4285f4"
        d="M381.2 192.6 318.4 256l62.8 63.4 73.4-42.3c19.5-11.2 19.5-39 0-50.2z"
      />
      <path
        fill="#fbbc04"
        d="M381.2 319.4 318.4 256 71 481.4c7.6 5 17.5 5.6 26.7.4z"
      />
      <path
        fill="#ea4335"
        d="M97.7 30.2C88.5 25 78.6 25.6 71 30.6L318.4 256l62.8-63.4z"
      />
    </svg>
  );
}

type StorePillLinkProps = {
  targetKey: StoreTargetKey;
  href: string;
};

function StorePillLink({ targetKey, href }: StorePillLinkProps) {
  const target = storeTargets[targetKey];
  const { eyebrow } = storePillCopy[targetKey];

  return (
    <a
      aria-label={target.label}
      className={clsx("store-pill", `store-pill--${targetKey}`)}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {targetKey === "ios" ? <AppleIcon /> : <GooglePlayIcon />}
      <span className="store-pill__text">
        <span className="store-pill__eyebrow">{eyebrow}</span>
        <span className="store-pill__store">{target.shortLabel}</span>
      </span>
    </a>
  );
}

type StoreButtonsProps = {
  className?: string;
  compact?: boolean;
};

export function StoreButtons({ className, compact = false }: StoreButtonsProps) {
  const [availability, setAvailability] = useState<StoreRedirectAvailability>(
    defaultStoreRedirectAvailability,
  );

  useEffect(() => {
    let cancelled = false;

    void getStoreRedirectAvailability().then((nextAvailability) => {
      if (!cancelled) {
        setAvailability(nextAvailability);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={clsx("store-buttons", compact && "store-buttons--compact", className)}>
      {STORE_ORDER.map((targetKey) => {
        const target = storeTargets[targetKey];
        const isLive = availability[target.key];

        if (!isLive) {
          return (
            <button
              key={target.key}
              className="store-button store-button--muted"
              type="button"
            >
              <span className="store-button__eyebrow">{target.shortLabel}</span>
              <span className="store-button__title">{target.label}</span>
              <span className="store-button__meta">Coming soon</span>
            </button>
          );
        }

        return (
          <StorePillLink
            key={target.key}
            href={getStoreRedirectHref(target.key)}
            targetKey={target.key}
          />
        );
      })}
    </div>
  );
}
