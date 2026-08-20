import fs from "node:fs";
import path from "node:path";

// Static guard: the in-app nurture drip (floriva-email Worker) reads and writes
// lead_magnet_sequence_jobs. Confirm the migrations still define the table, the
// columns the runner depends on, and the indexes that keep the cron sweep + its
// idempotency cheap. Runs without DB access so it can gate every deploy.

const migrationsDir = "migrations";
const sql = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .map((file) => fs.readFileSync(path.join(migrationsDir, file), "utf8"))
  .join("\n")
  .toLowerCase();

const requiredTable = "lead_magnet_sequence_jobs";
const requiredColumns = [
  "sequence_step",
  "status",
  "due_at",
  "sent_at",
  "retry_count",
  "idempotency_key",
];
const requiredIndexes = [
  "idx_lead_magnet_sequence_due",
  "idx_lead_magnet_sequence_stale_processing",
  "idx_lead_magnet_sequence_unique",
];

const problems = [];

if (!new RegExp(`create table[^;]*${requiredTable}`).test(sql)) {
  problems.push(`missing CREATE TABLE for ${requiredTable}`);
}

// Scope column checks to the statements that create/alter this table (including
// the `_new` rename lineage from 0002) so a generic column name defined on some
// unrelated table can't false-satisfy the guard.
const tableStatements = sql
  .split(";")
  .filter(
    (statement) =>
      /(create table|alter table)/.test(statement) && statement.includes(requiredTable),
  )
  .join("\n");

for (const column of requiredColumns) {
  if (!tableStatements.includes(column)) {
    problems.push(`missing column ${column} on ${requiredTable}`);
  }
}

for (const index of requiredIndexes) {
  if (!sql.includes(index)) {
    problems.push(`missing index ${index}`);
  }
}

if (problems.length > 0) {
  console.error(`lead_magnet_sequence_jobs schema verification failed:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}

console.log("verified lead_magnet_sequence_jobs schema (table, columns, indexes) in migrations");
