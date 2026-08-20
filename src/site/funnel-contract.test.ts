import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { allEntries } from "@/site/content";
import { collectionDefinitions } from "@/site/config";
import {
  funnelCollectionContracts,
  funnelCollectionContractsByCollection,
  type BuyerStage,
} from "@/site/funnel-contract";
import { getValidRoutePaths } from "@/site/route-inventory";

function parseFunnelTable() {
  const source = readFileSync("docs/funnel-next-steps.md", "utf8");
  const rows = source
    .split(/\r?\n/)
    .filter((line) => line.startsWith("| `"));

  return rows.map((line) => {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

    return {
      collection: cells[0].replace(/`/g, ""),
      routeBase: cells[1].replace(/`/g, ""),
      hubPath: cells[2].replace(/`/g, ""),
      stage: cells[3],
      primaryNextStep: cells[4],
    };
  });
}

function formatStage(stage: BuyerStage): string {
  return stage.toUpperCase();
}

describe("funnel collection contract", () => {
  it("covers every configured collection and uses valid route bases", () => {
    const validRoutes = getValidRoutePaths();

    expect(funnelCollectionContracts.map((contract) => contract.collection).sort()).toEqual(
      Object.keys(collectionDefinitions).sort(),
    );

    for (const contract of funnelCollectionContracts) {
      expect(contract.routeBase).toBe(collectionDefinitions[contract.collection].routeBase);
      expect(validRoutes.has(contract.hubPath)).toBe(true);
      expect(contract.allowedStages).toContain(contract.primaryStage);
    }
  });

  it("keeps existing content buyer stages inside each collection contract", () => {
    const errors = allEntries
      .filter((entry) => !funnelCollectionContractsByCollection[entry.collection].allowedStages.includes(entry.buyerStage))
      .map((entry) => `${entry.routePath}: ${entry.buyerStage} is not allowed for ${entry.collection}`);

    expect(errors).toEqual([]);
  });

  it("keeps the funnel docs table synchronized with the checked contract", () => {
    const docRows = parseFunnelTable();

    expect(docRows.map((row) => row.collection).sort()).toEqual(
      funnelCollectionContracts.map((contract) => contract.collection).sort(),
    );

    for (const contract of funnelCollectionContracts) {
      const docRow = docRows.find((row) => row.collection === contract.collection);

      expect(docRow).toEqual({
        collection: contract.collection,
        routeBase: contract.routeBase,
        hubPath: contract.hubPath,
        stage: formatStage(contract.primaryStage),
        primaryNextStep: contract.primaryNextStep,
      });
    }
  });
});

