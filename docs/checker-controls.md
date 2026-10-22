# Local checker controls

From the project root:

```sh
pnpm run issues:status
pnpm run issues:check-now
```

Both accept an optional issue-event filename. `check-now` is an alias for `issues:check --receipt`: it validates once and saves a receipt. It never claims issues or executes proposals. `status` only reads the current file and saved receipts; it writes nothing.

In Pi, run `/reload` once, then use `/loop-status` or `/loop-check-now`. These are project prompt templates, not autonomous workers. They ask Pi to run the same commands and show the actual output.

## Read the status

- `state`: `unchecked` when no timestamped receipt exists for this file; `done` when the latest saved successful check matches its SHA-256; `stale` when the file differs. Command or read failures print `failed` and exit nonzero.
- `checkedAt`: completion time recorded in the latest successful receipt, never the time you asked for status.
- `lastCommand`: the equivalent canonical check command, including the absolute source file and `--receipt`.
- `lastReceipt`: the exact saved receipt path, or null before the first saved check.
- `waitingReason`: the next safe action. `issues` lists issue IDs, latest event IDs, classifications, and individual stop reasons.

This is status of the **latest successful saved check**, not a heartbeat or process monitor. There is no running daemon. Failed attempts are reported immediately by the command, not persisted; a previous successful receipt is not proof that a later attempt succeeded. A check without `--receipt` does not update status. Older receipts without check metadata remain readable files but cannot establish freshness. No age threshold is invented: stale means changed input, not elapsed time.

## Keep the two panes visible

Keep the current Pi pane. Split it to the right, name the new pane `Status / check`, then run:

```sh
pnpm run issues:status
```

For example, from Pi's bash tool inside Herdr:

```sh
herdr pane rename "$HERDR_PANE_ID" Pi
herdr pane split "$HERDR_PANE_ID" --direction right --cwd "$PWD" --no-focus
# Use the returned pane ID for these commands:
herdr pane rename <pane-id> 'Status / check'
herdr pane run <pane-id> 'pnpm run issues:status'
```

After `/loop-check-now` finishes, rerun status in the second pane. The output stays visible at the shell prompt; it does not poll or schedule checks.

## Compare one check across all views

Keep the read-only API and Lakebed running in separate tabs, if not already running:

```sh
pnpm run issues:serve
# In another tab:
npx lakebed dev surface/lakebed --host 127.0.0.1 --port 3000
```

1. Run `/loop-check-now` in Pi and retain its output.
2. Run `pnpm run issues:status` in the Herdr status/check pane.
3. Open port 3000 and click **Refresh from file**. The **Latest saved check** section shows the same status object returned by `http://127.0.0.1:8788/api/issues` under `checker`.
4. Open `lastReceipt`. Compare `checkedAt`, `lastCommand`, `receiptFile` (status calls it `lastReceipt`), and `sourceSha256` across the outputs.
5. Compare each card's `issueId`, latest `eventId`, and classification with status and the receipt. For repeated issue IDs, the last event in file order wins.

Stop on mismatches. Refreshing the view never runs a check or writes an event. `done` only means validation finished; human approval and input boundaries still apply.
