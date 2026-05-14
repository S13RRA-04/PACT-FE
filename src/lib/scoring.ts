import type { AnswerValue, PactQuestion } from "../types";

export function scoreQuestion(question: PactQuestion, value?: AnswerValue) {
  const payload = question.payload;
  const points = question.scoring.points;
  if (payload.kind === "true_false") return value === payload.correct ? points : 0;
  if (payload.kind === "multiple_choice") {
    const correct = Array.isArray(payload.correct) ? payload.correct : [];
    const selected = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
    return sameSet(correct, selected) ? points : 0;
  }
  if (payload.kind === "fill_blank" && isRecord(value)) {
    const blanks = payload.blanks ?? [];
    const correct = blanks.filter((blank) => {
      const answer = value[blank.id] ?? "";
      return blank.accepted.some((accepted) => blank.caseSensitive ? accepted === answer : accepted.toLowerCase() === answer.trim().toLowerCase());
    }).length;
    return blanks.length ? Math.round((correct / blanks.length) * points) : 0;
  }
  if (payload.kind === "drag_match" && isRecord(value)) {
    const matches = payload.matches ?? [];
    const correct = matches.filter((match) => value[match.sourceId] === match.targetId).length;
    return matches.length ? Math.round((correct / matches.length) * points) : 0;
  }
  return 0;
}

export function toggle(selected: string[], optionId: string) {
  return selected.includes(optionId) ? selected.filter((id) => id !== optionId) : [...selected, optionId];
}

export function isRecord(value: unknown): value is Record<string, string> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sameSet(left: string[], right: string[]) {
  return left.length === right.length && left.every((value) => right.includes(value));
}
