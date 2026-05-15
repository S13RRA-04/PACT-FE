import { useEffect, useMemo, useState } from "react";
import pactLogo from "./assets/pact-logo-display.png";
import { ControlPlane } from "./features/controlPlane";
import { ContentWorkspace } from "./features/learningWorkspace";
import { Scoreboard } from "./features/scoreboard";
import { SessionDiagnosticSummary } from "./features/pactShared";
import { contextSquadLabel, initialsFor, roleLabel, themeLabelFor } from "./lib/format";
import { PactClient } from "./lib/pactClient";
import { scoreQuestion } from "./lib/scoring";
import type { AdminAuditAction, AdminAuditEvent, AdminCohort, AgsPublishAttempt, AgsPublishAttemptStatus, AgsTokenContextDiagnostic, AnswerState, AnswerValue, AssignmentCompletion, ContentFilter, ContentProgress, ContentStatus, ManualGradingStatus, PactContent, PactNotification, PactSession, QuestionAttempt, QuestionSubmissionFeedback, ScoreboardEntry, SessionDiagnostic, SquadNumber, View } from "./types";

const apiBaseUrl = requireApiBaseUrl();
type QuestionAttemptFilters = { cohortId?: string; contentId?: string; userId?: string; questionId?: string; manualGradingStatus?: ManualGradingStatus };
type CompletionScoreStatus = { score: number; maxScore: number; progressPercent: number; agsStatus: string };

function requireApiBaseUrl() {
  const value = (import.meta.env.VITE_PACT_API_BASE_URL ?? "http://localhost:4100").replace(/\/$/, "");

  if (import.meta.env.PROD) {
    const url = new URL(value);
    const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    const isPlaceholder = url.hostname === "example.com" || url.hostname.endsWith(".example.com");
    if (url.protocol !== "https:" || isLocal || isPlaceholder) {
      throw new Error("VITE_PACT_API_BASE_URL must be a real HTTPS API URL for production builds");
    }
  }

  return value;
}

