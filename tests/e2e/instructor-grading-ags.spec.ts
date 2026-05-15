import { expect, test, type Page } from "@playwright/test";

const instructorSession = {
  userId: "instructor-1",
  role: "instructor",
  courseId: "CYB-201",
  cohortId: "spring-2026",
  csrfToken: "csrf-e2e"
};

const content = [
  {
    id: "module-1",
    type: "module",
    title: "Incident Triage Fundamentals",
    prompt: "Review learner analysis and publish final scores.",
    maxScore: 10,
    status: "published",
    questionCount: 1,
    cohortId: "spring-2026",
    questions: [
      {
        id: "q-manual",
        type: "knowledge",
        day: "Day 1",
        role: "analyst",
        topic: "Manual analysis",
        tags: [],
        stem: { en: "Explain the escalation decision." },
        payload: { kind: "fill_blank", blanks: [{ id: "analysis", label: { en: "Analysis" }, accepted: [] }] },
        feedback: {},
        scoring: { points: 10, difficulty: "medium", mustPass: true, gradingMode: "manual" }
      }
    ]
  },
  {
    id: "game-1",
    type: "game",
    title: "Packet Pursuit",
    prompt: "Play a packet capture scenario.",
    maxScore: 25,
    status: "draft",
    questionCount: 0,
    cohortId: "spring-2026",
    mechanics: {
      kind: "packet_capture",
      title: "Capture the packet trail",
      prompt: "Tap evidence nodes.",
      nodes: [{ id: "dns", label: "DNS", points: 20 }]
    },
    questions: []
  }
];

const cohorts = [
  {
    courseId: "CYB-201",
    cohortId: "spring-2026",
    squads: [{ id: "squad-3", name: "Squad 3", number: "3" }],
    users: [
      { id: "instructor-1", name: "Instructor One", role: "instructor", cohortId: "spring-2026" },
      { id: "learner-3", name: "Learner Three", email: "learner.three@example.test", role: "learner", cohortId: "spring-2026", squadId: "squad-3", squadNumber: "3" }
    ]
  }
];

test("instructor grades a manual attempt and retries AGS publishing", async ({ page }) => {
  const calls: string[] = [];
  await mockInstructorApi(page, calls);
  await page.goto("/");
  await page.getByRole("button", { name: "Instructor Delivery" }).click();

  await expect(page.getByRole("heading", { name: "Question Attempt Review" })).toBeVisible();
  await expect(page.getByText("Incident Triage Fundamentals | Manual analysis")).toBeVisible();
  await expect(page.getByText("Awaiting instructor grade")).toBeVisible();
  await page.locator(".gate-row", { hasText: "Packet Pursuit" }).getByText("Mechanics JSON").click();
  await page.getByLabel("Packet Pursuit mechanics JSON").fill(JSON.stringify({
    kind: "packet_capture",
    title: "Capture updated trail",
    prompt: "Updated game shell.",
    nodes: [{ id: "proxy", label: "Proxy", points: 25 }]
  }, null, 2));
  await page.getByRole("button", { name: "Save Mechanics" }).click();
  await expect(page.locator(".status-line")).toHaveText("Content mechanics updated.");
  await expect(page).toHaveScreenshot("instructor-control-plane.png", { fullPage: true, maxDiffPixelRatio: 0.02 });

  await page.getByLabel("Manual score").fill("9");
  await page.getByLabel("Feedback").fill("Clear escalation rationale.");
  await page.getByRole("button", { name: "Save Grade" }).click();
  await expect(page.locator(".status-line")).toHaveText("Manual grade saved and completion policy re-run.");

  await expect(page.getByText("3 due or retryable sync items")).toBeVisible();
  await expect(page.getByText("Manual processing is available for this launched course.")).toBeVisible();

  const retryControls = page.getByLabel("AGS token for ags-1").locator("..");
  await page.getByLabel("AGS token for ags-1").fill("operator-token");
  await retryControls.getByRole("button", { name: "Retry" }).click();
  await expect(page.locator(".status-line")).toHaveText("AGS publish retry submitted.");

  await page.getByRole("button", { name: "Process Due" }).click();
  await expect(page.locator(".status-line")).toHaveText("Processed due AGS queue: 1 retried, 0 failed, 0 exhausted.");

  expect(calls).toContain("POST /api/v1/admin/analytics/question-attempts/attempt-1/grade");
  expect(calls).toContain("POST /api/v1/admin/diagnostics/ags-publish-attempts/ags-1/retry");
  expect(calls).toContain("POST /api/v1/admin/diagnostics/ags-publish-attempts/process-due");
});

