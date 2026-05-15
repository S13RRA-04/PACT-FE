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
    mechanics: {
      kind: "challenge_path",
      title: "Choose the escalation path",
      prompt: "Probe the scenario by selecting a response track. Published challenge prompts can replace these local drills without changing the shell.",
      resultLabel: "Recommended action",
      defaultPathId: "escalate",
      paths: [
        { id: "triage", label: "Triage", detail: "Preserve header evidence and score urgency.", score: 72 },
        { id: "contain", label: "Contain", detail: "Hold delivery, isolate mailbox rules, capture artifacts.", score: 88 },
        { id: "escalate", label: "Escalate", detail: "Route to incident command with confidence and scope.", score: 94 }
      ]
    },
    questions: []
  },
  {
    id: "game-1",
    type: "game",
    title: "Packet Pursuit",
    prompt: "Play through a timed packet-routing scenario and preserve the highest-confidence evidence chain.",
    maxScore: 25,
    status: "published",
    day: "Day 3",
    questionCount: 0,
    cohortId: "spring-2026",
    mechanics: {
      kind: "packet_capture",
      title: "Capture the packet trail",
      prompt: "Tap evidence nodes to build a clean chain before the clock runs out. This is the playable shell for future game mechanics.",
      resultLabel: "Evidence captured",
      maxScore: 100,
      initiallyCaptured: ["dns"],
      nodes: [
        { id: "dns", label: "DNS", points: 20 },
        { id: "proxy", label: "Proxy", points: 25 },
        { id: "edr", label: "EDR", points: 30 },
        { id: "siem", label: "SIEM", points: 25 }
      ]
    },
    questions: []
  },
  {
    id: "assessment-1",
    type: "assessment",
    title: "Incident Response Checkpoint",
    prompt: "Complete the checkpoint assessment before the final capstone operation unlocks.",
    maxScore: 30,
    status: "published",
    day: "Day 4",
    questionCount: 0,
    cohortId: "spring-2026",
    mechanics: {
      kind: "readiness_checklist",
      title: "Readiness checkpoint",
      prompt: "Work through the readiness gates before final assessment items are published.",
      resultLabel: "Gate readiness",
      timing: {
        enabled: true,
        timeLimitSeconds: 900,
        startTrigger: "learner_start",
        submitTrigger: "content_submit"
      },
      checks: [
        { id: "scope", label: "Scope incident evidence", initiallyChecked: true },
        { id: "risk", label: "Prioritize business risk" },
        { id: "action", label: "Select response action" },
        { id: "brief", label: "Prepare command brief" }
      ]
    },
    questions: []
  }
];

const scoreboard = {
  entries: [
    {
      userId: "learner-1",
      name: "Learner One",
      role: "learner",
      squadNumber: "1",
      totalScore: 82,
      maxScore: 100,
      progressPercent: 82
    },
    {
      userId: "learner-2",
      name: "Learner Two",
      role: "learner",
      squadNumber: "2",
      totalScore: 74,
      maxScore: 100,
      progressPercent: 74
    },
    {
      userId: "learner-3",
      name: "Learner Three",
      role: "learner",
      squadNumber: "3",
      totalScore: 60,
      maxScore: 100,
      progressPercent: 60
    },
    {
      userId: "learner-4",
      name: "Learner Four",
      role: "learner",
      squadNumber: "4",
      totalScore: 30,
      maxScore: 100,
      progressPercent: 30
    }
  ]
};

