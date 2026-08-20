import clsx from "clsx";

/**
 * Screen keys map 1:1 to generated asset basenames at
 * `/app-screens/{screen}-{402|804|1206}.{avif|webp}`. Assets are produced by
 * a separate pipeline and are not expected to exist on disk in this repo.
 */
export type DeviceScreen =
  | "today"
  | "calendar"
  | "insights"
  | "logging"
  | "privacy-settings"
  | "condition-aware"
  | "ttc-birth-control";

export type DeviceFrameProps = {
  screen: DeviceScreen;
  alt: string;
  /** Hero usage — loads eager + high priority instead of lazy. Default false. */
  priority?: boolean;
  className?: string;
};

/** Exact source aspect ratio for every generated screenshot. */
const SOURCE_WIDTH = 1206;
const SOURCE_HEIGHT = 2622;

const RESPONSIVE_WIDTHS = [402, 804, 1206] as const;

const DEFAULT_SIZES = "(max-width: 720px) 78vw, 380px";

function buildSrcSet(screen: DeviceScreen, format: "avif" | "webp") {
  return RESPONSIVE_WIDTHS.map(
    (width) => `/app-screens/${screen}-${width}.${format} ${width}w`,
  ).join(", ");
}

export function DeviceFrame({ screen, alt, priority = false, className }: DeviceFrameProps) {
  return (
    <div className={clsx("device-frame", className)}>
      <picture className="device-frame__picture">
        <source
          type="image/avif"
          srcSet={buildSrcSet(screen, "avif")}
          sizes={DEFAULT_SIZES}
        />
        <source
          type="image/webp"
          srcSet={buildSrcSet(screen, "webp")}
          sizes={DEFAULT_SIZES}
        />
        <img
          className="device-frame__screen"
          src={`/app-screens/${screen}-804.webp`}
          alt={alt}
          width={SOURCE_WIDTH}
          height={SOURCE_HEIGHT}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : undefined}
        />
      </picture>
    </div>
  );
}
