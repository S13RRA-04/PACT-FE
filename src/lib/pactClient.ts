import type { AdminAuditAction, AdminAuditEvent, AdminCohort, AdminUser, AgsAttemptPage, AgsPublishAttemptStatus, AgsQueueProcessingResult, AgsTokenContextDiagnostic, AnswerValue, AssignmentCompletion, ContentMechanics, ContentProgress, ContentStatus, ManualGradingStatus, PactContent, PactNotification, PactNotificationStatus, PactSession, QuestionAttempt, QuestionSubmissionFeedback, ScoreboardEntry, SessionDiagnostic, SquadNumber } from "../types";

type ContentCompletionResponse = {
  contentId: string;
  completion: AssignmentCompletion;
  progress?: ContentProgress;
  score?: { score: number; maxScore: number; progressPercent: number; agsStatus: string };
};

export class PactClient {
  private csrfToken: string | undefined;

  constructor(private readonly baseUrl: string) {}

  setCsrfToken(token: string | undefined) {
    this.csrfToken = token;
  }

  async getSession() {
    return this.request<PactSession>("/api/v1/session");
  }

  async getContent() {
    return this.request<PactContent[]>("/api/v1/content");
  }

  async getContentProgress() {
    try {
      return await this.request<{ progress: ContentProgress[] }>("/api/v1/content/progress");
    } catch (error) {
      if (error instanceof PactApiError && error.status === 404) {
        return { progress: [] };
      }
      throw error;
    }
  }

  async getContentCompletion(contentId: string): Promise<ContentCompletionResponse> {
    try {
      return await this.request<ContentCompletionResponse>(`/api/v1/content/${encodeURIComponent(contentId)}/completion`);
    } catch (error) {
      if (error instanceof PactApiError && error.status === 404) {
        return {
          contentId,
          completion: {
            complete: false,
            status: "in_progress",
            score: 0,
            maxScore: 0,
            requiredQuestionIds: [],
            answeredRequiredQuestionIds: [],
            pendingQuestionIds: [],
            pendingManualQuestionIds: [],
            failedMustPassQuestionIds: [],
            exhaustedQuestionIds: []
          }
        };
      }
      throw error;
    }
  }

  async updateContentProgress(contentId: string, input: Partial<Pick<ContentProgress, "answers" | "progressPercent" | "mechanicsState" | "status">>) {
    try {
      return await this.request<ContentProgress>(`/api/v1/content/${encodeURIComponent(contentId)}/progress`, {
        method: "PATCH",
        body: JSON.stringify(input)
      });
    } catch (error) {
      if (error instanceof PactApiError && error.status === 404) {
        return undefined;
      }
      throw error;
    }
  }

  async submitQuestionAttempt(contentId: string, questionId: string, input: { answer: AnswerValue; feedbackExposed: boolean }) {
    try {
      return await this.request<{
        attempt: QuestionAttempt;
        feedback: QuestionSubmissionFeedback;
        progress: ContentProgress;
        score?: unknown;
        completion?: AssignmentCompletion;
      }>(
        `/api/v1/content/${encodeURIComponent(contentId)}/questions/${encodeURIComponent(questionId)}/attempts`,
        {
          method: "POST",
          body: JSON.stringify(input)
        }
      );
    } catch (error) {
      if (error instanceof PactApiError && error.status === 404) {
        return undefined;
      }
      throw error;
    }
  }

  async getManagedContent() {
    return this.request<PactContent[]>("/api/v1/admin/content");
  }

  async getSessionDiagnostic() {
    return this.request<SessionDiagnostic>("/api/v1/admin/diagnostics/session");
  }

  async getAdminCohorts() {
    return this.request<{ cohorts: AdminCohort[] }>("/api/v1/admin/cohorts");
  }

  async getAdminAuditEvents(input: { action?: AdminAuditAction; limit?: number } = {}) {
    const params = new URLSearchParams();
    if (input.action) params.set("action", input.action);
    if (input.limit) params.set("limit", String(input.limit));
    const query = params.toString();
    return this.request<{ events: AdminAuditEvent[] }>(`/api/v1/admin/audit-events${query ? `?${query}` : ""}`);
  }

  async getQuestionAttempts(input: { cohortId?: string; contentId?: string; userId?: string; questionId?: string; manualGradingStatus?: ManualGradingStatus; limit?: number } = {}) {
    const params = new URLSearchParams();
    if (input.cohortId) params.set("cohortId", input.cohortId);
    if (input.contentId) params.set("contentId", input.contentId);
    if (input.userId) params.set("userId", input.userId);
    if (input.questionId) params.set("questionId", input.questionId);
    if (input.manualGradingStatus) params.set("manualGradingStatus", input.manualGradingStatus);
    if (input.limit) params.set("limit", String(input.limit));
    const query = params.toString();
    try {
      return await this.request<{ attempts: QuestionAttempt[] }>(`/api/v1/admin/analytics/question-attempts${query ? `?${query}` : ""}`);
    } catch (error) {
      if (error instanceof PactApiError && error.status === 404) {
        return { attempts: [] };
      }
      throw error;
    }
  }

