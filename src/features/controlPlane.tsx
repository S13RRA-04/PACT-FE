import { useMemo, useState } from "react";
import type { AdminAuditAction, AdminAuditEvent, AdminCohort, AgsPublishAttempt, AgsPublishAttemptStatus, AgsTokenContextDiagnostic, ContentStatus, ManualGradingStatus, PactContent, PactNotification, QuestionAttempt, SessionDiagnostic, SquadNumber } from "../types";
import { contentTypeLabel, formatDateTime, roleLabel } from "../lib/format";
import { Empty, SessionDiagnosticSummary } from "./pactShared";

export function ControlPlane({
  content,
  cohorts,
  auditEvents,
  questionAttempts,
  agsAttempts,
  agsNextCursor,
  agsSummary,
  agsPageSize,
  agsTokenContext,
  notifications,
  agsExportUrl,
  diagnostic,
  canAdmin,
  onUpdateStatus,
  onAssignContent,
  onUpdateLmsLabel,
  onAssignSquad,
  onLoadQuestionAttempts,
  onGradeManualAttempt,
  onLoadAgsAttempts,
  onLoadMoreAgsAttempts,
  onRetryAgsAttempt,
  onProcessDueAgsAttempts,
  onLoadNotifications,
  onLoadAuditEvents
}: {
  content: PactContent[];
  cohorts: AdminCohort[];
  auditEvents: AdminAuditEvent[];
  questionAttempts: QuestionAttempt[];
  agsAttempts: AgsPublishAttempt[];
  agsNextCursor?: string;
  agsSummary?: { total: number; byStatus: Partial<Record<AgsPublishAttemptStatus, number>> };
  agsPageSize: number;
  agsTokenContext?: AgsTokenContextDiagnostic;
  notifications: PactNotification[];
  agsExportUrl: string;
  diagnostic?: SessionDiagnostic;
  canAdmin: boolean;
  onUpdateStatus: (id: string, status: ContentStatus) => void;
  onAssignContent: (id: string, cohortId: string | null) => void;
  onUpdateLmsLabel: (id: string, lmsLabel: string | null) => void;
  onAssignSquad: (userId: string, squadNumber: SquadNumber) => void;
  onLoadQuestionAttempts: (filters: { cohortId?: string; contentId?: string; userId?: string; questionId?: string; manualGradingStatus?: ManualGradingStatus }) => void;
  onGradeManualAttempt: (attemptId: string, input: { score: number; feedback?: string }) => void;
  onLoadAgsAttempts: (filters: { status?: AgsPublishAttemptStatus; cohortId?: string; contentId?: string; userId?: string }, pageSize: number) => void;
  onLoadMoreAgsAttempts: (pageSize: number) => void;
  onRetryAgsAttempt: (attemptId: string, agsAccessToken: string) => void;
  onProcessDueAgsAttempts: () => void;
  onLoadNotifications: () => void;
  onLoadAuditEvents: (action?: AdminAuditAction) => void;
}) {
  return (
    <section className="control-plane">
      <article>
        <header className="section-head"><div><h2>Control Plane</h2><p>Manage PACT content delivery, cohort assignment, user squads, and diagnostics.</p></div></header>
        {diagnostic ? <SessionDiagnosticSummary diagnostic={diagnostic} /> : null}
      </article>
      <ContentDeliveryManager content={content} cohorts={cohorts} onUpdateStatus={onUpdateStatus} onAssignContent={onAssignContent} onUpdateLmsLabel={onUpdateLmsLabel} />
      <AgsDiagnosticsPanel
        content={content}
        cohorts={cohorts}
        attempts={agsAttempts}
        nextCursor={agsNextCursor}
        summary={agsSummary}
        pageSize={agsPageSize}
        tokenContext={agsTokenContext}
        exportUrl={agsExportUrl}
        onLoad={onLoadAgsAttempts}
        onLoadMore={onLoadMoreAgsAttempts}
        onRetry={onRetryAgsAttempt}
        onProcessDue={onProcessDueAgsAttempts}
      />
      <NotificationDiagnosticsPanel notifications={notifications} onRefresh={onLoadNotifications} />
      <AttemptReviewPanel content={content} cohorts={cohorts} attempts={questionAttempts} onLoad={onLoadQuestionAttempts} onGrade={onGradeManualAttempt} />
      <AdminConsole cohorts={cohorts} auditEvents={canAdmin ? auditEvents : []} onAssign={onAssignSquad} onLoadAuditEvents={onLoadAuditEvents} showAudit={canAdmin} />
    </section>
  );
}

