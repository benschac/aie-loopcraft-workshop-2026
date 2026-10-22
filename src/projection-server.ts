import { readFile } from "node:fs/promises";
import { createServer } from "node:http";

import { projectIssues } from "./issue-projection.ts";

/** No cache and no writes: a bad file never produces partial or stale cards. */
export const createProjectionServer = (fileRead: string) =>
  createServer(async (request, response) => {
    const { origin } = request.headers;
    if (origin && !/^http:\/\/(?:localhost|127\.0\.0\.1):3000$/u.test(origin)) {
      response.writeHead(403).end();
      return;
    }
    if (origin) {
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Vary", "Origin");
    }
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    if (request.url !== "/api/issues") {
      response.writeHead(404).end(JSON.stringify({ error: "Not found" }));
      return;
    }
    if (request.method !== "GET") {
      response.setHeader("Allow", "GET");
      response
        .writeHead(405)
        .end(JSON.stringify({ error: "Read-only endpoint" }));
      return;
    }
    try {
      const projection = projectIssues(
        await readFile(fileRead, "utf-8"),
        fileRead
      );
      response.end(JSON.stringify(projection));
    } catch (error) {
      response.writeHead(422).end(
        JSON.stringify({
          complete: false,
          error: error instanceof Error ? error.message : String(error),
          nextAllowedAction:
            "Correct the input with human approval, then refresh.",
          stopReason: "Invalid input or I/O failure; no cards returned.",
        })
      );
    }
  });
