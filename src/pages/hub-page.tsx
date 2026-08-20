import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DownloadCta, type DownloadCtaVariant } from "@/components/download-cta";
import { JsonLd } from "@/components/json-ld";
import { REVEAL_STAGGER_MS, Reveal } from "@/components/reveal";
import { type ContentEntry, getHubEntries, searchEntries } from "@/site/content";
import { type CollectionKey, collectionDefinitions } from "@/site/config";
import { formatCollectionLabel } from "@/site/format";
import { buildHubNextStepLinks } from "@/site/internal-links";
import { florivaKnowledge } from "@/site/knowledge";
import { hubGuideLinks } from "@/site/marketing-links";
import { Meta } from "@/site/meta";
import { resolvePageMeta } from "@/site/page-meta";
import { pillarHubDefinitionsByPath, type PillarHubDefinition } from "@/site/pillar-hubs";
import { buildPageJsonLd } from "@/site/structured-data";

type HubPageProps = {
  collections: CollectionKey[];
  description: string;
  title: string;
};

type StateTier = {
  key: "banned" | "restricted" | "legal-access" | "protected" | "other";
  label: string;
  description: string;
};

const STATE_TIERS: readonly StateTier[] = florivaKnowledge.stateRiskTiers;

/**
 * How many cards a pillar section shows before handing off to its `seeAllHref`.
 * A pillar hub is a landing page: it should show the shape of what is here, not
 * every page that matches.
 */
const PILLAR_SECTION_PREVIEW_COUNT = 6;

function isStateOnlyHub(collections: CollectionKey[]): boolean {
  return collections.length === 1 && collections[0] === "reproductive-privacy-state-pages";
}

function stateCardTitle(entry: ContentEntry): string {
  return entry.state ?? entry.title;
}

function groupByStateTier(entries: ContentEntry[]): Array<{ tier: StateTier; entries: ContentEntry[] }> {
  const groups: Record<StateTier["key"], ContentEntry[]> = {
    banned: [],
    restricted: [],
    "legal-access": [],
    protected: [],
    other: [],
  };
  for (const entry of entries) {
    const status = entry.abortionLawStatus ?? "";
    const key = (["banned", "restricted", "legal-access", "protected"] as const).find((k) => k === status) ?? "other";
    groups[key].push(entry);
  }
  for (const list of Object.values(groups)) {
    list.sort((a, b) => (a.state ?? "").localeCompare(b.state ?? ""));
  }
  return STATE_TIERS
    .map((tier) => ({ tier, entries: groups[tier.key] }))
    .filter((group) => group.entries.length > 0);
}

function stateTierChipClass(key: StateTier["key"]): string {
  if (key === "banned" || key === "restricted") {
    return "state-tier__chip state-tier__chip--warm";
  }
  if (key === "legal-access" || key === "protected") {
    return "state-tier__chip state-tier__chip--calm";
  }
  return "state-tier__chip state-tier__chip--neutral";
}

function hubDownloadCtaVariant(collections: CollectionKey[]): DownloadCtaVariant {
  if (collections.includes("reproductive-privacy-state-pages")) {
    return "state";
  }
  if (
    collections.includes("alternatives") ||
    collections.includes("comparisons") ||
    collections.includes("pricing-breakdowns")
  ) {
    return "compare";
  }
  if (collections.includes("lead-magnets")) {
    return "lead-magnet";
  }
  return "guide";
}

function entriesForPillarSection(section: PillarHubDefinition["sections"][number], entries: ContentEntry[]): ContentEntry[] {
  return entries.filter((entry) => section.collections.includes(entry.collection));
}

function normalizeHubPath(pathname: string): string {
  return pathname === "/" ? "/" : pathname.split("#")[0].split("?")[0].replace(/\/+$/, "") || "/";
}

