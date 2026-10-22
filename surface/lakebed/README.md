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

## Docker / OrbStack access from your Mac

The servers must listen on the container network interface, not just its loopback address. Inside the container, run:

```sh
PROJECTION_HOST=0.0.0.0 pnpm run issues:serve
npx lakebed dev surface/lakebed --host 0.0.0.0 --port 3000
```

Use separate terminals for these commands. Open <http://127.0.0.1:3000> on your Mac; the browser also reads <http://127.0.0.1:8788/api/issues>.

Compose publishes both ports on the Mac's loopback address only. After changing port mappings, restart the container from a Mac terminal with `pnpm run workshop`, `pnpm run workshop:shell`, or `pnpm run workshop:pi`. These launchers use `--service-ports`, which `docker compose run` requires to publish the configured ports. An already-running container will not pick up new mappings. Run only one container publishing these ports at a time.

From your Mac, verify both paths:

```sh
curl -f http://127.0.0.1:3000/
curl -f http://127.0.0.1:8788/api/issues
```

## Read path

```txt
data/issue-events.jsonl
  → src/issue-events.ts (Effect validation and checker decisions)
  → src/issue-projection.ts (latest finding per issue, history, counts, hash)
  → GET http://127.0.0.1:8788/api/issues
  → Lakebed browser views
```

The direct browser read is deliberate: Lakebed capsule code cannot import Node filesystem APIs or the Effect core. A query over a second database would introduce another source of truth. This local-only view reads the small Node endpoint instead. Its CORS allowlist permits only localhost/127.0.0.1 on port 3000; the endpoint defaults to loopback and accepts only GET. In Docker, `PROJECTION_HOST=0.0.0.0` allows port forwarding while Compose restricts published access to the Mac's loopback address. There are no capsule mutations, approval buttons, demo seeds, external auth, polling, or write endpoints.

Events are ordered by file position. Multiple events for one issue retain their history; only the latest checker finding becomes its card. Counts refer to issues, while the CLI also reports every event.

## Compare and save evidence

```sh
pnpm run issues:check --receipt
pnpm run check
pnpm run ultracite:check
npx lakebed build surface/lakebed --out /tmp/loopcraft-lakebed.json --json
```

Compare the CLI classifications with each card's event ID, status, stop reason, and next allowed action. Record the file hash, route opened, counts, and any mismatch in a dedicated `receipts/` file. If they disagree, fix the read/view path—not the issue file.

For a different input, pass the same file to both `issues:check` and `issues:serve`. Keep the UI and endpoint local; do not publish these ports to the LAN or a public host.