function AgsDiagnosticsPanel({
  content,
  cohorts,
  attempts,
  nextCursor,
  summary,
  pageSize,
  tokenContext,
  exportUrl,
  onLoad,
  onLoadMore,
  onRetry,
  onProcessDue
}: {
  content: PactContent[];
  cohorts: AdminCohort[];
  attempts: AgsPublishAttempt[];
  nextCursor?: string;
  summary?: { total: number; byStatus: Partial<Record<AgsPublishAttemptStatus, number>> };
  pageSize: number;
  tokenContext?: AgsTokenContextDiagnostic;
  exportUrl: string;
  onLoad: (filters: { status?: AgsPublishAttemptStatus; cohortId?: string; contentId?: string; userId?: string }, pageSize: number) => void;
  onLoadMore: (pageSize: number) => void;
  onRetry: (attemptId: string, agsAccessToken: string) => void;
  onProcessDue: () => void;
}) {
  const cohortOptions = useMemo(() => cohorts.map((cohort) => cohort.cohortId).sort(), [cohorts]);
  const learnerOptions = useMemo(
    () => cohorts.flatMap((cohort) => cohort.users.filter((user) => user.role === "learner").map((user) => ({ ...user, cohortId: cohort.cohortId }))),
    [cohorts]
  );
  const [status, setStatus] = useState<AgsPublishAttemptStatus | "">("failed");
  const [cohortId, setCohortId] = useState("");
  const [contentId, setContentId] = useState("");
  const [userId, setUserId] = useState("");
  const [selectedPageSize, setSelectedPageSize] = useState(pageSize);
  const [retryTokens, setRetryTokens] = useState<Record<string, string>>({});
  const retryableCount = attempts.filter((attempt) => attempt.status === "failed" || attempt.status === "pending").length;
  const exhaustedCount = summary?.byStatus.retry_exhausted ?? attempts.filter((attempt) => attempt.status === "retry_exhausted").length;
  const pendingCount = summary?.byStatus.pending ?? attempts.filter((attempt) => attempt.status === "pending").length;
  const failedCount = summary?.byStatus.failed ?? attempts.filter((attempt) => attempt.status === "failed").length;
  const queueReady = Boolean(tokenContext?.hasLaunchContext && tokenContext.hasScoreScope);

  function applyFilters() {
    onLoad({
      status: status || undefined,
      cohortId: cohortId || undefined,
      contentId: contentId || undefined,
      userId: userId || undefined
    }, selectedPageSize);
  }

  return (
    <article className="ags-diagnostics">
      <header className="section-head">
        <div>
          <h2>AGS Publish Diagnostics</h2>
          <p>Inspect LMS grade sync outcomes, verify launch token context, and retry failed or pending publishes.</p>
        </div>
        <div className="section-actions">
          <a className="button-link" href={exportUrl}>Export CSV</a>
          <button type="button" onClick={applyFilters}>Refresh</button>
        </div>
      </header>
      <div className={`ags-token-context ${tokenContext?.hasLaunchContext && tokenContext.hasScoreScope ? "ready" : "needs-launch"}`}>
        <div>
          <strong>{tokenContext?.hasLaunchContext && tokenContext.hasScoreScope ? "Server-side AGS tokens available" : "Launch context needs refresh"}</strong>
          <p>
            {tokenContext?.hasLaunchContext && tokenContext.hasScoreScope
              ? `PACT can request short-lived LMS AGS score tokens for ${tokenContext.courseId}/${tokenContext.cohortId}.`
              : "Launch PACT from the LMS as an instructor/admin with AGS scope before relying on durable retries."}
          </p>
        </div>
        <dl>
          <div><dt>Score Scope</dt><dd>{tokenContext?.hasScoreScope ? "Granted" : "Missing"}</dd></div>
          <div><dt>Updated</dt><dd>{tokenContext?.updatedAt ? formatDateTime(tokenContext.updatedAt) : "No launch"}</dd></div>
        </dl>
      </div>
      {exhaustedCount ? (
        <div className="ags-alert" role="alert">
          <strong>{exhaustedCount} AGS retry {exhaustedCount === 1 ? "attempt has" : "attempts have"} exhausted max attempts.</strong>
          <span>Refresh the LMS launch context, inspect the LMS line item, then retry manually.</span>
        </div>
      ) : null}
      <div className={`ags-queue-action ${queueReady ? "ready" : "blocked"}`} aria-label="AGS queue processing">
        <div>
          <strong>{pendingCount + failedCount} due or retryable sync {pendingCount + failedCount === 1 ? "item" : "items"}</strong>
          <span>{queueReady ? "Manual processing is available for this launched course." : "Launch context must include AGS score scope before queue processing."}</span>
        </div>
        <button type="button" disabled={!queueReady} onClick={onProcessDue}>Process Due</button>
      </div>
      <div className="attempt-filters" aria-label="AGS diagnostics filters">
        <label className="inline-select">
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as AgsPublishAttemptStatus | "")}>
            <option value="">All statuses</option>
            <option value="failed">Failed</option>
            <option value="retry_exhausted">Retry exhausted</option>
            <option value="pending">Pending</option>
            <option value="published">Published</option>
            <option value="not_applicable">Not applicable</option>
            <option value="skipped_duplicate">Skipped duplicate</option>
          </select>
        </label>
        <label className="inline-select">
          <span>Cohort</span>
          <select value={cohortId} onChange={(event) => setCohortId(event.target.value)}>
            <option value="">All cohorts</option>
            {cohortOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label className="inline-select">
          <span>Content</span>
          <select value={contentId} onChange={(event) => setContentId(event.target.value)}>
            <option value="">All content</option>
            {content.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
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
          <span>Page size</span>
          <select value={selectedPageSize} onChange={(event) => setSelectedPageSize(Number(event.target.value))}>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
            <option value={500}>500</option>
          </select>
        </label>
      </div>
      <div className="attempt-summary" aria-label="AGS diagnostics summary">
        <div><span>Loaded</span><strong>{attempts.length}</strong></div>
        <div><span>Total</span><strong>{summary?.total ?? attempts.length}</strong></div>
        <div><span>Retryable Loaded</span><strong>{retryableCount}</strong></div>
        <div><span>Pending</span><strong>{pendingCount}</strong></div>
        <div><span>Exhausted</span><strong>{exhaustedCount}</strong></div>
        <div><span>Failed</span><strong>{failedCount}</strong></div>
        <div><span>Published</span><strong>{summary?.byStatus.published ?? attempts.filter((attempt) => attempt.status === "published").length}</strong></div>
      </div>
      <div className="ags-attempt-list">
        {attempts.length ? attempts.map((attempt) => {
          const retryable = attempt.status === "failed" || attempt.status === "pending";
          const retryToken = retryTokens[attempt.id] ?? "";
          const item = content.find((candidate) => candidate.id === attempt.contentId);
          const learner = learnerOptions.find((candidate) => candidate.id === attempt.userId);
          return (
            <section className="ags-attempt-row" key={attempt.id}>
              <div>
                <strong>{item?.title ?? attempt.contentId}</strong>
                <small>{learner?.name ?? learner?.email ?? attempt.userId} | {attempt.cohortId}</small>
              </div>
              <span className={`status ${statusClassForAgs(attempt.status)}`}>{attempt.status.replace(/_/g, " ")}</span>
              <div><span>Score</span><strong>{attempt.score}/{attempt.maxScore}</strong></div>
              <div><span>Retry</span><strong>{attempt.retryCount ?? 0}</strong></div>
              <div><span>Created</span><time dateTime={attempt.createdAt}>{formatDateTime(attempt.createdAt)}</time></div>
              <div className="ags-error">
                <span>{attempt.errorCode ?? "No error"}</span>
                <small>{attempt.nextRetryAt ? `Next ${formatDateTime(attempt.nextRetryAt)}` : attempt.errorMessage ?? attempt.lineItemUrl ?? "Recorded outcome"}</small>
              </div>
              {retryable ? (
                <div className="retry-controls">
                  <input
                    aria-label={`AGS token for ${attempt.id}`}
                    type="password"
                    value={retryToken}
                    onChange={(event) => setRetryTokens((current) => ({ ...current, [attempt.id]: event.target.value }))}
                    placeholder={tokenContext?.hasScoreScope ? "Optional token override" : "AGS access token"}
                  />
                  <button type="button" disabled={!tokenContext?.hasScoreScope && !retryToken.trim()} onClick={() => onRetry(attempt.id, retryToken.trim())}>Retry</button>
                </div>
              ) : <span className="muted">Final outcome</span>}
            </section>
          );
        }) : <Empty text="No AGS publish attempts match the current filters." />}
      </div>
      {nextCursor ? <button className="secondary-button" type="button" onClick={() => onLoadMore(selectedPageSize)}>Load More</button> : null}
    </article>
  );
}

