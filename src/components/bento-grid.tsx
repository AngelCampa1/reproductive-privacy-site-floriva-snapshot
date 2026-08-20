import type { ReactNode } from "react";
import clsx from "clsx";

export type BentoCellSize = "sm" | "md" | "wide" | "tall";

export type BentoCellTone = "paper" | "berry-soft" | "moss-soft" | "canvas-deep";

export type BentoStat = {
  value: string;
  label: string;
};

type BentoGridProps = {
  children: ReactNode;
  className?: string;
};

export function BentoGrid({ children, className }: BentoGridProps) {
  return <div className={clsx("bento-grid", className)}>{children}</div>;
}

type BentoCellProps = {
  size?: BentoCellSize;
  eyebrow?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  stat?: BentoStat;
  tone?: BentoCellTone;
  className?: string;
  children?: ReactNode;
};

export function BentoCell({
  size = "sm",
  eyebrow,
  title,
  body,
  stat,
  tone = "paper",
  className,
  children,
}: BentoCellProps) {
  return (
    <article
      className={clsx(
        "bento-cell",
        `bento-cell--${size}`,
        `bento-cell--${tone}`,
        className,
      )}
    >
      {eyebrow ? <p className="bento-cell__eyebrow">{eyebrow}</p> : null}
      <h3 className="bento-cell__title">{title}</h3>
      {body ? <p className="bento-cell__body">{body}</p> : null}
      {stat ? (
        <p className="bento-cell__stat">
          <span className="bento-cell__stat-value">{stat.value}</span>
          <span className="bento-cell__stat-label">{stat.label}</span>
        </p>
      ) : null}
      {children}
    </article>
  );
}
