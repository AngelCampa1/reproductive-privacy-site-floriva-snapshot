import type { CollectionKey } from "@/site/config";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

export function formatCollectionLabel(collection: CollectionKey): string {
  switch (collection) {
    case "lead-magnets":
      return "Free resource";
    case "pricing-breakdowns":
      return "Pricing breakdown";
    case "reproductive-privacy-state-pages":
      return "Privacy by state";
    default:
      return collection.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

export function formatBuyerStage(stage: "bofu" | "mofu" | "tofu"): string {
  if (stage === "bofu") {
    return "Ready to switch";
  }

  if (stage === "mofu") {
    return "Evaluating options";
  }

  return "Researching the risk";
}
