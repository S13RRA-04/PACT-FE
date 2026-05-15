import { useState } from "react";
import type { AnswerState, AnswerValue, AssignmentCompletion, ContentFilter, ContentProgress, ContentType, MechanicsState, PactContent, PactSession, QuestionSubmissionFeedback, ScoreboardEntry } from "../types";
import { contentTypeLabel, contextSquadLabel } from "../lib/format";
import { readBooleanPreference, UI_PREF_KEYS, writeBooleanPreference } from "../lib/uiPreferences";
import { ModuleRunner } from "./learnerMissionRunner";
import type { MechanicOutcome } from "./learnerMechanicsTypes";
import { contentTypeCounts, contentTypeModeLabel, MissionProgressCard, MissionQueueItem, MissionTypeCard, OperatorHud, ProgressTrack, SquadLogo, type HudCallout } from "../components/pact";
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
  focused,
  onFocusedChange,
  onFilterChange,
  onSelectContent,
  onAnswer,
  onQuestionSelect,
  onSubmitQuestion,
  onMechanicsStateChange,
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
  focused: boolean;
  onFocusedChange: (focused: boolean) => void;
  onFilterChange: (filter: ContentFilter) => void;
  onSelectContent: (id: string) => void;
  onAnswer: (questionId: string, value: AnswerValue) => void;
  onQuestionSelect: (index: number) => void;
  onSubmitQuestion: (questionId: string) => void;
  onMechanicsStateChange: (state: MechanicsState, outcome: MechanicOutcome) => void;
  onSubmit: (outcome?: MechanicOutcome) => void;
}) {
  const contentCounts = contentTypeCounts(content);
  const [queueCollapsed, setQueueCollapsed] = useState(() => readBooleanPreference(UI_PREF_KEYS.queueCollapsed));

  function setQueuePreference(next: boolean) {
    writeBooleanPreference(UI_PREF_KEYS.queueCollapsed, next);
    setQueueCollapsed(next);
  }

  function toggleQueueCollapsed() {
    setQueuePreference(!queueCollapsed);
  }

  return (
    <section className={`module-layout ${queueCollapsed ? "queue-collapsed" : ""} ${focused ? "task-focused" : ""}`}>
      <MissionOverview
        content={content}
        selectedContent={selectedContent}
        answeredCount={answeredCount}
        progressPercent={progressPercent}
        result={result}
        session={session}
        contentCounts={contentCounts}
        focused={focused}
        queueCollapsed={queueCollapsed}
        onFocusedChange={onFocusedChange}
        onQueueCollapsedChange={setQueuePreference}
        onTypeSelect={onFilterChange}
      />
      <ModuleList
        content={content}
        allContentCount={allContentCount}
        filter={filter}
        availableTypes={availableTypes}
        session={session}
        selectedContentId={selectedContent?.id}
        collapsed={queueCollapsed}
        onToggleCollapsed={toggleQueueCollapsed}
        onFilterChange={onFilterChange}
        onSelect={onSelectContent}
      />
      <FocusProgressDock
        content={selectedContent}
        focused={focused}
        progressPercent={progressPercent}
        answeredCount={answeredCount}
        result={result}
        session={session}
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
        onMechanicsStateChange={onMechanicsStateChange}
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

function MissionOverview({
  content,
  selectedContent,
  answeredCount,
  progressPercent,
  result,
  session,
  contentCounts,
  focused,
  queueCollapsed,
  onFocusedChange,
  onQueueCollapsedChange,
  onTypeSelect
}: {
  content: PactContent[];
  selectedContent?: PactContent;
  answeredCount: number;
  progressPercent: number;
  result?: { score: number; maxScore: number };
  session?: PactSession;
  contentCounts: Record<ContentType, number>;
  focused: boolean;
  queueCollapsed: boolean;
  onFocusedChange: (focused: boolean) => void;
  onQueueCollapsedChange: (collapsed: boolean) => void;
  onTypeSelect: (filter: ContentFilter) => void;
}) {
  const questionCount = selectedContent?.questions?.length ?? 0;
  const scoreLabel = result ? `${result.score}/${result.maxScore}` : `${answeredCount}/${questionCount}`;
  return (
    <article className="mission-overview">
      <div className="mission-copy">
        <SquadLogo squadNumber={session?.squadNumber} className="mission-squad-logo" decorative />
        <div>
          <span>{selectedContent ? `${contentTypeLabel(selectedContent.type)} operation` : "PACT operation"}</span>
          <strong className="mission-title">{selectedContent?.title ?? "Choose a PACT mission"}</strong>
          <p>{selectedContent?.prompt ?? "Select a module, challenge, game, or assessment to begin."}</p>
        </div>
      </div>
      <MissionProgressCard
        value={progressPercent}
        detail={`${scoreLabel} current submissions ${session?.squadNumber ? `| Squad ${session.squadNumber}` : ""}`}
      />
      <div className="mission-type-grid" aria-label="PACT activity types">
        {(["module", "challenge", "game", "assessment"] as ContentType[]).map((type) => (
          <MissionTypeCard active={selectedContent?.type === type} count={contentCounts[type]} key={type} onSelect={onTypeSelect} type={type} />
        ))}
      </div>
      <div className="mission-roster">
        <span>Queue</span>
        <strong>{content.length}</strong>
      </div>
      <LearnerPreferencesMenu
        focused={focused}
        queueCollapsed={queueCollapsed}
        onFocusedChange={onFocusedChange}
        onQueueCollapsedChange={onQueueCollapsedChange}
      />
      <div className="mission-circuit-wall" aria-hidden="true" />
    </article>
  );
}

function LearnerPreferencesMenu({
  focused,
  queueCollapsed,
  onFocusedChange,
  onQueueCollapsedChange
}: {
  focused: boolean;
  queueCollapsed: boolean;
  onFocusedChange: (focused: boolean) => void;
  onQueueCollapsedChange: (collapsed: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="learner-preferences">
      <button type="button" className="secondary-button" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        Preferences
      </button>
      {open ? (
        <div className="learner-preferences-panel" role="dialog" aria-label="Learner preferences">
          <div>
            <strong>Learning view</strong>
            <p>Saved on this browser.</p>
          </div>
          <label>
            <span>
              <strong>Focus current task</strong>
              <small>Hide session metadata and queue.</small>
            </span>
            <input type="checkbox" checked={focused} onChange={(event) => onFocusedChange(event.target.checked)} />
          </label>
          <label>
            <span>
              <strong>Collapse queue</strong>
              <small>Keep missions in a slim rail.</small>
            </span>
            <input type="checkbox" checked={queueCollapsed} onChange={(event) => onQueueCollapsedChange(event.target.checked)} />
          </label>
        </div>
      ) : null}
    </div>
  );
}

function ModuleList({
  content,
  allContentCount,
  filter,
  availableTypes,
  session,
  selectedContentId,
  collapsed,
  onToggleCollapsed,
  onFilterChange,
  onSelect
}: {
  content: PactContent[];
  allContentCount: number;
  filter: ContentFilter;
  availableTypes: ContentType[];
  session?: PactSession;
  selectedContentId?: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onFilterChange: (filter: ContentFilter) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <article className={`module-list ${collapsed ? "collapsed" : ""}`}>
      <div className="panel-title">
        <div className="panel-title-copy">
          <span className="panel-label">Mission Queue</span>
          <h2>Training Queue</h2>
          <p>{allContentCount} assigned item{allContentCount === 1 ? "" : "s"}</p>
        </div>
        <div className="queue-actions">
          <span className="panel-count">{content.length}</span>
          <button type="button" onClick={onToggleCollapsed} aria-expanded={!collapsed} aria-label={collapsed ? "Expand mission queue" : "Collapse mission queue"}>
            {collapsed ? "Open" : "Hide"}
          </button>
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
          <MissionQueueItem item={item} key={item.id} onSelect={onSelect} selected={item.id === selectedContentId} />
        )) : <Empty text={allContentCount ? "No assigned content matches this filter." : emptyContentMessage(session)} />}
      </div>
    </article>
  );
}

