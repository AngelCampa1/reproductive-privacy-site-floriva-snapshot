import { Link } from "react-router-dom";
import { siteConfig } from "@/site/config";
import { StoreButtons } from "@/components/store-buttons";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell site-footer__inner">
        <div className="site-footer__intro">
          <div className="site-footer__brand">
            <img alt="Floriva" className="site-footer__logo" height={48} src="/logo-mark.png" width={48} />
            <p className="section-eyebrow">Floriva</p>
          </div>
          <h2>{siteConfig.tagline}</h2>
          <p>{siteConfig.subheadline}</p>
          <StoreButtons compact />
        </div>

        <div className="site-footer__links">
          {siteConfig.footerGroups.map((group) => (
            <div key={group.heading}>
              <p className="footer-heading">{group.heading}</p>
              <ul className="footer-link-list">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link to={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="shell site-footer__meta">
        <p>Built for people who want their cycle history to stay on their own device, not on someone else's server.</p>
        <div className="site-footer__legal">
          {siteConfig.legalLinks.map((link) => (
            <Link key={link.href} to={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
