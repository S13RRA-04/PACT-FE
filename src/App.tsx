import { useEffect, useMemo, useState } from "react";
import pactLogo from "./assets/pact-logo-display.png";
import { ContentWorkspace, ControlPlane, Scoreboard, SessionDiagnosticSummary } from "./features/pactWorkspace";
import { contextSquadLabel, initialsFor, roleLabel, themeLabelFor } from "./lib/format";
import { PactClient } from "./lib/pactClient";
import { scoreQuestion } from "./lib/scoring";
import type { AdminAuditEvent, AdminCohort, AnswerState, AnswerValue, ContentFilter, ContentProgress, ContentStatus, PactContent, PactSession, ScoreboardEntry, SessionDiagnostic, SquadNumber, View } from "./types";

const apiBaseUrl = requireApiBaseUrl();

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
  const [sessionToken, setSessionToken] = useState(() => window.localStorage.getItem("pact_session") ?? "");
  const [session, setSession] = useState<PactSession | undefined>();
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([]);
  const [diagnostic, setDiagnostic] = useState<SessionDiagnostic | undefined>();
  const [content, setContent] = useState<PactContent[]>([]);
  const [progress, setProgress] = useState<ContentProgress[]>([]);
  const [managedContent, setManagedContent] = useState<PactContent[]>([]);
  const [adminCohorts, setAdminCohorts] = useState<AdminCohort[]>([]);
  const [adminAuditEvents, setAdminAuditEvents] = useState<AdminAuditEvent[]>([]);
  const [selectedContentId, setSelectedContentId] = useState<string | undefined>();
  const [answers, setAnswers] = useState<AnswerState>({});
  const [result, setResult] = useState<{ score: number; maxScore: number } | undefined>();
  const [view, setView] = useState<View>("modules");
  const [contentFilter, setContentFilter] = useState<ContentFilter>("all");
  const [status, setStatus] = useState("Connect with an LMS launch session token.");
  const isConnected = sessionToken.trim().length > 0;
  const canManage = session?.role === "admin" || session?.role === "instructor";
  const canAdmin = session?.role === "admin";

  const client = useMemo(() => new PactClient(apiBaseUrl, sessionToken), [sessionToken]);
  const filteredContent = useMemo(
    () => content.filter((item) => contentFilter === "all" || item.type === contentFilter),
    [content, contentFilter]
  );
  const selectedContent = filteredContent.find((item) => item.id === selectedContentId) ?? filteredContent[0] ?? content[0];
  const selectedProgress = progress.find((item) => item.contentId === selectedContent?.id);
  const themeClass = session ? themeClassFor(session.role, session.squadNumber) : "theme-neutral";
  const answeredCount = selectedContent?.questions?.filter((question) => answers[question.id] !== undefined).length ?? 0;
  const selectedQuestionCount = selectedContent?.questions?.length ?? 0;
  const selectedProgressPercent = selectedQuestionCount ? Math.round((answeredCount / selectedQuestionCount) * 100) : selectedProgress?.progressPercent ?? 0;
  const availableTypes = useMemo(() => {
    const types = Array.from(new Set(content.map((item) => item.type)));
    return types.sort((left, right) => left.localeCompare(right));
  }, [content]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const launchedSessionToken = params.get("sessionToken");
    if (!launchedSessionToken) return;
    setSessionToken(launchedSessionToken);
    window.localStorage.setItem("pact_session", launchedSessionToken);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setStatus("LMS launch session received.");
    void syncDashboard(new PactClient(apiBaseUrl, launchedSessionToken));
  }, []);

  async function saveSession() {
    window.localStorage.setItem("pact_session", sessionToken.trim());
    setStatus("Session saved.");
  }

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
      setSession(sessionResponse);
      setContent(contentResponse);
      setProgress(progressResponse.progress);
      setScoreboard(scoreboardResponse.entries);
      const nextSelectedId = selectedContentId ?? contentResponse[0]?.id;
      setSelectedContentId(nextSelectedId);
      setAnswers(progressResponse.progress.find((item) => item.contentId === nextSelectedId)?.answers ?? {});
      setResult(undefined);

      const canManageSession = sessionResponse.role === "admin" || sessionResponse.role === "instructor";
      const [managedResponse, diagnosticResponse, adminResponse, auditResponse] = canManageSession
        ? await Promise.all([
            pactClient.getManagedContent(),
            pactClient.getSessionDiagnostic(),
            pactClient.getAdminCohorts(),
            sessionResponse.role === "admin" ? pactClient.getAdminAuditEvents() : Promise.resolve({ events: [] })
          ])
        : [[], undefined, { cohorts: [] }, { events: [] }];
      setManagedContent(managedResponse);
      setDiagnostic(diagnosticResponse);
      setAdminCohorts(adminResponse.cohorts);
      setAdminAuditEvents(auditResponse.events);
      setStatus("PACT content synced from Mongo.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to sync PACT content.");
    }
  }

  function selectContent(contentId: string) {
    setSelectedContentId(contentId);
    setAnswers(progress.find((item) => item.contentId === contentId)?.answers ?? {});
    setResult(undefined);
  }

  async function saveAnswer(questionId: string, value: AnswerValue) {
    if (!selectedContent) return;
    const nextAnswers = { ...answers, [questionId]: value };
    const questionCount = selectedContent.questions?.length ?? 0;
    const progressPercent = questionCount
      ? Math.round((selectedContent.questions ?? []).filter((question) => nextAnswers[question.id] !== undefined).length / questionCount * 100)
      : 0;
    setAnswers(nextAnswers);
    try {
      const updated = await client.updateContentProgress(selectedContent.id, { answers: nextAnswers, progressPercent });
      if (updated) {
        setProgress((current) => [updated, ...current.filter((item) => item.contentId !== updated.contentId)]);
        setStatus("Progress saved.");
      } else {
        setStatus("Progress saved locally. Backend progress sync is not deployed yet.");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save progress.");
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
          <strong>PACT</strong>
        </div>
        <nav>
          <button className={view === "modules" ? "active" : ""} type="button" onClick={() => setView("modules")}><span>Training</span></button>
          {canManage ? <button className={view === "control" ? "active" : ""} type="button" onClick={() => setView("control")}><span>Instructor Delivery</span></button> : null}
          <button className={view === "scoreboard" ? "active" : ""} type="button" onClick={() => setView("scoreboard")}><span>Scoreboard</span></button>
        </nav>
        <div className="side-user">
          <span>{session ? initialsFor(session.userId) : "P"}</span>
          <div><strong>{session?.userId ?? "PACT"}</strong><small>{session ? roleLabel(session.role) : "Launch required"}</small></div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><span>Training</span><h1>{selectedContent?.title ?? "PACT Content Workspace"}</h1></div>
          <div className="topbar-actions">
            {session ? <span className="role-chip">{themeLabelFor(session)}</span> : null}
            <button type="button" onClick={() => void loadDashboard()} disabled={!isConnected}>Sync</button>
          </div>
        </header>

        <section className="session-panel">
          <div className="session-input">
            <label htmlFor="session">PACT session token</label>
            <input id="session" value={sessionToken} onChange={(event) => setSessionToken(event.target.value)} placeholder="Paste the token returned from /api/v1/lti/launch" />
            <button type="button" onClick={() => void saveSession()}>Save</button>
          </div>
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
            progressPercent={selectedProgressPercent}
            result={result}
            persistedProgress={selectedProgress}
            scoreboard={scoreboard}
            status={status}
            onFilterChange={(nextFilter) => {
              const nextContent = content.find((item) => nextFilter === "all" || item.type === nextFilter);
              setContentFilter(nextFilter);
              setSelectedContentId(nextContent?.id);
              setAnswers(progress.find((item) => item.contentId === nextContent?.id)?.answers ?? {});
              setResult(undefined);
            }}
            onSelectContent={selectContent}
            onAnswer={(questionId, value) => void saveAnswer(questionId, value)}
            onSubmit={() => void submitSelectedModule()}
          />
        ) : null}

        {view === "control" && canManage ? (
          <ControlPlane
            content={managedContent}
            cohorts={adminCohorts}
            auditEvents={adminAuditEvents}
            diagnostic={diagnostic}
            canAdmin={canAdmin}
            onUpdateStatus={(id, nextStatus) => void updateGate(id, nextStatus)}
            onAssignContent={(id, cohortId) => void assignContentCohort(id, cohortId)}
            onUpdateLmsLabel={(id, lmsLabel) => void updateContentLmsLabel(id, lmsLabel)}
            onAssignSquad={(userId, squadNumber) => void assignSquad(userId, squadNumber)}
          />
        ) : null}
        {view === "scoreboard" ? <Scoreboard entries={scoreboard} /> : null}
      </section>
    </main>
  );
}

function themeClassFor(role: PactSession["role"], squadNumber?: SquadNumber) {
  if (role !== "learner") return "theme-staff";
  return squadNumber ? `theme-squad-${squadNumber}` : "theme-neutral";
}
