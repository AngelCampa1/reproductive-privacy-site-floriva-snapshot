import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArticleBody } from "@/components/article-body";
import { ArticleToc } from "@/components/article-toc";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DownloadCta, type DownloadCtaVariant } from "@/components/download-cta";
import { JsonLd } from "@/components/json-ld";
import { LeadMagnetInlineForm } from "@/components/lead-magnet-inline-form";
import { Reveal } from "@/components/reveal";
import { Sources } from "@/components/sources";
import { getEntryByCollectionSlug, loadEntryBody } from "@/site/content";
import type { CollectionKey } from "@/site/config";
import { formatCollectionLabel, formatDate } from "@/site/format";
import { buildContentNextStepLinks, resolveFunnelAwareRelatedEntries } from "@/site/internal-links";
import { getLeadMagnetResource, selectLeadMagnetForPath } from "@/site/lead-magnets";
import { Meta } from "@/site/meta";
import { resolvePageMeta } from "@/site/page-meta";
import { buildPageJsonLd } from "@/site/structured-data";

type ContentPageProps = {
  collection: CollectionKey;
};

type StructuredTableData = {
  columns: string[];
  name?: string;
  rows: string[][];
};

function downloadCtaVariantFor(collection: CollectionKey): DownloadCtaVariant | null {
  switch (collection) {
    case "reproductive-privacy-state-pages":
      return "state";
    case "alternatives":
    case "comparisons":
    case "pricing-breakdowns":
      return "compare";
    case "guides":
    case "listicles":
    case "privacy-in-practice":
    case "symptom-guides":
    case "condition-guides":
    case "hormone-guides":
    case "life-stage-guides":
    case "wellness-guides":
    case "app-guides":
      return "guide";
    case "lead-magnets":
    case "questionnaires":
      return null;
    default:
      return "default";
  }
}

/* Headings, not sentences. These read as `<h2>` and used to end in a period,
   which stops them scanning as headings when a reader skims the page. */
function nextStepHeadingFor(collection: CollectionKey): string {
  switch (collection) {
    case "lead-magnets":
      return "Use this with the next resource";
    case "questionnaires":
      return "Turn the result into a plan";
    case "symptom-guides":
    case "condition-guides":
    case "hormone-guides":
    case "life-stage-guides":
    case "wellness-guides":
      return "Start tracking the pattern";
    case "alternatives":
    case "comparisons":
    case "pricing-breakdowns":
    case "listicles":
      return "Compare your next choice";
    case "reproductive-privacy-state-pages":
      return "Cut down the data trail";
    case "privacy-in-practice":
      return "Run the next privacy check";
    case "app-guides":
      return "Set up the next step";
    default:
      return "Choose your next step";
  }
}

function asStructuredTableData(value: unknown): StructuredTableData | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (
    !Array.isArray(record.columns) ||
    !record.columns.every((column) => typeof column === "string") ||
    !Array.isArray(record.rows) ||
    !record.rows.every(
      (row) => Array.isArray(row) && row.every((cell) => typeof cell === "string"),
    )
  ) {
    return null;
  }

  return {
    columns: record.columns,
    name: typeof record.name === "string" ? record.name : undefined,
    rows: record.rows,
  };
}

function EmptyState() {
  return (
    <>
      <Meta description="Floriva page not found." noIndex title="Page not found" />
      <section className="shell page-hero page-hero--compact">
        <h1>That page is missing.</h1>
        <p>We couldn't find the page you were looking for. It may have moved or been renamed.</p>
        <Link className="text-link" to="/">
          Return home
        </Link>
      </section>
    </>
  );
}

