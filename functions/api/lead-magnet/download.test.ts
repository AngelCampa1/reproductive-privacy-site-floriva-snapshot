import { describe, expect, it } from "vitest";
import { createSignedLeadMagnetDownloadUrl } from "../../_lib/lead-magnet-download";
import { getLeadMagnetResource } from "../../../src/site/lead-magnets";
import { onRequest } from "./download";

const secret = "test-download-signing-secret";
const resource = getLeadMagnetResource("privacy-guide")!;

type StatementCall = {
  binds: unknown[];
  sql: string;
};

function createFakeD1({
  firstResult = { id: "lead-1", status: "active" },
  rejectRun = false,
}: { firstResult?: unknown; rejectRun?: boolean } = {}) {
  const calls: StatementCall[] = [];

  return {
    calls,
    db: {
      prepare(sql: string) {
        return {
          bind(...binds: unknown[]) {
            calls.push({ binds, sql });

            return {
              async run() {
                if (rejectRun) {
                  throw new Error("D1 insert failed");
                }
                return { meta: { changes: 1 } };
              },
              async first() {
                return firstResult;
              },
            };
          },
        };
      },
    } as unknown as D1Database,
  };
}

function createContext(url: string, bucket: Partial<R2Bucket>, db?: D1Database): Parameters<typeof onRequest>[0] {
  return {
    data: {},
    env: {
      ASSETS: { fetch: async () => new Response(null) } as unknown as Fetcher,
      LEAD_MAGNET_BUCKET: bucket as R2Bucket,
      LEAD_MAGNET_DB: db,
      LEAD_MAGNET_DOWNLOAD_SIGNING_SECRET: secret,
    },
    functionPath: "/api/lead-magnet/download",
    next: (() => Promise.resolve(new Response(null))) as Parameters<typeof onRequest>[0]["next"],
    passThroughOnException: () => undefined,
    params: {},
    request: new Request(url),
    waitUntil: (promise) => {
      void promise;
    },
  };
}

describe("lead magnet download endpoint", () => {
  it("streams the private R2 object for a valid signed URL", async () => {
    const body = "%PDF-privacy-guide";
    const { calls, db } = createFakeD1();
    const url = await createSignedLeadMagnetDownloadUrl({
      leadId: "lead-1",
      now: new Date(),
      origin: "https://floriva.app",
      resource,
      secret,
    });
    const response = await onRequest(
      createContext(
        url,
        {
          get: async (key: string) => {
            expect(key).toBe(resource.r2Key);

            return new Response(body, {
              headers: { "Content-Type": "application/pdf" },
            }) as unknown as R2ObjectBody;
          },
        },
        db,
      ),
    );

    const eventInsert = calls.find((call) => call.sql.includes("INSERT INTO lead_magnet_events"));

    await expect(response.text()).resolves.toBe(body);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain(resource.downloadFileName);
    expect(eventInsert?.binds[1]).toBe("lead-1");
    expect(eventInsert?.binds[2]).toBe("resource_downloaded");
    expect(eventInsert?.binds[3]).toBe(JSON.stringify({ slug: "privacy-guide" }));
  });

  it("still streams the PDF when download event recording fails", async () => {
    const body = "%PDF-privacy-guide";
    const { db } = createFakeD1({ rejectRun: true });
    const url = await createSignedLeadMagnetDownloadUrl({
      leadId: "lead-1",
      now: new Date(),
      origin: "https://floriva.app",
      resource,
      secret,
    });
    const response = await onRequest(
      createContext(
        url,
        {
          get: async () =>
            new Response(body, {
              headers: { "Content-Type": "application/pdf" },
            }) as unknown as R2ObjectBody,
        },
        db,
      ),
    );

    await expect(response.text()).resolves.toBe(body);
    expect(response.status).toBe(200);
  });

  it("returns 403 for an expired signed URL", async () => {
    const url = await createSignedLeadMagnetDownloadUrl({
      now: new Date("2026-04-01T12:00:00.000Z"),
      origin: "https://floriva.app",
      resource,
      secret,
    });
    const response = await onRequest(createContext(url, { get: async () => null }));

    expect(response.status).toBe(403);
  });

  it("rejects signed lead download links for unknown leads before reading R2", async () => {
    let bucketRead = false;
    const { db } = createFakeD1({ firstResult: null });
    const url = await createSignedLeadMagnetDownloadUrl({
      leadId: "missing-lead",
      now: new Date(),
      origin: "https://floriva.app",
      resource,
      secret,
    });

    const response = await onRequest(createContext(url, {
      get: async () => {
        bucketRead = true;
        return null;
      },
    }, db));

    expect(response.status).toBe(403);
    expect(bucketRead).toBe(false);
  });

  it("rejects signed lead download links for unsubscribed leads before reading R2", async () => {
    let bucketRead = false;
    const { db } = createFakeD1({ firstResult: { id: "lead-1", status: "unsubscribed" } });
    const url = await createSignedLeadMagnetDownloadUrl({
      leadId: "lead-1",
      now: new Date(),
      origin: "https://floriva.app",
      resource,
      secret,
    });

    const response = await onRequest(createContext(url, {
      get: async () => {
        bucketRead = true;
        return null;
      },
    }, db));

    expect(response.status).toBe(403);
    expect(bucketRead).toBe(false);
  });
});
