import type { Source } from "@/site/content";

type SourcesProps = {
  sources: Source[];
};

function formatDate(value: string | undefined): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  try {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

export function Sources({ sources }: SourcesProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <section className="shell" aria-labelledby="sources-heading">
      <div className="section-heading">
        <p className="section-eyebrow">Sources</p>
        <h2 id="sources-heading">Citations for the claims on this page</h2>
      </div>
      <ol className="sources-list">
        {sources.map((source, index) => {
          const published = formatDate(source.publishedAt);
          const accessed = formatDate(source.accessedAt);
          return (
            <li key={source.id} className="sources-list__item" id={`source-${source.id}`}>
              <span className="sources-list__index" aria-hidden>
                {index + 1}.
              </span>
              <div className="sources-list__body">
                <p className="sources-list__claim">
                  {source.softened ? <em>Hedged: </em> : null}
                  {source.claim}
                </p>
                <p className="sources-list__meta">
                  <a
                    href={source.url}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="sources-list__link"
                  >
                    {source.publisher}
                  </a>
                  {published ? <span> · Published {published}</span> : null}
                  {accessed ? <span> · Verified {accessed}</span> : null}
                  {source.primary ? null : <span> · Secondary coverage</span>}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
