export type PactRole = "admin" | "instructor" | "learner";
export type SquadNumber = "1" | "2" | "3" | "4";
export type ContentType = "module" | "challenge" | "game" | "assessment";
export type ContentStatus = "draft" | "published" | "archived";
export type QuestionKind = "multiple_choice" | "true_false" | "fill_blank" | "drag_match";
export type ManualGradingStatus = "pending" | "graded" | "not_required";
export type CompletionStatus = "in_progress" | "pending_manual" | "failed_must_pass" | "complete";

export type PactSession = {
  userId: string;
  role: PactRole;
  courseId: string;
  cohortId: string;
  squadId?: string;
  squadNumber?: SquadNumber;
  contentType?: ContentType;
  csrfToken?: string;
};

export type ScoreboardEntry = {
  userId: string;
  name?: string;
  role: string;
  squadId?: string;
  squadNumber?: SquadNumber;
  totalScore: number;
  maxScore: number;
  progressPercent: number;
};

export type AdminUser = {
  id: string;
  email?: string;
  name?: string;
  role: PactRole;
  cohortId: string;
  squadId?: string;
  squadNumber?: SquadNumber;
};

export type AdminSquad = {
  id: string;
  name: string;
  number?: SquadNumber;
};

export type AdminCohort = {
  courseId: string;
  cohortId: string;
  squads: AdminSquad[];
  users: AdminUser[];
};

export type AdminAuditEvent = {
  id: string;
  action: "squad.assignment.changed" | "question.manual_grade.upserted" | "ags.queue.process_due.triggered";
  actorUserId: string;
  actorName?: string;
  targetUserId: string;
  targetName?: string;
  courseId: string;
  cohortId: string;
  metadata?: Record<string, unknown>;
  previousSquadId?: string;
  nextSquadId?: string;
  nextSquadNumber?: SquadNumber;
  contentId?: string;
  questionId?: string;
  attemptId?: string;
  previousScore?: number;
  nextScore?: number;
  maxScore?: number;
  previousIsCorrect?: boolean;
  nextIsCorrect?: boolean;
  feedbackChanged?: boolean;
  scanned?: number;
  retried?: number;
  failed?: number;
  exhausted?: number;
  limit?: number;
  createdAt: string;
};

export type AdminAuditAction = AdminAuditEvent["action"];

export type SessionDiagnostic = {
  courseId: string;
  cohortId: string;
  role: PactRole;
  contentType?: ContentType;
  visibleContentCount: number;
  contentCounts?: ContentCountDiagnostic[];
  publishedModuleWarning?: {
    code: "NO_PUBLISHED_MODULES";
    message: string;
  };
};

export type ContentCountDiagnostic = {
  courseId: string;
  cohortId: string | null;
  type: ContentType;
  status: ContentStatus;
  count: number;
  questions: number;
};

export type LocalizedText = {
  en?: string;
};

export type QuestionOption = {
  id: string;
  text: LocalizedText;
};

export type QuestionBlank = {
  id: string;
  label: LocalizedText;
  accepted: string[];
  caseSensitive?: boolean;
};

export type QuestionMatch = {
  sourceId: string;
  targetId: string;
};

export type QuestionPayload = {
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

export type PactQuestion = {
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
    optional?: boolean;
    maxAttempts?: number;
    gradingMode?: "automatic" | "manual";
  };
};

export type ChallengeMechanics = {
  kind: "challenge_path";
  title: string;
  prompt: string;
  resultLabel?: string;
  defaultPathId?: string;
  paths: Array<{
    id: string;
    label: string;
    detail: string;
    score: number;
  }>;
};

export type GameMechanics = {
  kind: "packet_capture";
  title: string;
  prompt: string;
  resultLabel?: string;
  maxScore?: number;
  initiallyCaptured?: string[];
  nodes: Array<{
    id: string;
    label: string;
    points: number;
  }>;
};

export type AssessmentMechanics = {
  kind: "readiness_checklist";
  title: string;
  prompt: string;
  resultLabel?: string;
  checks: Array<{
    id: string;
    label: string;
    initiallyChecked?: boolean;
  }>;
};

