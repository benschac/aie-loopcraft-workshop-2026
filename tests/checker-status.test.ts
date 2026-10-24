import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { once } from "node:events";
import {
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Schema } from "effect";
import { test } from "vitest";

import { readCheckerStatus } from "../src/checker-status.ts";
import { parseEvents } from "../src/issue-events.ts";
import { projectIssues } from "../src/issue-projection.ts";
import { createProjectionServer } from "../src/projection-server.ts";

const checker = fileURLToPath(new URL("../src/loop-check.ts", import.meta.url));
const statusCli = fileURLToPath(new URL("../src/status.ts", import.meta.url));
const fixture = await readFile(
  new URL("../data/issue-events.jsonl", import.meta.url),
  "utf-8"
);
const run = (script: string, cwd: string, args: string[]) =>
  spawnSync(process.execPath, [script, ...args], { cwd, encoding: "utf-8" });
const decodeStatus = Schema.decodeUnknownSync(
  Schema.Struct({
    checkedAt: Schema.NullOr(Schema.String),
    checkedSourceSha256: Schema.NullOr(Schema.String),
    fileRead: Schema.String,
    issues: Schema.Array(
      Schema.Struct({
        classification: Schema.String,
        eventId: Schema.String,
        issueId: Schema.String,
        stopReason: Schema.String,
      })
    ),
    lastCommand: Schema.NullOr(Schema.String),
    lastReceipt: Schema.NullOr(Schema.String),
    sourceSha256: Schema.String,
    state: Schema.String,
    waitingReason: Schema.String,
  })
);
const decodeReceipt = Schema.decodeUnknownSync(
  Schema.Struct({
    checkedAt: Schema.String,
    lastCommand: Schema.String,
    receiptFile: Schema.String,
    sourceSha256: Schema.String,
    statusVersion: Schema.Number,
  }),
  { onExcessProperty: "preserve" }
);
const decodeFailedStatus = Schema.decodeUnknownSync(
  Schema.Struct({ state: Schema.String })
);

