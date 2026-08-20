import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { siteConfig } from "@/site/config";
import { buildResourcesMegamenuGroups } from "@/site/internal-links";

const RESOURCES_MENU_ID = "resources-megamenu";

export function SiteHeader() {
  const resourcesMegamenuGroups = buildResourcesMegamenuGroups();
  const resourcesMenuRef = useRef<HTMLDetailsElement>(null);
  const [resourcesMenuOpen, setResourcesMenuOpen] = useState(false);

  const closeResourcesMenu = (returnFocus: boolean) => {
    const menu = resourcesMenuRef.current;
    if (!menu || !menu.open) {
      return;
    }
    menu.open = false;
    if (returnFocus) {
      menu.querySelector<HTMLElement>("summary")?.focus();
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeResourcesMenu(true);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const menu = resourcesMenuRef.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) {
        closeResourcesMenu(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <NavLink className="brandmark" to="/">
          <img alt="Floriva" className="brandmark__logo" height={44} src="/logo-mark.png" width={44} />
          <span className="brandmark__copy">
            <span className="brandmark__name">{siteConfig.name}</span>
            <span className="brandmark__tag">{siteConfig.heroTrustSignal}</span>
          </span>
        </NavLink>

        <div className="site-header__actions">
          <nav className="site-nav" aria-label="Primary">
            {siteConfig.nav.map((item) => (
              item.href === "/resources" ? (
                <details
                  key={item.href}
                  className="site-nav__menu"
                  ref={resourcesMenuRef}
                  onToggle={(event) => setResourcesMenuOpen(event.currentTarget.open)}
                >
                  <summary
                    className="site-nav__link"
                    aria-controls={RESOURCES_MENU_ID}
                    aria-expanded={resourcesMenuOpen}
                  >
                    Resources
                  </summary>
                  <div
                    className="resources-megamenu"
                    id={RESOURCES_MENU_ID}
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest("a")) {
                        closeResourcesMenu(false);
                      }
                    }}
                  >
                    <div className="resources-megamenu__intro">
                      <p className="section-eyebrow">Resources</p>
                      <Link className="resources-megamenu__overview" to="/resources">
                        Floriva privacy resources
                      </Link>
                      <p>Every guide, comparison, state page, and download organized by search intent.</p>
                    </div>
                    <div className="resources-megamenu__groups">
                      {resourcesMegamenuGroups.map((group) => {
                        /* Group names are <p>, not <h2>/<h3>. The panel is present in the DOM of
                           every page, so headings here landed in every document outline above the
                           page's own <h1>. aria-labelledby keeps the grouping legible to screen
                           readers without polluting the outline. */
                        const headingId = `resources-megamenu-${group.heading.toLowerCase().replace(/\W+/g, "-")}`;
                        return (
                          <div key={group.heading} className="resources-megamenu__group">
                            <p className="resources-megamenu__group-heading" id={headingId}>
                              {group.heading}
                            </p>
                            <ul aria-labelledby={headingId} className="resources-megamenu__links">
                              {group.links.map((link) => (
                                <li key={link.href}>
                                  <Link to={link.href}>{link.label}</Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </details>
              ) : (
                <NavLink
                  key={item.href}
                  className={({ isActive }) => (isActive ? "site-nav__link is-active" : "site-nav__link")}
                  to={item.href}
                >
                  {item.label}
                </NavLink>
              )
            ))}
          </nav>
          <Link className="button-link button-link--primary site-header__cta" to="/get">
            Get the app
          </Link>
        </div>
      </div>
    </header>
  );
}
