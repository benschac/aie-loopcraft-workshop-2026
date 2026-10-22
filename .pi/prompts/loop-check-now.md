---
description: Check the local issue file once, save a receipt, then show status
---
Run `pnpm run issues:check-now && pnpm run issues:status` from this project root using bash. Print the actual status JSON and receipt filename. On failure, report the error and stop; do not show an older receipt as this check's success. Compare issue IDs, latest event IDs, checkedAt, sourceSha256, and lastReceipt with Herdr's status/check pane and Lakebed after a manual refresh. Report any mismatch or unavailable view. Do not claim issues, execute proposals, change issue inputs, start agents, or add scheduling.
