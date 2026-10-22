import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { readCheckerStatus } from "./checker-status.ts";

try {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some((arg) => arg.startsWith("-"))) {
    throw new Error("Usage: pnpm run issues:status [file.jsonl]");
  }
  const fileRead = path.resolve(args[0] ?? "data/issue-events.jsonl");
  const text = await readFile(fileRead, "utf-8");
  const status = await readCheckerStatus(
    fileRead,
    createHash("sha256").update(text).digest("hex")
  );
  console.log(JSON.stringify(status, null, 2));
} catch (error) {
  console.log(
    JSON.stringify(
      {
        checkedAt: null,
        lastCommand: null,
        lastReceipt: null,
        state: "failed",
        waitingReason: error instanceof Error ? error.message : String(error),
      },
      null,
      2
    )
  );
  process.exitCode = 1;
}
