import { useEffect, useState } from "react";
import type { ChallengeMechanics, MechanicsState, PactContent } from "../types";
import { contentTypeModeLabel, ProgressTrack } from "../components/pact";
import { scaledOutcome, stateString, type MechanicOutcome } from "./learnerMechanicsTypes";

export function ChallengeShell({
  content,
  mechanics,
  persistedState,
  onOutcomeChange,
  onStateChange
}: {
  content: PactContent;
  mechanics: ChallengeMechanics;
  persistedState?: MechanicsState;
  onOutcomeChange: (outcome: MechanicOutcome) => void;
  onStateChange: (state: MechanicsState, outcome: MechanicOutcome) => void;
}) {
  const [selected, setSelected] = useState(stateString(persistedState, "selectedPathId") ?? mechanics.defaultPathId ?? mechanics.paths[0]?.id ?? "");
  const active = mechanics.paths.find((path) => path.id === selected) ?? mechanics.paths[0];
  const progressPercent = active?.score ?? 0;

  useEffect(() => {
    const outcome = scaledOutcome(content.maxScore, progressPercent);
    onOutcomeChange(outcome);
    onStateChange({ kind: mechanics.kind, selectedPathId: selected }, outcome);
  }, [content.maxScore, mechanics.kind, onOutcomeChange, onStateChange, progressPercent, selected]);

  return (
    <section className={`interactive-shell challenge-shell type-${content.type}`}>
      <div className="shell-copy">
        <span>{contentTypeModeLabel(content.type)}</span>
        <strong>{mechanics.title}</strong>
        <p>{mechanics.prompt}</p>
      </div>
      <div className="challenge-paths">
        {mechanics.paths.map((path) => (
          <button className={selected === path.id ? "active" : ""} key={path.id} type="button" onClick={() => setSelected(path.id)}>
            <span>{path.label}</span>
            <strong>{path.score}</strong>
            <small>{path.detail}</small>
          </button>
        ))}
      </div>
      <div className="shell-result" role="status">
        <span>{mechanics.resultLabel ?? "Recommended action"}</span>
        <strong>{active?.label ?? "No path selected"}</strong>
        <p>{active?.detail ?? "Select a path to preview the expected outcome."}</p>
        <ProgressTrack value={progressPercent} />
      </div>
    </section>
  );
}
