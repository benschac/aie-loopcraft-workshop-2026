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

export interface IssueProjection {
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
