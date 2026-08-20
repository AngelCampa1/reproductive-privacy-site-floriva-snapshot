import { describe, expect, it } from "vitest";
import { buildLeadMagnetDeliveryEmail } from "./lead-magnet-email";

const SITE_ORIGIN = "https://floriva.app";
const UNSUBSCRIBE_URL = "https://floriva.app/api/lead-magnet/unsubscribe?t=abc";

describe("lead magnet email copy", () => {
  it("builds an immediate delivery email with unsubscribe controls", () => {
    const email = buildLeadMagnetDeliveryEmail({
      downloadUrl: "https://floriva.app/api/lead-magnet/download?slug=privacy-guide&exp=1&sig=abc",
      leadMagnetTitle: "Period Tracker Privacy Guide",
      siteOrigin: SITE_ORIGIN,
      unsubscribeUrl: UNSUBSCRIBE_URL,
    });

    expect(email.subject).toContain("Period Tracker Privacy Guide");
    expect(email.html).toContain("https://floriva.app/api/lead-magnet/download");
    expect(email.text).toContain("https://floriva.app/api/lead-magnet/download");
    expect(email.html).not.toContain("downloads/lead-magnets");
    expect(email.html).toContain('src="https://floriva.app/logo-mark.png"');
    expect(email.html).toContain('alt="Floriva"');
    expect(email.headers["List-Unsubscribe"]).toBe(`<${UNSUBSCRIBE_URL}>`);
    expect(email.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(email.html).toContain("Unsubscribe");
    expect(email.text).toContain(`Unsubscribe: ${UNSUBSCRIBE_URL}`);
  });

  it("renders a transparency footer reason line on delivery emails", () => {
    const email = buildLeadMagnetDeliveryEmail({
      downloadUrl: "https://floriva.app/api/lead-magnet/download?slug=privacy-guide&exp=1&sig=abc",
      leadMagnetTitle: "Period Tracker Privacy Guide",
      siteOrigin: SITE_ORIGIN,
      unsubscribeUrl: UNSUBSCRIBE_URL,
    });

    expect(email.html).toContain("you downloaded");
    expect(email.html).toContain("Period Tracker Privacy Guide");
    expect(email.html).toContain("&ldquo;Period Tracker Privacy Guide&rdquo;");
    expect(email.html).not.toContain("&ldquo;Period Tracker Privacy Guide&ldquo;");
    expect(email.text).toContain('you downloaded "Period Tracker Privacy Guide"');
  });
});
