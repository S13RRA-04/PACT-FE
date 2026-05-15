import type { ContentProgress, ContentType, PactContent, PactQuestion, AssignmentCompletion } from "../types";
import { contentTypeLabel } from "../lib/format";
import { contentTypeModeLabel, InteractiveGlobe, ProgressTrack } from "../components/pact";

export function MissionStagePanel({
  content,
  answeredCount,
  activeIndex,
  questionCount,
  progressPercent
}: {
  content: PactContent;
  answeredCount: number;
  activeIndex: number;
  questionCount: number;
  progressPercent: number;
}) {
  return (
    <section className={`mission-stage-panel type-${content.type}`} aria-label="Mission stage">
      <InteractiveGlobe className="stage-globe" />
      <div className="stage-objective">
        <span>{contentTypeModeLabel(content.type)}</span>
        <strong>{stageTitle(content.type)}</strong>
        <p>{stageDetail(content.type)}</p>
      </div>
      <div className="stage-readout">
        <div><span>Step</span><strong>{questionCount ? activeIndex + 1 : 0}/{questionCount}</strong></div>
        <div><span>Captured</span><strong>{answeredCount}</strong></div>
        <div><span>Signal</span><strong>{progressPercent}%</strong></div>
      </div>
    </section>
  );
}

export function ContentModePreview({ content }: { content: PactContent }) {
  return (
    <section className={`mode-preview type-${content.type}`}>
      <div>
        <span>{contentTypeModeLabel(content.type)}</span>
        <strong>{previewTitle(content.type)}</strong>
        <p>{previewDetail(content.type)}</p>
      </div>
      <div className="preview-cards" aria-label={`${contentTypeLabel(content.type)} readiness`}>
        <div><span>Objective</span><strong>{content.maxScore} pts</strong></div>
        <div><span>Mode</span><strong>{contentTypeLabel(content.type)}</strong></div>
        <div><span>Status</span><strong>Ready</strong></div>
      </div>
    </section>
  );
}

export function CompletionScene({
  content,
  result,
  progress,
  completion
}: {
  content: PactContent;
  result?: { score: number; maxScore: number };
  progress?: ContentProgress;
  completion?: AssignmentCompletion;
}) {
  const score = result?.score ?? progress?.score ?? completion?.score ?? 0;
  const maxScore = result?.maxScore ?? progress?.maxScore ?? completion?.maxScore ?? content.maxScore;
  const percent = maxScore ? Math.round((score / maxScore) * 100) : 0;
  return (
    <section className={`completion-scene type-${content.type}`} role="status">
      <div className="completion-emblem" aria-hidden="true">{percent}</div>
      <div>
        <span>{contentTypeModeLabel(content.type)} complete</span>
        <strong>{completionTitle(content.type)}</strong>
        <p>{score}/{maxScore} points captured. Your PACT progress is saved for this launch context.</p>
        <ProgressTrack value={percent} />
      </div>
    </section>
  );
}

export function QuestionStepper({
  activeIndex,
  questions,
  submittedQuestionIds,
  onSelect
}: {
  activeIndex: number;
  questions: PactQuestion[];
  submittedQuestionIds: string[];
  onSelect: (index: number) => void;
}) {
  return (
    <ol className="question-stepper" aria-label="Question progress">
      {questions.map((question, index) => (
        <li className={`${submittedQuestionIds.includes(question.id) ? "complete" : ""} ${index === activeIndex ? "active" : ""}`} key={question.id}>
          <button type="button" onClick={() => onSelect(index)} aria-label={`Question ${index + 1}`}>
            {index + 1}
          </button>
        </li>
      ))}
    </ol>
  );
}

function stageTitle(type: ContentType) {
  if (type === "challenge") return "Exploit the scenario";
  if (type === "game") return "Play the operation";
  if (type === "assessment") return "Prove readiness";
  return "Work the mission";
}

function stageDetail(type: ContentType) {
  if (type === "challenge") return "Short, focused decisions with immediate operational pressure.";
  if (type === "game") return "A scenario-driven run built for momentum, score, and replay.";
  if (type === "assessment") return "A checkpoint that validates mastery before moving forward.";
  return "Move question by question, lock in evidence, and submit when complete.";
}

function previewTitle(type: ContentType) {
  if (type === "challenge") return "Challenge shell ready";
  if (type === "game") return "Game scenario shell";
  if (type === "assessment") return "Assessment checkpoint";
  return "Module shell ready";
}

function previewDetail(type: ContentType) {
  if (type === "challenge") return "This challenge is staged for delivery, but its decision prompts have not been published yet.";
  if (type === "game") return "The game surface is ready. Scenario mechanics, timers, and scoring events can attach here when content is published.";
  if (type === "assessment") return "This assessment gate is visible, but the scored checkpoint items are not loaded yet.";
  return "This module is visible, but questions have not been loaded yet.";
}

function completionTitle(type: ContentType) {
  if (type === "challenge") return "Challenge cleared";
  if (type === "game") return "Run complete";
  if (type === "assessment") return "Assessment submitted";
  return "Module submitted";
}
