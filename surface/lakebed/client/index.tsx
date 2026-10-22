import { useEffect, useState } from "preact/hooks";

import { gates } from "../shared/issue";
import type { IssueCard, IssueProjection } from "../shared/issue";

const Card = ({ issue }: { issue: IssueCard }) => (
  <article className="my-3 rounded border border-neutral-700 bg-neutral-900 p-4">
    <p className="font-mono text-sm text-sky-300">
      {issue.issueId} · {issue.classification}
    </p>
    <h3 className="my-2 text-lg font-bold">{issue.title}</h3>
    <dl className="space-y-2 text-sm">
      <div>
        <dt className="text-neutral-400">Reason</dt>
        <dd>{issue.reason}</dd>
      </div>
      <div>
        <dt className="text-neutral-400">Stop reason</dt>
        <dd>{issue.stopReason}</dd>
      </div>
      <div>
        <dt className="text-neutral-400">Proposed action (not executed)</dt>
        <dd>{issue.proposedAction}</dd>
      </div>
      <div>
        <dt className="text-neutral-400">Next allowed action</dt>
        <dd>{issue.nextAllowedAction}</dd>
      </div>
    </dl>
    <details className="mt-3 text-sm">
      <summary>
        Trace {issue.events.length} event(s) · latest {issue.eventId}
      </summary>
      <pre className="overflow-auto whitespace-pre-wrap">
        {JSON.stringify(issue.events, null, 2)}
      </pre>
    </details>
  </article>
);

export const App = () => {
  const [projection, setProjection] = useState<IssueProjection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [view, setView] = useState<"board" | "list" | "events">("board");

  useEffect(() => {
    const controller = new AbortController();
    setProjection(null);
    setError(null);
    setLoading(true);
    const load = async () => {
      try {
        // Direct browser read is intentional: the capsule cannot read repo files.
        // Both services are local; no database, auth, or decision logic in the UI.
        const response = await fetch("http://127.0.0.1:8788/api/issues", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const value = (await response.json()) as IssueProjection;
        if (
          !value.complete ||
          !Array.isArray(value.cards) ||
          !Array.isArray(value.events)
        ) {
          throw new Error("Incomplete projection; no cards shown.");
        }
        if (!controller.signal.aborted) {
          setProjection(value);
        }
      } catch (error_) {
        if (!controller.signal.aborted) {
          setError(error_ instanceof Error ? error_.message : String(error_));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => controller.abort();
  }, [refresh]);

  return (
    <main className="min-h-screen bg-neutral-950 p-6 text-neutral-100">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold">Local issue projection</h1>
        <p className="my-3 text-neutral-300">
          Read-only snapshot. Ready means proposal-ready, never permission to
          implement.
        </p>
        <nav aria-label="Issue views" className="my-4 flex gap-3">
          {(["board", "list", "events"] as const).map((mode) => (
            <button
              type="button"
              key={mode}
              aria-pressed={view === mode}
              className="rounded border border-neutral-500 px-4 py-2 aria-pressed:bg-sky-900"
              onClick={() => setView(mode)}
            >
              {mode}
            </button>
          ))}
          <button
            type="button"
            disabled={loading}
            className="rounded border px-4 py-2 disabled:opacity-50"
            onClick={() => setRefresh((value) => value + 1)}
          >
            Refresh from file
          </button>
        </nav>
        {loading && <p role="status">Reading and validating the event file…</p>}
        {error && (
          <div role="alert">
            <h2 className="text-xl text-red-300">Stopped — no cards shown</h2>
            <pre className="whitespace-pre-wrap">{error}</pre>
            <p>
              Check the read endpoint and input file, then refresh. Do not
              change events just to fix the view.
            </p>
          </div>
        )}
        {projection && (
          <>
            <p className="font-mono text-sm break-all">
              File: {projection.fileRead}
              <br />
              SHA-256: {projection.sourceSha256}
            </p>
            <p className="my-3">
              {projection.cards.length} issues · {projection.eventCount} events
              ·{" "}
              {gates
                .map((gate) => `${gate}: ${projection.counts[gate]}`)
                .join(" · ")}
            </p>
            {view === "board" && (
              <div className="grid gap-4 md:grid-cols-3">
                {gates.map((gate) => (
                  <section key={gate} aria-label={gate}>
                    <h2 className="text-lg font-bold">
                      {gate} ({projection.counts[gate]})
                    </h2>
                    {projection.cards
                      .filter((issue) => issue.classification === gate)
                      .map((issue) => (
                        <Card key={issue.issueId} issue={issue} />
                      ))}
                  </section>
                ))}
              </div>
            )}
            {view === "list" &&
              projection.cards.map((issue) => (
                <Card key={issue.issueId} issue={issue} />
              ))}
            {view === "events" && (
              <section aria-label="Event history">
                <h2 className="text-xl">Event history (file order)</h2>
                {projection.events.map((event) => (
                  <article
                    key={event.eventId}
                    className="my-4 rounded border border-neutral-700 p-4"
                  >
                    <h3>
                      {event.eventId} · {event.issueId} · {event.gate}
                    </h3>
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(event, null, 2)}
                    </pre>
                    {projection.cards
                      .filter((card) => card.issueId === event.issueId)
                      .map((card) => (
                        <p key={card.issueId}>
                          Current status: {card.classification}
                          <br />
                          Stop reason: {card.stopReason}
                          <br />
                          Next allowed action: {card.nextAllowedAction}
                        </p>
                      ))}
                  </article>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
};
