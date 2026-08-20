import { useEffect, useMemo } from "react";
import { serializeJsonLd } from "@/site/structured-data";

const EDGE_SCRIPT_ATTR = "data-seo-jsonld-edge";
const CLIENT_SCRIPT_ID = "seo-jsonld-client";

type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

type JsonLdBlock = { [key: string]: JsonLdValue };

type JsonLdProps = {
  blocks: JsonLdBlock[];
};

export function JsonLd({ blocks }: JsonLdProps): null {
  const serialized = useMemo(
    () => (blocks && blocks.length > 0 ? serializeJsonLd(blocks) : ""),
    [blocks],
  );

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.head
      .querySelectorAll(`script[${EDGE_SCRIPT_ATTR}]`)
      .forEach((element) => element.remove());

    const existing = document.getElementById(CLIENT_SCRIPT_ID) as HTMLScriptElement | null;

    if (!serialized) {
      existing?.remove();
      return;
    }

    if (existing) {
      existing.textContent = serialized;
      return;
    }

    const script = document.createElement("script");
    script.id = CLIENT_SCRIPT_ID;
    script.type = "application/ld+json";
    script.textContent = serialized;
    document.head.append(script);
  }, [serialized]);

  return null;
}
