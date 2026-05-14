export type PactRole = "admin" | "instructor" | "learner";
export type SquadNumber = "1" | "2" | "3" | "4";
export type ContentType = "module" | "challenge" | "game" | "assessment";
export type ContentStatus = "draft" | "published" | "archived";
export type QuestionKind = "multiple_choice" | "true_false" | "fill_blank" | "drag_match";

export type PactSession = {
  userId: string;
  role: PactRole;
  courseId: string;
  cohortId: string;
  squadId?: string;
  squadNumber?: SquadNumber;
  contentType?: ContentType;
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
  action: "squad.assignment.changed";
  actorUserId: string;
  actorName?: string;
  targetUserId: string;
  targetName?: string;
  courseId: string;
  cohortId: string;
  previousSquadId?: string;
  nextSquadId: string;
  nextSquadNumber?: SquadNumber;
  createdAt: string;
};

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
  };
};

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
  answeredQuestionIds: string[];
  progressPercent: number;
  score?: number;
  maxScore?: number;
  status: "not_started" | "in_progress" | "submitted";
  submittedAt?: string;
  updatedAt: string;
};
