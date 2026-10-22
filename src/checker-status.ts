import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { Schema } from "effect";

import type { CheckerStatus } from "../surface/lakebed/shared/issue.ts";

const ReceiptSchema = Schema.Struct({
  checkedAt: Schema.String.pipe(
    Schema.filter(
      (value) =>
        Number.isFinite(Date.parse(value)) &&
        new Date(value).toISOString() === value
    )
  ),
  classifications: Schema.Array(
    Schema.Struct({
      classification: Schema.Literal(
        "ready",
        "approval-required",
        "input-required"
      ),
      eventId: Schema.NonEmptyTrimmedString,
      issueId: Schema.NonEmptyTrimmedString,
      stopReason: Schema.NonEmptyTrimmedString,
    })
  ),
  complete: Schema.Literal(true),
  fileRead: Schema.String,
  lastCommand: Schema.NonEmptyTrimmedString,
  receiptFile: Schema.String,
  sourceSha256: Schema.String.pipe(Schema.pattern(/^[a-f0-9]{64}$/u)),
  statusVersion: Schema.Literal(1),
});
const decodeReceipt = Schema.decodeUnknownSync(ReceiptSchema);
const decodeVersion = Schema.decodeUnknownSync(
  Schema.Struct({ statusVersion: Schema.optional(Schema.Number) })
);

const loadReceipt = async (receiptFile: string, fileRead: string) => {
  const value: unknown = JSON.parse(await readFile(receiptFile, "utf-8"));
  // Older checks have no timestamp or source fingerprint; do not invent them.
  if (decodeVersion(value).statusVersion === undefined) {
    return null;
  }
  const receipt = decodeReceipt(value);
  if (receipt.fileRead !== fileRead) {
    return null;
  }
  if (receipt.receiptFile !== receiptFile) {
    throw new Error(`Receipt path mismatch: ${receiptFile}`);
  }
  return receipt;
};

const latestReceipt = async (fileRead: string, receiptDirectory: string) => {
  let names: string[];
  try {
    names = await readdir(receiptDirectory);
  } catch (error) {
    if (
      !(error instanceof Error && "code" in error && error.code === "ENOENT")
    ) {
      throw error;
    }
    names = [];
  }
  let latest: typeof ReceiptSchema.Type | null = null;
  const receipts = await Promise.all(
    names
      .toSorted()
      .filter((name) => /^check-.*\.json$/u.test(name))
      .map((name) => loadReceipt(path.join(receiptDirectory, name), fileRead))
  );
  for (const receipt of receipts) {
    if (
      receipt?.fileRead === fileRead &&
      (!latest || receipt.checkedAt >= latest.checkedAt)
    ) {
      latest = receipt;
    }
  }
  return latest;
};

/** Latest successful check, not a heartbeat. Reads only; never runs a check. */
export const readCheckerStatus = async (
  fileRead: string,
  sourceSha256: string,
  receiptDirectory = path.resolve("receipts")
): Promise<CheckerStatus> => {
  const latest = await latestReceipt(fileRead, receiptDirectory);
  const current = latest?.sourceSha256 === sourceSha256;
  let state: CheckerStatus["state"] = "unchecked";
  if (latest) {
    state = current ? "done" : "stale";
  }
  return {
    checkedAt: latest?.checkedAt ?? null,
    checkedSourceSha256: latest?.sourceSha256 ?? null,
    fileRead,
    issues: latest
      ? [
          ...new Map(
            latest.classifications.map((item) => [item.issueId, item])
          ).values(),
        ]
      : [],
    lastCommand: latest?.lastCommand ?? null,
    lastReceipt: latest?.receiptFile ?? null,
    sourceSha256,
    state,
    waitingReason: current
      ? "Check complete. Review issue stop reasons with a human; no proposal is authorized to run."
      : "No saved check matches the current file. Run check-now before relying on these findings.",
  };
};
