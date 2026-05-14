import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

describe("PACT admin console", () => {
  it("loads cohorts and assigns a learner to a numbered squad", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const path = new URL(url).pathname;

      if (path === "/api/v1/session") {
        return jsonResponse({
          userId: "admin-1",
          role: "admin",
          courseId: "course-a",
          cohortId: "cohort-a"
        });
      }
      if (path === "/api/v1/content" || path === "/api/v1/admin/content") {
        return jsonResponse([]);
      }
      if (path === "/api/v1/dashboard/scoreboard") {
        return jsonResponse({ entries: [] });
      }
      if (path === "/api/v1/admin/diagnostics/session") {
        return jsonResponse({
          courseId: "course-a",
          cohortId: "cohort-a",
          role: "admin",
          visibleContentCount: 0
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
      if (path === "/api/v1/admin/users/learner-1/squad" && init?.method === "PATCH") {
        expect(JSON.parse(String(init.body))).toEqual({ squadNumber: "3" });
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

    await userEvent.type(screen.getByLabelText(/PACT session token/i), "admin-token");
    await userEvent.click(screen.getByRole("button", { name: "Sync" }));
    await userEvent.click(await screen.findByRole("button", { name: "Admin" }));

    expect(await screen.findByRole("heading", { name: "Administrator Console" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Assignment History" })).toBeInTheDocument();
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
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}