const withDirectory = async (
  runTest: (directory: string, input: string) => Promise<void>
) => {
  const directory = await realpath(
    await mkdtemp(path.join(os.tmpdir(), "checker-status-"))
  );
  const input = path.join(directory, "events.jsonl");
  try {
    await writeFile(input, fixture);
    await runTest(directory, input);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
};

const readStatus = (directory: string, input: string) => {
  const result = run(statusCli, directory, [input]);
  assert.equal(result.status, 0, result.stderr);
  return decodeStatus(JSON.parse(result.stdout));
};

test("status is read-only, unchecked before a saved check, and failed on missing input or bad arguments", async () => {
  await withDirectory(async (directory, input) => {
    const status = readStatus(directory, input);
    assert.equal(status.state, "unchecked");
    assert.equal(status.checkedAt, null);
    assert.equal(status.lastCommand, null);
    assert.equal(status.lastReceipt, null);
    assert.ok(status.waitingReason.length > 0);
    assert.deepEqual(await readdir(directory), ["events.jsonl"]);
    for (const args of [["missing.jsonl"], ["--bogus"], [input, input]]) {
      const result = run(statusCli, directory, args);
      assert.equal(result.status, 1);
      assert.equal(
        decodeFailedStatus(JSON.parse(result.stdout)).state,
        "failed"
      );
    }
  });
});

test("latest receipt, status and Lakebed agree on check identity and latest facts per issue", async () => {
  await withDirectory(async (directory, input) => {
    const receipts = path.join(directory, "receipts");
    assert.equal(run(checker, directory, [input, "--receipt"]).status, 0);
    const first = readStatus(directory, input);
    const events = parseEvents(fixture, "fixture");
    const next = {
      ...events[0],
      eventId: "latest-fact",
      gate: "input-required",
    };
    const changed = `${fixture.trimEnd()}\n${JSON.stringify(next)}\n`;
    await writeFile(input, changed);
    const stale = readStatus(directory, input);
    assert.equal(stale.state, "stale");
    assert.equal(stale.lastReceipt, first.lastReceipt);
    assert.notEqual(stale.sourceSha256, stale.checkedSourceSha256);
    // A different source's newer receipt must not replace this file's status.
    const other = path.join(directory, "other.jsonl");
    await writeFile(other, fixture);
    assert.equal(run(checker, directory, [other, "--receipt"]).status, 0);
    assert.equal(readStatus(directory, input).lastReceipt, first.lastReceipt);
    assert.equal(run(checker, directory, [input, "--receipt"]).status, 0);
    const status = readStatus(directory, input);
    assert.equal(status.state, "done");
    assert.notEqual(status.lastReceipt, first.lastReceipt);
    assert.ok(typeof status.lastReceipt === "string");
    const receipt = decodeReceipt(
      JSON.parse(await readFile(status.lastReceipt, "utf-8"))
    );
    assert.equal(status.checkedAt, receipt.checkedAt);
    assert.equal(status.lastCommand, receipt.lastCommand);
    assert.equal(status.lastReceipt, receipt.receiptFile);
    assert.equal(status.sourceSha256, receipt.sourceSha256);
    assert.equal(status.checkedSourceSha256, receipt.sourceSha256);
    assert.equal(status.issues.length, 3);
    assert.equal(status.issues[0]?.eventId, "latest-fact");
    assert.equal(status.issues[0]?.classification, "input-required");

    const server = createProjectionServer(input, receipts);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
      const address = server.address();
      assert.ok(address !== null && typeof address !== "string");
      const url = `http://127.0.0.1:${address.port}/api/issues`;
      const response = await fetch(url);
      const projection = projectIssues(changed, input);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        ...projection,
        checker: status,
      });
      assert.deepEqual(
        projection.cards.map(
          ({ classification, eventId, issueId, stopReason }) => ({
            classification,
            eventId,
            issueId,
            stopReason,
          })
        ),
        status.issues
      );
      assert.equal(await readFile(input, "utf-8"), changed);
      await writeFile(input, `${changed}{`);
      const failedCheck = run(checker, directory, [input, "--receipt"]);
      assert.equal(failedCheck.status, 1);
      assert.equal(readStatus(directory, input).state, "stale");
      const invalid = await fetch(url);
      assert.equal(invalid.status, 422);
      const names = await readdir(receipts);
      assert.equal(names.length, 3);
    } finally {
      const closed = once(server, "close");
      server.closeAllConnections();
      server.close();
      await closed;
    }
  });
});

test("legacy receipts cannot claim freshness; malformed new receipts fail closed", async () => {
  await withDirectory(async (directory, input) => {
    assert.equal(run(checker, directory, [input, "--receipt"]).status, 0);
    const status = readStatus(directory, input);
    assert.ok(typeof status.lastReceipt === "string");
    const value = decodeReceipt(
      JSON.parse(await readFile(status.lastReceipt, "utf-8"))
    );
    const { statusVersion, ...legacy } = value;
    assert.equal(statusVersion, 1);
    await writeFile(status.lastReceipt, JSON.stringify(legacy));
    assert.equal(readStatus(directory, input).state, "unchecked");
    for (const checkedAt of ["invalid", "2020-01-01"]) {
      // Sequential writes exercise different corruptions of the same receipt.
      // oxlint-disable-next-line no-await-in-loop
      await writeFile(
        status.lastReceipt,
        JSON.stringify({ ...value, checkedAt })
      );
      // oxlint-disable-next-line no-await-in-loop
      await assert.rejects(
        readCheckerStatus(
          input,
          status.sourceSha256,
          path.join(directory, "receipts")
        )
      );
    }
    await writeFile(status.lastReceipt, "{");
    assert.equal(run(statusCli, directory, [input]).status, 1);
  });
});
