import { useState, type FormEvent } from "react";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { florivaKnowledge } from "@/site/knowledge";

type SubmissionState = "idle" | "submitting" | "success" | "error";

type LeadMagnetInlineFormProps = {
  leadMagnetSlug: string;
  sourcePath: string;
  title: string;
};

export function LeadMagnetInlineForm({ leadMagnetSlug, sourcePath, title }: LeadMagnetInlineFormProps) {
  const copy = florivaKnowledge.leadMagnetUi.form;
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmissionState>("idle");
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("submitting");
    setError("");

    const form = new FormData(event.currentTarget);
    const honeypot = String(form.get("company") ?? "");

    try {
      const response = await fetch("/api/lead-magnet/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          honeypot,
          leadMagnetSlug,
          sourcePath,
          turnstileToken,
        }),
      });

      if (!response.ok) {
        throw new Error("Subscription failed.");
      }

      setState("success");
    } catch {
      setState("error");
      setError(copy.errorMessage);
    }
  };

  return (
    <section className="shell lead-magnet-inline" aria-labelledby="lead-magnet-inline-heading">
      <div className="section-heading">
        <p className="section-eyebrow">{copy.inlineEyebrow}</p>
        <h2 id="lead-magnet-inline-heading">{copy.inlineHeadingTemplate.replace("{title}", title)}</h2>
        <p>{copy.inlineDescription}</p>
      </div>

      {state === "success" ? (
        <div className="lead-magnet-modal__success" role="status">
          <h3>{copy.successHeading}</h3>
          <p>{copy.successBody}</p>
        </div>
      ) : (
        <form className="lead-magnet-modal__form" data-lead-magnet-form onSubmit={onSubmit}>
          <label htmlFor="lead-magnet-inline-email">{copy.emailLabel}</label>
          <input
            autoComplete="email"
            id="lead-magnet-inline-email"
            inputMode="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy.placeholder}
            required
            type="email"
            value={email}
            aria-describedby={error ? "lead-magnet-inline-error" : undefined}
            aria-invalid={state === "error" ? true : undefined}
          />
          <label className="lead-magnet-modal__honeypot" htmlFor="lead-magnet-inline-company">
            {copy.honeypotLabel}
            <input id="lead-magnet-inline-company" name="company" tabIndex={-1} type="text" />
          </label>
          <TurnstileWidget onTokenChange={setTurnstileToken} />
          <button disabled={state === "submitting"} type="submit">
            {state === "submitting" ? copy.submittingLabel : copy.submitLabel}
          </button>
          {error ? (
            <p className="lead-magnet-modal__error" id="lead-magnet-inline-error" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      )}
    </section>
  );
}