test("instructor control plane renders empty and blocked states", async ({ page }) => {
  await mockEmptyControlPlaneApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Instructor Delivery" }).click();

  await expect(page.getByText("Launch context needs refresh")).toBeVisible();
  await expect(page.getByText("No content available to manage.")).toBeVisible();
  await expect(page.getByText("No AGS publish attempts match the current filters.")).toBeVisible();
  await expect(page.getByText("No question attempts match the current filters.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Process Due" })).toBeDisabled();
  await expect(page).toHaveScreenshot("instructor-control-plane-empty-error.png", { fullPage: true, maxDiffPixels: 500 });
});

async function mockInstructorApi(page: Page, calls: string[]) {
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const key = `${request.method()} ${url.pathname}`;
    calls.push(key);

    if (url.pathname === "/api/v1/session") return route.fulfill({ json: instructorSession });
    if (url.pathname === "/api/v1/content" || url.pathname === "/api/v1/admin/content") return route.fulfill({ json: content });
    if (url.pathname === "/api/v1/admin/content/game-1/mechanics" && request.method() === "PATCH") {
      expect(request.headers()["x-csrf-token"]).toBe("csrf-e2e");
      expect(request.postDataJSON()).toEqual({
        mechanics: {
          kind: "packet_capture",
          title: "Capture updated trail",
          prompt: "Updated game shell.",
          nodes: [{ id: "proxy", label: "Proxy", points: 25 }]
        }
      });
      return route.fulfill({ json: { ...content[1], mechanics: request.postDataJSON().mechanics } });
    }
    if (url.pathname === "/api/v1/content/progress") return route.fulfill({ json: { progress: [] } });
    if (url.pathname === "/api/v1/content/module-1/completion") {
      return route.fulfill({
        json: {
          completion: {
            complete: false,
            status: "pending_manual",
            requiredQuestionIds: ["q-manual"],
            answeredRequiredQuestionIds: ["q-manual"],
            pendingQuestionIds: ["q-manual"],
            pendingManualQuestionIds: ["q-manual"],
            failedMustPassQuestionIds: [],
            exhaustedQuestionIds: [],
            score: 0,
            maxScore: 10
          },
          progress: undefined,
          score: { score: 0, maxScore: 10, progressPercent: 100, agsStatus: "pending" }
        }
      });
    }
    if (url.pathname === "/api/v1/dashboard/scoreboard") return route.fulfill({ json: { entries: [] } });
    if (url.pathname === "/api/v1/admin/diagnostics/session") {
      return route.fulfill({
        json: {
          courseId: "CYB-201",
          cohortId: "spring-2026",
          role: "instructor",
          visibleContentCount: 1,
          contentCounts: [{ courseId: "CYB-201", cohortId: "spring-2026", type: "module", status: "published", count: 1, questions: 1 }]
        }
      });
    }
    if (url.pathname === "/api/v1/admin/cohorts") return route.fulfill({ json: { cohorts } });
    if (url.pathname === "/api/v1/admin/analytics/question-attempts") {
      return route.fulfill({
        json: {
          attempts: [{
            id: "attempt-1",
            userId: "learner-3",
            learnerName: "Learner Three",
            contentId: "module-1",
            contentTitle: "Incident Triage Fundamentals",
            contentType: "module",
            questionId: "q-manual",
            questionTopic: "Manual analysis",
            attemptNumber: 1,
            answer: { analysis: "Escalate based on repeated MFA failure." },
            score: 0,
            maxScore: 10,
            isCorrect: false,
            feedbackExposed: true,
            manualGradingStatus: "pending",
            submittedAt: "2026-05-14T12:00:00.000Z"
          }]
        }
      });
    }
    if (url.pathname === "/api/v1/admin/analytics/question-attempts/attempt-1/grade" && request.method() === "POST") {
      expect(request.postDataJSON()).toEqual({ score: 9, feedback: "Clear escalation rationale." });
      expect(request.headers()["x-csrf-token"]).toBe("csrf-e2e");
      return route.fulfill({ json: { completion: { complete: true, status: "complete", score: 9, maxScore: 10 }, progress: {} } });
    }
    if (url.pathname === "/api/v1/admin/diagnostics/ags-token-context") {
      return route.fulfill({
        json: {
          courseId: "CYB-201",
          cohortId: "spring-2026",
          hasLaunchContext: true,
          hasScoreScope: true,
          scopes: ["https://purl.imsglobal.org/spec/lti-ags/scope/score"],
          updatedAt: "2026-05-14T12:00:00.000Z"
        }
      });
    }
    if (url.pathname === "/api/v1/admin/diagnostics/ags-publish-attempts") return route.fulfill({ json: agsAttemptPage() });
    if (url.pathname === "/api/v1/admin/diagnostics/notifications") return route.fulfill({ json: { notifications: [] } });
    if (url.pathname === "/api/v1/admin/diagnostics/ags-publish-attempts/ags-1/retry" && request.method() === "POST") {
      expect(request.postDataJSON()).toEqual({ agsAccessToken: "operator-token" });
      expect(request.headers()["x-csrf-token"]).toBe("csrf-e2e");
      return route.fulfill({ json: { agsStatus: "published" } });
    }
    if (url.pathname === "/api/v1/admin/diagnostics/ags-publish-attempts/process-due" && request.method() === "POST") {
      expect(request.headers()["x-csrf-token"]).toBe("csrf-e2e");
      return route.fulfill({ json: { scanned: 1, retried: 1, failed: 0, exhausted: 0 } });
    }
    return route.fulfill({ status: 404, json: { error: { message: `Unexpected ${key}` } } });
  });
}

