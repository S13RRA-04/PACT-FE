import { useCallback, useState } from "react";
import type { AnswerState, AnswerValue, AssignmentCompletion, ContentProgress, MechanicsState, PactContent, PactQuestion, QuestionSubmissionFeedback } from "../types";
import { text } from "../lib/format";
import { isRecord, scoreQuestion, toggle } from "../lib/scoring";
import { contentTypeModeLabel, ProgressTrack } from "../components/pact";
import { Empty } from "./pactShared";
import { CompletionScene, MissionStagePanel, QuestionStepper } from "./learnerRunnerPrimitives";
import { InteractiveContentShell } from "./interactiveContentShell";
import type { MechanicOutcome } from "./learnerMechanicsTypes";
export type { MechanicOutcome } from "./learnerMechanicsTypes";

export function ModuleRunner({
  content,
  answers,
  answeredCount,
  activeQuestionIndex,
  submittedQuestionIds,
  questionFeedback,
  progressPercent,
  result,
  persistedProgress,
  assignmentCompletion,
  onAnswer,
  onQuestionSelect,
  onSubmitQuestion,
  onMechanicsStateChange,
  onSubmit
}: {
  content?: PactContent;
  answers: AnswerState;
  answeredCount: number;
  activeQuestionIndex: number;
  submittedQuestionIds: string[];
  questionFeedback: Record<string, QuestionSubmissionFeedback>;
  progressPercent: number;
  result?: { score: number; maxScore: number };
  persistedProgress?: ContentProgress;
  assignmentCompletion?: AssignmentCompletion;
  onAnswer: (questionId: string, value: AnswerValue) => void;
  onQuestionSelect: (index: number) => void;
  onSubmitQuestion: (questionId: string) => void;
  onMechanicsStateChange: (state: MechanicsState, outcome: MechanicOutcome) => void;
  onSubmit: (outcome?: MechanicOutcome) => void;
}) {
  const [mechanicOutcomeState, setMechanicOutcomeState] = useState<{ contentId: string; outcome: MechanicOutcome } | undefined>();
  const contentId = content?.id;
  const recordMechanicOutcome = useCallback((outcome: MechanicOutcome) => {
    if (!contentId) return;
    setMechanicOutcomeState({ contentId, outcome });
  }, [contentId]);
  if (!content) return <article><Empty text="Sync PACT to load assigned content." /></article>;
  const mechanicOutcome = mechanicOutcomeState?.contentId === content.id ? mechanicOutcomeState.outcome : undefined;
  const questions = content.questions ?? [];
  const activeIndex = questions.length ? Math.min(activeQuestionIndex, questions.length - 1) : 0;
  const activeQuestion = questions[activeIndex];
  const activeValue = activeQuestion ? answers[activeQuestion.id] : undefined;
  const activeSubmitted = activeQuestion ? submittedQuestionIds.includes(activeQuestion.id) : false;
  const canSubmitContent = questions.length > 0 ? answeredCount === questions.length : Boolean(mechanicOutcome);
  const cohortLabel = content.cohortId ?? "All cohorts";
  const isComplete = Boolean(result || assignmentCompletion?.status === "complete" || persistedProgress?.status === "submitted");

  return (
    <article className={`runner type-${content.type}`}>
      <div className="runner-head">
        <div>
          <span className="content-kicker">{contentTypeModeLabel(content.type)}{content.day ? ` | ${content.day}` : ""}</span>
          <h2>{content.title}</h2>
          <p>{content.prompt}</p>
        </div>
        <div className="runner-stats" aria-label="Selected content summary">
          <span><strong>{questions.length}</strong> questions</span>
          <span><strong>{content.maxScore}</strong> points</span>
          <span><strong>{cohortLabel}</strong></span>
        </div>
      </div>
      <MissionStagePanel
        content={content}
        answeredCount={answeredCount}
        activeIndex={activeIndex}
        questionCount={questions.length}
        progressPercent={progressPercent}
      />
      <div className="progress-block" aria-label="Content progress">
        <div>
          <strong>{progressPercent}% complete</strong>
          <span>{answeredCount}/{questions.length} submitted</span>
        </div>
        <ProgressTrack value={progressPercent} />
      </div>
      {questions.length ? (
        <QuestionStepper
          activeIndex={activeIndex}
          questions={questions}
          submittedQuestionIds={submittedQuestionIds}
          onSelect={onQuestionSelect}
        />
      ) : null}
      {isComplete ? (
        <CompletionScene content={content} result={result} progress={persistedProgress} completion={assignmentCompletion} />
      ) : activeQuestion ? (
        <QuestionCard
          index={activeIndex + 1}
          question={activeQuestion}
          questionCount={questions.length}
          value={activeValue}
          isSubmitted={activeSubmitted}
          submissionFeedback={questionFeedback[activeQuestion.id]}
          canGoPrevious={activeIndex > 0}
          canGoNext={activeIndex < questions.length - 1}
          onChange={(value) => onAnswer(activeQuestion.id, value)}
          onPrevious={() => onQuestionSelect(activeIndex - 1)}
          onNext={() => onQuestionSelect(activeIndex + 1)}
          onSubmit={() => onSubmitQuestion(activeQuestion.id)}
        />
      ) : <InteractiveContentShell content={content} persistedState={persistedProgress?.mechanicsState} onOutcomeChange={recordMechanicOutcome} onStateChange={onMechanicsStateChange} />}
      <div className="submit-row">
        {result ? <strong>{result.score}/{result.maxScore} submitted</strong> : <span>{submissionSummary(assignmentCompletion, persistedProgress, answeredCount, questions.length)}</span>}
        <button type="button" onClick={() => onSubmit(mechanicOutcome)} disabled={!canSubmitContent}>Submit Content</button>
      </div>
    </article>
  );
}