function FocusProgressDock({
  content,
  focused,
  progressPercent,
  answeredCount,
  result,
  session
}: {
  content?: PactContent;
  focused: boolean;
  progressPercent: number;
  answeredCount: number;
  result?: { score: number; maxScore: number };
  session?: PactSession;
}) {
  if (!focused || !content) return null;
  const questionCount = content.questions?.length ?? 0;
  const scoreLabel = result ? `${result.score}/${result.maxScore}` : `${answeredCount}/${questionCount || content.questionCount || 0}`;
  return (
    <aside className={`focus-progress-dock type-${content.type}`} aria-label="Focused task progress">
      <div>
        <span>{contentTypeModeLabel(content.type)}</span>
        <strong>{content.title}</strong>
      </div>
      <div className="focus-dock-meter">
        <span>{progressPercent}%</span>
        <ProgressTrack value={progressPercent} />
      </div>
      <dl>
        <div><dt>Progress</dt><dd>{scoreLabel}</dd></div>
        <div><dt>Squad</dt><dd>{session ? contextSquadLabel(session) : "Launch required"}</dd></div>
      </dl>
    </aside>
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
    <OperatorHud
      title="Activity"
      metrics={[
        { label: "Progress", value: `${progressPercent}%` },
        { label: "Answered", value: `${answeredCount}/${questionCount}` },
        { label: "Possible", value: content?.maxScore ?? 0 }
      ]}
      context={[
        { label: "Course", value: session?.courseId ?? "Not connected" },
        { label: "Cohort", value: session?.cohortId ?? "Not connected" },
        { label: "Squad", value: session ? contextSquadLabel(session) : "Not connected" }
      ]}
      callout={completionState}
      status={status}
    />
  );
}

function completionDisplayState(input: {
  assignmentCompletion?: AssignmentCompletion;
  completionScore?: { score: number; maxScore: number; progressPercent: number; agsStatus: string };
  result?: { score: number; maxScore: number };
  persistedProgress?: ContentProgress;
  ownScore?: ScoreboardEntry;
  content?: PactContent;
}): HudCallout {
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

function emptyContentMessage(session?: PactSession) {
  if (session?.role === "admin" || session?.role === "instructor") {
    return "No content is assigned to this course or cohort yet.";
  }

  const type = session?.contentType ? `${contentTypeLabel(session.contentType).toLowerCase()} content` : "content";
  const context = session ? `course ${session.courseId} and cohort ${session.cohortId}` : "this launch session";
  return `No published ${type} matches ${context}. Ask an instructor to publish or assign content for this launch.`;
}

