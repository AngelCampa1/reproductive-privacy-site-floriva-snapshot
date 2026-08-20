import { describe, expect, it } from "vitest";
import { getLeadMagnetResource } from "../../src/site/lead-magnets";
import {
  createSignedLeadMagnetDownloadUrl,
  verifySignedLeadMagnetDownloadUrl,
} from "./lead-magnet-download";

const secret = "test-download-signing-secret";
const resource = getLeadMagnetResource("privacy-guide")!;
const now = new Date("2026-04-26T12:00:00.000Z");

describe("lead magnet signed downloads", () => {
  it("creates app-hosted signed links for R2 resources", async () => {
    const url = await createSignedLeadMagnetDownloadUrl({
      leadId: "lead-1",
      now,
      origin: "https://floriva.app",
      resource,
      secret,
    });

    expect(url).toMatch(/^https:\/\/floriva\.app\/api\/lead-magnet\/download\?/);
    expect(url).toContain("lead=lead-1");
    expect(url).toContain("slug=privacy-guide");
    expect(url).not.toContain(resource.r2Key);

    const verified = await verifySignedLeadMagnetDownloadUrl(new URL(url), secret, now);

    expect(verified.ok).toBe(true);
    expect(verified.ok ? verified.leadId : "").toBe("lead-1");
    expect(verified.ok ? verified.resource.slug : "").toBe("privacy-guide");
  });

  it("rejects tampered and expired signed links", async () => {
    const url = new URL(
      await createSignedLeadMagnetDownloadUrl({
        now,
        origin: "https://floriva.app",
        resource,
        secret,
      }),
    );

    const tampered = new URL(url);
    tampered.searchParams.set("slug", "state-risk-scorecard");

    await expect(verifySignedLeadMagnetDownloadUrl(tampered, secret, now)).resolves.toMatchObject({
      ok: false,
      reason: "invalid_signature",
    });

    await expect(
      verifySignedLeadMagnetDownloadUrl(url, secret, new Date("2026-05-05T12:00:00.000Z")),
    ).resolves.toMatchObject({
      ok: false,
      reason: "expired",
    });
  });

  it("continues to verify legacy links without a lead id", async () => {
    const url = await createSignedLeadMagnetDownloadUrl({
      now,
      origin: "https://floriva.app",
      resource,
      secret,
    });

    expect(url).not.toContain("lead=");

    const verified = await verifySignedLeadMagnetDownloadUrl(new URL(url), secret, now);

    expect(verified.ok).toBe(true);
    expect(verified.ok ? verified.leadId : "unexpected").toBeUndefined();
    expect(verified.ok ? verified.resource.slug : "").toBe("privacy-guide");
  });
});
