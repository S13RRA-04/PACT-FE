import type { AnswerState, AnswerValue, AssignmentCompletion, ContentFilter, ContentProgress, ContentType, PactContent, PactQuestion, PactSession, QuestionSubmissionFeedback, ScoreboardEntry } from "../types";
import { contentTypeLabel, contextSquadLabel, text } from "../lib/format";
import { isRecord, scoreQuestion, toggle } from "../lib/scoring";
import { Empty } from "./pactShared";

export function ContentWorkspace({
  content,
  allContentCount,
  filter,
  availableTypes,
  session,
  selectedContent,
  answers,
  answeredCount,
  activeQuestionIndex,
  submittedQuestionIds,
  questionFeedback,
  assignmentCompletion,
  completionScore,
  progressPercent,
  result,
  persistedProgress,
  scoreboard,
  status,
  onFilterChange,
  onSelectContent,
  onAnswer,
  onQuestionSelect,
  onSubmitQuestion,
  onSubmit
}: {
  content: PactContent[];
  allContentCount: number;
  filter: ContentFilter;
  availableTypes: ContentType[];
  session?: PactSession;
  selectedContent?: PactContent;
  answers: AnswerState;
  answeredCount: number;
  activeQuestionIndex: number;
  submittedQuestionIds: string[];
  questionFeedback: Record<string, QuestionSubmissionFeedback>;
  assignmentCompletion?: AssignmentCompletion;
  completionScore?: { score: number; maxScore: number; progressPercent: number; agsStatus: string };
  progressPercent: number;
  result?: { score: number; maxScore: number };
  persistedProgress?: ContentProgress;
  scoreboard: ScoreboardEntry[];
  status: string;
  onFilterChange: (filter: ContentFilter) => void;
  onSelectContent: (id: string) => void;
  onAnswer: (questionId: string, value: AnswerValue) => void;
  onQuestionSelect: (index: number) => void;
  onSubmitQuestion: (questionId: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="module-layout">
      <ModuleList
        content={content}
        allContentCount={allContentCount}
        filter={filter}
        availableTypes={availableTypes}
        session={session}
        selectedContentId={selectedContent?.id}
        onFilterChange={onFilterChange}
        onSelect={onSelectContent}
      />
      <ModuleRunner
        content={selectedContent}
        answers={answers}
        answeredCount={answeredCount}
        activeQuestionIndex={activeQuestionIndex}
        submittedQuestionIds={submittedQuestionIds}
        questionFeedback={questionFeedback}
        progressPercent={progressPercent}
        result={result}
        persistedProgress={persistedProgress}
        assignmentCompletion={assignmentCompletion}
        onAnswer={onAnswer}
        onQuestionSelect={onQuestionSelect}
        onSubmitQuestion={onSubmitQuestion}
        onSubmit={onSubmit}
      />
      <ActivityPanel
        content={selectedContent}
        session={session}
        answeredCount={answeredCount}
        progressPercent={progressPercent}
        result={result}
        persistedProgress={persistedProgress}
        assignmentCompletion={assignmentCompletion}
        completionScore={completionScore}
        scoreboard={scoreboard}
        status={status}
      />
    </section>
  );
}

function ModuleList({
  content,
  allContentCount,
  filter,
  availableTypes,
  session,
  selectedContentId,
  onFilterChange,
  onSelect
}: {
  content: PactContent[];
  allContentCount: number;
  filter: ContentFilter;
  availableTypes: ContentType[];
  session?: PactSession;
  selectedContentId?: string;
  onFilterChange: (filter: ContentFilter) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <article className="module-list">
      <div className="panel-title">
        <div>
          <h2>Module Playlist</h2>
          <p>{allContentCount} assigned item{allContentCount === 1 ? "" : "s"}</p>
        </div>
        <span className="panel-count">{content.length}</span>
      </div>
      <div className="filter-tabs" aria-label="Filter content">
        <button className={filter === "all" ? "active" : ""} type="button" onClick={() => onFilterChange("all")}>All</button>
        {availableTypes.map((type) => (
          <button className={filter === type ? "active" : ""} key={type} type="button" onClick={() => onFilterChange(type)}>
            {contentTypeLabel(type)}
          </button>
        ))}
      </div>
      <div className="list">
        {content.length ? content.map((item) => (
          <button className={`module-row ${item.id === selectedContentId ? "selected" : ""}`} key={item.id} type="button" onClick={() => onSelect(item.id)}>
            <span className="module-index">{item.day ?? contentTypeLabel(item.type)}</span>
            <span className="module-row-copy">
              <strong>{item.title}</strong>
              <small>{item.questionCount ?? item.questions?.length ?? 0} questions | {item.maxScore} pts | {item.cohortId ?? "all cohorts"}</small>
            </span>
            <span className="module-row-arrow" aria-hidden="true">&gt;</span>
          </button>
        )) : <Empty text={allContentCount ? "No assigned content matches this filter." : emptyContentMessage(session)} />}
      </div>
    </article>
  );
}

function ModuleRunner({
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
  onSubmit: () => void;
}) {
  if (!content) return <article><Empty text="Sync PACT to load assigned content." /></article>;
  const questions = content.questions ?? [];
  const activeIndex = questions.length ? Math.min(activeQuestionIndex, questions.length - 1) : 0;
  const activeQuestion = questions[activeIndex];
  const activeValue = activeQuestion ? answers[activeQuestion.id] : undefined;
  const activeSubmitted = activeQuestion ? submittedQuestionIds.includes(activeQuestion.id) : false;
  const canSubmitContent = questions.length > 0 && answeredCount === questions.length;

  return (
    <article className="runner">
      <div className="runner-head">
        <div>
          <span className="content-kicker">{contentTypeLabel(content.type)}{content.day ? ` | ${content.day}` : ""}</span>
          <h2>{content.title}</h2>
          <p>{content.prompt}</p>
        </div>
        <span className="question-total">{questions.length} questions</span>
      </div>
      <div className="progress-block" aria-label="Content progress">
        <div>
          <strong>{progressPercent}% complete</strong>
          <span>{answeredCount}/{questions.length} submitted</span>
        </div>
        <div className="progress-track"><span style={{ width: `${progressPercent}%` }} /></div>
      </div>
      {questions.length ? (
        <QuestionStepper
          activeIndex={activeIndex}
          questions={questions}
          submittedQuestionIds={submittedQuestionIds}
          onSelect={onQuestionSelect}
        />
      ) : null}
      {activeQuestion ? (
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
      ) : <Empty text="This content does not have questions loaded yet." />}
      <div className="submit-row">
        {result ? <strong>{result.score}/{result.maxScore} submitted</strong> : <span>{submissionSummary(assignmentCompletion, persistedProgress, answeredCount, questions.length)}</span>}
        <button type="button" onClick={onSubmit} disabled={!canSubmitContent}>Submit Content</button>
      </div>
    </article>
  );
}

function QuestionStepper({ activeIndex, questions, submittedQuestionIds, onSelect }: {
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
  return (
    <section className={`question ${isSubmitted ? "answered" : ""}`}>
      <header>
        <div><span>Question {index}</span><small>{question.topic}</small></div>
        <small>{index}/{questionCount} | {question.scoring.points} pts | {question.scoring.difficulty}</small>
      </header>
      <p>{text(question.stem)}</p>
      <QuestionInput question={question} value={value} onChange={onChange} />
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

function QuestionInput({ question, value, onChange }: { question: PactQuestion; value?: AnswerValue; onChange: (value: AnswerValue) => void }) {
  const payload = question.payload;
  if (payload.kind === "true_false") {
    return (
      <div className="choice-grid two">
        {[true, false].map((option) => (
          <button className={value === option ? "selected" : ""} key={String(option)} type="button" onClick={() => onChange(option)}>
            {option ? "True" : "False"}
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
            <input value={current[blank.id] ?? ""} onChange={(event) => onChange({ ...current, [blank.id]: event.target.value })} />
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
            <select value={current[source.id] ?? ""} onChange={(event) => onChange({ ...current, [source.id]: event.target.value })}>
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
      {(payload.options ?? []).map((option) => {
        const isSelected = selected.includes(option.id);
        return (
          <button
            className={isSelected ? "selected" : ""}
            key={option.id}
            type="button"
            onClick={() => onChange(allowsMultiple ? toggle(selected, option.id) : option.id)}
          >
            {text(option.text)}
          </button>
        );
      })}
    </div>
  );
}

function ActivityPanel({
  content,
  session,
  answeredCount,
  progressPercent,
  result,
  persistedProgress,
  assignmentCompletion,
  completionScore,
  scoreboard,
  status
}: {
  content?: PactContent;
  session?: PactSession;
  answeredCount: number;
  progressPercent: number;
  result?: { score: number; maxScore: number };
  persistedProgress?: ContentProgress;
  assignmentCompletion?: AssignmentCompletion;
  completionScore?: { score: number; maxScore: number; progressPercent: number; agsStatus: string };
  scoreboard: ScoreboardEntry[];
  status: string;
}) {
  const ownScore = session ? scoreboard.find((entry) => entry.userId === session.userId) : undefined;
  const questionCount = content?.questions?.length ?? 0;
  const completionState = completionDisplayState({ assignmentCompletion, completionScore, result, persistedProgress, ownScore, content });
  return (
    <aside className="activity-panel" aria-label="Learning activity">
      <section>
        <h2>Activity</h2>
        <div className="metric-grid">
          <div><span>Progress</span><strong>{progressPercent}%</strong></div>
          <div><span>Answered</span><strong>{answeredCount}/{questionCount}</strong></div>
          <div><span>Possible</span><strong>{content?.maxScore ?? 0}</strong></div>
        </div>
      </section>
      <section>
        <h3>Current Context</h3>
        <dl className="context-list">
          <div><dt>Course</dt><dd>{session?.courseId ?? "Not connected"}</dd></div>
          <div><dt>Cohort</dt><dd>{session?.cohortId ?? "Not connected"}</dd></div>
          <div><dt>Squad</dt><dd>{session ? contextSquadLabel(session) : "Not connected"}</dd></div>
        </dl>
      </section>
      <section>
        <h3>Score Sync</h3>
        <div className={`score-callout ${completionState.tone}`}>
          <span>{completionState.label}</span>
          <strong>{completionState.value}</strong>
          <small>{completionState.detail}</small>
        </div>
      </section>
      <section><h3>Status</h3><p className="muted">{status}</p></section>
    </aside>
  );
}

function completionDisplayState(input: {
  assignmentCompletion?: AssignmentCompletion;
  completionScore?: { score: number; maxScore: number; progressPercent: number; agsStatus: string };
  result?: { score: number; maxScore: number };
  persistedProgress?: ContentProgress;
  ownScore?: ScoreboardEntry;
  content?: PactContent;
}) {
  if (input.assignmentCompletion?.status === "pending_manual") {
    return {
      tone: "pending",
      label: "Instructor review",
      value: "Pending grade",
      detail: "Final score waits for manual grading."
    };
  }
  if (input.assignmentCompletion?.status === "failed_must_pass") {
    return {
      tone: "failed",
      label: "Must-pass gate",
      value: "Not submitted",
      detail: "A required question must be passed before final score submission."
    };
  }
  if (input.completionScore?.agsStatus === "pending") {
    return {
      tone: "pending",
      label: "LMS sync queued",
      value: `${input.completionScore.score}/${input.completionScore.maxScore}`,
      detail: "PACT saved the final score and queued LMS grade sync."
    };
  }
  if (input.completionScore?.agsStatus === "failed") {
    return {
      tone: "failed",
      label: "LMS sync retry needed",
      value: `${input.completionScore.score}/${input.completionScore.maxScore}`,
      detail: "PACT saved the final score; an instructor can retry LMS sync."
    };
  }
  if (input.assignmentCompletion?.status === "complete") {
    return {
      tone: "success",
      label: "Completed",
      value: `${input.assignmentCompletion.score}/${input.assignmentCompletion.maxScore}`,
      detail: "Final score has been submitted."
    };
  }
  if (input.result) {
    return {
      tone: "success",
      label: "Submitted",
      value: `${input.result.score}/${input.result.maxScore}`,
      detail: "This content score was submitted."
    };
  }
  if (input.persistedProgress?.status === "submitted") {
    return {
      tone: "success",
      label: "Previously submitted",
      value: `${input.persistedProgress.score ?? 0}/${input.persistedProgress.maxScore ?? input.content?.maxScore ?? 0}`,
      detail: "Saved completion was restored from PACT."
    };
  }
  if (input.ownScore) {
    return {
      tone: "neutral",
      label: "Course progress",
      value: `${input.ownScore.totalScore}/${input.ownScore.maxScore}`,
      detail: `${input.ownScore.progressPercent}% progress across scored content.`
    };
  }
  return {
    tone: "neutral",
    label: "Not submitted",
    value: "In progress",
    detail: "Submit content to publish progress through PACT."
  };
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

function emptyContentMessage(session?: PactSession) {
  if (session?.role === "admin" || session?.role === "instructor") {
    return "No content is assigned to this course or cohort yet.";
  }

  const type = session?.contentType ? `${contentTypeLabel(session.contentType).toLowerCase()} content` : "content";
  const context = session ? `course ${session.courseId} and cohort ${session.cohortId}` : "this launch session";
  return `No published ${type} matches ${context}. Ask an instructor to publish or assign content for this launch.`;
}
