import { useEffect, useState } from "react";
import type { AssessmentMechanics, MechanicsState, PactContent } from "../types";
import { contentTypeModeLabel, ProgressTrack } from "../components/pact";
import { scaledOutcome, stateBooleanRecord, type MechanicOutcome } from "./learnerMechanicsTypes";

export function AssessmentShell({
  content,
  mechanics,
  persistedState,
  onOutcomeChange,
  onStateChange
}: {
  content: PactContent;
  mechanics: AssessmentMechanics;
  persistedState?: MechanicsState;
  onOutcomeChange: (outcome: MechanicOutcome) => void;
  onStateChange: (state: MechanicsState, outcome: MechanicOutcome) => void;
}) {
  const timingEnabled = mechanics.timing?.enabled !== false;
  const persistedStartedAt = typeof persistedState?.startedAt === "string" && Number.isFinite(Date.parse(persistedState.startedAt))
    ? persistedState.startedAt
    : undefined;
  const [startedAt, setStartedAt] = useState<string | undefined>(persistedStartedAt);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [checks, setChecks] = useState<Record<string, boolean>>(
    stateBooleanRecord(persistedState, "checkedIds") ?? Object.fromEntries(mechanics.checks.filter((item) => item.initiallyChecked).map((item) => [item.id, true]))
  );
  const complete = mechanics.checks.filter((item) => checks[item.id]).length;
  const percent = Math.round((complete / mechanics.checks.length) * 100);
  const hasStarted = !timingEnabled || Boolean(startedAt);
  const elapsedSeconds = startedAt ? Math.max(0, Math.floor((nowMs - Date.parse(startedAt)) / 1000)) : 0;
  const timeLimitSeconds = mechanics.timing?.timeLimitSeconds;
  const expired = typeof timeLimitSeconds === "number" && elapsedSeconds > timeLimitSeconds;

  useEffect(() => {
    if (!hasStarted) return;
    const outcome = scaledOutcome(content.maxScore, percent);
    onOutcomeChange(outcome);
    onStateChange({
      kind: mechanics.kind,
      checkedIds: Object.keys(checks).filter((id) => checks[id]),
      startedAt,
      timing: {
        startTrigger: mechanics.timing?.startTrigger ?? "learner_start",
        submitTrigger: mechanics.timing?.submitTrigger ?? "content_submit",
        timeLimitSeconds
      }
    }, outcome);
  }, [checks, content.maxScore, hasStarted, mechanics.kind, mechanics.timing?.startTrigger, mechanics.timing?.submitTrigger, onOutcomeChange, onStateChange, percent, startedAt, timeLimitSeconds]);

  useEffect(() => {
    if (!startedAt) return undefined;
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [startedAt]);

  function startAssessment() {
    const nextStartedAt = new Date().toISOString();
    setStartedAt(nextStartedAt);
    setNowMs(Date.now());
    const outcome = scaledOutcome(content.maxScore, percent);
    onOutcomeChange(outcome);
    onStateChange({
      kind: mechanics.kind,
      checkedIds: Object.keys(checks).filter((id) => checks[id]),
      startedAt: nextStartedAt,
      timing: {
        startTrigger: mechanics.timing?.startTrigger ?? "learner_start",
        submitTrigger: mechanics.timing?.submitTrigger ?? "content_submit",
        timeLimitSeconds
      },
      elapsedSeconds: 0,
      expired: false
    }, outcome);
  }

  if (!hasStarted) {
    return (
      <section className={`interactive-shell assessment-shell type-${content.type}`}>
        <div className="shell-copy">
          <span>{contentTypeModeLabel(content.type)}</span>
          <strong>{mechanics.title}</strong>
          <p>{mechanics.prompt}</p>
        </div>
        <div className="assessment-start-panel">
          <div>
            <span>Timed assessment</span>
            <strong>{timeLimitSeconds ? formatDuration(timeLimitSeconds) : "Untimed"}</strong>
            <p>The assessment clock starts when you launch this checkpoint and is included with your LMS score package on submit.</p>
          </div>
          <button type="button" onClick={startAssessment}>Start Assessment</button>
        </div>
      </section>
    );
  }

  return (
    <section className={`interactive-shell assessment-shell type-${content.type}`}>
      <div className="shell-copy">
        <span>{contentTypeModeLabel(content.type)}</span>
        <strong>{mechanics.title}</strong>
        <p>{mechanics.prompt}</p>
      </div>
      <div className={`assessment-timer ${expired ? "expired" : ""}`} role="status">
        <span>{expired ? "Time limit reached" : "Session timer"}</span>
        <strong>{formatDuration(elapsedSeconds)}</strong>
        <small>{timeLimitSeconds ? `${formatDuration(Math.max(0, timeLimitSeconds - elapsedSeconds))} remaining` : "No time limit"}</small>
      </div>
      <div className="assessment-checks">
        {mechanics.checks.map((item) => (
          <button className={checks[item.id] ? "checked" : ""} key={item.id} type="button" onClick={() => setChecks((current) => ({ ...current, [item.id]: !current[item.id] }))}>
            <span>{checks[item.id] ? "Ready" : "Open"}</span>
            <strong>{item.label}</strong>
          </button>
        ))}
      </div>
      <div className="shell-result" role="status">
        <span>{mechanics.resultLabel ?? "Gate readiness"}</span>
        <strong>{percent}%</strong>
        <p>{complete} of {mechanics.checks.length} readiness checks complete.</p>
        <ProgressTrack value={percent} />
      </div>
    </section>
  );
}

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}
