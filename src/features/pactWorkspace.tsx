import { useMemo, useState } from "react";
import type { AdminAuditEvent, AdminCohort, AnswerState, AnswerValue, ContentFilter, ContentProgress, ContentStatus, ContentType, PactContent, PactQuestion, PactSession, QuestionAttempt, ScoreboardEntry, SessionDiagnostic, SquadNumber } from "../types";
import { contentTypeLabel, contextSquadLabel, formatDateTime, roleLabel, text } from "../lib/format";
import { isRecord, scoreQuestion, toggle } from "../lib/scoring";

export function SessionDiagnosticSummary({ diagnostic }: { diagnostic: SessionDiagnostic }) {
  return (
    <div className="diagnostic-panel" aria-label="Session diagnostics">
      <dl className="diagnostic-grid">
        <div><dt>Course</dt><dd>{diagnostic.courseId}</dd></div>
        <div><dt>Cohort</dt><dd>{diagnostic.cohortId}</dd></div>
        <div><dt>Visible</dt><dd>{diagnostic.visibleContentCount}</dd></div>
        <div><dt>Launch Type</dt><dd>{diagnostic.contentType ? contentTypeLabel(diagnostic.contentType) : "All"}</dd></div>
      </dl>
      {diagnostic.contentCounts?.length ? (
        <div className="content-counts" aria-label="Content counts">
          {diagnostic.contentCounts.map((item) => (
            <span key={`${item.courseId}-${item.cohortId ?? "global"}-${item.type}-${item.status}`}>
              {item.courseId}/{item.cohortId ?? "global"} {contentTypeLabel(item.type)} {item.status}: {item.count}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

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
        progressPercent={progressPercent}
        result={result}
        persistedProgress={persistedProgress}
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
  progressPercent,
  result,
  persistedProgress,
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
  progressPercent: number;
  result?: { score: number; maxScore: number };
  persistedProgress?: ContentProgress;
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
        <span>{questions.length} questions</span>
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
          canGoPrevious={activeIndex > 0}
          canGoNext={activeIndex < questions.length - 1}
          onChange={(value) => onAnswer(activeQuestion.id, value)}
          onPrevious={() => onQuestionSelect(activeIndex - 1)}
          onNext={() => onQuestionSelect(activeIndex + 1)}
          onSubmit={() => onSubmitQuestion(activeQuestion.id)}
        />
      ) : <Empty text="This content does not have questions loaded yet." />}
      <div className="submit-row">
        {result ? <strong>{result.score}/{result.maxScore} submitted</strong> : <span>{persistedProgress?.status === "submitted" ? "Previously submitted" : `${answeredCount}/${questions.length} questions submitted`}</span>}
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
  canGoPrevious: boolean;
  canGoNext: boolean;
  onChange: (value: AnswerValue) => void;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  const hasAnswer = hasAnswerValue(value);
  const earnedPoints = scoreQuestion(question, value);
  const isCorrect = earnedPoints >= question.scoring.points;
  const feedback = isSubmitted
    ? isCorrect
      ? text(question.feedback.correct) || "Correct. This response earned full credit."
      : text(question.feedback.incorrect) || "Review this response before moving on."
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
        <div className={`answer-feedback ${isCorrect ? "correct" : "incorrect"}`} role="status">
          <strong>{earnedPoints}/{question.scoring.points} points</strong>
          <span>{feedback}</span>
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
  scoreboard,
  status
}: {
  content?: PactContent;
  session?: PactSession;
  answeredCount: number;
  progressPercent: number;
  result?: { score: number; maxScore: number };
  persistedProgress?: ContentProgress;
  scoreboard: ScoreboardEntry[];
  status: string;
}) {
  const ownScore = session ? scoreboard.find((entry) => entry.userId === session.userId) : undefined;
  const questionCount = content?.questions?.length ?? 0;
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
        {result ? (
          <p className="score-callout">{result.score}/{result.maxScore} submitted for this content.</p>
        ) : persistedProgress?.status === "submitted" ? (
          <p className="score-callout">{persistedProgress.score ?? 0}/{persistedProgress.maxScore ?? content?.maxScore ?? 0} submitted previously.</p>
        ) : ownScore ? (
          <p className="score-callout">{ownScore.totalScore}/{ownScore.maxScore} total score, {ownScore.progressPercent}% progress.</p>
        ) : (
          <p className="muted">Submit content to publish progress back through the PACT API.</p>
        )}
      </section>
      <section><h3>Status</h3><p className="muted">{status}</p></section>
    </aside>
  );
}

export function ControlPlane({
  content,
  cohorts,
  auditEvents,
  questionAttempts,
  diagnostic,
  canAdmin,
  onUpdateStatus,
  onAssignContent,
  onUpdateLmsLabel,
  onAssignSquad,
  onLoadQuestionAttempts
}: {
  content: PactContent[];
  cohorts: AdminCohort[];
  auditEvents: AdminAuditEvent[];
  questionAttempts: QuestionAttempt[];
  diagnostic?: SessionDiagnostic;
  canAdmin: boolean;
  onUpdateStatus: (id: string, status: ContentStatus) => void;
  onAssignContent: (id: string, cohortId: string | null) => void;
  onUpdateLmsLabel: (id: string, lmsLabel: string | null) => void;
  onAssignSquad: (userId: string, squadNumber: SquadNumber) => void;
  onLoadQuestionAttempts: (filters: { cohortId?: string; contentId?: string; userId?: string; questionId?: string }) => void;
}) {
  return (
    <section className="control-plane">
      <article>
        <header className="section-head"><div><h2>Control Plane</h2><p>Manage PACT content delivery, cohort assignment, user squads, and diagnostics.</p></div></header>
        {diagnostic ? <SessionDiagnosticSummary diagnostic={diagnostic} /> : null}
      </article>
      <ContentDeliveryManager content={content} cohorts={cohorts} onUpdateStatus={onUpdateStatus} onAssignContent={onAssignContent} onUpdateLmsLabel={onUpdateLmsLabel} />
      <AttemptReviewPanel content={content} cohorts={cohorts} attempts={questionAttempts} onLoad={onLoadQuestionAttempts} />
      <AdminConsole cohorts={cohorts} auditEvents={canAdmin ? auditEvents : []} onAssign={onAssignSquad} showAudit={canAdmin} />
    </section>
  );
}

type AttemptCorrectnessFilter = "all" | "correct" | "incorrect";
type AttemptRetryFilter = "all" | "first" | "retry";

function AttemptReviewPanel({
  content,
  cohorts,
  attempts,
  onLoad
}: {
  content: PactContent[];
  cohorts: AdminCohort[];
  attempts: QuestionAttempt[];
  onLoad: (filters: { cohortId?: string; contentId?: string; userId?: string; questionId?: string }) => void;
}) {
  const cohortOptions = useMemo(() => cohorts.map((cohort) => cohort.cohortId).sort(), [cohorts]);
  const learnerOptions = useMemo(
    () => cohorts.flatMap((cohort) => cohort.users.filter((user) => user.role === "learner").map((user) => ({ ...user, cohortId: cohort.cohortId }))),
    [cohorts]
  );
  const questionOptions = useMemo(
    () => content.flatMap((item) => (item.questions ?? []).map((question) => ({
      contentId: item.id,
      id: question.id,
      label: `${item.title} - ${question.topic || question.id}`
    }))),
    [content]
  );
  const [cohortId, setCohortId] = useState(cohortOptions[0] ?? "");
  const [contentId, setContentId] = useState("");
  const [userId, setUserId] = useState("");
  const [questionId, setQuestionId] = useState("");
  const [correctness, setCorrectness] = useState<AttemptCorrectnessFilter>("all");
  const [retry, setRetry] = useState<AttemptRetryFilter>("all");
  const visibleQuestions = questionOptions.filter((question) => !contentId || question.contentId === contentId);
  const filteredAttempts = attempts.filter((attempt) => {
    if (correctness === "correct" && !attempt.isCorrect) return false;
    if (correctness === "incorrect" && attempt.isCorrect) return false;
    if (retry === "first" && attempt.attemptNumber !== 1) return false;
    if (retry === "retry" && attempt.attemptNumber <= 1) return false;
    return true;
  });

  function applyFilters() {
    onLoad({
      cohortId: cohortId || undefined,
      contentId: contentId || undefined,
      userId: userId || undefined,
      questionId: questionId || undefined
    });
  }

  return (
    <article className="attempt-review">
      <header className="section-head">
        <div>
          <h2>Question Attempt Review</h2>
          <p>Review retries, correctness, timestamps, and feedback exposure by learner.</p>
        </div>
        <button type="button" onClick={applyFilters}>Apply Filters</button>
      </header>
      <div className="attempt-filters" aria-label="Attempt review filters">
        <label className="inline-select">
          <span>Cohort</span>
          <select value={cohortId} onChange={(event) => setCohortId(event.target.value)}>
            <option value="">Current cohort</option>
            {cohortOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label className="inline-select">
          <span>Learner</span>
          <select value={userId} onChange={(event) => setUserId(event.target.value)}>
            <option value="">All learners</option>
            {learnerOptions.map((learner) => <option key={learner.id} value={learner.id}>{learner.name ?? learner.email ?? learner.id}</option>)}
          </select>
        </label>
        <label className="inline-select">
          <span>Content</span>
          <select value={contentId} onChange={(event) => { setContentId(event.target.value); setQuestionId(""); }}>
            <option value="">All content</option>
            {content.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </label>
        <label className="inline-select">
          <span>Question</span>
          <select value={questionId} onChange={(event) => setQuestionId(event.target.value)}>
            <option value="">All questions</option>
            {visibleQuestions.map((question) => <option key={`${question.contentId}-${question.id}`} value={question.id}>{question.label}</option>)}
          </select>
        </label>
        <label className="inline-select">
          <span>Correctness</span>
          <select value={correctness} onChange={(event) => setCorrectness(event.target.value as AttemptCorrectnessFilter)}>
            <option value="all">All results</option>
            <option value="correct">Correct only</option>
            <option value="incorrect">Incorrect only</option>
          </select>
        </label>
        <label className="inline-select">
          <span>Retry count</span>
          <select value={retry} onChange={(event) => setRetry(event.target.value as AttemptRetryFilter)}>
            <option value="all">All attempts</option>
            <option value="first">First attempts</option>
            <option value="retry">Retries only</option>
          </select>
        </label>
      </div>
      <div className="attempt-summary" aria-label="Attempt review summary">
        <div><span>Showing</span><strong>{filteredAttempts.length}</strong></div>
        <div><span>Correct</span><strong>{filteredAttempts.filter((attempt) => attempt.isCorrect).length}</strong></div>
        <div><span>Retries</span><strong>{filteredAttempts.filter((attempt) => attempt.attemptNumber > 1).length}</strong></div>
        <div><span>Feedback seen</span><strong>{filteredAttempts.filter((attempt) => attempt.feedbackExposed).length}</strong></div>
      </div>
      <div className="attempt-list">
        {filteredAttempts.length ? filteredAttempts.map((attempt) => (
          <section className="attempt-row" key={attempt.id}>
            <div>
              <strong>{attempt.learnerName ?? attempt.learnerEmail ?? attempt.userId}</strong>
              <small>{attempt.contentTitle ?? attempt.contentId} | {attempt.questionTopic ?? attempt.questionId}</small>
            </div>
            <span className={`status ${attempt.isCorrect ? "published" : "draft"}`}>{attempt.isCorrect ? "correct" : "incorrect"}</span>
            <div><span>Attempt</span><strong>{attempt.attemptNumber}</strong></div>
            <div><span>Score</span><strong>{attempt.score}/{attempt.maxScore}</strong></div>
            <div><span>Feedback</span><strong>{attempt.feedbackExposed ? "Shown" : "Hidden"}</strong></div>
            <time dateTime={attempt.submittedAt}>{formatDateTime(attempt.submittedAt)}</time>
          </section>
        )) : <Empty text="No question attempts match the current filters." />}
      </div>
    </article>
  );
}

function ContentDeliveryManager({ content, cohorts, onUpdateStatus, onAssignContent, onUpdateLmsLabel }: {
  content: PactContent[];
  cohorts: AdminCohort[];
  onUpdateStatus: (id: string, status: ContentStatus) => void;
  onAssignContent: (id: string, cohortId: string | null) => void;
  onUpdateLmsLabel: (id: string, lmsLabel: string | null) => void;
}) {
  const cohortOptions = Array.from(new Set(cohorts.map((cohort) => cohort.cohortId))).sort();
  return (
    <article>
      <h2>Content Delivery</h2>
      <div className="list">
        {content.length ? content.map((item) => (
          <div className="gate-row" key={item.id}>
            <span className={`status ${item.status ?? "draft"}`}>{item.status ?? "draft"}</span>
            <div><strong>{item.title}</strong><small>{contentTypeLabel(item.type)} | {item.questionCount ?? item.questions?.length ?? 0} questions | {item.cohortId ?? "all cohorts"}</small></div>
            <label className="inline-select"><span>Cohort</span><select value={item.cohortId ?? ""} onChange={(event) => onAssignContent(item.id, event.target.value || null)}><option value="">All cohorts</option>{cohortOptions.map((cohortId) => <option key={cohortId} value={cohortId}>{cohortId}</option>)}</select></label>
            <label className="inline-select"><span>LMS label</span><input defaultValue={item.lmsLabel ?? ""} onBlur={(event) => { const nextLabel = event.currentTarget.value.trim(); if (nextLabel !== (item.lmsLabel ?? "")) onUpdateLmsLabel(item.id, nextLabel || null); }} placeholder={item.title} /></label>
            <div>{(["draft", "published", "archived"] as ContentStatus[]).map((status) => <button disabled={item.status === status} key={status} type="button" onClick={() => onUpdateStatus(item.id, status)}>{status}</button>)}</div>
          </div>
        )) : <Empty text="No content available to manage." />}
      </div>
    </article>
  );
}

function AdminConsole({ cohorts, auditEvents, onAssign, showAudit = true }: { cohorts: AdminCohort[]; auditEvents: AdminAuditEvent[]; onAssign: (userId: string, squadNumber: SquadNumber) => void; showAudit?: boolean }) {
  return (
    <article className="admin-console">
      <h2>PACT Users</h2>
      <div className="cohort-list">
        {cohorts.length ? cohorts.map((cohort) => (
          <section className="cohort-panel" key={cohort.cohortId}>
            <header><div><span>{cohort.courseId}</span><h3>{cohort.cohortId}</h3></div><small>{cohort.users.length} enrolled</small></header>
            <div className="squad-strip" aria-label={`${cohort.cohortId} squads`}>
              {(["1", "2", "3", "4"] as SquadNumber[]).map((number) => <span className={`squad-pill squad-${number}`} key={number}>Squad {number}<strong>{cohort.users.filter((user) => user.squadNumber === number).length}</strong></span>)}
            </div>
            <div className="admin-user-list">
              {cohort.users.map((user) => (
                <div className="admin-user-row" key={user.id}>
                  <div><strong>{user.name ?? user.email ?? user.id}</strong><small>{roleLabel(user.role)}{user.email ? ` | ${user.email}` : ""}</small></div>
                  {user.role === "learner" ? (
                    <div className="squad-actions" aria-label={`Assign ${user.name ?? user.id} to squad`}>
                      {(["1", "2", "3", "4"] as SquadNumber[]).map((number) => <button className={`squad-button squad-${number} ${user.squadNumber === number ? "selected" : ""}`} key={number} type="button" onClick={() => onAssign(user.id, number)} disabled={user.squadNumber === number}>{number}</button>)}
                    </div>
                  ) : <span className="staff-pill">Grey - {roleLabel(user.role)}</span>}
                </div>
              ))}
            </div>
          </section>
        )) : <Empty text="No cohorts or enrolled users are available for this admin session." />}
      </div>
      {showAudit ? <section className="audit-panel">
        <header><h3>Assignment History</h3><small>{auditEvents.length} recent changes</small></header>
        <div className="audit-list">
          {auditEvents.length ? auditEvents.map((event) => (
            <div className="audit-row" key={event.id}>
              <div><strong>{event.targetName ?? event.targetUserId}</strong><small>{event.cohortId} - assigned to {event.nextSquadNumber ? `Squad ${event.nextSquadNumber}` : event.nextSquadId}</small></div>
              <div><span>{event.actorName ?? event.actorUserId}</span><time dateTime={event.createdAt}>{formatDateTime(event.createdAt)}</time></div>
            </div>
          )) : <Empty text="No squad assignment changes have been recorded yet." />}
        </div>
      </section> : null}
    </article>
  );
}

export function Scoreboard({ entries }: { entries: ScoreboardEntry[] }) {
  return (
    <article>
      <h2>Scoreboard</h2>
      <div className="list">
        {entries.length ? entries.map((entry) => (
          <div className="row" key={entry.userId}>
            <span className={entry.squadNumber ? `score-squad squad-${entry.squadNumber}` : ""}>{entry.squadNumber ? `Squad ${entry.squadNumber}` : "solo"}</span>
            <strong>{entry.name ?? entry.userId}</strong>
            <small>{entry.totalScore}/{entry.maxScore} - {entry.progressPercent}%</small>
          </div>
        )) : <Empty text="No scores loaded." />}
      </div>
    </article>
  );
}

function Empty({ text: message }: { text: string }) {
  return <div className="empty">{message}</div>;
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
