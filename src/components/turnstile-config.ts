export const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? "";

export function hasTurnstileSiteKey(): boolean {
  return turnstileSiteKey.length > 0;
}
