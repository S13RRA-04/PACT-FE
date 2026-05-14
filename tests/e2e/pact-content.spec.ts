import { expect, test, type Page } from "@playwright/test";

const session = {
  userId: "learner-3",
  role: "learner",
  courseId: "CYB-201",
  cohortId: "spring-2026",
  squadId: "squad-3",
  squadNumber: "3"
};

const content = [
  {
    id: "module-1",
    type: "module",
    title: "Incident Triage Fundamentals",
    prompt: "Work through the triage decisions in order. Your answers are restored from PACT progress when you return.",
    maxScore: 20,
    status: "published",
    day: "Day 1",
    questionCount: 3,
    cohortId: "spring-2026",
    questions: [
      question("q1", "Alert review", "Which signal should be reviewed first when validating a suspicious login alert?", {
        kind: "multiple_choice",
        selectionMode: "single",
        options: [
          { id: "a", text: { en: "User-agent only" } },
          { id: "b", text: { en: "Impossible travel, MFA result, and device history" } },
          { id: "c", text: { en: "The ticket title" } }
        ],
        correct: ["b"]
      }, 10),
      question("q2", "Containment", "A containment action should be documented before closing the incident.", {
        kind: "true_false",
        correct: true
      }, 5),
      question("q3", "Evidence", "Enter the artifact label used for endpoint timeline evidence.", {
        kind: "fill_blank",
        blanks: [{ id: "blank-1", label: { en: "Artifact label" }, accepted: ["EDR timeline"] }]
      }, 5)
    ]
  },
  {
    id: "challenge-1",
    type: "challenge",
    title: "Phishing Escalation Drill",
    prompt: "Classify the escalation path for a suspicious email.",
    maxScore: 15,
    status: "published",
    day: "Day 2",
    questionCount: 0,
    questions: []
  }
];

const scoreboard = {
  entries: [
    {
      userId: "learner-3",
      name: "Learner Three",
      role: "learner",
      squadNumber: "3",
      totalScore: 60,
      maxScore: 100,
      progressPercent: 60
    }
  ]
};

test("learner content workspace restores and saves backend progress", async ({ page }) => {
  await mockPactApi(page);
  await page.goto("/");
  await page.getByLabel("PACT session token").fill("qa-token");
  await page.getByRole("button", { name: "Sync" }).click();

  await expect(page.getByRole("heading", { name: "Incident Triage Fundamentals", level: 2 })).toBeVisible();
  await expect(page.getByText("33% complete")).toBeVisible();
  await expect(page.getByText("A containment action should be documented before closing the incident.")).toBeVisible();
  await expect(page.getByText("Enter the artifact label used for endpoint timeline evidence.")).toBeHidden();

  await page.getByRole("button", { name: "True" }).click();
  await page.getByRole("button", { name: "Submit Question" }).click();
  await expect(page.locator(".status-line")).toHaveText("Question submitted. Feedback is available.");
  await expect(page.getByText("5/5 points")).toBeVisible();
  await expect(page.getByText("Correct. This response earned full credit.")).toBeVisible();
  await expect(page.getByText("67% complete")).toBeVisible();

  await expect(page).toHaveScreenshot("pact-content-workspace.png", { fullPage: true });
});

async function mockPactApi(page: Page) {
  let progress = [
    {
      id: "progress-1",
      userId: "learner-3",
      contentId: "module-1",
      contentType: "module",
      answers: { q1: "b" },
      answeredQuestionIds: ["q1"],
      progressPercent: 33,
      status: "in_progress",
      updatedAt: "2026-05-14T12:00:00.000Z"
    }
  ];

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/v1/session") return route.fulfill({ json: session });
    if (url.pathname === "/api/v1/content") return route.fulfill({ json: content });
    if (url.pathname === "/api/v1/content/progress") return route.fulfill({ json: { progress } });
    if (url.pathname === "/api/v1/content/module-1/questions/q2/attempts" && route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      expect(body).toEqual({ answer: true, feedbackExposed: true });
      progress = [{
        id: "progress-1",
        userId: "learner-3",
        contentId: "module-1",
        contentType: "module",
        answers: { q1: "b", q2: body.answer },
        answeredQuestionIds: ["q1", "q2"],
        progressPercent: 67,
        status: "in_progress",
        updatedAt: "2026-05-14T12:01:00.000Z"
      }];
      return route.fulfill({
        status: 201,
        json: {
          attempt: {
            id: "attempt-1",
            userId: "learner-3",
            contentId: "module-1",
            contentType: "module",
            questionId: "q2",
            attemptNumber: 1,
            answer: true,
            score: 5,
            maxScore: 5,
            isCorrect: true,
            feedbackExposed: true,
            feedbackExposedAt: "2026-05-14T12:01:00.000Z",
            submittedAt: "2026-05-14T12:01:00.000Z"
          },
          progress: progress[0]
        }
      });
    }
    if (url.pathname === "/api/v1/dashboard/scoreboard") return route.fulfill({ json: scoreboard });
    if (url.pathname === "/api/v1/scores") return route.fulfill({ status: 201, json: { ok: true } });
    return route.fulfill({ status: 404, json: { error: { message: `Unexpected ${url.pathname}` } } });
  });
}

function question(id: string, topic: string, stem: string, payload: Record<string, unknown>, points: number) {
  return {
    id,
    type: "knowledge",
    day: "Day 1",
    role: "analyst",
    topic,
    tags: [],
    stem: { en: stem },
    payload,
    feedback: {},
    scoring: { points, difficulty: "medium", mustPass: false }
  };
}
