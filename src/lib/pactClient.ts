import type { AdminAuditEvent, AdminCohort, AdminUser, ContentProgress, ContentStatus, PactContent, PactSession, ScoreboardEntry, SessionDiagnostic, SquadNumber } from "../types";

export class PactClient {
  constructor(private readonly baseUrl: string, private readonly token: string) {}

  async getSession() {
    return this.request<PactSession>("/api/v1/session");
  }

  async getContent() {
    return this.request<PactContent[]>("/api/v1/content");
  }

  async getContentProgress() {
    return this.request<{ progress: ContentProgress[] }>("/api/v1/content/progress");
  }

  async updateContentProgress(contentId: string, input: Pick<ContentProgress, "answers" | "progressPercent">) {
    return this.request<ContentProgress>(`/api/v1/content/${encodeURIComponent(contentId)}/progress`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
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

  async getAdminAuditEvents() {
    return this.request<{ events: AdminAuditEvent[] }>("/api/v1/admin/audit-events");
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