function QuestionCard({
  index,
  question,
  questionCount,
  value,
  isSubmitted,
  submissionFeedback,
  canGoPrevious,
  canGoNext,
  onChange,
  onPrevious,
  onNext,
  onSubmit
}: {
  index: number;
  question: PactQuestion;
  questionCount: number;
  value?: AnswerValue;
  isSubmitted: boolean;
  submissionFeedback?: QuestionSubmissionFeedback;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onChange: (value: AnswerValue) => void;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  const hasAnswer = hasAnswerValue(value);
  const earnedPoints = scoreQuestion(question, value);
  const displayedPoints = submissionFeedback?.earnedPoints ?? earnedPoints;
  const possiblePoints = submissionFeedback?.possiblePoints ?? question.scoring.points;
  const feedbackStatus = submissionFeedback?.status ?? (displayedPoints >= possiblePoints ? "correct" : displayedPoints > 0 ? "partial" : "incorrect");
  const feedback = isSubmitted
    ? feedbackStatus === "needs_review"
      ? "Needs instructor review before final scoring."
      : feedbackStatus === "correct"
        ? (feedbackText(submissionFeedback) ?? text(question.feedback.correct)) || "Correct. This response earned full credit."
        : (feedbackText(submissionFeedback) ?? text(question.feedback.incorrect)) || "Review this response before moving on."
    : undefined;
  const guidance = isSubmitted
    ? "Answer locked. Review the feedback, then continue when ready."
    : hasAnswer
      ? "Answer selected. Submit to receive feedback and save progress."
      : "Choose an answer to enable Submit Question.";
  return (
    <section className={`question ${isSubmitted ? "answered" : ""}`}>
      <header>
        <div>
          <span>Question {index}</span>
          <small>{question.topic}</small>
        </div>
        <small>{index}/{questionCount} | {question.scoring.points} pts | {question.scoring.difficulty}</small>
      </header>
      <p>{text(question.stem)}</p>
      <div className={`question-guidance ${isSubmitted ? "locked" : hasAnswer ? "ready" : ""}`} role="status" aria-live="polite">
        {guidance}
      </div>
      <QuestionInput question={question} value={value} onChange={onChange} disabled={isSubmitted} />
      {isSubmitted ? (
        <div className={`answer-feedback ${feedbackClass(feedbackStatus)}`} role="status">
          <strong>{feedbackLabel(feedbackStatus)} | {displayedPoints}/{possiblePoints} points</strong>
          <span>{feedback}</span>
          {submissionFeedback?.nextState.attemptsRemaining !== undefined ? <small>{submissionFeedback.nextState.attemptsRemaining} attempts remaining</small> : null}
          {question.feedback.reference ? <small>Reference: {question.feedback.reference}</small> : null}
        </div>
      ) : null}
      <div className="question-actions">
        <button type="button" className="secondary-button" onClick={onPrevious} disabled={!canGoPrevious}>Previous</button>
        <button type="button" onClick={onSubmit} disabled={!hasAnswer}>Submit Question</button>
        <button type="button" className="secondary-button" onClick={onNext} disabled={!canGoNext}>Next</button>
      </div>
    </section>
  );
}

function QuestionInput({ question, value, disabled = false, onChange }: { question: PactQuestion; value?: AnswerValue; disabled?: boolean; onChange: (value: AnswerValue) => void }) {
  const payload = question.payload;
  if (payload.kind === "true_false") {
    return (
      <div className="choice-grid two">
        {[true, false].map((option) => (
          <button className={value === option ? "selected" : ""} key={String(option)} type="button" disabled={disabled} aria-pressed={value === option} onClick={() => onChange(option)}>
            <span className="choice-key">{option ? "T" : "F"}</span>
            <span className="choice-text">{option ? "True" : "False"}</span>
          </button>
        ))}
      </div>
    );
  }

  if (payload.kind === "fill_blank") {
    const current = isRecord(value) ? value : {};
    return (
      <div className="blank-grid">
        {(payload.blanks ?? []).map((blank) => (
          <label key={blank.id}>
            <span>{text(blank.label)}</span>
            <input value={current[blank.id] ?? ""} disabled={disabled} onChange={(event) => onChange({ ...current, [blank.id]: event.target.value })} />
          </label>
        ))}
      </div>
    );
  }

  if (payload.kind === "drag_match") {
    const current = isRecord(value) ? value : {};
    return (
      <div className="match-grid">
        {(payload.sources ?? []).map((source) => (
          <label key={source.id}>
            <span>{text(source.text)}</span>
            <select value={current[source.id] ?? ""} disabled={disabled} onChange={(event) => onChange({ ...current, [source.id]: event.target.value })}>
              <option value="">Choose match</option>
              {(payload.targets ?? []).map((target) => <option key={target.id} value={target.id}>{text(target.text)}</option>)}
            </select>
          </label>
        ))}
      </div>
    );
  }

  const selected = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const allowsMultiple = payload.selectionMode === "multiple";
  return (
    <div className="choice-grid">
      {(payload.options ?? []).map((option, optionIndex) => {
        const isSelected = selected.includes(option.id);
        return (
          <button
            className={isSelected ? "selected" : ""}
            key={option.id}
            type="button"
            disabled={disabled}
            aria-pressed={isSelected}
            onClick={() => onChange(allowsMultiple ? toggle(selected, option.id) : option.id)}
          >
            <span className="choice-key">{choiceLabel(optionIndex)}</span>
            <span className="choice-text">{text(option.text)}</span>
          </button>
        );
      })}
    </div>
  );
}

function choiceLabel(index: number) {
  return String.fromCharCode(65 + index);
}

function submissionSummary(completion: AssignmentCompletion | undefined, progress: ContentProgress | undefined, answeredCount: number, questionCount: number) {
  if (completion?.status === "pending_manual") return "Pending instructor review";
  if (completion?.status === "failed_must_pass") return "Must-pass requirement failed";
  if (completion?.status === "complete") return "Completed and submitted";
  if (progress?.status === "submitted") return "Previously submitted";
  return `${answeredCount}/${questionCount} questions submitted`;
}

function feedbackText(feedback: QuestionSubmissionFeedback | undefined) {
  if (typeof feedback?.feedback === "string") return feedback.feedback;
  if (isLocalizedFeedback(feedback?.feedback)) return text(feedback.feedback);
  return undefined;
}

function isLocalizedFeedback(value: unknown): value is { en?: string } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function feedbackClass(status: QuestionSubmissionFeedback["status"]) {
  if (status === "correct") return "correct";
  if (status === "needs_review") return "pending";
  return "incorrect";
}

function feedbackLabel(status: QuestionSubmissionFeedback["status"]) {
  if (status === "needs_review") return "Needs review";
  if (status === "correct") return "Correct";
  if (status === "partial") return "Partial credit";
  return "Incorrect";
}

function hasAnswerValue(value?: AnswerValue) {
  if (value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return true;
  return Object.values(value).some((item) => item.trim().length > 0);
}
