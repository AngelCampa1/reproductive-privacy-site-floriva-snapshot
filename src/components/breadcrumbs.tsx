import { Link } from "react-router-dom";
import { buildCrumbs } from "@/components/breadcrumbs-utils";

type BreadcrumbsProps = {
  pathname: string;
  overrides?: Record<string, string>;
};

export function Breadcrumbs({ pathname, overrides }: BreadcrumbsProps) {
  const crumbs = buildCrumbs(pathname, overrides);

  if (crumbs.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <ol>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <li key={crumb.to} className="breadcrumbs__item">
              {isLast ? (
                <span aria-current="page">{crumb.label}</span>
              ) : (
                <Link to={crumb.to}>{crumb.label}</Link>
              )}
              {!isLast ? <span aria-hidden="true" className="breadcrumbs__sep">/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
