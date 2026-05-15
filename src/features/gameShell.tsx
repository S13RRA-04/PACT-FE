import { useEffect, useState, type CSSProperties } from "react";
import type { GameMechanics, MechanicsState, PactContent } from "../types";
import { contentTypeModeLabel, ProgressTrack } from "../components/pact";
import { scaledOutcome, stateStringArray, type MechanicOutcome } from "./learnerMechanicsTypes";

export function GameShell({
  content,
  mechanics,
  persistedState,
  onOutcomeChange,
  onStateChange
}: {
  content: PactContent;
  mechanics: GameMechanics;
  persistedState?: MechanicsState;
  onOutcomeChange: (outcome: MechanicOutcome) => void;
  onStateChange: (state: MechanicsState, outcome: MechanicOutcome) => void;
}) {
  const [captured, setCaptured] = useState<string[]>(stateStringArray(persistedState, "capturedNodeIds") ?? mechanics.initiallyCaptured ?? []);
  const score = mechanics.nodes.filter((node) => captured.includes(node.id)).reduce((sum, node) => sum + node.points, 0);
  const maxScore = mechanics.maxScore ?? mechanics.nodes.reduce((sum, node) => sum + node.points, 0);
  const progress = maxScore ? Math.round(score / maxScore * 100) : 0;

  useEffect(() => {
    const outcome = scaledOutcome(content.maxScore, progress);
    onOutcomeChange(outcome);
    onStateChange({ kind: mechanics.kind, capturedNodeIds: captured }, outcome);
  }, [captured, content.maxScore, mechanics.kind, onOutcomeChange, onStateChange, progress]);

  function toggleNode(id: string) {
    setCaptured((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <section className={`interactive-shell game-shell type-${content.type}`}>
      <div className="shell-copy">
        <span>{contentTypeModeLabel(content.type)}</span>
        <strong>{mechanics.title}</strong>
        <p>{mechanics.prompt}</p>
      </div>
      <div className="game-board" aria-label="Packet Pursuit board">
        {mechanics.nodes.map((node, index) => (
          <button className={captured.includes(node.id) ? "captured" : ""} key={node.id} style={{ "--node-index": String(index) } as CSSProperties} type="button" onClick={() => toggleNode(node.id)}>
            <span>{node.label}</span>
            <small>{node.points} pts</small>
          </button>
        ))}
      </div>
      <div className="shell-result" role="status">
        <span>{mechanics.resultLabel ?? "Evidence captured"}</span>
        <strong>{score}/{maxScore}</strong>
        <p>{captured.length} of {mechanics.nodes.length} telemetry nodes locked.</p>
        <ProgressTrack value={progress} />
      </div>
    </section>
  );
}
