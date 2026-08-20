import type { ReactNode } from "react";
import clsx from "clsx";
import { Reveal } from "@/components/reveal";

type JourneySectionProps = {
  children: ReactNode;
  className?: string;
};

export function JourneySection({ children, className }: JourneySectionProps) {
  return <div className={clsx("journey", className)}>{children}</div>;
}

type JourneyStepProps = {
  index: number;
  eyebrow?: ReactNode;
  heading: ReactNode;
  body: ReactNode;
  media: ReactNode;
  reverse?: boolean;
  className?: string;
  children?: ReactNode;
};

export function JourneyStep({
  index,
  eyebrow,
  heading,
  body,
  media,
  reverse,
  className,
  children,
}: JourneyStepProps) {
  const isReversed = reverse ?? index % 2 === 0;
  const paddedIndex = String(index).padStart(2, "0");

  return (
    <Reveal
      className={clsx(
        "journey-step",
        isReversed && "journey-step--reverse",
        className,
      )}
    >
      <div className="journey-step__text">
        <p className="journey-step__index">{paddedIndex}</p>
        {eyebrow ? <p className="journey-step__eyebrow section-eyebrow">{eyebrow}</p> : null}
        <h3 className="journey-step__heading">{heading}</h3>
        <p className="journey-step__body">{body}</p>
        {children}
      </div>
      <div className="journey-step__media">{media}</div>
    </Reveal>
  );
}
