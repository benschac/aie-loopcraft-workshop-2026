import path from "node:path";

import { createProjectionServer } from "./projection-server.ts";

const args = process.argv.slice(2);
if (args.length > 1 || args.some((arg) => arg.startsWith("-"))) {
  console.error("Usage: pnpm run issues:serve [file.jsonl]");
  process.exitCode = 1;
} else {
  const fileRead = path.resolve(args[0] ?? "data/issue-events.jsonl");
  const server = createProjectionServer(fileRead);
  server.on("error", (error) => {
    console.error(`PROJECTION FAILED: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(8788, "127.0.0.1", () => {
    console.log(`Read-only projection: http://127.0.0.1:8788/api/issues`);
    console.log(`Reading: ${fileRead}`);
  });
}