function NotificationDiagnosticsPanel({ notifications, onRefresh }: { notifications: PactNotification[]; onRefresh: () => void }) {
  return (
    <article className="notification-diagnostics">
      <header className="section-head">
        <div>
          <h2>Notification Diagnostics</h2>
          <p>Inspect exhausted retry alerts that could not be delivered to configured sinks.</p>
        </div>
        <button type="button" onClick={onRefresh}>Refresh</button>
      </header>
      <div className="attempt-summary" aria-label="Notification diagnostics summary">
        <div><span>Dead Letters</span><strong>{notifications.length}</strong></div>
        <div><span>AGS Alerts</span><strong>{notifications.filter((item) => item.event === "ags.retry_exhausted").length}</strong></div>
      </div>
      <div className="ags-attempt-list">
        {notifications.length ? notifications.map((notification) => (
          <section className="ags-attempt-row" key={notification.id}>
            <div>
              <strong>{notification.event}</strong>
              <small>{notification.sinkUrl}</small>
            </div>
            <span className="status status-failed">{notification.status.replace(/_/g, " ")}</span>
            <div><span>Attempts</span><strong>{notification.attemptCount}</strong></div>
            <div><span>Last Status</span><strong>{notification.lastStatus ?? "n/a"}</strong></div>
            <div><span>Updated</span><time dateTime={notification.updatedAt}>{formatDateTime(notification.updatedAt)}</time></div>
            <div className="ags-error">
              <span>{notification.lastError ?? "Delivery failed"}</span>
              <small>Created {formatDateTime(notification.createdAt)}</small>
            </div>
          </section>
        )) : <Empty text="No dead-lettered notification deliveries." />}
      </div>
    </article>
  );
}

