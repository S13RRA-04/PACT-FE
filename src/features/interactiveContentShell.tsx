import type { MechanicsState, PactContent } from "../types";
import { AssessmentShell } from "./assessmentShell";
import { ChallengeShell } from "./challengeShell";
import { GameShell } from "./gameShell";
import { ContentModePreview } from "./learnerRunnerPrimitives";
import type { MechanicOutcome } from "./learnerMechanicsTypes";

export function InteractiveContentShell({
  content,
  persistedState,
  onOutcomeChange,
  onStateChange
}: {
  content: PactContent;
  persistedState?: MechanicsState;
  onOutcomeChange: (outcome: MechanicOutcome) => void;
  onStateChange: (state: MechanicsState, outcome: MechanicOutcome) => void;
}) {
  if (content.type === "challenge" && content.mechanics?.kind === "challenge_path") {
    return <ChallengeShell content={content} mechanics={content.mechanics} persistedState={persistedState} onOutcomeChange={onOutcomeChange} onStateChange={onStateChange} />;
  }
  if (content.type === "game" && content.mechanics?.kind === "packet_capture") {
    return <GameShell content={content} mechanics={content.mechanics} persistedState={persistedState} onOutcomeChange={onOutcomeChange} onStateChange={onStateChange} />;
  }
  if (content.type === "assessment" && content.mechanics?.kind === "readiness_checklist") {
    return <AssessmentShell content={content} mechanics={content.mechanics} persistedState={persistedState} onOutcomeChange={onOutcomeChange} onStateChange={onStateChange} />;
  }
  return <ContentModePreview content={content} />;
}
