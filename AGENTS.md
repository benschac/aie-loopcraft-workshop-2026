# Agent Notes

You are in the Loopcraft workshop project.

Build the local issue-progress loop in this folder. Do not manage anything outside this project folder.

## Lesson boundary

Lessons are the path. Issue events are the project data we are building toward.

Start with Lesson 01 (run `/loop-lesson-01` in Pi, or read `web/static/lessons/01-tour-vision-repo/prompt.txt`; full lesson at <https://aie-loopcraft-workshop-2026.wzrrd.sh/lessons/01-tour-vision-repo/>): create `VISION.md` and the first repo boundaries only. Lesson 02 creates the local issue-event queue and first checks. Lesson 03 adds read-only Lakebed views of the same validated event file. Do not add UI writes, dispatch, schedulers, GitHub, Linear, or background workers.

## Local checks

- `pnpm run issues:check` validates the local queue; add `--receipt` to save findings under `receipts/`.
- `pnpm run issues:status` reads the latest saved check; `pnpm run issues:check-now` checks once with a receipt. Pi: `/reload`, then `/loop-status` or `/loop-check-now`. Keep Herdr's Pi and status/check panes visible; see `docs/checker-controls.md`.
- `pnpm run issues:serve` serves read-only cards on loopback port 8788. Run `npx lakebed dev surface/lakebed --host 127.0.0.1 --port 3000` and open port 3000. See `surface/lakebed/README.md`.
- `pnpm run check` covers core and Lakebed capsule typecheck, lint, formatting checks, and tests. Run `pnpm run ultracite:check` for the preset checks too.
- Run `pnpm run hooks:install` after dependency setup. Lefthook auto-formats and re-stages selected product files before commit, then runs whole-product quality checks; push runs the full gate. Verify manually with `pnpm exec lefthook run pre-commit --all-files --no-stage-fixed`; skipped jobs are not passes.
- See `docs/local-check.md` for the input contract. Ready means proposal-ready, not permission to implement; the checker never executes proposals.

## Standing habits

- Inspect the repo before editing: `git status --short` and `git log --oneline --max-count=5`.
- Keep changes small and visible.
- Use the local `loopcraft-ta` skill when available.
- Explain the evidence before claiming progress.
- Run the checks that exist. If no checks exist yet, say that plainly.
- See `docs/tooling.md` for the toolchain and guardrail rationale (you build these checks in Lesson 02).
- Leave completed changes unstaged and uncommitted so you can review them. Stage or commit only when you explicitly ask.

## Boundaries

- Keep `VISION.md` human-owned. Ask before changing strategic intent once it exists.
- Keep this file short and operational.
- Do not put planning notes or old-run archaeology here.
- Do not add external auth or services until the local loop proves the shape.