export type ContentMechanics = ChallengeMechanics | GameMechanics | AssessmentMechanics;
export type MechanicsState = Record<string, unknown>;

export type PactContent = {
  id: string;
  cohortId?: string | null;
  type: ContentType;
  title: string;
  lmsLabel?: string;
  prompt: string;
  maxScore: number;
  status?: ContentStatus;
  day?: string;
  questionCount?: number;
  questions?: PactQuestion[];
  mechanics?: ContentMechanics;
};

export type AnswerValue = string | string[] | Record<string, string> | boolean;
export type AnswerState = Record<string, AnswerValue>;
export type View = "modules" | "control" | "scoreboard";
export type ContentFilter = "all" | ContentType;

export type ContentProgress = {
  id: string;
  userId: string;
  contentId: string;
  contentType: ContentType;
  answers: AnswerState;
  mechanicsState?: MechanicsState;
  answeredQuestionIds: string[];
  progressPercent: number;
  score?: number;
  maxScore?: number;
  status: "not_started" | "in_progress" | "submitted";
  submittedAt?: string;
  updatedAt: string;
};

export type AssignmentCompletion = {
  complete: boolean;
  status: CompletionStatus;
  requiredQuestionIds: string[];
  answeredRequiredQuestionIds: string[];
  pendingQuestionIds: string[];
  pendingManualQuestionIds: string[];
  failedMustPassQuestionIds: string[];
  exhaustedQuestionIds: string[];
  score: number;
  maxScore: number;
};

export type QuestionSubmissionFeedback = {
  submissionId: string;
  status: "correct" | "partial" | "incorrect" | "needs_review";
  earnedPoints: number;
  possiblePoints: number;
  feedback?: unknown;
  nextState: {
    questionComplete: boolean;
    attemptsRemaining?: number;
  };
};

export type QuestionAttempt = {
  id: string;
  userId: string;
  learnerName?: string;
  learnerEmail?: string;
  contentId: string;
  contentTitle?: string;
  contentType: ContentType;
  questionId: string;
  questionTopic?: string;
  questionVersion?: number;
  attemptNumber: number;
  answer: AnswerValue;
  score: number;
  maxScore: number;
  isCorrect: boolean;
  feedbackExposed: boolean;
  feedbackExposedAt?: string;
  manualGradingStatus?: ManualGradingStatus;
  manualGrade?: {
    score: number;
    maxScore: number;
    isCorrect: boolean;
    feedback?: string;
    gradedByUserId: string;
    gradedAt: string;
  };
  submittedAt: string;
};

export type AgsPublishAttemptStatus = "pending" | "published" | "failed" | "retry_exhausted" | "not_applicable" | "skipped_duplicate";

export type AgsPublishAttempt = {
  id: string;
  courseId: string;
  cohortId: string;
  squadId?: string;
  userId: string;
  contentId: string;
  lineItemUrl?: string;
  score: number;
  maxScore: number;
  progressPercent: number;
  status: AgsPublishAttemptStatus;
  retryCount?: number;
  nextRetryAt?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
};

export type AgsAttemptPage = {
  attempts: AgsPublishAttempt[];
  nextCursor?: string;
  summary?: {
    total: number;
    byStatus: Partial<Record<AgsPublishAttemptStatus, number>>;
  };
};

export type AgsQueueProcessingResult = {
  scanned: number;
  retried: number;
  failed: number;
  exhausted: number;
};

export type AgsTokenContextDiagnostic = {
  courseId: string;
  cohortId: string;
  hasLaunchContext: boolean;
  hasScoreScope: boolean;
  lineItemsUrl?: string;
  lineItemUrl?: string;
  scopes: string[];
  updatedAt?: string;
};

export type PactNotificationStatus = "pending" | "delivered" | "dead_letter";

export type PactNotification = {
  id: string;
  event: "ags.retry_exhausted";
  sinkUrl: string;
  payload: Record<string, unknown>;
  status: PactNotificationStatus;
  attemptCount: number;
  nextAttemptAt: string;
  lastStatus?: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};
