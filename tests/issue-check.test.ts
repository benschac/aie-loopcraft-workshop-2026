import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { test } from "vitest";

import {
  checkIssues,
  InvalidIssueFileError,
  parseEvents,
} from "../src/issue-events.ts";

const fixturePath = fileURLToPath(
  new URL("../data/issue-events.jsonl", import.meta.url)
);
const cliPath = fileURLToPath(new URL("../src/loop-check.ts", import.meta.url));
const sample = {
  eventId: "event-1",
  gate: "ready",
  issueId: "LOCAL-1",
  proposedAction: "Document the command after approval.",
  reason: "The command is known.",
  title: "Document check",
  type: "issue-recorded",
};
const validRow = JSON.stringify(sample);

const runCli = (cwd: string, args: string[]) =>
  spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: "utf-8",
  });

const withDirectory = async (run: (directory: string) => Promise<void>) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "issue-check-"));
  try {
    await run(directory);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
};

test("real examples classify every event without granting implementation permission", async () => {
  const text = await readFile(fixturePath, "utf-8");
  const report = checkIssues(text, fixturePath);
  assert.equal(report.complete, true);
  assert.equal(report.fileRead, fixturePath);
  assert.equal(report.eventCount, 3);
  assert.deepEqual(
    report.classifications.map((item) => item.classification),
    ["ready", "approval-required", "input-required"]
  );
  for (const item of report.classifications) {
    assert.ok(item.reason);
    assert.ok(item.stopReason);
    assert.ok(item.nextAllowedAction);
    assert.match(item.refusedAction, /Execute the proposal/u);
  }
  assert.match(
    report.classifications[0]?.nextAllowedAction ?? "",
    /approval; do not execute/u
  );
});

test("all malformed rows are reported with physical file and line, with no partial result", () => {
  assert.throws(
    () => parseEvents(`${validRow}\n{\n{}\nnull\n`, "queue.jsonl"),
    // assert.throws takes a synchronous error validator, not a completion callback.
    // oxlint-disable-next-line promise/prefer-await-to-callbacks
    (error: unknown) =>
      error instanceof InvalidIssueFileError &&
      error.message.includes("queue.jsonl:2") &&
      error.message.includes("queue.jsonl:3") &&
      error.message.includes("queue.jsonl:4")
  );
});

test("reject empty files, blank rows, unknown gates, fields, duplicates and whitespace-only values", () => {
  const invalidFiles = [
    "",
    "\n",
    `${validRow}\n\n`,
    JSON.stringify({ ...sample, gate: "approved" }),
    JSON.stringify({ ...sample, surprise: true }),
    JSON.stringify({ ...sample, title: "  " }),
    JSON.stringify({ ...sample, proposedAction: 42 }),
    JSON.stringify({ ...sample, reason: null }),
    JSON.stringify({ eventId: "only-an-id" }),
    `${validRow}\n${validRow}`,
  ];
  for (const text of invalidFiles) {
    assert.throws(
      () => parseEvents(text, "queue.jsonl"),
      InvalidIssueFileError
    );
  }
});

test("accept CRLF and an optional final newline", () => {
  assert.equal(parseEvents(validRow, "queue").length, 1);
  assert.equal(parseEvents(`${validRow}\r\n`, "queue").length, 1);
});

test("CLI writes a receipt matching real output and leaves issue input untouched", async () => {
  await withDirectory(async (directory) => {
    const inputPath = path.join(directory, "issues.jsonl");
    await writeFile(inputPath, validRow);
    const result = runCli(directory, [inputPath, "--receipt"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /"complete": true/u);
    const receiptNames = await readdir(path.join(directory, "receipts"));
    assert.equal(receiptNames.length, 1);
    const receipt = await readFile(
      path.join(directory, "receipts", receiptNames[0] ?? "missing"),
      "utf-8"
    );
    assert.equal(result.stdout, `Reading: ${inputPath}\n${receipt}`);
    assert.equal(await readFile(inputPath, "utf-8"), validRow);
  });
});

test("default CLI is read-only, bad rows fail nonzero, and no receipt is saved on invalid input", async () => {
  await withDirectory(async (directory) => {
    const inputPath = path.join(directory, "issues.jsonl");
    await writeFile(inputPath, validRow);
    assert.equal(runCli(directory, [inputPath]).status, 0);
    assert.deepEqual(await readdir(directory), ["issues.jsonl"]);
    await writeFile(inputPath, `${validRow}\n{`);
    const result = runCli(directory, [inputPath, "--receipt"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /CHECK FAILED/u);
    assert.ok(result.stderr.includes(`${inputPath}:2`));
    assert.doesNotMatch(result.stdout, /"complete": true/u);
    assert.deepEqual(await readdir(directory), ["issues.jsonl"]);
  });
});

test("missing input, bad arguments, and unwritable receipt destination never report success", async () => {
  await withDirectory(async (directory) => {
    for (const args of [["missing.jsonl"], ["--bogus"], ["one", "two"]]) {
      const result = runCli(directory, args);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /CHECK FAILED/u);
      assert.doesNotMatch(result.stdout, /"complete": true/u);
    }
    const inputPath = path.join(directory, "issues.jsonl");
    await writeFile(inputPath, validRow);
    await writeFile(path.join(directory, "receipts"), "not a directory");
    const result = runCli(directory, [inputPath, "--receipt"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /check incomplete/u);
    assert.doesNotMatch(result.stdout, /"complete": true/u);
  });
});
