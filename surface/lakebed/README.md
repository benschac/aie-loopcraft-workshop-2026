# Read-only Lakebed issue views

Lakebed shows the facts from `data/issue-events.jsonl`. The CLI and the local read endpoint use the same Effect-validated checker. The capsule stores nothing, changes nothing, and never executes proposals.

## Run locally

From the project root, start the read endpoint in one terminal:

```sh
pnpm run issues:serve
```

In another terminal:

```sh
npx lakebed dev surface/lakebed --host 127.0.0.1 --port 3000
```

Open <http://127.0.0.1:3000>. Choose **board**, **list**, or **events**. Each issue shows its status, reason, stop reason, proposed action, next allowed action, and the events behind it. Ready means proposal-ready, not permission to implement.

Use **Refresh from file** after the input changes. This is a snapshot, not a monitor. On refresh, old cards are cleared; invalid input or an unavailable endpoint shows an error, never stale or partial cards.

## Read path

```txt
data/issue-events.jsonl
  → src/issue-events.ts (Effect validation and checker decisions)
  → src/issue-projection.ts (latest finding per issue, history, counts, hash)
  → GET http://127.0.0.1:8788/api/issues
  → Lakebed browser views
```

The direct browser read is deliberate: Lakebed capsule code cannot import Node filesystem APIs or the Effect core. A query over a second database would introduce another source of truth. This local-only view reads the small Node endpoint instead. Its CORS allowlist permits only localhost/127.0.0.1 on port 3000; the endpoint binds to loopback and accepts only GET. There are no capsule mutations, approval buttons, demo seeds, external auth, polling, or write endpoints.

Events are ordered by file position. Multiple events for one issue retain their history; only the latest checker finding becomes its card. Counts refer to issues, while the CLI also reports every event.

## Compare and save evidence

```sh
pnpm run issues:check --receipt
pnpm run check
pnpm run ultracite:check
npx lakebed build surface/lakebed --out /tmp/loopcraft-lakebed.json --json
```

Compare the CLI classifications with each card's event ID, status, stop reason, and next allowed action. Record the file hash, route opened, counts, and any mismatch in a dedicated `receipts/` file. If they disagree, fix the read/view path—not the issue file.

For a different input, pass the same file to both `issues:check` and `issues:serve`. Keep the UI and endpoint on this machine; remote hosting and forwarded-container access need a separate transport decision.
