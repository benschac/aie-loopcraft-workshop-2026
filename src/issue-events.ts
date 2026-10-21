import { Either, Schema } from "effect";

const IssueEventSchema = Schema.Struct({
  eventId: Schema.NonEmptyTrimmedString,
  gate: Schema.Literal("ready", "approval-required", "input-required"),
  issueId: Schema.NonEmptyTrimmedString,
  proposedAction: Schema.NonEmptyTrimmedString,
  reason: Schema.NonEmptyTrimmedString,
  title: Schema.NonEmptyTrimmedString,
  type: Schema.Literal("issue-recorded"),
});

type IssueEvent = typeof IssueEventSchema.Type;

const decodeEvent = Schema.decodeUnknownEither(IssueEventSchema, {
  errors: "all",
  onExcessProperty: "error",
});

export class InvalidIssueFileError extends Error {
  override name = "InvalidIssueFileError";
}

/** Validate the entire file before exposing any classifications. */
export const parseEvents = (
  text: string,
  file: string
): readonly IssueEvent[] => {
  const lines = text.split(/\r?\n/u);
  if (lines.at(-1) === "") {
    lines.pop();
  }
  const events: IssueEvent[] = [];
  const problems: string[] = [];
  const eventIds = new Set<string>();
  if (lines.length === 0) {
    throw new InvalidIssueFileError(`${file}: empty issue file`);
  }
  for (const [index, line] of lines.entries()) {
    const location = `${file}:${index + 1}`;
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      problems.push(`${location}: invalid JSON (blank rows are not allowed)`);
      continue;
    }
    const result = decodeEvent(value);
    if (Either.isLeft(result)) {
      problems.push(`${location}: ${result.left.message}`);
      continue;
    }
    if (eventIds.has(result.right.eventId)) {
      problems.push(`${location}: duplicate eventId ${result.right.eventId}`);
      continue;
    }
    eventIds.add(result.right.eventId);
    events.push(result.right);
  }
  if (problems.length > 0) {
    throw new InvalidIssueFileError(problems.join("\n"));
  }
  return events;
};

const classify = (event: IssueEvent) => {
  const common = {
    classification: event.gate,
    eventId: event.eventId,
    issueId: event.issueId,
    proposedAction: event.proposedAction,
    reason: event.reason,
    refusedAction: `Execute the proposal: ${event.proposedAction}`,
  };
  switch (event.gate) {
    case "ready": {
      return {
        ...common,
        nextAllowedAction:
          "Present this proposal to a human for approval; do not execute it.",
        stopReason:
          "Proposal only: VISION.md requires approval before any implementation.",
      };
    }
    case "approval-required": {
      return {
        ...common,
        nextAllowedAction:
          "Present the decision request to a human; wait for approval.",
        stopReason: `Human decision required: ${event.reason}`,
      };
    }
    case "input-required": {
      return {
        ...common,
        nextAllowedAction:
          "Present the clarification request to a human; do not guess.",
        stopReason: `Missing information: ${event.reason}`,
      };
    }
    default: {
      const impossible: never = event.gate;
      throw new Error(`Unexpected gate: ${String(impossible)}`);
    }
  }
};

export const checkIssues = (text: string, fileRead: string) => {
  const events = parseEvents(text, fileRead);
  return {
    classifications: events.map(classify),
    complete: true,
    eventCount: events.length,
    fileRead,
    mode: "proposal-only",
    nextAllowedAction:
      "Review findings with a human. Only dedicated receipts and run logs may be written.",
    refusedAction:
      "Change issue inputs or project code, run implementation agents, or contact external services.",
    stopReason: "Check complete; no proposed actions were executed.",
  };
};
