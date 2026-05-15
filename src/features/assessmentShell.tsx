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
  const [checks, setChecks] = useState<Record<string, boolean>>(
    stateBooleanRecord(persistedState, "checkedIds") ?? Object.fromEntries(mechanics.checks.filter((item) => item.initiallyChecked).map((item) => [item.id, true]))
  );
  const complete = mechanics.checks.filter((item) => checks[item.id]).length;
  const percent = Math.round((complete / mechanics.checks.length) * 100);

  useEffect(() => {
    const outcome = scaledOutcome(content.maxScore, percent);
    onOutcomeChange(outcome);
    onStateChange({ kind: mechanics.kind, checkedIds: Object.keys(checks).filter((id) => checks[id]) }, outcome);
  }, [checks, content.maxScore, mechanics.kind, onOutcomeChange, onStateChange, percent]);

  return (
    <section className={`interactive-shell assessment-shell type-${content.type}`}>
      <div className="shell-copy">
        <span>{contentTypeModeLabel(content.type)}</span>
        <strong>{mechanics.title}</strong>
        <p>{mechanics.prompt}</p>
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
