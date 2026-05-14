import { useEffect, useMemo, useState } from "react";

type PactRole = "admin" | "instructor" | "learner";
type ContentType = "module" | "challenge" | "game" | "assessment";
type ContentStatus = "draft" | "published" | "archived";
type QuestionKind = "multiple_choice" | "true_false" | "fill_blank" | "drag_match";

type PactSession = {
  userId: string;
  role: PactRole;
  courseId: string;
  cohortId: string;
  squadId?: string;
};

type ScoreboardEntry = {
  userId: string;
  name?: string;
  role: string;
  squadId?: string;
  totalScore: number;
  maxScore: number;
  progressPercent: number;
};

type SessionDiagnostic = {
  courseId: string;
  cohortId: string;
  role: PactRole;
  visibleContentCount: number;
};

type LocalizedText = {
  en?: string;
};

type QuestionOption = {
  id: string;
  text: LocalizedText;
};

type QuestionBlank = {
  id: string;
  label: LocalizedText;
  accepted: string[];
  caseSensitive?: boolean;
};

type QuestionMatch = {
  sourceId: string;
  targetId: string;
};

type QuestionPayload = {
  kind: QuestionKind;
  selectionMode?: "single" | "multiple";
  options?: QuestionOption[];
  correct?: string[] | boolean;
  blanks?: QuestionBlank[];
  sources?: QuestionOption[];
  targets?: QuestionOption[];
  matches?: QuestionMatch[];
  partialCredit?: boolean;
};

type PactQuestion = {
  id: string;
  type: string;
  day: string;
  role: string;
  topic: string;
  tags: string[];
  stem: LocalizedText;
  payload: QuestionPayload;
  feedback: {
    correct?: LocalizedText;
    incorrect?: LocalizedText;
    reference?: string;
  };
  scoring: {
    points: number;
    difficulty: string;
    mustPass: boolean;
  };
};

type PactContent = {
  id: string;
  type: ContentType;
  title: string;
  prompt: string;
  maxScore: number;
  status?: ContentStatus;
  day?: string;
  questionCount?: number;
  questions?: PactQuestion[];
};

