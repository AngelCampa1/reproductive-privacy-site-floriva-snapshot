import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { DownloadCta } from "@/components/download-cta";
import { REVEAL_STAGGER_MS, Reveal } from "@/components/reveal";
import { StoreButtons } from "@/components/store-buttons";
import { florivaKnowledge, type StaticKnowledgePage } from "@/site/knowledge";
import { Meta } from "@/site/meta";

type StaticPageLayoutProps = {
  children: ReactNode;
  description: string;
  title: string;
  showDownloadCta?: boolean;
};

function StaticPageLayout({ children, description, title, showDownloadCta = true }: StaticPageLayoutProps) {
  return (
    <>
      <Meta description={description} title={title} />
      <section className="shell page-hero page-hero--compact">
        <Reveal>
          <h1>{title}</h1>
          <p>{description}</p>
        </Reveal>
      </section>
      <section className="shell static-page-body">
        <Reveal>{children}</Reveal>
      </section>
      {showDownloadCta ? <DownloadCta variant="static" /> : null}
    </>
  );
}

function renderSupportBody(body: string): ReactNode {
  const email = florivaKnowledge.contact.publicEmail;
  const segments = body.split("support");
  return segments.flatMap((segment, index) =>
    index === 0
      ? [segment]
      : [
          <a key={`mail-${index}`} className="text-link" href={`mailto:${email}`}>
            {email}
          </a>,
          segment,
        ],
  );
}

function KnowledgePageBody({ page }: { page: StaticKnowledgePage }) {
  return (
    <article className="article-prose">
      {page.sections.map((section, index) => (
        <section id={section.id} key={`${section.heading ?? "section"}-${index}`}>
          {section.heading ? <h2>{section.heading}</h2> : null}
          {section.body ? <p>{renderSupportBody(section.body)}</p> : null}
          {section.bullets ? (
            <ul>
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}
          {section.link ? (
            <p>
              <Link className="text-link" to={section.link.href}>
                {section.link.label}
              </Link>
            </p>
          ) : null}
        </section>
      ))}
    </article>
  );
}

export function GetAppPage() {
  const page = florivaKnowledge.staticPages.get;
  const { storeCta } = florivaKnowledge.marketing.homepage;

  return (
    <>
      <Meta description={page.description} title={page.title} />
      <section className="shell home-hero">
        <Reveal className="home-hero__text">
          <p className="section-eyebrow">Ready when you are</p>
          <h1 className="home-hero__headline">Get Floriva on your phone</h1>
          <p className="home-hero__dek">{page.description}</p>
          <StoreButtons />
        </Reveal>
        <Reveal className="home-store-cta__qr" delay={REVEAL_STAGGER_MS * 2}>
          <img
            alt="QR code that opens Floriva's app store page"
            height={140}
            src="/qr/get-floriva.svg"
            width={140}
          />
          <p className="home-store-cta__qr-caption">{storeCta.qrCaption}</p>
        </Reveal>
      </section>

      <section className="shell static-page-body">
        <Reveal>
          <KnowledgePageBody page={page} />
        </Reveal>
      </section>
    </>
  );
}

export function PrivacyPage() {
  const page = florivaKnowledge.staticPages.privacy;

  return (
    <StaticPageLayout description={page.description} title={page.title}>
      <KnowledgePageBody page={page} />
    </StaticPageLayout>
  );
}

export function PrivacyFeaturesPage() {
  const page = florivaKnowledge.staticPages["privacy-features"];

  return (
    <StaticPageLayout description={page.description} title={page.title}>
      <KnowledgePageBody page={page} />
    </StaticPageLayout>
  );
}

export function SupportPage() {
  const page = florivaKnowledge.staticPages.support;

  return (
    <StaticPageLayout description={page.description} title={page.title}>
      <KnowledgePageBody page={page} />
    </StaticPageLayout>
  );
}

export function TermsPage() {
  const page = florivaKnowledge.staticPages.terms;

  return (
    <StaticPageLayout description={page.description} showDownloadCta={false} title={page.title}>
      <KnowledgePageBody page={page} />
    </StaticPageLayout>
  );
}

export function NotFoundPage() {
  return (
    <>
      <Meta description="Floriva page not found." noIndex title="Page not found" />
      <section className="shell page-hero page-hero--compact">
        <Reveal>
          <p className="section-eyebrow">404</p>
          <h1>That page doesn&apos;t exist.</h1>
          <p>We couldn&apos;t find what you were looking for. It may have moved, or the link may have a typo.</p>
          <ul className="not-found-links">
            <li>
              <Link className="text-link" to="/compare">
                Compare period trackers &gt;
              </Link>
            </li>
            <li>
              <Link className="text-link" to="/period-tracker-privacy">
                Privacy by state &gt;
              </Link>
            </li>
            <li>
              <Link className="text-link" to="/privacy-features">
                Why on-device matters &gt;
              </Link>
            </li>
            <li>
              <Link className="text-link" to="/">
                Return to the homepage &gt;
              </Link>
            </li>
          </ul>
        </Reveal>
      </section>
    </>
  );
}
