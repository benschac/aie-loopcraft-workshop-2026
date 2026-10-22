/** Transport only. The local checker owns validation and all decisions. */
export type Gate = "ready" | "approval-required" | "input-required";

export interface IssueEvent {
  eventId: string;
  gate: Gate;
  issueId: string;
  proposedAction: string;
  reason: string;
  title: string;
  type: "issue-recorded";
}

export interface IssueCard {
  classification: Gate;
  eventId: string;
  issueId: string;
  nextAllowedAction: string;
  proposedAction: string;
  reason: string;
  refusedAction: string;
  stopReason: string;
  title: string;
  events: readonly IssueEvent[];
}

export interface CheckerStatus {
  state: "unchecked" | "done" | "stale";
  checkedAt: string | null;
  lastCommand: string | null;
  lastReceipt: string | null;
  waitingReason: string;
  fileRead: string;
  sourceSha256: string;
  checkedSourceSha256: string | null;
  issues: readonly {
    issueId: string;
    eventId: string;
    classification: Gate;
    stopReason: string;
  }[];
}

export interface IssueProjection {
  checker?: CheckerStatus;
  cards: readonly IssueCard[];
  complete: boolean;
  counts: Record<Gate, number>;
  eventCount: number;
  events: readonly IssueEvent[];
  fileRead: string;
  sourceSha256: string;
}

export const gates: readonly Gate[] = [
  "ready",
  "approval-required",
  "input-required",
];