async function mockEmptyControlPlaneApi(page: Page) {
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === "/api/v1/session") return route.fulfill({ json: instructorSession });
    if (url.pathname === "/api/v1/content" || url.pathname === "/api/v1/admin/content") return route.fulfill({ json: [] });
    if (url.pathname === "/api/v1/content/progress") return route.fulfill({ json: { progress: [] } });
    if (url.pathname === "/api/v1/dashboard/scoreboard") return route.fulfill({ json: { entries: [] } });
    if (url.pathname === "/api/v1/admin/diagnostics/session") {
      return route.fulfill({
        json: {
          courseId: "CYB-201",
          cohortId: "spring-2026",
          role: "instructor",
          visibleContentCount: 0,
          contentCounts: []
        }
      });
    }
    if (url.pathname === "/api/v1/admin/cohorts") return route.fulfill({ json: { cohorts: [] } });
    if (url.pathname === "/api/v1/admin/analytics/question-attempts") return route.fulfill({ json: { attempts: [] } });
    if (url.pathname === "/api/v1/admin/diagnostics/ags-token-context") {
      return route.fulfill({
        json: {
          courseId: "CYB-201",
          cohortId: "spring-2026",
          hasLaunchContext: false,
          hasScoreScope: false,
          scopes: []
        }
      });
    }
    if (url.pathname === "/api/v1/admin/diagnostics/ags-publish-attempts") {
      return route.fulfill({
        json: {
          attempts: [],
          summary: { total: 0, byStatus: { failed: 0, pending: 0, retry_exhausted: 0, published: 0 } }
        }
      });
    }
    if (url.pathname === "/api/v1/admin/diagnostics/notifications") return route.fulfill({ json: { notifications: [] } });
    return route.fulfill({ status: 404, json: { error: { message: `Unexpected ${request.method()} ${url.pathname}` } } });
  });
}

function agsAttemptPage() {
  return {
    attempts: [
      agsAttempt("ags-1", "failed", 0),
      agsAttempt("ags-2", "pending", 0),
      agsAttempt("ags-3", "retry_exhausted", 3)
    ],
    summary: {
      total: 3,
      byStatus: { failed: 1, pending: 2, retry_exhausted: 1, published: 0 }
    }
  };
}

function agsAttempt(id: string, status: string, retryCount: number) {
  return {
    id,
    courseId: "CYB-201",
    cohortId: "spring-2026",
    userId: "learner-3",
    contentId: "module-1",
    lineItemUrl: "https://lms.example.test/lineitems/1",
    score: 9,
    maxScore: 10,
    progressPercent: 100,
    status,
    retryCount,
    nextRetryAt: "2026-05-14T12:10:00.000Z",
    errorCode: status === "published" ? undefined : "AGS_PUBLISH_FAILED",
    errorMessage: status === "published" ? undefined : "LMS AGS score publish failed",
    createdAt: "2026-05-14T12:01:00.000Z"
  };
}