export function HubPage({ collections, description, title }: HubPageProps) {
  const location = useLocation();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const entries = searchEntries(getHubEntries(collections), deferredQuery);
  const currentPath = normalizeHubPath(location.pathname);
  const nextStepLinks = buildHubNextStepLinks(collections, currentPath);
  const stateOnly = isStateOnlyHub(collections);
  const stateGroups = useMemo(() => (stateOnly ? groupByStateTier(entries) : []), [stateOnly, entries]);
  // Both lookups use the normalized path. They used to use the raw pathname
  // while `currentPath` was normalized, so a trailing slash quietly demoted a
  // pillar hub to a flat grid with no authored cards.
  const pillarHub = pillarHubDefinitionsByPath[currentPath];
  const isSearching = deferredQuery.trim().length > 0;

  /* Authored cards only. This used to fall back to synthesizing three cards
     from `nextStepLinks` with one hardcoded body sentence repeated across all
     three — which is what 12 of the 18 hubs actually shipped, and it reused the
     same links the page already repeats in its footer band. Every hub now has
     real copy in `hubGuideLinks`; `hub-guide-links.test.ts` keeps it that way. */
  const guideLinks = (hubGuideLinks[currentPath] ?? [])
    .filter((link) => normalizeHubPath(link.href) !== currentPath)
    .filter(
      (link, index, links) =>
        links.findIndex((candidate) => normalizeHubPath(candidate.href) === normalizeHubPath(link.href)) === index,
    )
    .slice(0, 3);
  const jsonLdBlocks = useMemo(
    () => buildPageJsonLd(resolvePageMeta(location.pathname)),
    [location.pathname],
  );

  return (
    <div className="hub-page">
      <Meta description={description} title={title} />
      <JsonLd blocks={jsonLdBlocks} />

      <section className="shell page-hero page-hero--compact">
        <Reveal>
          <Breadcrumbs pathname={location.pathname} />
          <p className="section-eyebrow">{collections.map((key) => collectionDefinitions[key].shortLabel).join(" / ")}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </Reveal>

        <Reveal delay={REVEAL_STAGGER_MS * 2}>
          <label className="search-field">
            <span>Search this section</span>
            <input
              name="query"
              onChange={(event) => {
                const nextValue = event.currentTarget.value;
                startTransition(() => setQuery(nextValue));
              }}
              placeholder="Search titles, states, or themes"
              type="search"
              value={query}
            />
          </label>
        </Reveal>
      </section>

      <section className="shell chip-row">
        {collections.map((collection) => (
          <span key={collection} className="info-chip">
            {collectionDefinitions[collection].label}
          </span>
        ))}
        <span className="info-chip info-chip--soft">{entries.length} matching pages</span>
      </section>

      <section className="shell hub-guide" aria-labelledby="hub-guide-heading">
        <div className="section-heading">
          <p className="section-eyebrow">Choose your path</p>
          <h2 id="hub-guide-heading">{stateOnly ? "Check what changes where you live" : "Start where your question fits"}</h2>
        </div>
        <div className="guided-entry__grid guided-entry__grid--compact">
          {guideLinks.map((link, index) => (
            <Reveal key={`${link.href}-${link.title}`} delay={index * REVEAL_STAGGER_MS}>
              <Link className="guided-entry-card guided-entry-card--compact" to={link.href}>
                <p className="section-eyebrow">{link.eyebrow}</p>
                <h3>{link.title}</h3>
                <p>{link.body}</p>
                <span>Open this path</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {stateOnly ? (
        stateGroups.map((group) => (
          <section key={group.tier.key} className="shell state-tier">
            <div className="section-heading state-tier__heading">
              <p className={`section-eyebrow ${stateTierChipClass(group.tier.key)}`}>{group.tier.label}</p>
              <p>{group.tier.description}</p>
            </div>
            <div className="card-grid card-grid--states">
              {group.entries.map((entry, index) => (
                <Reveal key={entry.id} delay={(index % 6) * REVEAL_STAGGER_MS}>
                  <Link className="content-card content-card--state content-card--compact" to={entry.routePath}>
                    <p className="content-card__label">{entry.stateCode ?? ""}</p>
                    <h2>{stateCardTitle(entry)}</h2>
                    <p className="content-card__excerpt">{entry.description}</p>
                  </Link>
                </Reveal>
              ))}
            </div>
          </section>
        ))
      ) : pillarHub ? (
        pillarHub.sections.map((section) => {
          const matchingEntries = entriesForPillarSection(section, entries);

          if (matchingEntries.length === 0) {
            return null;
          }

          // A section previews only when another hub owns its full list, and
          // never while the reader is searching — a search should return
          // everything it matched, not the first six of it.
          const isPreview =
            Boolean(section.seeAllHref) && !isSearching && matchingEntries.length > PILLAR_SECTION_PREVIEW_COUNT;
          const sectionEntries = isPreview
            ? matchingEntries.slice(0, PILLAR_SECTION_PREVIEW_COUNT)
            : matchingEntries;

          return (
            <section key={section.title} className="shell pillar-section">
              <div className="section-heading">
                <p className="section-eyebrow">{section.title}</p>
                <p>{section.description}</p>
              </div>
              <div className="card-grid">
                {sectionEntries.map((entry, index) => (
                  <Reveal key={entry.id} delay={(index % 6) * REVEAL_STAGGER_MS}>
                    <Link className="content-card" to={entry.routePath}>
                      <p className="content-card__label">{formatCollectionLabel(entry.collection)}</p>
                      <h2>{entry.title}</h2>
                      <p className="content-card__excerpt">{entry.description}</p>
                      <div className="content-card__meta">
                        <span>{entry.readingMinutes} min</span>
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
              {isPreview ? (
                <Link className="pillar-section__see-all text-link" to={section.seeAllHref!}>
                  See all {matchingEntries.length} {section.title.toLowerCase()}
                </Link>
              ) : null}
            </section>
          );
        })
      ) : (
        <section className="shell card-grid">
          {entries.map((entry, index) => (
            <Reveal key={entry.id} delay={(index % 6) * REVEAL_STAGGER_MS}>
              <Link className="content-card" to={entry.routePath}>
                <p className="content-card__label">{formatCollectionLabel(entry.collection)}</p>
                <h2>{entry.title}</h2>
                <p className="content-card__excerpt">{entry.description}</p>
                <div className="content-card__meta">
                  <span>{entry.readingMinutes} min</span>
                </div>
              </Link>
            </Reveal>
          ))}
        </section>
      )}

      <DownloadCta variant={hubDownloadCtaVariant(collections)} />

      <section className="shell next-step-band" aria-labelledby="hub-next-step-heading">
        <div className="section-heading">
          <p className="section-eyebrow">Next step</p>
          <h2 id="hub-next-step-heading">Move from research to a safer choice</h2>
        </div>
        <div className="next-step-links">
          {nextStepLinks.map((link) => (
            <Link key={link.href} className="next-step-link" to={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
