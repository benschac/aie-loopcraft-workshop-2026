import { createHash } from "node:crypto";

import type {
  IssueCard,
  IssueEvent,
  IssueProjection,
} from "../surface/lakebed/shared/issue.ts";
import { checkIssues } from "./issue-events.ts";

/** File order is event order; the latest validated fact wins per issue. */
export const projectIssues = (
  text: string,
  fileRead: string
): IssueProjection => {
  const report = checkIssues(text, fileRead);
  const histories = new Map<string, IssueEvent[]>();
  for (const event of report.events) {
    const history = histories.get(event.issueId) ?? [];
    history.push(event);
    histories.set(event.issueId, history);
  }
  const latest = new Map<string, IssueCard>();
  for (const finding of report.classifications) {
    latest.set(finding.issueId, {
      ...finding,
      events: histories.get(finding.issueId) ?? [],
    });
  }
  const cards = [...latest.values()];
  const counts = { "approval-required": 0, "input-required": 0, ready: 0 };
  for (const card of cards) {
    counts[card.classification] += 1;
  }
  return {
    cards,
    complete: report.complete,
    counts,
    eventCount: report.eventCount,
    events: report.events,
    fileRead,
    sourceSha256: createHash("sha256").update(text).digest("hex"),
  };
};