test("learner content workspace restores and saves backend progress", async ({ page }) => {
  await mockPactApi(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Incident Triage Fundamentals", level: 2 })).toBeVisible();
  await expect(page.locator(".mission-overview .mission-circuit-wall")).toBeVisible();
  await expect(page.locator(".mission-stage-panel .interactive-globe-canvas")).toBeVisible();
  if (page.viewportSize()?.width && page.viewportSize()!.width > 760) {
    await expect(await renderedGlobePixels(page, ".mission-stage-panel .interactive-globe-canvas")).toBeGreaterThan(100);
  }
  await expect(page.getByText("33% complete")).toBeVisible();
  await expect(page.getByText("A containment action should be documented before closing the incident.")).toBeVisible();
  await expect(page.getByText("Enter the artifact label used for endpoint timeline evidence.")).toBeHidden();

  await page.getByRole("button", { name: "True" }).click();
  await page.getByRole("button", { name: "Submit Question" }).click();
  await expect(page.locator(".status-line")).toHaveText("Question submitted. Feedback is available.");
  await expect(page.getByText("5/5 points")).toBeVisible();
  await expect(page.getByText("Correct. This response earned full credit.")).toBeVisible();
  await expect(page.getByText("67% complete")).toBeVisible();

  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Artifact label").fill("EDR timeline");
  await page.getByRole("button", { name: "Submit Question" }).click();
  await expect(page.getByText("100% complete")).toBeVisible();

  await page.getByRole("button", { name: "Submit Content" }).click();
  await expect(page.getByText("Module submitted")).toBeVisible();
  await expect(page.getByText("20/20 points captured. Your PACT progress is saved for this launch context.")).toBeVisible();

  await page.getByRole("button", { name: "Collapse mission queue" }).click();
  await expect(page.getByLabel("Collapse mission queue")).toBeHidden();
  await expect(page.getByLabel("Expand mission queue")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Expand mission queue")).toBeVisible();
  await page.getByRole("button", { name: "Expand mission queue" }).click();
  await expect(page.getByText("Training Queue")).toBeVisible();

  await expect(page.getByRole("tooltip", { name: "Press F to toggle focus. Esc exits." })).toBeHidden();
  await page.getByRole("button", { name: "Focus Task" }).hover();
  await expect(page.getByRole("tooltip", { name: "Press F to toggle focus. Esc exits." })).toBeVisible();
  await page.mouse.move(0, 0);

  await page.keyboard.press("f");
  await expect(page.locator(".session-panel")).toBeHidden();
  await expect(page.getByText("Training Queue")).toBeHidden();
  await expect(page.getByLabel("Focused task progress")).toContainText("100%");
  await expect(page.locator(".runner")).toBeVisible();
  await page.reload();
  await expect(page.locator(".session-panel")).toBeHidden();
  await expect(page.getByLabel("Focused task progress")).toBeVisible();
  await expect(page).toHaveScreenshot("pact-focused-task.png", { fullPage: true, maxDiffPixels: 1000 });
  await page.keyboard.press("Escape");
  await expect(page.locator(".session-panel")).toBeVisible();

  await expect(page).toHaveScreenshot("pact-content-workspace.png", { fullPage: true, maxDiffPixels: 1500 });
});

test("mission type cards filter the learner queue", async ({ page }) => {
  await mockPactApi(page);
  await page.goto("/");

  await page.getByLabel("PACT activity types").getByRole("button", { name: /Game/ }).click();

  await expect(page.getByRole("heading", { name: "Packet Pursuit", level: 2 })).toBeVisible();
  await expect(page.locator(".runner").getByText("Game simulation | Day 3")).toBeVisible();
  await expect(page.getByText("Capture the packet trail")).toBeVisible();
  await expect(page.getByText("20/100")).toBeVisible();

  await page.getByRole("button", { name: /Proxy/ }).click();
  await expect(page.getByText("45/100")).toBeVisible();
  await page.getByLabel("Filter content").getByRole("button", { name: "Module" }).click();
  await page.getByLabel("PACT activity types").getByRole("button", { name: /Game/ }).click();
  await expect(page.getByText("45/100")).toBeVisible();
  await expect(page).toHaveScreenshot("pact-game-shell.png", { fullPage: true, maxDiffPixelRatio: 0.03 });

  await page.getByRole("button", { name: "Submit Content" }).click();
  await expect(page.getByText("Run complete")).toBeVisible();
  await expect(page.getByText("11/25 points captured. Your PACT progress is saved for this launch context.")).toBeVisible();
});

test("challenge and assessment shells expose interactive states", async ({ page }) => {
  await mockPactApi(page);
  await page.goto("/");

  await page.getByLabel("PACT activity types").getByRole("button", { name: /Challenge/ }).click();
  await expect(page.getByText("Choose the escalation path")).toBeVisible();
  await page.getByRole("button", { name: /Contain/ }).click();
  await expect(page.locator(".shell-result").getByText("Contain")).toBeVisible();
  await expect(page).toHaveScreenshot("pact-challenge-shell.png", { fullPage: true, maxDiffPixelRatio: 0.03 });

  await page.getByLabel("PACT activity types").getByRole("button", { name: /Assessment/ }).click();
  await expect(page.getByText("Readiness checkpoint")).toBeVisible();
  await expect(page.getByText("Timed assessment")).toBeVisible();
  await page.getByRole("button", { name: "Start Assessment" }).click();
  await expect(page.locator(".shell-result").getByText("25%")).toBeVisible();
  await page.getByRole("button", { name: /Prioritize business risk/ }).click();
  await expect(page.locator(".shell-result").getByText("50%")).toBeVisible();
  await expect(page).toHaveScreenshot("pact-assessment-shell.png", {
    fullPage: true,
    mask: [page.locator(".assessment-timer strong"), page.locator(".assessment-timer small")],
    maxDiffPixelRatio: 0.03
  });
});

test("scoreboard renders mission leaderboard", async ({ page }) => {
  await mockPactApi(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Scoreboard" }).click();

  await expect(page.getByRole("heading", { name: "Mission Leaderboard", level: 1 })).toBeVisible();
  await expect(page.locator(".leaderboard-list").getByText("Learner One")).toBeVisible();
  await expect(page.getByLabel("Squad summaries").getByText("Squad 3")).toBeVisible();
  await expect(page).toHaveScreenshot("pact-scoreboard.png", { fullPage: true, maxDiffPixels: 900 });

  await page.getByLabel("Squad summaries").getByRole("button", { name: /Squad 3/ }).click();
  await expect(page.getByText("1 shown of 4 active learners")).toBeVisible();
  await expect(page.locator(".leaderboard-list").getByText("Learner Three")).toBeVisible();
  await expect(page.locator(".leaderboard-list").getByText("Learner One")).toBeHidden();
});

test("theme palettes preview squad and staff roles", async ({ page }) => {
  const palettes = [
    { name: "squad-1", session: { ...session, userId: "learner-1", squadId: "squad-1", squadNumber: "1" }, accent: "255, 47, 95" },
    { name: "squad-2", session: { ...session, userId: "learner-2", squadId: "squad-2", squadNumber: "2" }, accent: "255, 176, 0" },
    { name: "squad-3", session, accent: "0, 220, 166" },
    { name: "squad-4", session: { ...session, userId: "learner-4", squadId: "squad-4", squadNumber: "4" }, accent: "0, 167, 255" },
    { name: "instructor", session: { ...session, userId: "instructor-1", role: "instructor", squadId: undefined, squadNumber: undefined }, accent: "111, 85, 217" },
    { name: "admin", session: { ...session, userId: "admin-1", role: "admin", squadId: undefined, squadNumber: undefined }, accent: "100, 113, 125" }
  ];

  for (const palette of palettes) {
    await page.unroute("**/api/v1/**").catch(() => undefined);
    await mockPactApi(page, { sessionOverride: palette.session });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Incident Triage Fundamentals", level: 1 })).toBeVisible();
    const accent = await page.locator(".shell").evaluate((node) => getComputedStyle(node).getPropertyValue("--accent-rgb").trim());
    expect(accent).toBe(palette.accent);
    await expect(page).toHaveScreenshot(`pact-theme-${palette.name}.png`, { maxDiffPixelRatio: 0.03 });
  }
});

async function renderedGlobePixels(page: Page, selector: string) {
  await expect.poll(async () => page.locator(selector).evaluate((canvas: HTMLCanvasElement) => {
    if (!canvas.width || !canvas.height) {
      return 0;
    }

    const blank = document.createElement("canvas");
    blank.width = canvas.width;
    blank.height = canvas.height;
    return canvas.toDataURL("image/png") === blank.toDataURL("image/png") ? 0 : 101;
  }), { timeout: 5000 }).toBeGreaterThan(100);
  return page.locator(selector).evaluate((canvas: HTMLCanvasElement) => {
    if (!canvas.width || !canvas.height) {
      return 0;
    }

    const blank = document.createElement("canvas");
    blank.width = canvas.width;
    blank.height = canvas.height;
    return canvas.toDataURL("image/png") === blank.toDataURL("image/png") ? 0 : 101;
  });
}

async function mockPactApi(page: Page, options: { sessionOverride?: typeof session } = {}) {
  const activeSession = options.sessionOverride ?? session;
  let progress = [
    {
      id: "progress-1",
      userId: "learner-3",
      contentId: "module-1",
      contentType: "module",
      answers: { q1: "b" },
      mechanicsState: {},
      answeredQuestionIds: ["q1"],
      progressPercent: 33,
      status: "in_progress",
      updatedAt: "2026-05-14T12:00:00.000Z"
    }
  ];

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/v1/session") return route.fulfill({ json: activeSession });
    if (url.pathname === "/api/v1/content") return route.fulfill({ json: content });
    if (url.pathname === "/api/v1/content/progress") return route.fulfill({ json: { progress } });
    if (url.pathname === "/api/v1/admin/content") return route.fulfill({ json: content });
    if (url.pathname === "/api/v1/admin/diagnostics/session") {
      return route.fulfill({
        json: {
          courseId: activeSession.courseId,
          cohortId: activeSession.cohortId,
          role: activeSession.role,
          visibleContentCount: content.length,
          contentCounts: []
        }
      });
    }
    if (url.pathname === "/api/v1/admin/cohorts") return route.fulfill({ json: { cohorts: [] } });
    if (url.pathname === "/api/v1/admin/audit-events") return route.fulfill({ json: { events: [] } });
    if (url.pathname === "/api/v1/admin/analytics/question-attempts") return route.fulfill({ json: { attempts: [] } });
    if (url.pathname === "/api/v1/admin/diagnostics/ags-token-context") {
      return route.fulfill({
        json: {
          courseId: activeSession.courseId,
          cohortId: activeSession.cohortId,
          hasLaunchContext: true,
          hasScoreScope: true,
          scopes: [],
          updatedAt: "2026-05-14T12:00:00.000Z"
        }
      });
    }
    if (url.pathname === "/api/v1/admin/diagnostics/ags-publish-attempts") return route.fulfill({ json: { attempts: [], summary: { total: 0, byStatus: {} } } });
    if (url.pathname === "/api/v1/admin/diagnostics/notifications") return route.fulfill({ json: { notifications: [] } });
    if (url.pathname === "/api/v1/content/game-1/progress" && route.request().method() === "PATCH") {
      const body = route.request().postDataJSON();
      expect(body).toMatchObject({
        mechanicsState: { kind: "packet_capture", capturedNodeIds: expect.arrayContaining(["dns"]) }
      });
      const updated = {
        id: "progress-game-1",
        userId: "learner-3",
        contentId: "game-1",
        contentType: "game",
        answers: {},
        mechanicsState: body.mechanicsState,
        answeredQuestionIds: [],
        progressPercent: body.progressPercent,
        status: body.status,
        updatedAt: "2026-05-14T12:02:30.000Z"
      };
      progress = [updated, ...progress.filter((item) => item.contentId !== "game-1")];
      return route.fulfill({ json: updated });
    }
    if (url.pathname === "/api/v1/content/assessment-1/progress" && route.request().method() === "PATCH") {
      const body = route.request().postDataJSON();
      expect(body.mechanicsState).toMatchObject({
        kind: "readiness_checklist",
        checkedIds: expect.any(Array),
        startedAt: expect.any(String),
        timing: {
          startTrigger: "learner_start",
          submitTrigger: "content_submit",
          timeLimitSeconds: 900
        }
      });
      const updated = {
        id: "progress-assessment-1",
        userId: "learner-3",
        contentId: "assessment-1",
        contentType: "assessment",
        answers: {},
        mechanicsState: body.mechanicsState,
        answeredQuestionIds: [],
        progressPercent: body.progressPercent,
        status: body.status,
        startedAt: body.mechanicsState.startedAt,
        updatedAt: "2026-05-14T12:03:00.000Z"
      };
      progress = [updated, ...progress.filter((item) => item.contentId !== "assessment-1")];
      return route.fulfill({ json: updated });
    }
    if (url.pathname === "/api/v1/content/module-1/questions/q2/attempts" && route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      expect(body).toEqual({ answer: true, feedbackExposed: true });
      progress = [{
        id: "progress-1",
        userId: "learner-3",
        contentId: "module-1",
        contentType: "module",
        answers: { q1: "b", q2: body.answer },
        mechanicsState: {},
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
          feedback: {
            submissionId: "q2",
            status: "correct",
            earnedPoints: 5,
            possiblePoints: 5,
            feedback: { en: "Correct. This response earned full credit." },
            nextState: { questionComplete: true }
          },
          progress: progress[0]
        }
      });
    }
    if (url.pathname === "/api/v1/content/module-1/questions/q3/attempts" && route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      expect(body).toEqual({ answer: { "blank-1": "EDR timeline" }, feedbackExposed: true });
      progress = [{
        id: "progress-1",
        userId: "learner-3",
        contentId: "module-1",
        contentType: "module",
        answers: { q1: "b", q2: true, q3: body.answer },
        mechanicsState: {},
        answeredQuestionIds: ["q1", "q2", "q3"],
        progressPercent: 100,
        status: "in_progress",
        updatedAt: "2026-05-14T12:02:00.000Z"
      }];
      return route.fulfill({
        status: 201,
        json: {
          attempt: {
            id: "attempt-2",
            userId: "learner-3",
            contentId: "module-1",
            contentType: "module",
            questionId: "q3",
            attemptNumber: 1,
            answer: body.answer,
            score: 5,
            maxScore: 5,
            isCorrect: true,
            feedbackExposed: true,
            feedbackExposedAt: "2026-05-14T12:02:00.000Z",
            submittedAt: "2026-05-14T12:02:00.000Z"
          },
          feedback: {
            submissionId: "q3",
            status: "correct",
            earnedPoints: 5,
            possiblePoints: 5,
            feedback: { en: "Correct. This response earned full credit." },
            nextState: { questionComplete: true }
          },
          progress: progress[0]
        }
      });
    }
    if (url.pathname === "/api/v1/dashboard/scoreboard") return route.fulfill({ json: scoreboard });
    if (url.pathname === "/api/v1/scores") {
      const body = route.request().postDataJSON();
      if (body.contentId === "module-1") {
        expect(body).toMatchObject({ contentId: "module-1", score: 20, maxScore: 20, progressPercent: 100 });
        progress = progress.map((item) => item.contentId === "module-1" ? { ...item, status: "submitted", score: 20, maxScore: 20 } : item);
      } else if (body.contentId === "game-1") {
        expect(body).toMatchObject({ contentId: "game-1", score: 11, maxScore: 25, progressPercent: 45 });
        progress = [{
          id: "progress-game-1",
          userId: "learner-3",
          contentId: "game-1",
          contentType: "game",
          answers: {},
          mechanicsState: { kind: "packet_capture", capturedNodeIds: ["dns", "proxy"] },
          answeredQuestionIds: [],
          progressPercent: 45,
          status: "submitted",
          score: 11,
          maxScore: 25,
          updatedAt: "2026-05-14T12:03:00.000Z"
        }, ...progress.filter((item) => item.contentId !== "game-1")];
      }
      return route.fulfill({ status: 201, json: { ok: true } });
    }
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
