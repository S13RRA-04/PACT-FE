import type { MechanicsState } from "../types";

export type MechanicOutcome = {
  score: number;
  maxScore: number;
  progressPercent: number;
};

export function scaledOutcome(maxScore: number, progressPercent: number): MechanicOutcome {
  const boundedProgress = Math.max(0, Math.min(100, progressPercent));
  return {
    score: Math.round(maxScore * boundedProgress / 100),
    maxScore,
    progressPercent: boundedProgress
  };
}

export function stateString(state: MechanicsState | undefined, key: string) {
  const value = state?.[key];
  return typeof value === "string" ? value : undefined;
}

export function stateStringArray(state: MechanicsState | undefined, key: string) {
  const value = state?.[key];
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : undefined;
}

export function stateBooleanRecord(state: MechanicsState | undefined, key: string) {
  const ids = stateStringArray(state, key);
  return ids ? Object.fromEntries(ids.map((id) => [id, true])) : undefined;
}