type AttemptCorrectnessFilter = "all" | "correct" | "incorrect";
type AttemptRetryFilter = "all" | "first" | "retry";
type AttemptManualFilter = "all" | ManualGradingStatus;

function AttemptReviewPanel({
  content,
  cohorts,
  attempts,
  onLoad,
  onGrade
}: {
  content: PactContent[];
  cohorts: AdminCohort[];
  attempts: QuestionAttempt[];
  onLoad: (filters: { cohortId?: string; contentId?: string; userId?: string; questionId?: string; manualGradingStatus?: ManualGradingStatus }) => void;
  onGrade: (attemptId: string, input: { score: number; feedback?: string }) => void;
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
  const [manualStatus, setManualStatus] = useState<AttemptManualFilter>("all");
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, { score: string; feedback: string }>>({});
  const visibleQuestions = questionOptions.filter((question) => !contentId || question.contentId === contentId);
  const filteredAttempts = attempts.filter((attempt) => {
    if (correctness === "correct" && !attempt.isCorrect) return false;
    if (correctness === "incorrect" && attempt.isCorrect) return false;
    if (retry === "first" && attempt.attemptNumber !== 1) return false;
    if (retry === "retry" && attempt.attemptNumber <= 1) return false;
    if (manualStatus !== "all" && (attempt.manualGradingStatus ?? "not_required") !== manualStatus) return false;
    return true;
  });

  function applyFilters() {
    onLoad({
      cohortId: cohortId || undefined,
      contentId: contentId || undefined,
      userId: userId || undefined,
      questionId: questionId || undefined,
      manualGradingStatus: manualStatus === "all" ? undefined : manualStatus
    });
  }

  function gradeDraftFor(attempt: QuestionAttempt) {
    return gradeDrafts[attempt.id] ?? {
      score: String(attempt.manualGrade?.score ?? attempt.score ?? 0),
      feedback: attempt.manualGrade?.feedback ?? ""
    };
  }

  function updateGradeDraft(attemptId: string, patch: Partial<{ score: string; feedback: string }>) {
    setGradeDrafts((current) => ({ ...current, [attemptId]: { ...(current[attemptId] ?? { score: "", feedback: "" }), ...patch } }));
  }

  function submitGrade(attempt: QuestionAttempt) {
    const draft = gradeDraftFor(attempt);
    const score = Number(draft.score);
    if (!Number.isFinite(score)) return;
    onGrade(attempt.id, {
      score,
      feedback: draft.feedback.trim() || undefined
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
        <label className="inline-select">
          <span>Manual grade</span>
          <select value={manualStatus} onChange={(event) => setManualStatus(event.target.value as AttemptManualFilter)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="graded">Graded</option>
            <option value="not_required">Not required</option>
          </select>
        </label>
      </div>
      <div className="attempt-summary" aria-label="Attempt review summary">
        <div><span>Showing</span><strong>{filteredAttempts.length}</strong></div>
        <div><span>Correct</span><strong>{filteredAttempts.filter((attempt) => attempt.isCorrect).length}</strong></div>
        <div><span>Retries</span><strong>{filteredAttempts.filter((attempt) => attempt.attemptNumber > 1).length}</strong></div>
        <div><span>Feedback seen</span><strong>{filteredAttempts.filter((attempt) => attempt.feedbackExposed).length}</strong></div>
        <div><span>Pending manual</span><strong>{filteredAttempts.filter((attempt) => attempt.manualGradingStatus === "pending").length}</strong></div>
        <div><span>Graded manual</span><strong>{filteredAttempts.filter((attempt) => attempt.manualGradingStatus === "graded").length}</strong></div>
      </div>
      <div className="attempt-list">
        {filteredAttempts.length ? filteredAttempts.map((attempt) => {
          const manualGradeStatus = attempt.manualGradingStatus ?? "not_required";
          const draft = gradeDraftFor(attempt);
          return (
            <section className="attempt-row" key={attempt.id}>
              <div>
                <strong>{attempt.learnerName ?? attempt.learnerEmail ?? attempt.userId}</strong>
                <small>{attempt.contentTitle ?? attempt.contentId} | {attempt.questionTopic ?? attempt.questionId}</small>
              </div>
              <span className={`status ${attempt.isCorrect ? "published" : manualGradeStatus === "pending" ? "pending" : "draft"}`}>{attempt.isCorrect ? "correct" : manualGradeStatus === "pending" ? "pending" : "incorrect"}</span>
              <div><span>Attempt</span><strong>{attempt.attemptNumber}</strong></div>
              <div><span>Score</span><strong>{attempt.manualGrade ? `${attempt.manualGrade.score}/${attempt.manualGrade.maxScore}` : `${attempt.score}/${attempt.maxScore}`}</strong></div>
              <div><span>Manual</span><strong>{manualGradeStatus.replace("_", " ")}</strong></div>
              <time dateTime={attempt.submittedAt}>{formatDateTime(attempt.submittedAt)}</time>
              {manualGradeStatus !== "not_required" ? (
                <div className="manual-grade-editor">
                  <label className="inline-select">
                    <span>Manual score</span>
                    <input
                      type="number"
                      min={0}
                      max={attempt.maxScore}
                      step="0.01"
                      value={draft.score}
                      onChange={(event) => updateGradeDraft(attempt.id, { score: event.target.value })}
                    />
                  </label>
                  <label className="inline-select">
                    <span>Feedback</span>
                    <textarea value={draft.feedback} onChange={(event) => updateGradeDraft(attempt.id, { feedback: event.target.value })} />
                  </label>
                  <button type="button" onClick={() => submitGrade(attempt)}>Save Grade</button>
                  {attempt.manualGrade ? <small>Graded by {attempt.manualGrade.gradedByUserId} at {formatDateTime(attempt.manualGrade.gradedAt)}</small> : <small>Awaiting instructor grade</small>}
                </div>
              ) : null}
            </section>
          );
        }) : <Empty text="No question attempts match the current filters." />}
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

function AdminConsole({
  cohorts,
  auditEvents,
  onAssign,
  onLoadAuditEvents,
  showAudit = true
}: {
  cohorts: AdminCohort[];
  auditEvents: AdminAuditEvent[];
  onAssign: (userId: string, squadNumber: SquadNumber) => void;
  onLoadAuditEvents: (action?: AdminAuditAction) => void;
  showAudit?: boolean;
}) {
  const [auditAction, setAuditAction] = useState<AdminAuditAction | "">("");
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
        <header className="audit-panel-head">
          <div><h3>Audit History</h3><small>{auditEvents.length} recent events</small></div>
          <div className="section-actions">
            <label className="inline-select">
              <span>Event type</span>
              <select value={auditAction} onChange={(event) => setAuditAction(event.target.value as AdminAuditAction | "")}>
                <option value="">All events</option>
                <option value="squad.assignment.changed">Squad assignments</option>
                <option value="question.manual_grade.upserted">Manual grading</option>
                <option value="ags.queue.process_due.triggered">AGS queue processing</option>
              </select>
            </label>
            <button type="button" onClick={() => onLoadAuditEvents(auditAction || undefined)}>Apply</button>
          </div>
        </header>
        <div className="audit-list">
          {auditEvents.length ? auditEvents.map((event) => (
            <div className="audit-row" key={event.id}>
              <div><strong>{auditTitle(event)}</strong><small>{auditDetail(event)}</small></div>
              <div><span>{event.actorName ?? event.actorUserId}</span><time dateTime={event.createdAt}>{formatDateTime(event.createdAt)}</time></div>
            </div>
          )) : <Empty text="No audit events match the selected filters." />}
        </div>
      </section> : null}
    </article>
  );
}

function auditTitle(event: AdminAuditEvent) {
  if (event.action === "squad.assignment.changed") return event.targetName ?? event.targetUserId;
  if (event.action === "question.manual_grade.upserted") return `Manual grade ${event.nextScore ?? "saved"}/${event.maxScore ?? "?"}`;
  return `AGS queue processed: ${event.retried ?? 0} retried`;
}

function auditDetail(event: AdminAuditEvent) {
  if (event.action === "squad.assignment.changed") {
    return `${event.cohortId} - assigned to ${event.nextSquadNumber ? `Squad ${event.nextSquadNumber}` : event.nextSquadId ?? "updated squad"}`;
  }
  if (event.action === "question.manual_grade.upserted") {
    const feedback = event.feedbackChanged ? "feedback changed" : "feedback unchanged";
    return `${event.cohortId} - ${event.contentId ?? "content"} / ${event.questionId ?? "question"} / ${event.attemptId ?? "attempt"} - ${feedback}`;
  }
  return `${event.cohortId} - scanned ${event.scanned ?? 0}, failed ${event.failed ?? 0}, exhausted ${event.exhausted ?? 0}, limit ${event.limit ?? "default"}`;
}

function statusClassForAgs(status: AgsPublishAttemptStatus) {
  if (status === "published" || status === "skipped_duplicate") return "published";
  if (status === "failed" || status === "retry_exhausted") return "failed";
  if (status === "pending") return "pending";
  return "archived";
}
