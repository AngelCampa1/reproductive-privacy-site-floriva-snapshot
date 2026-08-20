// Test stub for the Workers-only `cloudflare:email` module. Aliased in
// vitest.config.ts so unit tests can import send-email.ts without the Workers
// runtime. The real module is provided by wrangler at build/deploy time.
export class EmailMessage {
  from: string;
  to: string;
  raw: string;

  constructor(from: string, to: string, raw: string) {
    this.from = from;
    this.to = to;
    this.raw = raw;
  }
}
