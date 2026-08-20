const EMAIL_ATTEMPT_LIMIT = 3;
const IP_ATTEMPT_LIMIT = 30;
const WINDOW_MS = 10 * 60 * 1000;

type CountResult = {
  count: number;
};

function windowStart(): string {
  return new Date(Date.now() - WINDOW_MS).toISOString();
}

function clientKey(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function isLeadMagnetSubmissionRateLimited({
  db,
  emailHash,
  request,
}: {
  db: D1Database;
  emailHash: string;
  request: Request;
}): Promise<boolean> {
  const since = windowStart();
  const emailAttempts = await db
    .prepare("SELECT COUNT(*) AS count FROM lead_magnet_submission_attempts WHERE email_hash = ? AND created_at >= ?")
    .bind(emailHash, since)
    .first<CountResult>();

  if ((emailAttempts?.count ?? 0) >= EMAIL_ATTEMPT_LIMIT) {
    return true;
  }

  const ipAttempts = await db
    .prepare("SELECT COUNT(*) AS count FROM lead_magnet_submission_attempts WHERE client_key = ? AND created_at >= ?")
    .bind(clientKey(request), since)
    .first<CountResult>();

  return (ipAttempts?.count ?? 0) >= IP_ATTEMPT_LIMIT;
}

export async function recordLeadMagnetSubmissionAttempt({
  db,
  emailHash,
  request,
}: {
  db: D1Database;
  emailHash: string;
  request: Request;
}): Promise<void> {
  await db
    .prepare(
      `INSERT INTO lead_magnet_submission_attempts (id, email_hash, client_key, created_at)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(crypto.randomUUID(), emailHash, clientKey(request), new Date().toISOString())
    .run();
}
