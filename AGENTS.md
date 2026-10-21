# Agent Notes

You are in the Loopcraft workshop project.

Build the local issue-progress loop in this folder. Do not manage anything outside this project folder.

## Lesson boundary

Lessons are the path. Issue events are the project data we are building toward.

Start with Lesson 01 (run `/loop-lesson-01` in Pi, or read `web/static/lessons/01-tour-vision-repo/prompt.txt`; full lesson at <https://aie-loopcraft-workshop-2026.wzrrd.sh/lessons/01-tour-vision-repo/>): create `VISION.md` and the first repo boundaries only. Lesson 02 creates the local issue-event queue and first checks. Do not jump ahead to Lakebed code, dispatch, schedulers, GitHub, Linear, or background workers.

## Local checks

- `pnpm run issues:check` validates the local queue; add `--receipt` to save findings under `receipts/`.
- `pnpm run check` runs product typecheck, lint, formatting checks, and tests. Run `pnpm run ultracite:check` for the preset checks too.
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
