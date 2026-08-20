import { florivaKnowledge } from "../../src/site/knowledge";
import type { LeadMagnetResource, LeadMagnetSequenceEmail } from "../../src/site/lead-magnets";

type DeliveryEmailInput = {
  downloadUrl: string;
  leadMagnetTitle: string;
  siteOrigin: string;
  unsubscribeUrl: string;
};

type SequenceEmailInput = {
  email: LeadMagnetSequenceEmail;
  resource: LeadMagnetResource;
  siteOrigin: string;
  unsubscribeUrl: string;
};

type BuiltEmail = {
  headers: Record<string, string>;
  html: string;
  subject: string;
  text: string;
};

function unsubscribeHeaders(unsubscribeUrl: string): Record<string, string> {
  const safe = unsubscribeUrl.replace(/[\r\n]/g, "");
  return {
    "List-Unsubscribe": `<${safe}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeHtmlWithCurlyQuotes(value: string): string {
  return escapeHtml(value).replace(/&quot;([^&]*)&quot;/g, "&ldquo;$1&rdquo;");
}

function ctaButton(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
        <tr>
          <td style="border-radius:999px;background:#496f50;">
            <a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-weight:700;font-family:Manrope,Segoe UI,Arial,sans-serif;font-size:15px;">${escapeHtml(label)}</a>
          </td>
        </tr>
      </table>`;
}

function header(siteOrigin: string): string {
  const logoUrl = escapeHtml(new URL("/logo-mark.png", siteOrigin).toString());
  const shellCopy = florivaKnowledge.emails.shell;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">
          <tr>
            <td style="vertical-align:middle;padding-right:12px;">
              <img src="${logoUrl}" width="36" height="36" alt="${escapeHtml(shellCopy.brandAlt)}" style="display:block;border:0;width:36px;height:36px;object-fit:contain;" />
            </td>
            <td style="vertical-align:middle;color:#5f7f63;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:11px;font-family:Manrope,Segoe UI,Arial,sans-serif;">
              ${escapeHtml(shellCopy.brandLabel)}
            </td>
          </tr>
        </table>`;
}

function transparencyFooter({
  leadMagnetTitle,
  unsubscribeUrl,
}: {
  leadMagnetTitle: string;
  unsubscribeUrl: string;
}): string {
  const shellCopy = florivaKnowledge.emails.shell;
  const reason = shellCopy.footer.reasonTemplate.replace("{leadMagnetTitle}", leadMagnetTitle);
  return `<hr style="border:0;border-top:1px solid #e3dac9;margin:28px 0 16px;" />
        <p style="margin:0 0 6px;color:#7d7268;font-size:12px;line-height:1.55;font-family:Manrope,Segoe UI,Arial,sans-serif;">${escapeHtmlWithCurlyQuotes(reason)}</p>
        <p style="margin:0;color:#7d7268;font-size:12px;line-height:1.55;font-family:Manrope,Segoe UI,Arial,sans-serif;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#7d7268;text-decoration:underline;">${escapeHtml(shellCopy.footer.unsubscribeLabel)}</a> &middot; ${escapeHtml(shellCopy.footer.privacyLine)}</p>`;
}

function shell({
  body,
  footer,
  preview,
  siteOrigin,
}: {
  body: string;
  footer: string;
  preview: string;
  siteOrigin: string;
}): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
  </head>
  <body style="margin:0;background:#f8f4ea;color:#3f332b;font-family:Manrope,Segoe UI,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f8f4ea;">${escapeHtml(preview)}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8f4ea;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;">
            <tr>
              <td style="border:1px solid #d9d0bf;background:#fffaf0;border-radius:18px;padding:28px;">
                ${header(siteOrigin)}
                ${body}
                ${footer}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function plainTextFooter({
  leadMagnetTitle,
  unsubscribeUrl,
}: {
  leadMagnetTitle: string;
  unsubscribeUrl: string;
}): string {
  const shellCopy = florivaKnowledge.emails.shell;
  return [
    shellCopy.footer.reasonTemplate.replace("{leadMagnetTitle}", leadMagnetTitle),
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");
}

export function buildLeadMagnetDeliveryEmail(input: DeliveryEmailInput): BuiltEmail {
  const shellCopy = florivaKnowledge.emails.shell;
  const title = escapeHtml(input.leadMagnetTitle);
  const downloadUrl = escapeHtml(input.downloadUrl);
  const subject = shellCopy.delivery.subjectTemplate.replace("{leadMagnetTitle}", input.leadMagnetTitle);
  const preview = shellCopy.delivery.previewTemplate.replace("{leadMagnetTitle}", input.leadMagnetTitle);
  const body = `
        <h1 style="font-family:Georgia,serif;font-size:26px;line-height:1.18;margin:0 0 14px;color:#36553d;">Your ${title} is ready</h1>
        <p style="font-size:15px;line-height:1.65;margin:0 0 16px;color:#3f332b;">${escapeHtml(shellCopy.delivery.body)}</p>
        ${ctaButton(input.downloadUrl, shellCopy.delivery.buttonLabel)}
        <p style="font-size:14px;line-height:1.65;margin:0 0 6px;color:#5a4f44;">${escapeHtml(shellCopy.delivery.linkFallback)}</p>
        <p style="font-size:13px;line-height:1.55;margin:0;word-break:break-all;"><a href="${downloadUrl}" style="color:#496f50;">${downloadUrl}</a></p>
      `;

  return {
    subject,
    headers: unsubscribeHeaders(input.unsubscribeUrl),
    html: shell({
      body,
      footer: transparencyFooter({
        leadMagnetTitle: input.leadMagnetTitle,
        unsubscribeUrl: input.unsubscribeUrl,
      }),
      preview,
      siteOrigin: input.siteOrigin,
    }),
    text: [
      subject,
      "----",
      shellCopy.delivery.body,
      "",
      `${shellCopy.delivery.buttonLabel}: ${input.downloadUrl}`,
      "",
      plainTextFooter({
        leadMagnetTitle: input.leadMagnetTitle,
        unsubscribeUrl: input.unsubscribeUrl,
      }),
    ].join("\n"),
  };
}

function bulletList(bullets: readonly string[]): string {
  const items = bullets
    .map(
      (bullet) =>
        `<li style="margin:0 0 8px;">${escapeHtmlWithCurlyQuotes(bullet)}</li>`,
    )
    .join("");

  return `<ul style="font-size:15px;line-height:1.65;margin:0 0 16px;padding-left:20px;color:#3f332b;">${items}</ul>`;
}

// Renders one nurture-sequence step (emails 2-8). Content is resolved lazily from
// the shared catalog at send time; only the schedule is frozen at enroll time.
export function buildLeadMagnetSequenceEmail(input: SequenceEmailInput): BuiltEmail {
  const { email, resource, siteOrigin, unsubscribeUrl } = input;
  const ctaUrl = new URL(email.ctaPath, siteOrigin).toString();

  const paragraphs: string[] = [
    `<p style="font-size:15px;line-height:1.65;margin:0 0 16px;color:#3f332b;">${escapeHtmlWithCurlyQuotes(email.opening)}</p>`,
  ];

  if (email.body) {
    paragraphs.push(
      `<p style="font-size:15px;line-height:1.65;margin:0 0 16px;color:#3f332b;">${escapeHtmlWithCurlyQuotes(email.body)}</p>`,
    );
  }

  if (email.bullets && email.bullets.length > 0) {
    paragraphs.push(bulletList(email.bullets));
  }

  paragraphs.push(ctaButton(ctaUrl, email.ctaLabel));

  if (email.postscript) {
    paragraphs.push(
      `<p style="font-size:13px;line-height:1.6;margin:0;color:#5a4f44;">${escapeHtmlWithCurlyQuotes(email.postscript)}</p>`,
    );
  }

  const body = `
        <h1 style="font-family:Georgia,serif;font-size:24px;line-height:1.2;margin:0 0 14px;color:#36553d;">${escapeHtmlWithCurlyQuotes(email.subject)}</h1>
        ${paragraphs.join("\n        ")}
      `;

  const textLines: string[] = [email.subject, "----", email.opening];

  if (email.body) {
    textLines.push("", email.body);
  }

  if (email.bullets && email.bullets.length > 0) {
    textLines.push("", ...email.bullets.map((bullet) => `- ${bullet}`));
  }

  textLines.push("", `${email.ctaLabel}: ${ctaUrl}`);

  if (email.postscript) {
    textLines.push("", email.postscript);
  }

  textLines.push(
    "",
    plainTextFooter({ leadMagnetTitle: resource.title, unsubscribeUrl }),
  );

  return {
    subject: email.subject,
    headers: unsubscribeHeaders(unsubscribeUrl),
    html: shell({
      body,
      footer: transparencyFooter({ leadMagnetTitle: resource.title, unsubscribeUrl }),
      preview: email.preview,
      siteOrigin,
    }),
    text: textLines.join("\n"),
  };
}

