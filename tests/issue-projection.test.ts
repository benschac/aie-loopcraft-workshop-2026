import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { test } from "vitest";

import { checkIssues } from "../src/issue-events.ts";
import { projectIssues } from "../src/issue-projection.ts";
import { createProjectionServer } from "../src/projection-server.ts";

const file = path.resolve("data/issue-events.jsonl");

test("projection preserves every checker decision and traces each card to its events", async () => {
  const text = await readFile(file, "utf-8");
  const report = checkIssues(text, file);
  const projection = projectIssues(text, file);
  assert.deepEqual(projection.counts, {
    "approval-required": 1,
    "input-required": 1,
    ready: 1,
  });
  assert.equal(projection.fileRead, file);
  assert.match(projection.sourceSha256, /^[a-f0-9]{64}$/u);
  assert.deepEqual(projection.events, report.events);
  assert.deepEqual(
    projection.cards.map(({ events, ...finding }) => {
      assert.ok(events.some((event) => event.eventId === finding.eventId));
      return finding;
    }),
    report.classifications
  );
});

test("multiple events keep history but only the latest classification becomes a card", async () => {
  const text = await readFile(file, "utf-8");
  const [first] = checkIssues(text, file).events;
  assert.ok(first);
  const next = { ...first, eventId: "new-fact", gate: "input-required" };
  const projection = projectIssues(
    `${text.trimEnd()}\n${JSON.stringify(next)}\n`,
    file
  );
  assert.equal(projection.cards.length, 3);
  const card = projection.cards.find((item) => item.issueId === first.issueId);
  assert.equal(card?.eventId, "new-fact");
  assert.equal(card.classification, "input-required");
  assert.equal(card.events.length, 2);
  assert.equal(projection.counts.ready, 0);
  assert.equal(projection.counts["input-required"], 2);
});

test("HTTP read uses fresh file content, refuses writes and origins, and fails closed", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "projection-"));
  const input = path.join(directory, "events.jsonl");
  const text = await readFile(file, "utf-8");
  await writeFile(input, text);
  const server = createProjectionServer(input);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const url = `http://127.0.0.1:${address.port}/api/issues`;
    const response = await fetch(url, {
      headers: { Origin: "http://localhost:3000" },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(
      response.headers.get("access-control-allow-origin"),
      "http://localhost:3000"
    );
    assert.deepEqual(await response.json(), projectIssues(text, input));
    const write = await fetch(url, { body: "{}", method: "POST" });
    assert.equal(write.status, 405);
    const foreign = await fetch(url, {
      headers: { Origin: "https://example.com" },
    });
    assert.equal(foreign.status, 403);
    const missing = await fetch(`${url}/missing`);
    assert.equal(missing.status, 404);
    assert.equal(await readFile(input, "utf-8"), text);
    await writeFile(input, `${text}\n{`);
    const invalid = await fetch(url);
    assert.equal(invalid.status, 422);
    const body = await invalid.text();
    assert.match(body, /"complete":false/u);
    assert.doesNotMatch(body, /"cards"/u);
    assert.ok(body.includes(input));
    await rm(input);
    const removed = await fetch(url);
    assert.equal(removed.status, 422);
  } finally {
    const closed = once(server, "close");
    server.closeAllConnections();
    server.close();
    await closed;
    await rm(directory, { force: true, recursive: true });
  }
});
