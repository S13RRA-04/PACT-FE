import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

describe("PACT admin console", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.name = "";
    vi.unstubAllGlobals();
  });

  it("loads cohorts and assigns a learner to a numbered squad", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const parsedUrl = new URL(url);
      const path = parsedUrl.pathname;

      if (path === "/api/v1/session") {
        return jsonResponse({
          userId: "admin-1",
          role: "admin",
          courseId: "course-a",
          cohortId: "cohort-a",
          csrfToken: "csrf-admin"
        });
      }
      if (path === "/api/v1/content" || path === "/api/v1/admin/content") {
        return jsonResponse([]);
      }
      if (path === "/api/v1/content/progress") {
        return jsonResponse({ progress: [] });
      }
      if (path === "/api/v1/content/legacy-module/completion") {
        return jsonResponse({ error: { message: "Not found" } }, 404);
      }
      if (path === "/api/v1/dashboard/scoreboard") {
        return jsonResponse({ entries: [] });
      }
      if (path === "/api/v1/admin/diagnostics/session") {
        return jsonResponse({
          courseId: "course-a",
          cohortId: "cohort-a",
          role: "admin",
          contentType: "module",
          visibleContentCount: 0,
          contentCounts: [
            {
              courseId: "course-a",
              cohortId: null,
              type: "module",
              status: "published",
              count: 8,
              questions: 96
            }
          ]
        });
      }
      if (path === "/api/v1/admin/cohorts") {
        return jsonResponse({
          cohorts: [
            {
              courseId: "course-a",
              cohortId: "cohort-a",
              squads: [],
              users: [
                {
                  id: "learner-1",
                  name: "Learner One",
                  email: "learner.one@example.test",
                  role: "learner",
                  cohortId: "cohort-a"
                },
                {
                  id: "instructor-1",
                  name: "Instructor One",
                  role: "instructor",
                  cohortId: "cohort-a"
                }
              ]
            }
          ]
        });
      }
      if (path === "/api/v1/admin/audit-events") {
        if (parsedUrl.searchParams.get("action") === "question.manual_grade.upserted") {
          return jsonResponse({
            events: [
              {
                id: "audit-manual-1",
                action: "question.manual_grade.upserted",
                actorUserId: "admin-1",
                actorName: "Admin One",
                targetUserId: "learner-1",
                targetName: "Learner One",
                courseId: "course-a",
                cohortId: "cohort-a",
                contentId: "content-1",
                questionId: "question-1",
                attemptId: "attempt-1",
                nextScore: 4,
                maxScore: 5,
                feedbackChanged: true,
                createdAt: "2026-05-13T12:02:00.000Z"
              }
            ]
          });
        }
        return jsonResponse({
          events: [
            {
              id: "audit-1",
              action: "squad.assignment.changed",
              actorUserId: "admin-1",
              actorName: "Admin One",
              targetUserId: "learner-1",
              targetName: "Learner One",
              courseId: "course-a",
              cohortId: "cohort-a",
              nextSquadId: "squad-3",
              nextSquadNumber: "3",
              createdAt: "2026-05-13T12:00:00.000Z"
            }
          ]
        });
      }
      if (path === "/api/v1/admin/analytics/question-attempts") {
        return jsonResponse({
          attempts: [
            {
              id: "attempt-1",
              userId: "learner-1",
              learnerName: "Learner One",
              contentId: "content-1",
              contentTitle: "Day 1 Lecture 1",
              contentType: "module",
              questionId: "q1",
              questionTopic: "Threat landscape",
              attemptNumber: 2,
              answer: "b",
              score: 5,
              maxScore: 5,
              isCorrect: true,
              feedbackExposed: true,
              feedbackExposedAt: "2026-05-14T12:01:00.000Z",
              manualGradingStatus: "pending",
              submittedAt: "2026-05-14T12:01:00.000Z"
            }
          ]
        });
      }
      if (path === "/api/v1/admin/analytics/question-attempts/attempt-1/grade" && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({ score: 4, feedback: "Good analysis" });
        expect(new Headers(init.headers).get("x-csrf-token")).toBe("csrf-admin");
        return jsonResponse({ completion: { status: "complete", complete: true }, progress: {} });
      }
      if (path === "/api/v1/admin/diagnostics/ags-token-context") {
        return jsonResponse({
          courseId: "course-a",
          cohortId: "cohort-a",
          hasLaunchContext: true,
          hasScoreScope: true,
          lineItemsUrl: "https://lms.example.test/lineitems",
          scopes: ["https://purl.imsglobal.org/spec/lti-ags/scope/score"],
          updatedAt: "2026-05-14T12:00:00.000Z"
        });
      }
      if (path === "/api/v1/admin/diagnostics/ags-publish-attempts" && init?.method !== "POST") {
        return jsonResponse({
          attempts: [
            {
              id: "ags-1",
              courseId: "course-a",
              cohortId: "cohort-a",
              userId: "learner-1",
              contentId: "content-1",
              lineItemUrl: "https://lms.example.test/lineitems/1",
              score: 8,
              maxScore: 10,
              progressPercent: 100,
              status: "failed",
              retryCount: 0,
              errorCode: "AGS_PUBLISH_FAILED",
              errorMessage: "LMS AGS score publish failed",
              createdAt: "2026-05-14T12:02:00.000Z"
            },
            {
              id: "ags-2",
              courseId: "course-a",
              cohortId: "cohort-a",
              userId: "learner-1",
              contentId: "content-1",
              lineItemUrl: "https://lms.example.test/lineitems/1",
              score: 7,
              maxScore: 10,
              progressPercent: 100,
              status: "retry_exhausted",
              retryCount: 3,
              errorCode: "AGS_PUBLISH_FAILED",
              errorMessage: "LMS AGS score publish failed",
              createdAt: "2026-05-14T12:01:00.000Z"
            }
          ],
          summary: {
            total: 12,
            byStatus: { failed: 6, retry_exhausted: 4, published: 2 }
          }
        });
      }
      if (path === "/api/v1/admin/diagnostics/notifications") {
        return jsonResponse({
          notifications: [
            {
              id: "notification-1",
              event: "ags.retry_exhausted",
              sinkUrl: "https://ops.example.test/ags",
              payload: { event: "ags.retry_exhausted", exhausted: 1 },
              status: "dead_letter",
              attemptCount: 5,
              nextAttemptAt: "2026-05-14T12:05:00.000Z",
              lastStatus: 503,
              createdAt: "2026-05-14T12:00:00.000Z",
              updatedAt: "2026-05-14T12:05:00.000Z"
            }
          ]
        });
      }
      if (path === "/api/v1/admin/diagnostics/ags-publish-attempts/process-due" && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({});
        expect(new Headers(init.headers).get("x-csrf-token")).toBe("csrf-admin");
        return jsonResponse({ scanned: 2, retried: 1, failed: 1, exhausted: 0 });
      }
      if (path === "/api/v1/admin/diagnostics/ags-publish-attempts/ags-1/retry" && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({ agsAccessToken: "operator-token" });
        expect(new Headers(init.headers).get("x-csrf-token")).toBe("csrf-admin");
        return jsonResponse({ agsStatus: "published" });
      }
      if (path === "/api/v1/admin/users/learner-1/squad" && init?.method === "PATCH") {
        expect(JSON.parse(String(init.body))).toEqual({ squadNumber: "3" });
        expect(new Headers(init.headers).get("x-csrf-token")).toBe("csrf-admin");
        return jsonResponse({
          id: "learner-1",
          name: "Learner One",
          role: "learner",
          cohortId: "cohort-a",
          squadId: "squad-3",
          squadNumber: "3"
        });
      }

      return jsonResponse({ error: { message: `Unexpected request: ${path}` } }, 500);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(screen.queryByLabelText(/PACT session token/i)).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole("button", { name: "Instructor Delivery" }));

    expect(await screen.findByRole("heading", { name: "Control Plane" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "PACT Users" })).toBeInTheDocument();
    expect(screen.getByText("Grey - Admin")).toBeInTheDocument();
    expect(screen.getAllByText("Launch Type").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Module").length).toBeGreaterThan(0);
    expect(screen.getAllByText("course-a/global Module published: 8").length).toBeGreaterThan(0);
    expect(await screen.findByRole("heading", { name: "Audit History" })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Event type"), "question.manual_grade.upserted");
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByText("Manual grade 4/5")).toBeInTheDocument();
    expect(screen.getByText(/feedback changed/)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "AGS Publish Diagnostics" })).toBeInTheDocument();
    expect(screen.getByText("Server-side AGS tokens available")).toBeInTheDocument();
    expect(screen.getAllByText("AGS_PUBLISH_FAILED").length).toBeGreaterThan(0);
    expect(screen.getByRole("alert")).toHaveTextContent("exhausted max attempts");
    const agsSummary = screen.getByLabelText("AGS diagnostics summary");
    expect(within(agsSummary).getByText("12")).toBeInTheDocument();
    expect(within(agsSummary).getByText("4")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Notification Diagnostics" })).toBeInTheDocument();
    expect(screen.getByText("https://ops.example.test/ags")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Question Attempt Review" })).toBeInTheDocument();
    expect(screen.getByText(/Threat landscape/)).toBeInTheDocument();
    expect(screen.getByText("Retries")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Manual score"));
    await userEvent.type(screen.getByLabelText("Manual score"), "4");
    await userEvent.type(screen.getByLabelText("Feedback"), "Good analysis");
    await userEvent.click(screen.getByRole("button", { name: "Save Grade" }));
    expect(await screen.findByText("Manual grade saved and completion policy re-run.")).toBeInTheDocument();
    expect(screen.getByText("Grey - Instructor")).toBeInTheDocument();
    const agsDiagnostics = screen.getByRole("heading", { name: "AGS Publish Diagnostics" }).closest("article") as HTMLElement;
    await userEvent.selectOptions(within(agsDiagnostics).getByLabelText("Page size"), "25");
    await userEvent.click(within(agsDiagnostics).getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/admin/diagnostics/ags-publish-attempts?status=failed&limit=25"),
      expect.anything()
    ));
    await userEvent.click(within(agsDiagnostics).getByRole("button", { name: "Process Due" }));
    expect(await screen.findByText("Processed due AGS queue: 1 retried, 1 failed, 0 exhausted.")).toBeInTheDocument();
    const learnerRow = screen.getAllByText("Learner One")
      .map((element) => element.closest(".admin-user-row"))
      .find((element): element is HTMLElement => element instanceof HTMLElement);
    expect(learnerRow).not.toBeNull();

    await userEvent.click(within(learnerRow as HTMLElement).getByRole("button", { name: "3" }));

    expect(await screen.findByText("Learner assigned to Squad 3.")).toBeInTheDocument();
    expect(screen.getByText("Admin One")).toBeInTheDocument();
    expect(screen.getByText("cohort-a - assigned to Squad 3")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("AGS token for ags-1"), "operator-token");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("AGS publish retry submitted.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4100/api/v1/admin/users/learner-1/squad",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ squadNumber: "3" })
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4100/api/v1/admin/diagnostics/ags-publish-attempts/ags-1/retry",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ agsAccessToken: "operator-token" })
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4100/api/v1/admin/diagnostics/ags-publish-attempts/process-due",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({})
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4100/api/v1/admin/analytics/question-attempts/attempt-1/grade",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ score: 4, feedback: "Good analysis" })
      })
    );
  });

  it("themes the active learner session from the PACT squad assignment", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = new URL(String(input)).pathname;

      if (path === "/api/v1/session") {
        return jsonResponse({
          userId: "learner-3",
          role: "learner",
          courseId: "course-a",
          cohortId: "cohort-a",
          squadId: "squad-3",
          squadNumber: "3"
        });
      }
      if (path === "/api/v1/content") {
        return jsonResponse([]);
      }
      if (path === "/api/v1/content/progress") {
        return jsonResponse({ progress: [] });
      }
      if (path === "/api/v1/dashboard/scoreboard") {
        return jsonResponse({ entries: [] });
      }

      return jsonResponse({ error: { message: `Unexpected request: ${path}` } }, 500);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<App />);

    expect(await screen.findByText("Green - Squad 3")).toBeInTheDocument();
    expect(container.querySelector("main")).toHaveClass("theme-squad-3");
  });

  it("keeps loading content when the deployed API does not have progress endpoints yet", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = new URL(String(input)).pathname;

      if (path === "/api/v1/session") {
        return jsonResponse({
          userId: "learner-legacy",
          role: "learner",
          courseId: "course-a",
          cohortId: "cohort-a"
        });
      }
      if (path === "/api/v1/content") {
        return jsonResponse([
          {
            id: "legacy-module",
            type: "module",
            title: "Legacy Module",
            prompt: "Answer the prompt",
            maxScore: 10,
            questions: []
          }
        ]);
      }
      if (path === "/api/v1/content/progress") {
        return jsonResponse({ error: { message: "Not found" } }, 404);
      }
      if (path === "/api/v1/content/legacy-module/completion") {
        return jsonResponse({
          contentId: "legacy-module",
          completion: {
            complete: false,
            status: "in_progress",
            requiredQuestionIds: [],
            answeredRequiredQuestionIds: [],
            pendingQuestionIds: [],
            pendingManualQuestionIds: [],
            failedMustPassQuestionIds: [],
            exhaustedQuestionIds: [],
            score: 0,
            maxScore: 0
          }
        });
      }
      if (path === "/api/v1/dashboard/scoreboard") {
        return jsonResponse({ entries: [] });
      }

      return jsonResponse({ error: { message: `Unexpected request: ${path}` } }, 500);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Legacy Module", level: 2 })).toBeInTheDocument();
    expect(screen.getAllByText("PACT content synced from Mongo.").length).toBeGreaterThan(0);
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}
