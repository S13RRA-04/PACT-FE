import { describe, expect, it } from "vitest";
import { scoreQuestion } from "./scoring";
import type { PactQuestion } from "../types";

describe("scoreQuestion", () => {
  it("requires all drag matches when partial credit is disabled", () => {
    const question: PactQuestion = {
      id: "match-all",
      type: "drag_match",
      day: "day_1",
      role: "both",
      topic: "topic",
      tags: ["post_test"],
      stem: { en: "Match all." },
      payload: {
        kind: "drag_match",
        sources: [
          { id: "source-a", text: { en: "A" } },
          { id: "source-b", text: { en: "B" } }
        ],
        targets: [
          { id: "target-a", text: { en: "A" } },
          { id: "target-b", text: { en: "B" } }
        ],
        matches: [
          { sourceId: "source-a", targetId: "target-a" },
          { sourceId: "source-b", targetId: "target-b" }
        ],
        partialCredit: false
      },
      feedback: {},
      scoring: { points: 4, difficulty: "core", mustPass: true }
    };

    expect(scoreQuestion(question, { "source-a": "target-a", "source-b": "target-a" })).toBe(0);
    expect(scoreQuestion(question, { "source-a": "target-a", "source-b": "target-b" })).toBe(4);
  });
});