type AnswerValue = string | string[] | Record<string, string> | boolean;
type AnswerState = Record<string, AnswerValue>;
type View = "modules" | "manage" | "scoreboard";

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
  const [managedContent, setManagedContent] = useState<PactContent[]>([]);
  const [selectedContentId, setSelectedContentId] = useState<string | undefined>();
  const [answers, setAnswers] = useState<AnswerState>({});
  const [result, setResult] = useState<{ score: number; maxScore: number } | undefined>();
  const [view, setView] = useState<View>("modules");
  const [status, setStatus] = useState("Connect with an LMS launch session token.");
  const isConnected = sessionToken.trim().length > 0;
  const canManage = session?.role === "admin" || session?.role === "instructor";

  const client = useMemo(() => new PactClient(apiBaseUrl, sessionToken), [sessionToken]);
  const selectedContent = content.find((item) => item.id === selectedContentId) ?? content[0];

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
      const [sessionResponse, contentResponse, scoreboardResponse] = await Promise.all([
        pactClient.getSession(),
        pactClient.getContent(),
        pactClient.getScoreboard()
      ]);
      setSession(sessionResponse);
      setContent(contentResponse);
      setScoreboard(scoreboardResponse.entries);
      setSelectedContentId((current) => current ?? contentResponse[0]?.id);
      const canManageSession = sessionResponse.role === "admin" || sessionResponse.role === "instructor";
      const [managedResponse, diagnosticResponse] = canManageSession
        ? await Promise.all([pactClient.getManagedContent(), pactClient.getSessionDiagnostic()])
        : [[], undefined];
      setManagedContent(managedResponse);
      setDiagnostic(diagnosticResponse);
      setStatus("PACT content synced from Mongo.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to sync PACT content.");
    }
  }

  async function updateGate(contentId: string, nextStatus: ContentStatus) {
    try {
      await client.updateContentStatus(contentId, nextStatus);
      const [contentResponse, managedResponse] = await Promise.all([client.getContent(), client.getManagedContent()]);
      setContent(contentResponse);
      setManagedContent(managedResponse);
      if (!contentResponse.some((item) => item.id === selectedContentId)) {
        setSelectedContentId(contentResponse[0]?.id);
      }
      setStatus(`Content set to ${nextStatus}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update content gate.");
    }
  }

  async function submitSelectedModule() {
    if (!selectedContent?.questions?.length) return;
    const score = selectedContent.questions.reduce((total, question) => total + scoreQuestion(question, answers[question.id]), 0);
    const maxScore = selectedContent.questions.reduce((total, question) => total + question.scoring.points, 0);
    const progressPercent = Math.round((Object.keys(answers).filter(Boolean).length / selectedContent.questions.length) * 100);

    try {
      await client.submitScore({
        contentId: selectedContent.id,
        score,
        maxScore,
        progressPercent: Math.min(100, progressPercent)
      });
      setResult({ score, maxScore });
      setScoreboard((await client.getScoreboard()).entries);
      setStatus("Content score submitted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to submit content score.");
    }
  }

  return (
    <main className="shell">
      <aside className="side">
        <div className="brand">
          <span>PACT</span>
          <strong>Content Hub</strong>
        </div>
        <nav>
          <button className={view === "modules" ? "active" : ""} type="button" onClick={() => setView("modules")}>Content</button>
          {canManage ? <button className={view === "manage" ? "active" : ""} type="button" onClick={() => setView("manage")}>Gate</button> : null}
          <button className={view === "scoreboard" ? "active" : ""} type="button" onClick={() => setView("scoreboard")}>Scoreboard</button>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>PACT Content</h1>
            <p>Mongo-backed learning content, instructor-controlled availability, and score sync.</p>
          </div>
          <button type="button" onClick={() => void loadDashboard()} disabled={!isConnected}>Sync</button>
        </header>

        <section className="session-panel">
          <label htmlFor="session">PACT session token</label>
          <div>
            <input
              id="session"
              value={sessionToken}
              onChange={(event) => setSessionToken(event.target.value)}
              placeholder="Paste the token returned from /api/v1/lti/launch"
            />
            <button type="button" onClick={() => void saveSession()}>Save</button>
          </div>
          <p>{session ? `${session.role} session for ${session.courseId}/${session.cohortId}` : status}</p>
          {diagnostic ? <SessionDiagnosticSummary diagnostic={diagnostic} /> : null}
        </section>

        {view === "modules" ? (
          <section className="module-layout">
            <ModuleList content={content} selectedContentId={selectedContent?.id} onSelect={(id) => {
              setSelectedContentId(id);
              setAnswers({});
              setResult(undefined);
            }} />
            <ModuleRunner
              content={selectedContent}
              answers={answers}
              result={result}
              onAnswer={(questionId, value) => setAnswers((current) => ({ ...current, [questionId]: value }))}
              onSubmit={() => void submitSelectedModule()}
            />
          </section>
        ) : null}

        {view === "manage" && canManage ? <GateManager content={managedContent} onUpdate={(id, nextStatus) => void updateGate(id, nextStatus)} /> : null}
        {view === "scoreboard" ? <Scoreboard entries={scoreboard} /> : null}
      </section>
    </main>
  );
}

function SessionDiagnosticSummary({ diagnostic }: { diagnostic: SessionDiagnostic }) {
  return (
    <dl className="diagnostic-grid" aria-label="Session diagnostics">
      <div>
        <dt>Course</dt>
        <dd>{diagnostic.courseId}</dd>
      </div>
      <div>
        <dt>Cohort</dt>
        <dd>{diagnostic.cohortId}</dd>
      </div>
      <div>
        <dt>Visible</dt>
        <dd>{diagnostic.visibleContentCount}</dd>
      </div>
    </dl>
  );
}

function ModuleList({ content, selectedContentId, onSelect }: { content: PactContent[]; selectedContentId?: string; onSelect: (id: string) => void }) {
  return (
    <article className="module-list">
      <h2>Available Content</h2>
      <div className="list">
        {content.length ? content.map((item) => (
          <button className={`module-row ${item.id === selectedContentId ? "selected" : ""}`} key={item.id} type="button" onClick={() => onSelect(item.id)}>
            <span>{item.day ?? item.type}</span>
            <strong>{item.title}</strong>
            <small>{item.questionCount ?? item.questions?.length ?? 0} questions - {item.maxScore} pts</small>
          </button>
        )) : <Empty text="No published content is assigned to this session." />}
      </div>
    </article>
  );
}

function ModuleRunner({ content, answers, result, onAnswer, onSubmit }: {
  content?: PactContent;
  answers: AnswerState;
  result?: { score: number; maxScore: number };
  onAnswer: (questionId: string, value: AnswerValue) => void;
  onSubmit: () => void;
}) {
  if (!content) return <article><Empty text="Sync PACT to load assigned content." /></article>;
  const questions = content.questions ?? [];

  return (
    <article className="runner">
      <div className="runner-head">
        <div>
          <h2>{content.title}</h2>
          <p>{content.prompt}</p>
        </div>
        <span>{questions.length} questions</span>
      </div>

      {questions.length ? questions.map((question, index) => (
        <QuestionCard key={question.id} index={index + 1} question={question} value={answers[question.id]} onChange={(value) => onAnswer(question.id, value)} />
      )) : <Empty text="This content does not have questions loaded yet." />}

      <div className="submit-row">
        {result ? <strong>{result.score}/{result.maxScore} submitted</strong> : <span>{Object.keys(answers).length}/{questions.length} answered</span>}
        <button type="button" onClick={onSubmit} disabled={!questions.length}>Submit Content</button>
      </div>
    </article>
  );
}

function QuestionCard({ index, question, value, onChange }: { index: number; question: PactQuestion; value?: AnswerValue; onChange: (value: AnswerValue) => void }) {
  return (
    <section className="question">
      <header>
        <span>Question {index}</span>
        <small>{question.scoring.points} pts - {question.scoring.difficulty}</small>
      </header>
      <p>{text(question.stem)}</p>
      <QuestionInput question={question} value={value} onChange={onChange} />
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

function GateManager({ content, onUpdate }: { content: PactContent[]; onUpdate: (id: string, status: ContentStatus) => void }) {
  return (
    <article>
      <h2>Content Gate</h2>
      <div className="list">
        {content.length ? content.map((item) => (
          <div className="gate-row" key={item.id}>
            <span className={`status ${item.status ?? "draft"}`}>{item.status ?? "draft"}</span>
            <strong>{item.title}</strong>
            <small>{contentTypeLabel(item.type)} - {item.questionCount ?? item.questions?.length ?? 0} questions</small>
            <div>
              {(["draft", "published", "archived"] as ContentStatus[]).map((status) => (
                <button disabled={item.status === status} key={status} type="button" onClick={() => onUpdate(item.id, status)}>{status}</button>
              ))}
            </div>
          </div>
        )) : <Empty text="No content available to manage." />}
      </div>
    </article>
  );
}

function Scoreboard({ entries }: { entries: ScoreboardEntry[] }) {
  return (
    <article>
      <h2>Scoreboard</h2>
      <div className="list">
        {entries.length ? entries.map((entry) => (
          <div className="row" key={entry.userId}>
            <span>{entry.squadId ?? "solo"}</span>
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

function scoreQuestion(question: PactQuestion, value?: AnswerValue) {
  const payload = question.payload;
  const points = question.scoring.points;
  if (payload.kind === "true_false") return value === payload.correct ? points : 0;
  if (payload.kind === "multiple_choice") {
    const correct = Array.isArray(payload.correct) ? payload.correct : [];
    const selected = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
    return sameSet(correct, selected) ? points : 0;
  }
  if (payload.kind === "fill_blank" && isRecord(value)) {
    const blanks = payload.blanks ?? [];
    const correct = blanks.filter((blank) => {
      const answer = value[blank.id] ?? "";
      return blank.accepted.some((accepted) => blank.caseSensitive ? accepted === answer : accepted.toLowerCase() === answer.trim().toLowerCase());
    }).length;
    return blanks.length ? Math.round((correct / blanks.length) * points) : 0;
  }
  if (payload.kind === "drag_match" && isRecord(value)) {
    const matches = payload.matches ?? [];
    const correct = matches.filter((match) => value[match.sourceId] === match.targetId).length;
    return matches.length ? Math.round((correct / matches.length) * points) : 0;
  }
  return 0;
}

function text(value?: LocalizedText) {
  return value?.en ?? "";
}

function contentTypeLabel(type: ContentType) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function toggle(selected: string[], optionId: string) {
  return selected.includes(optionId) ? selected.filter((id) => id !== optionId) : [...selected, optionId];
}

function sameSet(left: string[], right: string[]) {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function isRecord(value: unknown): value is Record<string, string> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

class PactClient {
  constructor(private readonly baseUrl: string, private readonly token: string) {}

  async getSession() {
    return this.request<PactSession>("/api/v1/session");
  }

  async getContent() {
    return this.request<PactContent[]>("/api/v1/content");
  }

  async getManagedContent() {
    return this.request<PactContent[]>("/api/v1/admin/content");
  }

  async getSessionDiagnostic() {
    return this.request<SessionDiagnostic>("/api/v1/admin/diagnostics/session");
  }

  async updateContentStatus(contentId: string, status: ContentStatus) {
    return this.request<PactContent>(`/api/v1/admin/content/${encodeURIComponent(contentId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  }

  async submitScore(input: { contentId: string; score: number; maxScore: number; progressPercent: number }) {
    return this.request("/api/v1/scores", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }

  async getScoreboard() {
    return this.request<{ entries: ScoreboardEntry[] }>("/api/v1/dashboard/scoreboard");
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${this.token}`);
    if (init.body) headers.set("content-type", "application/json");
    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error?.message ?? "PACT API request failed");
    }
    return response.json() as Promise<T>;
  }
}