export function ContentPage({ collection }: ContentPageProps) {
  const { slug = "" } = useParams();
  const entry = getEntryByCollectionSlug(collection, slug);
  const [loadedBody, setLoadedBody] = useState<{ entryId: string; markdown: string } | null>(null);

  useEffect(() => {
    if (!entry) return;
    let cancelled = false;
    loadEntryBody(entry.id).then((loaded) => {
      if (!cancelled) setLoadedBody({ entryId: entry.id, markdown: loaded });
    });
    return () => { cancelled = true; };
  }, [entry]);

  const body = loadedBody && loadedBody.entryId === entry?.id ? loadedBody.markdown : "";

  const jsonLdBlocks = useMemo(
    () => (entry ? buildPageJsonLd(resolvePageMeta(entry.routePath)) : []),
    [entry],
  );

  if (!entry) {
    // Friendly redirect for typed state shorthands, e.g. /period-tracker-privacy/texas
    // -> /period-tracker-privacy/reproductive-data-privacy-laws-texas.
    if (collection === "reproductive-privacy-state-pages" && slug && !slug.startsWith("reproductive-data-privacy-laws-")) {
      const canonical = getEntryByCollectionSlug(collection, `reproductive-data-privacy-laws-${slug}`);
      if (canonical) {
        return <Navigate replace to={canonical.routePath} />;
      }
    }
    return <EmptyState />;
  }

  const relatedEntries = resolveFunnelAwareRelatedEntries(entry);
  const nextStepLinks = buildContentNextStepLinks(entry);
  const tableData = asStructuredTableData(entry.tableData);
  const hasHeroAside = Boolean(entry.state) || entry.keyFacts.length > 0;

  return (
    <>
      <Meta article description={entry.metaDescription} ogImage={entry.ogImage} title={entry.seoTitle} />
      <JsonLd blocks={jsonLdBlocks} />

      <section className={`shell article-hero${hasHeroAside ? "" : " article-hero--single"}`}>
        <Reveal>
          <Breadcrumbs pathname={entry.routePath} overrides={{ [entry.routePath]: entry.title }} />
          <div className="article-hero__meta">
            <span>{formatCollectionLabel(entry.collection)}</span>
            <span>Updated {formatDate(entry.updatedAt)}</span>
            <span>{entry.readingMinutes} min read</span>
            <span>Published by Floriva</span>
            <Link className="text-link" to="/support#editorial-method">
              How Floriva checks its guides
            </Link>
          </div>
          <h1>{entry.title}</h1>
          <p className="article-hero__dek">{entry.description}</p>
          {entry.bluf ? <div className="bluf-card">{entry.bluf}</div> : null}
        </Reveal>

        {hasHeroAside ? (
          <Reveal delay={120}>
            <aside className="article-aside">
              {entry.state ? (
                <div className="aside-card">
                  <p className="section-eyebrow">State risk profile</p>
                  <ul className="meta-list">
                    <li>
                      <strong>{entry.state}</strong>
                      <span>{entry.stateCode}</span>
                    </li>
                    <li>
                      <strong>Abortion law</strong>
                      <span>{entry.abortionLawStatus ?? "n/a"}</span>
                    </li>
                    <li>
                      <strong>Data protection</strong>
                      <span>{entry.dataProtectionLevel ?? "n/a"}</span>
                    </li>
                    <li>
                      <strong>Subpoena risk</strong>
                      <span>{entry.subpoenaRisk ?? "n/a"}</span>
                    </li>
                  </ul>
                </div>
              ) : null}

              {entry.keyFacts.length > 0 ? (
                <div className="aside-card">
                  <p className="section-eyebrow">Key facts</p>
                  <ul className="meta-list meta-list--stacked">
                    {entry.keyFacts.map((fact) => (
                      <li key={fact}>{fact}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </aside>
          </Reveal>
        ) : null}
      </section>

      {entry.collection === "lead-magnets" ? (
        <LeadMagnetInlineForm
          leadMagnetSlug={
            getLeadMagnetResource(entry.slug)?.slug ?? selectLeadMagnetForPath(entry.routePath).slug
          }
          sourcePath={entry.routePath}
          title={entry.title}
        />
      ) : null}

      <section className="shell article-layout">
        <Reveal className="article-layout__main">
          <ArticleBody markdown={body} />
        </Reveal>

        <div className="article-layout__sidebar">
          <ArticleToc markdown={body} />

          {entry.definitions.length > 0 ? (
            <div className="sidebar-block">
              <p className="section-eyebrow">Definitions</p>
              <div className="definition-list">
                {entry.definitions.map((definition) => (
                  <div key={definition.term} className="definition-card">
                    <h3>{definition.term}</h3>
                    <p>{definition.definition}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {entry.pricingStats.length > 0 ? (
            <div className="sidebar-block">
              <p className="section-eyebrow">Cited signals</p>
              <div className="stat-list">
                {entry.pricingStats.map((stat) => (
                  <article key={`${stat.stat}-${stat.source}`} className="stat-card">
                    <strong>{stat.stat}</strong>
                    <p>{stat.source}</p>
                    {stat.sourceUrl ? (
                      <a href={stat.sourceUrl} rel="noreferrer" target="_blank">
                        View source
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {entry.tiers.length > 0 ? (
            <div className="sidebar-block">
              <p className="section-eyebrow">Plans or tiers</p>
              <div className="definition-list">
                {entry.tiers.map((tier) => (
                  <div key={tier.name} className="definition-card">
                    <h3>{tier.name}</h3>
                    <p>{tier.price ?? tier.description ?? "Pricing details vary — check the app listing."}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {entry.relevantLaws.length > 0 ? (
            <div className="sidebar-block">
              <p className="section-eyebrow">Relevant laws</p>
              <div className="law-list">
                {entry.relevantLaws.map((law) => (
                  <article key={law.name} className="definition-card">
                    <h3>{law.name}</h3>
                    <p>{law.summary}</p>
                    {law.url ? (
                      <a href={law.url} rel="noreferrer" target="_blank">
                        Read statute
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {tableData ? (
        <section className="shell collection-preview">
          <div className="section-heading">
            <p className="section-eyebrow">Comparison table</p>
            <h2>{tableData.name ?? "Side-by-side comparison"}</h2>
          </div>
          <div
            className="comparison-table"
            role="region"
            aria-label={tableData.name ?? entry.title}
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  {tableData.columns.map((column) => (
                    <th key={column} scope="col">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row) => (
                  <tr key={row.join("|")}>
                    {row.map((cell, cellIndex) => (
                      <td key={`${row.join("|")}-${cellIndex}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {entry.tools.length > 0 ? (
        <section className="shell collection-preview">
          <div className="section-heading">
            <p className="section-eyebrow">Ranked picks</p>
            <h2>How the options compare</h2>
          </div>
          <div className="card-grid">
            {entry.tools.map((tool) => (
              <article key={tool.name} className="content-card content-card--compact">
                <p className="content-card__label">{tool.pricing ?? "Pricing varies"}</p>
                <h3>{tool.name}</h3>
                <p>{tool.summary}</p>
                {tool.verdict ? <p className="content-card__verdict">{tool.verdict}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {entry.proscons.length > 0 ? (
        <section className="shell section-grid" aria-labelledby="proscons-heading">
          <div className="section-heading">
            <p className="section-eyebrow">Trade-offs</p>
            <h2 id="proscons-heading">What each option gets right and wrong</h2>
          </div>
          {entry.proscons.map((item) => (
            <article key={item.subject} className="statement-card">
              <p className="section-eyebrow">{item.subject}</p>
              <div className="pros-cons">
                <div>
                  <h3>Pros</h3>
                  <ul>
                    {item.pros.map((pro) => (
                      <li key={pro}>{pro}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3>Cons</h3>
                  <ul>
                    {item.cons.map((con) => (
                      <li key={con}>{con}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {entry.hiddenCosts.length > 0 ? (
        <section className="shell collection-preview">
          <div className="section-heading">
            <p className="section-eyebrow">Hidden costs</p>
            <h2>What you actually pay over time</h2>
          </div>
          <div className="card-grid">
            {entry.hiddenCosts.map((cost) => (
              <article key={cost.label} className="content-card content-card--compact">
                <p className="content-card__label">{cost.label}</p>
                <p>{cost.detail}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {entry.expertQuotes.length > 0 ? (
        <section className="shell card-grid" aria-labelledby="expert-quotes-heading">
          <div className="section-heading">
            <p className="section-eyebrow">On the record</p>
            <h2 id="expert-quotes-heading">What people who study this say</h2>
          </div>
          {entry.expertQuotes.map((quote) => (
            <blockquote key={`${quote.personName}-${quote.quote}`} className="quote-card">
              <p>{quote.quote}</p>
              <footer>
                <strong>{quote.personName}</strong>
                <span>
                  {[quote.jobTitle, quote.organization].filter(Boolean).join(", ")}
                </span>
                {quote.sourceUrl ? (
                  <a
                    href={quote.sourceUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="quote-card__source"
                  >
                    {quote.sourceLabel ?? "Source"}
                  </a>
                ) : null}
              </footer>
            </blockquote>
          ))}
        </section>
      ) : null}

      {/* One Q&A block, not two. `answers` and `faqs` were separate sections with
          separate headings stacked back to back — and 355 of the 446 entries
          carry both, so most pages asked the reader to read two FAQs in a row.
          The short direct answers stay open; the longer ones stay collapsed. */}
      {entry.answers.length > 0 || entry.faqs.length > 0 ? (
        <section className="shell faq-band" aria-labelledby="questions-heading">
          <div className="section-heading">
            <p className="section-eyebrow">Questions</p>
            <h2 id="questions-heading">Answers to what people ask most</h2>
          </div>

          {entry.answers.length > 0 ? (
            <div className="answer-grid">
              {entry.answers.map((answer) => (
                <article key={answer.question} className="answer-card">
                  <h3>{answer.question}</h3>
                  <p>{answer.answer}</p>
                </article>
              ))}
            </div>
          ) : null}

          {entry.faqs.length > 0 ? (
            <div className="faq-list">
              {entry.faqs.map((faq) => (
                <details key={faq.q} className="faq-item">
                  <summary>{faq.q}</summary>
                  <p>{faq.a}</p>
                </details>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <Sources sources={entry.sources} />

      {(() => {
        const variant = downloadCtaVariantFor(entry.collection);
        return variant ? <DownloadCta variant={variant} /> : null;
      })()}

      {/* One place to go next, not three. The curated funnel links and the
          related-pages grid were separate sections with separate headings, and
          together with the download CTA they offered 11 competing destinations
          in a row. Same links, one decision. */}
      <section className="shell next-step-band" aria-labelledby="next-step-heading">
        <div className="section-heading">
          <p className="section-eyebrow">Where to next</p>
          <h2 id="next-step-heading">{nextStepHeadingFor(entry.collection)}</h2>
        </div>
        <div className="next-step-links">
          {nextStepLinks.map((link) => (
            <Link key={link.href} className="next-step-link" to={link.href}>
              {link.label}
            </Link>
          ))}
        </div>

        {relatedEntries.length > 0 ? (
          <div className="next-step-related">
            <p className="section-eyebrow">Keep reading</p>
            <div className="card-grid">
              {relatedEntries.map((relatedEntry) => (
                <Link key={relatedEntry.id} className="content-card" to={relatedEntry.routePath}>
                  <p className="content-card__label">{formatCollectionLabel(relatedEntry.collection)}</p>
                  <h3>{relatedEntry.title}</h3>
                  <p>{relatedEntry.description}</p>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
