import { useMemo } from "react";
import { BentoCell, BentoGrid } from "@/components/bento-grid";
import { DeviceFrame } from "@/components/device-frame";
import { JourneySection, JourneyStep } from "@/components/journey-section";
import { JsonLd } from "@/components/json-ld";
import { OnDeviceDiagram } from "@/components/on-device-diagram";
import { REVEAL_STAGGER_MS, Reveal } from "@/components/reveal";
import { StoreButtons } from "@/components/store-buttons";
import { florivaKnowledge } from "@/site/knowledge";
import { Meta } from "@/site/meta";
import { resolvePageMeta } from "@/site/page-meta";
import { siteSeo } from "@/site/seo";
import { buildFaqPageJsonLd, buildPageJsonLd } from "@/site/structured-data";

const homepageKnowledge = florivaKnowledge.marketing.homepage;

/** Wraps the single configured accent word in `text` with <em> for the one
 * Newsreader italic accent the design canon allows per headline. Falls back
 * to a plain string if the word isn't found so a copy edit can never throw. */
function withEmphasis(text: string, word: string) {
  const index = text.indexOf(word);
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <em>{word}</em>
      {text.slice(index + word.length)}
    </>
  );
}

const journeyScreens = [
  {
    screen: "logging" as const,
    alt: "Screenshot of the Floriva logging screen for flow, mood, energy, and symptoms.",
  },
  {
    screen: "calendar" as const,
    alt: "Screenshot of the Floriva calendar screen showing period and fertile-window estimates with a confidence label.",
  },
  {
    screen: "insights" as const,
    alt: "Screenshot of the Floriva insights screen showing cycle patterns over time.",
  },
  {
    screen: "privacy-settings" as const,
    alt: "Screenshot of the Floriva privacy settings screen with app lock and delete-all-data controls.",
  },
];

export function HomePage() {
  const jsonLdBlocks = useMemo(() => {
    const blocks = buildPageJsonLd(resolvePageMeta("/"));
    const faqBlock = buildFaqPageJsonLd(homepageKnowledge.faqs);
    return faqBlock ? [...blocks, faqBlock] : blocks;
  }, []);

  return (
    <>
      <Meta description={siteSeo.metaDescription} title={siteSeo.homeTitle} />
      <JsonLd blocks={jsonLdBlocks} />

      <section className="shell home-hero">
        <Reveal className="home-hero__text">
          <p className="section-eyebrow">A quieter way to track your cycle</p>
          <h1 className="home-hero__headline">
            {withEmphasis(homepageKnowledge.tagline, homepageKnowledge.heroEmphasisWord)}
          </h1>
          <p className="home-hero__dek">{homepageKnowledge.subheadline}</p>
          <StoreButtons />
          <p className="home-hero__trust">{homepageKnowledge.heroTrustSignal}</p>
        </Reveal>

        <Reveal className="home-hero__device" delay={REVEAL_STAGGER_MS * 2}>
          <span className="home-hero__ring" aria-hidden="true" />
          <DeviceFrame
            alt="Screenshot of the Floriva Today screen showing the current cycle day and quick logging shortcuts."
            priority
            screen="today"
          />
        </Reveal>
      </section>

      <section className="shell home-journey" aria-labelledby="journey-heading">
        <div className="section-heading">
          <p className="section-eyebrow">Inside the app</p>
          <h2 id="journey-heading">What using Floriva feels like</h2>
        </div>
        <JourneySection>
          {homepageKnowledge.journey.map((step, index) => {
            const screen = journeyScreens[index];
            return (
              <JourneyStep
                key={step.heading}
                body={step.body}
                eyebrow={step.eyebrow}
                heading={step.heading}
                index={index + 1}
                media={screen ? <DeviceFrame alt={screen.alt} screen={screen.screen} /> : undefined}
              />
            );
          })}
        </JourneySection>
      </section>

      <section className="shell home-bento" aria-labelledby="bento-heading">
        <div className="section-heading">
          <p className="section-eyebrow">Also included</p>
          <h2 id="bento-heading">More features, built the same way</h2>
        </div>
        <BentoGrid>
          {homepageKnowledge.bento.map((cell) => (
            <BentoCell
              key={cell.title}
              body={cell.body}
              eyebrow={cell.eyebrow}
              size={cell.size}
              stat={cell.stat}
              title={cell.title}
              tone={cell.tone}
            />
          ))}
        </BentoGrid>
      </section>

      <section className="shell home-privacy" aria-labelledby="privacy-heading">
        <Reveal className="home-privacy__diagram">
          <OnDeviceDiagram caption="Your phone keeps the log. The line out to a cloud account stays broken." />
        </Reveal>
        <Reveal className="home-privacy__text">
          <p className="section-eyebrow">{homepageKnowledge.privacy.eyebrow}</p>
          <h2 id="privacy-heading">
            {withEmphasis(homepageKnowledge.privacy.heading, homepageKnowledge.privacy.headingEmphasisWord)}
          </h2>
          {homepageKnowledge.privacy.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </Reveal>
      </section>

      <section className="shell home-store-cta">
        <Reveal className="home-store-cta__card">
          <div className="home-store-cta__content">
            <h2>{homepageKnowledge.storeCta.heading}</h2>
            <p>{homepageKnowledge.storeCta.body}</p>
            <StoreButtons />
          </div>
          <div className="home-store-cta__qr">
            <img
              alt="QR code that opens Floriva's app store page"
              height={140}
              src="/qr/get-floriva.svg"
              width={140}
            />
            <p className="home-store-cta__qr-caption">{homepageKnowledge.storeCta.qrCaption}</p>
          </div>
        </Reveal>
      </section>

      <section className="shell home-faq">
        <div className="section-heading">
          <p className="section-eyebrow">FAQ</p>
          <h2>Questions people ask before switching</h2>
        </div>
        <div className="faq-list">
          {homepageKnowledge.faqs.map((faq) => (
            <details key={faq.q} className="faq-item">
              <summary>{faq.q}</summary>
              <p>{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