  async gradeManualQuestionAttempt(attemptId: string, input: { score: number; feedback?: string }) {
    return this.request<{ completion?: AssignmentCompletion; progress?: ContentProgress }>(
      `/api/v1/admin/analytics/question-attempts/${encodeURIComponent(attemptId)}/grade`,
      {
        method: "POST",
        body: JSON.stringify(input)
      }
    );
  }

  async getAgsTokenContext() {
    return this.request<AgsTokenContextDiagnostic>("/api/v1/admin/diagnostics/ags-token-context");
  }

  async getAgsPublishAttempts(input: { status?: AgsPublishAttemptStatus; cohortId?: string; contentId?: string; userId?: string; cursor?: string; limit?: number } = {}) {
    const params = new URLSearchParams();
    if (input.status) params.set("status", input.status);
    if (input.cohortId) params.set("cohortId", input.cohortId);
    if (input.contentId) params.set("contentId", input.contentId);
    if (input.userId) params.set("userId", input.userId);
    if (input.cursor) params.set("cursor", input.cursor);
    if (input.limit) params.set("limit", String(input.limit));
    const query = params.toString();
    return this.request<AgsAttemptPage>(`/api/v1/admin/diagnostics/ags-publish-attempts${query ? `?${query}` : ""}`);
  }

  async getNotificationDiagnostics(input: { status?: PactNotificationStatus; limit?: number } = {}) {
    const params = new URLSearchParams();
    if (input.status) params.set("status", input.status);
    if (input.limit) params.set("limit", String(input.limit));
    const query = params.toString();
    return this.request<{ notifications: PactNotification[] }>(`/api/v1/admin/diagnostics/notifications${query ? `?${query}` : ""}`);
  }

  agsPublishAttemptsExportUrl(input: { status?: AgsPublishAttemptStatus; cohortId?: string; contentId?: string; userId?: string; limit?: number } = {}) {
    const params = new URLSearchParams();
    if (input.status) params.set("status", input.status);
    if (input.cohortId) params.set("cohortId", input.cohortId);
    if (input.contentId) params.set("contentId", input.contentId);
    if (input.userId) params.set("userId", input.userId);
    if (input.limit) params.set("limit", String(input.limit));
    const query = params.toString();
    return `${this.baseUrl}/api/v1/admin/diagnostics/ags-publish-attempts/export.csv${query ? `?${query}` : ""}`;
  }

  async retryAgsPublishAttempt(attemptId: string, agsAccessToken?: string) {
    return this.request<{ agsStatus: AgsPublishAttemptStatus }>(`/api/v1/admin/diagnostics/ags-publish-attempts/${encodeURIComponent(attemptId)}/retry`, {
      method: "POST",
      body: JSON.stringify({ agsAccessToken: agsAccessToken || undefined })
    });
  }

  async processDueAgsPublishAttempts() {
    return this.request<AgsQueueProcessingResult>("/api/v1/admin/diagnostics/ags-publish-attempts/process-due", {
      method: "POST",
      body: JSON.stringify({})
    });
  }

  async updateContentStatus(contentId: string, status: ContentStatus) {
    return this.request<PactContent>(`/api/v1/admin/content/${encodeURIComponent(contentId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  }

  async updateContentAssignment(contentId: string, cohortId: string | null) {
    return this.request<PactContent>(`/api/v1/admin/content/${encodeURIComponent(contentId)}/assignment`, {
      method: "PATCH",
      body: JSON.stringify({ cohortId })
    });
  }

  async updateContentLmsLabel(contentId: string, lmsLabel: string | null) {
    return this.request<PactContent>(`/api/v1/admin/content/${encodeURIComponent(contentId)}/lms-label`, {
      method: "PATCH",
      body: JSON.stringify({ lmsLabel })
    });
  }

  async updateContentMechanics(contentId: string, mechanics: ContentMechanics | null) {
    return this.request<PactContent>(`/api/v1/admin/content/${encodeURIComponent(contentId)}/mechanics`, {
      method: "PATCH",
      body: JSON.stringify({ mechanics })
    });
  }

  async assignUserSquad(userId: string, squadNumber: SquadNumber) {
    return this.request<AdminUser>(`/api/v1/admin/users/${encodeURIComponent(userId)}/squad`, {
      method: "PATCH",
      body: JSON.stringify({ squadNumber })
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
    if (init.body) headers.set("content-type", "application/json");
    if (this.csrfToken && init.method && !["GET", "HEAD", "OPTIONS"].includes(init.method.toUpperCase())) {
      headers.set("x-csrf-token", this.csrfToken);
    }
    const response = await fetch(`${this.baseUrl}${path}`, { ...init, credentials: "include", headers });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new PactApiError(response.status, payload.error?.message ?? "PACT API request failed");
    }
    return response.json() as Promise<T>;
  }
}

class PactApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "PactApiError";
  }
}
