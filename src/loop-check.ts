import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { checkIssues } from "./issue-events.ts";

const main = async () => {
  const args = process.argv.slice(2);
  const files = args.filter((arg) => arg !== "--receipt");
  if (
    files.length > 1 ||
    args.filter((arg) => arg === "--receipt").length > 1 ||
    files.some((arg) => arg.startsWith("-"))
  ) {
    throw new Error("Usage: pnpm run issues:check [file.jsonl] [--receipt]");
  }
  const fileRead = path.resolve(files[0] ?? "data/issue-events.jsonl");
  console.log(`Reading: ${fileRead}`);
  const report = checkIssues(await readFile(fileRead, "utf-8"), fileRead);
  const receiptFile = args.includes("--receipt")
    ? path.resolve("receipts", `check-${randomUUID()}.json`)
    : null;
  const output = `${JSON.stringify({ ...report, receiptFile }, null, 2)}\n`;
  if (receiptFile !== null) {
    await mkdir(path.dirname(receiptFile), { recursive: true });
    await writeFile(receiptFile, output, { flag: "wx" });
  }
  process.stdout.write(output);
};

try {
  await main();
} catch (error) {
  console.error(
    `CHECK FAILED: ${error instanceof Error ? error.message : String(error)}`
  );
  console.error(
    "Stop reason: invalid input or I/O failure; check incomplete. No proposal executed."
  );
  console.error(
    "Next allowed action: correct the input or receipt path with human approval, then rerun."
  );
  console.error(
    "Refused action: report success, execute proposals, or continue with a partial file."
  );
  process.exitCode = 1;
}
