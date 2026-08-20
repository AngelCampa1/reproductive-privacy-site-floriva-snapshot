import { describe, expect, it } from "vitest";
import {
  InvalidLeadMagnetSubscriptionError,
  createEmailHash,
  parseLeadMagnetSubscription,
} from "./lead-magnet-subscription";

describe("lead magnet subscription parsing", () => {
  it("normalizes valid email and known lead magnet slug", async () => {
    const parsed = await parseLeadMagnetSubscription({
      email: "  USER@Example.COM ",
      honeypot: "",
      leadMagnetSlug: "privacy-guide",
      sourcePath: "/resources/guides/period-tracker-hipaa",
    });

    expect(parsed.email).toBe("user@example.com");
    expect(parsed.resource.slug).toBe("privacy-guide");
    expect(parsed.sourcePath).toBe("/resources/guides/period-tracker-hipaa");
  });

  it("rejects invalid email addresses", async () => {
    await expect(
      parseLeadMagnetSubscription({
        email: "not-an-email",
        leadMagnetSlug: "privacy-guide",
        sourcePath: "/",
      }),
    ).rejects.toBeInstanceOf(InvalidLeadMagnetSubscriptionError);
  });

  it("rejects unknown resource slugs", async () => {
    await expect(
      parseLeadMagnetSubscription({
        email: "user@example.com",
        leadMagnetSlug: "missing",
        sourcePath: "/",
      }),
    ).rejects.toThrow("Unknown resource.");
  });

  it("creates stable email hashes without exposing the raw email", async () => {
    await expect(createEmailHash("USER@example.com")).resolves.toBe(await createEmailHash("user@example.com"));
    await expect(createEmailHash("user@example.com")).resolves.not.toContain("user@example.com");
  });
});