export function App() {
  const [session, setSession] = useState<PactSession | undefined>();
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([]);
  const [diagnostic, setDiagnostic] = useState<SessionDiagnostic | undefined>();
  const [content, setContent] = useState<PactContent[]>([]);
  const [progress, setProgress] = useState<ContentProgress[]>([]);
  const [managedContent, setManagedContent] = useState<PactContent[]>([]);
  const [adminCohorts, setAdminCohorts] = useState<AdminCohort[]>([]);
  const [adminAuditEvents, setAdminAuditEvents] = useState<AdminAuditEvent[]>([]);
  const [auditActionFilter, setAuditActionFilter] = useState<AdminAuditAction | undefined>();
  const [questionAttempts, setQuestionAttempts] = useState<QuestionAttempt[]>([]);
  const [questionAttemptFilters, setQuestionAttemptFilters] = useState<QuestionAttemptFilters>({});
  const [agsAttempts, setAgsAttempts] = useState<AgsPublishAttempt[]>([]);
  const [agsNextCursor, setAgsNextCursor] = useState<string | undefined>();
  const [agsSummary, setAgsSummary] = useState<{ total: number; byStatus: Partial<Record<AgsPublishAttemptStatus, number>> } | undefined>();
  const [agsTokenContext, setAgsTokenContext] = useState<AgsTokenContextDiagnostic | undefined>();
  const [notifications, setNotifications] = useState<PactNotification[]>([]);
  const [agsFilters, setAgsFilters] = useState<{ status?: AgsPublishAttemptStatus; cohortId?: string; contentId?: string; userId?: string }>({});
  const [agsPageSize, setAgsPageSize] = useState(100);
  const [selectedContentId, setSelectedContentId] = useState<string | undefined>();
  const [answers, setAnswers] = useState<AnswerState>({});
  const [submittedQuestionIds, setSubmittedQuestionIds] = useState<string[]>([]);
  const [questionFeedback, setQuestionFeedback] = useState<Record<string, QuestionSubmissionFeedback>>({});
  const [assignmentCompletion, setAssignmentCompletion] = useState<AssignmentCompletion | undefined>();
  const [completionScore, setCompletionScore] = useState<CompletionScoreStatus | undefined>();
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [result, setResult] = useState<{ score: number; maxScore: number } | undefined>();
  const [view, setView] = useState<View>("modules");
  const [contentFilter, setContentFilter] = useState<ContentFilter>("all");
  const [status, setStatus] = useState("Launch PACT from the LMS to begin.");
  const isConnected = Boolean(session);
  const canManage = session?.role === "admin" || session?.role === "instructor";
  const canAdmin = session?.role === "admin";

  const client = useMemo(() => new PactClient(apiBaseUrl), []);
  const filteredContent = useMemo(
    () => content.filter((item) => contentFilter === "all" || item.type === contentFilter),
    [content, contentFilter]
  );
  const selectedContent = filteredContent.find((item) => item.id === selectedContentId) ?? filteredContent[0] ?? content[0];
  const selectedProgress = progress.find((item) => item.contentId === selectedContent?.id);
  const themeClass = session ? themeClassFor(session.role, session.squadNumber) : "theme-neutral";
  const answeredCount = selectedContent?.questions?.filter((question) => submittedQuestionIds.includes(question.id)).length ?? 0;
  const selectedQuestionCount = selectedContent?.questions?.length ?? 0;
  const selectedProgressPercent = selectedQuestionCount ? Math.round((answeredCount / selectedQuestionCount) * 100) : selectedProgress?.progressPercent ?? 0;
  const availableTypes = useMemo(() => {
    const types = Array.from(new Set(content.map((item) => item.type)));
    return types.sort((left, right) => left.localeCompare(right));
  }, [content]);

  useEffect(() => {
    clearLegacySessionHandoff();
    void syncDashboard(client);
  }, [client]);

  async function loadDashboard() {
    await syncDashboard(client);
  }

  async function syncDashboard(pactClient: PactClient) {
    try {
      setStatus("Loading PACT content.");
      const [sessionResponse, contentResponse, progressResponse, scoreboardResponse] = await Promise.all([
        pactClient.getSession(),
        pactClient.getContent(),
        pactClient.getContentProgress(),
        pactClient.getScoreboard()
      ]);
      pactClient.setCsrfToken(sessionResponse.csrfToken);
      setSession(sessionResponse);
      setContent(contentResponse);
      setProgress(progressResponse.progress);
      setScoreboard(scoreboardResponse.entries);
      const nextSelectedId = contentResponse.some((item) => item.id === selectedContentId)
        ? selectedContentId
        : contentResponse[0]?.id;
      const nextProgress = progressResponse.progress.find((item) => item.contentId === nextSelectedId);
      setSelectedContentId(nextSelectedId);
      setAnswers(nextProgress?.answers ?? {});
      setSubmittedQuestionIds(nextProgress?.answeredQuestionIds ?? []);
      setQuestionFeedback({});
      setAssignmentCompletion(undefined);
      setCompletionScore(undefined);
      setActiveQuestionIndex(firstOpenQuestionIndex(contentResponse.find((item) => item.id === nextSelectedId), nextProgress?.answeredQuestionIds ?? []));
      setResult(undefined);
      if (nextSelectedId) {
        const completionResponse = await pactClient.getContentCompletion(nextSelectedId);
        setAssignmentCompletion(completionResponse.completion);
        setCompletionScore(completionResponse.score);
      }

      const canManageSession = sessionResponse.role === "admin" || sessionResponse.role === "instructor";
      const [managedResponse, diagnosticResponse, adminResponse, auditResponse] = canManageSession
        ? await Promise.all([
            pactClient.getManagedContent(),
            pactClient.getSessionDiagnostic(),
            pactClient.getAdminCohorts(),
            sessionResponse.role === "admin" ? pactClient.getAdminAuditEvents({ action: auditActionFilter }) : Promise.resolve({ events: [] })
          ])
        : [[], undefined, { cohorts: [] }, { events: [] }];
      const [attemptsResponse, agsAttemptsResponse, agsTokenContextResponse, notificationResponse] = canManageSession
        ? await Promise.all([
            pactClient.getQuestionAttempts({ cohortId: sessionResponse.cohortId, limit: 200 }),
            pactClient.getAgsPublishAttempts({ limit: agsPageSize }),
            pactClient.getAgsTokenContext(),
            pactClient.getNotificationDiagnostics({ status: "dead_letter", limit: 100 })
          ])
        : [{ attempts: [] }, { attempts: [] }, undefined, { notifications: [] }];
      setManagedContent(managedResponse);
      setDiagnostic(diagnosticResponse);
      setAdminCohorts(adminResponse.cohorts);
      setAdminAuditEvents(auditResponse.events);
      setQuestionAttempts(attemptsResponse.attempts);
      setAgsAttempts(agsAttemptsResponse.attempts);
      setAgsNextCursor(agsAttemptsResponse.nextCursor);
      setAgsSummary(agsAttemptsResponse.summary);
      setAgsTokenContext(agsTokenContextResponse);
      setNotifications(notificationResponse.notifications);
      setStatus("PACT content synced from Mongo.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to sync PACT content.");
    }
  }

  function selectContent(contentId: string) {
    const nextContent = content.find((item) => item.id === contentId);
    const nextProgress = progress.find((item) => item.contentId === contentId);
    setSelectedContentId(contentId);
    setAnswers(nextProgress?.answers ?? {});
    setSubmittedQuestionIds(nextProgress?.answeredQuestionIds ?? []);
    setQuestionFeedback({});
    setAssignmentCompletion(undefined);
    setCompletionScore(undefined);
    setActiveQuestionIndex(firstOpenQuestionIndex(nextContent, nextProgress?.answeredQuestionIds ?? []));
    setResult(undefined);
    void loadCompletionStatus(contentId);
  }

  async function loadCompletionStatus(contentId: string) {
    try {
      const response = await client.getContentCompletion(contentId);
      setAssignmentCompletion(response.completion);
      setCompletionScore(response.score);
      if (response.progress) {
        setProgress((current) => [response.progress as ContentProgress, ...current.filter((item) => item.contentId !== response.progress?.contentId)]);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load assignment status.");
    }
  }

  function saveAnswer(questionId: string, value: AnswerValue) {
    if (!selectedContent) return;
    setAnswers((current) => ({ ...current, [questionId]: value }));
    setResult(undefined);
  }

  async function submitQuestion(questionId: string) {
    if (!selectedContent || answers[questionId] === undefined) return;
    const nextSubmittedIds = Array.from(new Set([...submittedQuestionIds, questionId]));
    const questionCount = selectedContent.questions?.length ?? 0;
    const progressPercent = questionCount
      ? Math.round((selectedContent.questions ?? []).filter((question) => nextSubmittedIds.includes(question.id)).length / questionCount * 100)
      : 0;
    setSubmittedQuestionIds(nextSubmittedIds);
    try {
      const attemptResponse = await client.submitQuestionAttempt(selectedContent.id, questionId, {
        answer: answers[questionId],
        feedbackExposed: true
      });
      if (attemptResponse) {
        setProgress((current) => [attemptResponse.progress, ...current.filter((item) => item.contentId !== attemptResponse.progress.contentId)]);
        setSubmittedQuestionIds(attemptResponse.progress.answeredQuestionIds);
        setQuestionFeedback((current) => ({ ...current, [questionId]: attemptResponse.feedback }));
        setAssignmentCompletion(attemptResponse.completion);
        setStatus(statusForCompletion(attemptResponse.completion, attemptResponse.feedback));
        return;
      }

      const submittedAnswers = Object.fromEntries(
        nextSubmittedIds
          .filter((id) => answers[id] !== undefined)
          .map((id) => [id, answers[id]])
      );
      const updated = await client.updateContentProgress(selectedContent.id, { answers: submittedAnswers, progressPercent });
      if (updated) {
        setProgress((current) => [updated, ...current.filter((item) => item.contentId !== updated.contentId)]);
        setSubmittedQuestionIds(updated.answeredQuestionIds);
        setStatus("Question submitted. Feedback is available.");
      } else {
        setStatus("Question submitted locally. Backend progress sync is not deployed yet.");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to submit question.");
    }
  }

  async function updateGate(contentId: string, nextStatus: ContentStatus) {
    try {
      await client.updateContentStatus(contentId, nextStatus);
      const [contentResponse, managedResponse] = await Promise.all([client.getContent(), client.getManagedContent()]);
      setContent(contentResponse);
      setManagedContent(managedResponse);
      if (!contentResponse.some((item) => item.id === selectedContentId)) setSelectedContentId(contentResponse[0]?.id);
      setStatus(`Content set to ${nextStatus}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update content gate.");
    }
  }

  async function assignContentCohort(contentId: string, cohortId: string | null) {
    try {
      await client.updateContentAssignment(contentId, cohortId);
      const [contentResponse, managedResponse, diagnosticResponse] = await Promise.all([
        client.getContent(),
        client.getManagedContent(),
        client.getSessionDiagnostic()
      ]);
      setContent(contentResponse);
      setManagedContent(managedResponse);
      setDiagnostic(diagnosticResponse);
      setStatus(cohortId ? "Content assigned to cohort." : "Content made available to all cohorts.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update content assignment.");
    }
  }

  async function updateContentLmsLabel(contentId: string, lmsLabel: string | null) {
    try {
      await client.updateContentLmsLabel(contentId, lmsLabel);
      const [contentResponse, managedResponse] = await Promise.all([client.getContent(), client.getManagedContent()]);
      setContent(contentResponse);
      setManagedContent(managedResponse);
      setStatus(lmsLabel ? "LMS label updated." : "LMS label cleared.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update LMS label.");
    }
  }

  async function assignSquad(userId: string, squadNumber: SquadNumber) {
    try {
      await client.assignUserSquad(userId, squadNumber);
      const [cohortResponse, auditResponse, scoreboardResponse] = await Promise.all([
        client.getAdminCohorts(),
        client.getAdminAuditEvents(),
        client.getScoreboard()
      ]);
      setAdminCohorts(cohortResponse.cohorts);
      setAdminAuditEvents(auditResponse.events);
      setScoreboard(scoreboardResponse.entries);
      setStatus(`Learner assigned to Squad ${squadNumber}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to assign learner squad.");
    }
  }

  async function loadQuestionAttempts(input: QuestionAttemptFilters) {
    try {
      const response = await client.getQuestionAttempts({ ...input, limit: 200 });
      setQuestionAttemptFilters(input);
      setQuestionAttempts(response.attempts);
      setStatus("Question attempts loaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load question attempts.");
    }
  }

  async function gradeManualAttempt(attemptId: string, input: { score: number; feedback?: string }) {
    try {
      await client.gradeManualQuestionAttempt(attemptId, input);
      const [attemptsResponse, scoreboardResponse, progressResponse] = await Promise.all([
        client.getQuestionAttempts({ ...questionAttemptFilters, limit: 200 }),
        client.getScoreboard(),
        client.getContentProgress()
      ]);
      setQuestionAttempts(attemptsResponse.attempts);
      setScoreboard(scoreboardResponse.entries);
      setProgress(progressResponse.progress);
      setStatus("Manual grade saved and completion policy re-run.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save manual grade.");
    }
  }

  async function loadAgsAttempts(input: { status?: AgsPublishAttemptStatus; cohortId?: string; contentId?: string; userId?: string }, mode: "replace" | "append" = "replace", pageSize = agsPageSize) {
    try {
      const nextFilters = mode === "replace" ? input : agsFilters;
      setAgsPageSize(pageSize);
      const response = await client.getAgsPublishAttempts({
        ...nextFilters,
        cursor: mode === "append" ? agsNextCursor : undefined,
        limit: pageSize
      });
      setAgsFilters(nextFilters);
      setAgsAttempts((current) => mode === "append" ? [...current, ...response.attempts] : response.attempts);
      setAgsNextCursor(response.nextCursor);
      setAgsSummary(response.summary);
      setStatus("AGS diagnostics loaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load AGS diagnostics.");
    }
  }

  async function retryAgsAttempt(attemptId: string, agsAccessToken: string) {
    try {
      await client.retryAgsPublishAttempt(attemptId, agsAccessToken);
      const response = await client.getAgsPublishAttempts({ ...agsFilters, limit: agsPageSize });
      setAgsAttempts(response.attempts);
      setAgsNextCursor(response.nextCursor);
      setAgsSummary(response.summary);
      setStatus("AGS publish retry submitted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to retry AGS publish.");
    }
  }

  async function processDueAgsAttempts() {
    try {
      const result = await client.processDueAgsPublishAttempts();
      const [attemptsResponse, notificationResponse] = await Promise.all([
        client.getAgsPublishAttempts({ ...agsFilters, limit: agsPageSize }),
        client.getNotificationDiagnostics({ status: "dead_letter", limit: 100 })
      ]);
      setAgsAttempts(attemptsResponse.attempts);
      setAgsNextCursor(attemptsResponse.nextCursor);
      setAgsSummary(attemptsResponse.summary);
      setNotifications(notificationResponse.notifications);
      setStatus(`Processed due AGS queue: ${result.retried} retried, ${result.failed} failed, ${result.exhausted} exhausted.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to process due AGS queue.");
    }
  }

  async function loadAdminAuditEvents(action?: AdminAuditAction) {
    try {
      setAuditActionFilter(action);
      const response = await client.getAdminAuditEvents({ action });
      setAdminAuditEvents(response.events);
      setStatus("Audit events loaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load audit events.");
    }
  }

  async function loadNotificationDiagnostics() {
    try {
      const response = await client.getNotificationDiagnostics({ status: "dead_letter", limit: 100 });
      setNotifications(response.notifications);
      setStatus("Notification diagnostics loaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load notification diagnostics.");
    }
  }

  async function submitSelectedModule() {
    if (!selectedContent?.questions?.length) return;
    const score = selectedContent.questions.reduce((total, question) => total + scoreQuestion(question, answers[question.id]), 0);
    const maxScore = selectedContent.questions.reduce((total, question) => total + question.scoring.points, 0);

    try {
      await client.submitScore({
        contentId: selectedContent.id,
        score,
        maxScore,
        progressPercent: Math.min(100, selectedProgressPercent)
      });
      const [scoreboardResponse, progressResponse] = await Promise.all([client.getScoreboard(), client.getContentProgress()]);
      setResult({ score, maxScore });
      setScoreboard(scoreboardResponse.entries);
      setProgress(progressResponse.progress);
      setStatus("Content score submitted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to submit content score.");
    }
  }

  return (
    <main className={`shell ${themeClass}`}>
      <aside className="side">
        <div className="brand">
          <img src={pactLogo} alt="PACT Cyber Education and Training Unit" />
          <div>
            <strong>PACT</strong>
            <span>Training Operations</span>
          </div>
        </div>
        <nav aria-label="PACT workspace">
          <button className={view === "modules" ? "active" : ""} type="button" onClick={() => setView("modules")}><span className="nav-icon" aria-hidden="true">T</span><span>Training</span></button>
          {canManage ? <button className={view === "control" ? "active" : ""} type="button" onClick={() => setView("control")}><span className="nav-icon" aria-hidden="true">D</span><span>Instructor Delivery</span></button> : null}
          <button className={view === "scoreboard" ? "active" : ""} type="button" onClick={() => setView("scoreboard")}><span className="nav-icon" aria-hidden="true">S</span><span>Scoreboard</span></button>
        </nav>
        <div className="side-user">
          <span>{session ? initialsFor(session.userId) : "P"}</span>
          <div><strong>{session?.userId ?? "PACT"}</strong><small>{session ? roleLabel(session.role) : "Launch required"}</small></div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><span>{view === "modules" ? "Training" : view === "control" ? "Instructor Delivery" : "Scoreboard"}</span><h1>{selectedContent?.title ?? "PACT Content Workspace"}</h1></div>
          <div className="topbar-actions">
            {session ? <span className="role-chip">{themeLabelFor(session)}</span> : null}
            <button type="button" onClick={() => void loadDashboard()} disabled={!isConnected}>Sync</button>
          </div>
        </header>

        <section className="session-panel">
          <dl className="session-strip">
            <div><dt>Session</dt><dd>{session ? session.userId : "Not connected"}</dd></div>
            <div><dt>Course</dt><dd>{session?.courseId ?? "Awaiting launch"}</dd></div>
            <div><dt>Cohort</dt><dd>{session?.cohortId ?? "Awaiting launch"}</dd></div>
            <div><dt>Squad</dt><dd>{session ? contextSquadLabel(session) : "Awaiting launch"}</dd></div>
          </dl>
          {session ? <p className="status-line">{status}</p> : null}
          {diagnostic ? <SessionDiagnosticSummary diagnostic={diagnostic} /> : null}
          {diagnostic?.publishedModuleWarning ? <p className="warning-line">{diagnostic.publishedModuleWarning.message}</p> : null}
        </section>

        {view === "modules" ? (
          <ContentWorkspace
            content={filteredContent}
            allContentCount={content.length}
            filter={contentFilter}
            availableTypes={availableTypes}
            session={session}
            selectedContent={selectedContent}
            answers={answers}
            answeredCount={answeredCount}
            activeQuestionIndex={activeQuestionIndex}
            submittedQuestionIds={submittedQuestionIds}
            questionFeedback={questionFeedback}
            assignmentCompletion={assignmentCompletion}
            completionScore={completionScore}
            progressPercent={selectedProgressPercent}
            result={result}
            persistedProgress={selectedProgress}
            scoreboard={scoreboard}
            status={status}
            onFilterChange={(nextFilter) => {
              const nextContent = content.find((item) => nextFilter === "all" || item.type === nextFilter);
              const nextProgress = progress.find((item) => item.contentId === nextContent?.id);
              setContentFilter(nextFilter);
              setSelectedContentId(nextContent?.id);
              setAnswers(nextProgress?.answers ?? {});
              setSubmittedQuestionIds(nextProgress?.answeredQuestionIds ?? []);
              setQuestionFeedback({});
              setAssignmentCompletion(undefined);
              setCompletionScore(undefined);
              setActiveQuestionIndex(firstOpenQuestionIndex(nextContent, nextProgress?.answeredQuestionIds ?? []));
              setResult(undefined);
              if (nextContent?.id) void loadCompletionStatus(nextContent.id);
            }}
            onSelectContent={selectContent}
            onAnswer={saveAnswer}
            onQuestionSelect={setActiveQuestionIndex}
            onSubmitQuestion={(questionId) => void submitQuestion(questionId)}
            onSubmit={() => void submitSelectedModule()}
          />
        ) : null}

        {view === "control" && canManage ? (
          <ControlPlane
            content={managedContent}
            cohorts={adminCohorts}
            auditEvents={adminAuditEvents}
            questionAttempts={questionAttempts}
            agsAttempts={agsAttempts}
            agsNextCursor={agsNextCursor}
            agsSummary={agsSummary}
            agsPageSize={agsPageSize}
            agsTokenContext={agsTokenContext}
            notifications={notifications}
            agsExportUrl={client.agsPublishAttemptsExportUrl({ ...agsFilters, limit: Math.max(agsPageSize, 10000) })}
            diagnostic={diagnostic}
            canAdmin={canAdmin}
            onUpdateStatus={(id, nextStatus) => void updateGate(id, nextStatus)}
            onAssignContent={(id, cohortId) => void assignContentCohort(id, cohortId)}
            onUpdateLmsLabel={(id, lmsLabel) => void updateContentLmsLabel(id, lmsLabel)}
            onAssignSquad={(userId, squadNumber) => void assignSquad(userId, squadNumber)}
            onLoadQuestionAttempts={(filters) => void loadQuestionAttempts(filters)}
            onGradeManualAttempt={(attemptId, input) => void gradeManualAttempt(attemptId, input)}
            onLoadAgsAttempts={(filters, pageSize) => void loadAgsAttempts(filters, "replace", pageSize)}
            onLoadMoreAgsAttempts={(pageSize) => void loadAgsAttempts(agsFilters, "append", pageSize)}
            onRetryAgsAttempt={(attemptId, agsAccessToken) => void retryAgsAttempt(attemptId, agsAccessToken)}
            onProcessDueAgsAttempts={() => void processDueAgsAttempts()}
            onLoadNotifications={() => void loadNotificationDiagnostics()}
            onLoadAuditEvents={(action) => void loadAdminAuditEvents(action)}
          />
        ) : null}
        {view === "scoreboard" ? <Scoreboard entries={scoreboard} /> : null}
      </section>
    </main>
  );
}

function clearLegacySessionHandoff() {
  if (window.location.hash.includes("sessionToken=")) {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  window.localStorage.removeItem("pact_session");
  try {
    const payload = JSON.parse(window.name) as { type?: unknown };
    if (payload.type === "pact_session") window.name = "";
  } catch {
    // Ignore unrelated window names from the browser or hosting environment.
  }
}

function themeClassFor(role: PactSession["role"], squadNumber?: SquadNumber) {
  if (role !== "learner") return "theme-staff";
  return squadNumber ? `theme-squad-${squadNumber}` : "theme-neutral";
}

function firstOpenQuestionIndex(content?: PactContent, submittedQuestionIds: string[] = []) {
  const questions = content?.questions ?? [];
  const index = questions.findIndex((question) => !submittedQuestionIds.includes(question.id));
  return index === -1 ? 0 : index;
}

function statusForCompletion(completion: AssignmentCompletion | undefined, feedback: QuestionSubmissionFeedback) {
  if (completion?.status === "pending_manual" || feedback.status === "needs_review") {
    return "Question submitted for instructor review. Final score is pending manual grade.";
  }
  if (completion?.status === "failed_must_pass") {
    return "Assignment cannot be completed until must-pass requirements are met.";
  }
  if (completion?.status === "complete") {
    return "Assignment completed and submitted.";
  }
  return "Question submitted. Feedback is available.";
}
