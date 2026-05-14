import type { AdminAuditEvent, AdminCohort, AnswerState, AnswerValue, ContentFilter, ContentProgress, ContentStatus, ContentType, PactContent, PactQuestion, PactSession, ScoreboardEntry, SessionDiagnostic, SquadNumber } from "../types";
import { contentTypeLabel, contextSquadLabel, formatDateTime, roleLabel, text } from "../lib/format";
import { isRecord, toggle } from "../lib/scoring";

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
  progressPercent,
  result,
  persistedProgress,
  scoreboard,
  status,
  onFilterChange,
  onSelectContent,
  onAnswer,
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
  progressPercent: number;
  result?: { score: number; maxScore: number };
  persistedProgress?: ContentProgress;
  scoreboard: ScoreboardEntry[];
  status: string;
  onFilterChange: (filter: ContentFilter) => void;
  onSelectContent: (id: string) => void;
  onAnswer: (questionId: string, value: AnswerValue) => void;
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
        progressPercent={progressPercent}
        result={result}
        persistedProgress={persistedProgress}
        onAnswer={onAnswer}
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

function ModuleRunner({ content, answers, answeredCount, progressPercent, result, persistedProgress, onAnswer, onSubmit }: {
  content?: PactContent;
  answers: AnswerState;
  answeredCount: number;
  progressPercent: number;
  result?: { score: number; maxScore: number };
  persistedProgress?: ContentProgress;
  onAnswer: (questionId: string, value: AnswerValue) => void;
  onSubmit: () => void;
}) {
  if (!content) return <article><Empty text="Sync PACT to load assigned content." /></article>;
  const questions = content.questions ?? [];

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
          <span>{answeredCount}/{questions.length} answered</span>
        </div>
        <div className="progress-track"><span style={{ width: `${progressPercent}%` }} /></div>
      </div>
      {questions.length ? <QuestionStepper questions={questions} answers={answers} /> : null}
      {questions.length ? questions.map((question, index) => (
        <QuestionCard key={question.id} index={index + 1} question={question} value={answers[question.id]} onChange={(value) => onAnswer(question.id, value)} />
      )) : <Empty text="This content does not have questions loaded yet." />}
      <div className="submit-row">
        {result ? <strong>{result.score}/{result.maxScore} submitted</strong> : <span>{persistedProgress?.status === "submitted" ? "Previously submitted" : `${answeredCount}/${questions.length} answered`}</span>}
        <button type="button" onClick={onSubmit} disabled={!questions.length || answeredCount === 0}>Submit Content</button>
      </div>
    </article>
  );
}

function QuestionStepper({ questions, answers }: { questions: PactQuestion[]; answers: AnswerState }) {
  return (
    <ol className="question-stepper" aria-label="Question progress">
      {questions.map((question, index) => (
        <li className={answers[question.id] !== undefined ? "complete" : ""} key={question.id}>
          <span>{index + 1}</span>
        </li>
      ))}
    </ol>
  );
}

function QuestionCard({ index, question, value, onChange }: { index: number; question: PactQuestion; value?: AnswerValue; onChange: (value: AnswerValue) => void }) {
  const isAnswered = value !== undefined;
  return (
    <section className={`question ${isAnswered ? "answered" : ""}`}>
      <header>
        <div><span>Question {index}</span><small>{question.topic}</small></div>
        <small>{question.scoring.points} pts | {question.scoring.difficulty}</small>
      </header>
      <p>{text(question.stem)}</p>
      <QuestionInput question={question} value={value} onChange={onChange} />
      {isAnswered ? <div className="answer-state">Response saved to PACT progress</div> : null}
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
  diagnostic,
  canAdmin,
  onUpdateStatus,
  onAssignContent,
  onUpdateLmsLabel,
  onAssignSquad
}: {
  content: PactContent[];
  cohorts: AdminCohort[];
  auditEvents: AdminAuditEvent[];
  diagnostic?: SessionDiagnostic;
  canAdmin: boolean;
  onUpdateStatus: (id: string, status: ContentStatus) => void;
  onAssignContent: (id: string, cohortId: string | null) => void;
  onUpdateLmsLabel: (id: string, lmsLabel: string | null) => void;
  onAssignSquad: (userId: string, squadNumber: SquadNumber) => void;
}) {
  return (
    <section className="control-plane">
      <article>
        <header className="section-head"><div><h2>Control Plane</h2><p>Manage PACT content delivery, cohort assignment, user squads, and diagnostics.</p></div></header>
        {diagnostic ? <SessionDiagnosticSummary diagnostic={diagnostic} /> : null}
      </article>
      <ContentDeliveryManager content={content} cohorts={cohorts} onUpdateStatus={onUpdateStatus} onAssignContent={onAssignContent} onUpdateLmsLabel={onUpdateLmsLabel} />
      <AdminConsole cohorts={cohorts} auditEvents={canAdmin ? auditEvents : []} onAssign={onAssignSquad} showAudit={canAdmin} />
    </section>
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

function emptyContentMessage(session?: PactSession) {
  if (session?.role === "admin" || session?.role === "instructor") {
    return "No content is assigned to this course or cohort yet.";
  }

  const type = session?.contentType ? `${contentTypeLabel(session.contentType).toLowerCase()} content` : "content";
  const context = session ? `course ${session.courseId} and cohort ${session.cohortId}` : "this launch session";
  return `No published ${type} matches ${context}. Ask an instructor to publish or assign content for this launch.`;
}
