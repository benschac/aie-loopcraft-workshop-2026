# Local issue check

Run from the repo root with Node 22.18+ and pnpm:

```sh
pnpm install --frozen-lockfile
pnpm run issues:check
pnpm run issues:check data/issue-events.jsonl --receipt
pnpm run check
pnpm run ultracite:check
```

`issues:check` is read-only unless you request `--receipt`. That flag saves the JSON report printed to stdout in a new `receipts/check-<id>.json` file. Receipt failures exit nonzero without printing a successful report. Nothing executes an issue proposal, changes the queue, or contacts a service.

The report prints the absolute input filename, event count, each classification and reason, stop reasons, next allowed actions, and refused actions. A successful check means the whole file was validated, not that any work was implemented. Blocked issues are valid data and do not make the validation command fail.

## Input contract

`data/issue-events.jsonl` contains one `issue-recorded` event per row. Each row requires these fields and rejects unknown fields:

- `eventId`: unique nonempty trimmed string within this file.
- `issueId`, `title`, `reason`, `proposedAction`: nonempty trimmed strings.
- `type`: exactly `issue-recorded`.
- `gate`: one of the three values below.

| Gate | Meaning | Next step |
| --- | --- | --- |
| `ready` | The proposal is clear enough to review. | Present it for approval; do not implement it. |
| `approval-required` | A human decision blocks the proposal. | Present the decision request; wait. |
| `input-required` | Missing information blocks the proposal. | Present a clarification request; do not guess. |

You supply the gate and reason explicitly. This command validates those declarations; it does not infer readiness from prose or verify that a claim in a reason is true. It checks individual events, not a latest-state projection of issue history.

Malformed JSON, blank rows, empty files, schema errors, and duplicate event IDs fail the entire check with filename and line details. All rows are checked before any classifications are published. One trailing newline is allowed. Missing files and other I/O failures also exit nonzero. No partial success report or receipt is produced for invalid input.

`VISION.md` remains the approval boundary: even `ready` does not authorize a code change. The checker only prints proposals and optionally writes a dedicated receipt. Human conversations, implementation, issue updates, and external services are not automated here.

## Check implementation

Effect Schema 3 matches the local `.agent_sources/effect` API. `src/issue-events.ts` validates the events; `src/loop-check.ts` runs the local check command. Node runs the CLI TypeScript directly, and Vitest runs the tests. `vitest.config.ts` limits discovery to `tests/**/*.test.ts`, keeping site and source-mirror tests out of the product check. `pnpm run check` runs strict `tsgo`, Oxlint with Ultracite core, Oxfmt with the Ultracite preset, and tests. These checks target `src/`, `tests/`, and the new product configs, not the prepared site or source mirrors.

The TypeScript configuration follows the [Total TypeScript TSConfig guidance](https://www.totaltypescript.com/tsconfig-cheat-sheet): strict mode, unchecked index protection, verbatim modules, and NodeNext resolution, with no emit. The pinned TypeScript 7 native compiler is a development preview, not a stable release; update it deliberately and rerun the checks.

A real check output is saved in `receipts/check-2b2c5c96-6182-4d8f-a799-c33b5269599d.json`.
