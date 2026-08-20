import { spawn } from "node:child_process";

const command = process.env.npm_execpath ? process.execPath : process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const args = [
  ...(process.env.npm_execpath ? [process.env.npm_execpath] : []),
  "exec",
  "wrangler",
  "d1",
  "migrations",
  "apply",
  "floriva-db",
  "--remote",
];
const child = spawn(
  command,
  args,
  {
    stdio: ["pipe", "inherit", "inherit"],
    shell: false,
  },
);

child.stdin.end("y\n");

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
