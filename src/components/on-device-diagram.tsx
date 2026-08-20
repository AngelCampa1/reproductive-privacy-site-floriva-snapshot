import type { ReactNode } from "react";
import clsx from "clsx";

type OnDeviceDiagramProps = {
  className?: string;
  caption?: ReactNode;
};

const DIAGRAM_DESCRIPTION =
  "Diagram: a phone holds a small grid of cycle log marks and a lock badge, labeled Stays on your phone. " +
  "A dashed line toward a faint cloud outline is broken by an X, and the cloud is labeled No cloud account.";

/**
 * Static, inline-SVG illustration of Floriva's local-first architecture: cycle
 * data stays inside a phone; the line out to a cloud/server is drawn broken.
 */
export function OnDeviceDiagram({ className, caption }: OnDeviceDiagramProps) {
  return (
    <figure className={clsx("on-device-diagram", className)}>
      <svg
        className="on-device-diagram__svg"
        viewBox="0 0 480 280"
        role="img"
        aria-label={DIAGRAM_DESCRIPTION}
      >
        {/* Broken connection: dashed segments with a berry break mark */}
        <g className="on-device-diagram__link">
          <line x1="172" y1="122" x2="210" y2="112" />
          <line x1="246" y1="100" x2="300" y2="90" />
        </g>
        <g className="on-device-diagram__break">
          <line x1="221" y1="99" x2="235" y2="113" />
          <line x1="235" y1="99" x2="221" y2="113" />
        </g>

        {/* Cloud / server, drawn faint and unconnected */}
        <g className="on-device-diagram__cloud" transform="translate(290, 40)">
          <path d="M30,70 Q10,70 10,50 Q10,32 28,30 Q30,12 50,14 Q56,0 74,4 Q92,-4 104,10 Q124,8 128,28 Q145,30 140,50 Q140,70 118,70 Z" />
        </g>
        <text x="365" y="150" textAnchor="middle" className="on-device-diagram__cloud-label">
          No cloud account
        </text>

        {/* Phone containing the local data cluster */}
        <rect
          className="on-device-diagram__phone"
          x="40"
          y="24"
          width="132"
          height="196"
          rx="24"
        />
        <rect
          className="on-device-diagram__screen"
          x="58"
          y="44"
          width="96"
          height="140"
          rx="10"
        />

        <g className="on-device-diagram__marks">
          <circle className="on-device-diagram__mark on-device-diagram__mark--berry" cx="74" cy="66" r="6" />
          <circle className="on-device-diagram__mark on-device-diagram__mark--berry" cx="98" cy="66" r="6" />
          <circle className="on-device-diagram__mark on-device-diagram__mark--rule" cx="122" cy="66" r="6" />
          <circle className="on-device-diagram__mark on-device-diagram__mark--moss" cx="146" cy="66" r="6" />

          <circle className="on-device-diagram__mark on-device-diagram__mark--moss" cx="74" cy="96" r="6" />
          <circle className="on-device-diagram__mark on-device-diagram__mark--rule" cx="98" cy="96" r="6" />
          <circle className="on-device-diagram__mark on-device-diagram__mark--berry" cx="122" cy="96" r="6" />
          <circle className="on-device-diagram__mark on-device-diagram__mark--rule" cx="146" cy="96" r="6" />

          <circle className="on-device-diagram__mark on-device-diagram__mark--rule" cx="74" cy="126" r="6" />
          <circle className="on-device-diagram__mark on-device-diagram__mark--moss" cx="98" cy="126" r="6" />
          <circle className="on-device-diagram__mark on-device-diagram__mark--moss" cx="122" cy="126" r="6" />
          <circle className="on-device-diagram__mark on-device-diagram__mark--berry" cx="146" cy="126" r="6" />

          <circle className="on-device-diagram__mark on-device-diagram__mark--berry" cx="74" cy="156" r="6" />
          <circle className="on-device-diagram__mark on-device-diagram__mark--rule" cx="98" cy="156" r="6" />
          <circle className="on-device-diagram__mark on-device-diagram__mark--rule" cx="122" cy="156" r="6" />
          <circle className="on-device-diagram__mark on-device-diagram__mark--moss" cx="146" cy="156" r="6" />
        </g>

        <rect className="on-device-diagram__today" x="74" y="170" width="72" height="6" rx="3" />

        {/* Lock badge */}
        <circle className="on-device-diagram__badge" cx="172" cy="204" r="18" />
        <circle className="on-device-diagram__badge-keyhole" cx="172" cy="199" r="3.2" />
        <rect className="on-device-diagram__badge-keyhole" x="169" y="201" width="6" height="8" rx="1.5" />

        {/* Label pill */}
        <rect className="on-device-diagram__pill" x="22" y="234" width="168" height="34" rx="17" />
        <text x="106" y="256" textAnchor="middle" className="on-device-diagram__pill-label">
          Stays on your phone
        </text>
      </svg>
      {caption ? <figcaption className="on-device-diagram__caption">{caption}</figcaption> : null}
    </figure>
  );
}
