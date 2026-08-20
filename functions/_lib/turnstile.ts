import type { EdgeEnv } from "./bindings";

export type TurnstileVerificationResult =
  | { ok: true }
  | { ok: false; reason: "missing-token" | "misconfigured" | "siteverify-failed" };

type SiteverifyResponse = {
  success?: boolean;
};

function isProductionRequest(request: Request, env: EdgeEnv): boolean {
  const hostname = new URL(request.url).hostname;

  return env.SENTRY_ENVIRONMENT === "production" || hostname === "floriva.app" || hostname.endsWith(".floriva.app");
}

function hasLeadMagnetSideEffects(env: EdgeEnv): boolean {
  return Boolean(
    env.LEAD_MAGNET_DB &&
      env.LEAD_MAGNET_BUCKET &&
      env.LEAD_MAGNET_DOWNLOAD_SIGNING_SECRET?.trim() &&
      env.EMAIL_WORKER &&
      env.INTERNAL_SEND_SECRET?.trim(),
  );
}

export async function verifyTurnstile({
  env,
  request,
  token,
}: {
  env: EdgeEnv;
  request: Request;
  token: string;
}): Promise<TurnstileVerificationResult> {
  const trimmedToken = token.trim();

  if (!trimmedToken) {
    return { ok: false, reason: "missing-token" };
  }

  const secret = env.TURNSTILE_SECRET_KEY?.trim();

  if (!secret) {
    return isProductionRequest(request, env) || hasLeadMagnetSideEffects(env)
      ? { ok: false, reason: "misconfigured" }
      : { ok: true };
  }

  try {
    const form = new FormData();
    form.set("secret", secret);
    form.set("response", trimmedToken);

    const remoteIp = request.headers.get("cf-connecting-ip")?.trim();

    if (remoteIp) {
      form.set("remoteip", remoteIp);
    }

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      body: form,
      method: "POST",
    });

    if (!response.ok) {
      return { ok: false, reason: "siteverify-failed" };
    }

    const body = (await response.json().catch(() => null)) as SiteverifyResponse | null;

    return body?.success === true ? { ok: true } : { ok: false, reason: "siteverify-failed" };
  } catch {
    return { ok: false, reason: "siteverify-failed" };
  }
}
