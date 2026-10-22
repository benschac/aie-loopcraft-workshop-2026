# Vision

Build a small local issue-progress loop that explains what can move forward before taking action.

## First pass

Read local issue data and classify each issue as:

- **Ready:** clear enough to move forward.
- **Needs clarification:** missing information prevents a safe next step.
- **Requires approval:** the next step needs a human decision.

For each issue, record the reason for its classification and propose a concrete next action. Do not execute the proposed action or implement the issue in this first pass.

## Allowed changes

The first pass may write only dedicated receipt and run-log files to record its findings. Issue inputs, project code, `VISION.md`, and repo rules remain unchanged.

## Human approval

Every action beyond writing dedicated receipts and run logs requires human approval. This includes changing issue data or project code, running implementation agents, and contacting external services. The first version only proposes these actions; it does not execute them.

## Stop conditions

Stop rather than guess when input is invalid, required information is missing, instructions conflict, or a receipt cannot be written. Explain the blocker and never report an incomplete check as successful.

## Not building yet

Lesson 03 adds a local, read-only Lakebed projection of the same validated issue-event file. List, board, and event views must preserve the checker's classifications, stop reasons, and next allowed actions. A manually started read endpoint may serve these facts; it must not modify inputs or execute proposals.

External trackers and authentication, UI writes, dispatch, implementation agents, scheduling, and background workers remain out of scope.

First prove one local check with readable receipts.
