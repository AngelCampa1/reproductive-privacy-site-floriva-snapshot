import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import remarkGfm from "remark-gfm";
import { slugifyHeading } from "@/lib/slugify";

type ArticleBodyProps = {
  markdown: string;
};

export function ArticleBody({ markdown }: ArticleBodyProps) {
  const headingCounts = new Map<string, number>();

  return (
    <div className="article-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => {
            const text = typeof children === "string" ? children : extractText(children);
            const base = slugifyHeading(text);
            const count = headingCounts.get(base) ?? 0;
            headingCounts.set(base, count + 1);
            const id = count === 0 ? base : `${base}-${count}`;
            return <h2 id={id}>{children}</h2>;
          },
          a: ({ href = "", children }) => {
            const text = children;

            if (href.startsWith("/")) {
              return <Link to={href}>{text}</Link>;
            }

            return (
              <a href={href} rel="noreferrer" target="_blank">
                {text}
              </a>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

function extractText(node: unknown): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: unknown } }).props;
    if (props && "children" in props) return extractText(props.children);
  }
  return "";
}
