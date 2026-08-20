import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

/* Single stagger increment for every Reveal grid across the site (hub-page,
   home-page, static-pages). Call sites used three different increments
   (50/60ms) before this — multiply by `index` (or `index % n` for a
   grid that wraps) to build a per-item delay. */
export const REVEAL_STAGGER_MS = 60;

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia(reducedMotionQuery).matches;
}

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(() => prefersReducedMotion());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(reducedMotionQuery);
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setVisible(true);
      }
    };

    // Safari < 14 only supports the deprecated addListener/removeListener
    // pair; addEventListener is preferred where available.
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", onChange);
    } else {
      mediaQuery.addListener(onChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", onChange);
      } else {
        mediaQuery.removeListener(onChange);
      }
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={clsx("reveal", visible && "reveal--visible", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
