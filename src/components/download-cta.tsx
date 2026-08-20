import { useId } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { Reveal } from "@/components/reveal";
import { StoreButtons } from "@/components/store-buttons";
import { florivaKnowledge } from "@/site/knowledge";

export type DownloadCtaVariant =
  | "default"
  | "state"
  | "compare"
  | "guide"
  | "lead-magnet"
  | "static";

const VARIANT_COPY = florivaKnowledge.ctas.download;

type DownloadCtaProps = {
  variant?: DownloadCtaVariant;
  eyebrow?: string;
  headline?: string;
  body?: string;
  leadMagnetSlug?: string;
  leadMagnetLabel?: string;
  className?: string;
};

export function DownloadCta({
  variant = "default",
  eyebrow,
  headline,
  body,
  leadMagnetSlug,
  leadMagnetLabel,
  className,
}: DownloadCtaProps) {
  const headingId = useId();
  const copy = VARIANT_COPY[variant];
  const resolvedSlug = leadMagnetSlug ?? copy.leadMagnetSlug;
  const resolvedLabel = leadMagnetLabel ?? copy.leadMagnetLabel;

  return (
    <section
      aria-labelledby={headingId}
      className={clsx("shell download-cta", `download-cta--${variant}`, className)}
    >
      <Reveal>
        <p className="section-eyebrow">{eyebrow ?? copy.eyebrow}</p>
        <h2 id={headingId}>{headline ?? copy.headline}</h2>
        <p className="download-cta__body">{body ?? copy.body}</p>
        <StoreButtons className="download-cta__store-buttons" />
        <Link className="download-cta__lead-link" to={`/free/${resolvedSlug}`}>
          {resolvedLabel}
        </Link>
      </Reveal>
    </section>
  );
}
