import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { test } from "vitest";

const compiler = fileURLToPath(
  new URL(
    "../node_modules/@typescript/native-preview/lib/tsgo.js",
    import.meta.url
  )
);
const config = fileURLToPath(
  new URL("../surface/lakebed/tsconfig.json", import.meta.url)
);

const run = () =>
  spawnSync(process.execPath, [compiler, "--noEmit", "-p", config], {
    encoding: "utf-8",
    timeout: 10_000,
  });

// Exercise a real file in the capsule, not a separate synthetic TS project.
// A passing valid JSX probe catches missing Preact config/types; the invalid
// probe catches accidental exclusion of TSX files from the check.
test("capsule typecheck accepts Preact JSX and rejects incorrectly typed JSX props", async () => {
  const filename = `guardrail-probe-${randomUUID()}.tsx`;
  const probe = new URL(
    `../surface/lakebed/client/${filename}`,
    import.meta.url
  );
  try {
    await writeFile(
      probe,
      'export const GuardrailProbe = () => <div title="valid" />;\n',
      { flag: "wx" }
    );
    const valid = run();
    assert.equal(valid.status, 0, `${valid.stdout}\n${valid.stderr}`);
    await writeFile(
      probe,
      "export const GuardrailProbe = () => <div title={42} />;\n"
    );
    const invalid = run();
    assert.equal(invalid.status, 1, `${invalid.stdout}\n${invalid.stderr}`);
    assert.ok(invalid.stdout.includes(filename));
    assert.match(invalid.stdout, /TS2322/u);
    assert.doesNotMatch(invalid.stdout, /react\/jsx-runtime/u);
  } finally {
    await rm(probe, { force: true });
  }
}, 30_000);
