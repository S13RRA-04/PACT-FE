import { render, screen, within } from "@testing-library/react";
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
      const path = new URL(url).pathname;

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
              submittedAt: "2026-05-14T12:01:00.000Z"
            }
          ]
        });
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
    expect(await screen.findByRole("heading", { name: "Assignment History" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Question Attempt Review" })).toBeInTheDocument();
    expect(screen.getByText(/Threat landscape/)).toBeInTheDocument();
    expect(screen.getByText("Retries")).toBeInTheDocument();
    expect(screen.getByText("Grey - Instructor")).toBeInTheDocument();
    const learnerRow = screen.getAllByText("Learner One")
      .map((element) => element.closest(".admin-user-row"))
      .find((element): element is HTMLElement => element instanceof HTMLElement);
    expect(learnerRow).not.toBeNull();

    await userEvent.click(within(learnerRow as HTMLElement).getByRole("button", { name: "3" }));

    expect(await screen.findByText("Learner assigned to Squad 3.")).toBeInTheDocument();
    expect(screen.getByText("Admin One")).toBeInTheDocument();
    expect(screen.getByText("cohort-a - assigned to Squad 3")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4100/api/v1/admin/users/learner-1/squad",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ squadNumber: "3" })
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
