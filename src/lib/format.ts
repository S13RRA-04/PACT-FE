import type { ContentType, LocalizedText, PactRole, PactSession, SquadNumber } from "../types";

export function text(value?: LocalizedText) {
  return value?.en ?? "";
}

export function contentTypeLabel(type: ContentType) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function roleLabel(role: PactRole | string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function initialsFor(value: string) {
  const parts = value.split(/[^a-z0-9]+/i).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return initials || "P";
}

export function themeLabelFor(session: PactSession) {
  if (session.role !== "learner") return `Grey - ${roleLabel(session.role)}`;
  if (!session.squadNumber) return "Unassigned";
  return `${squadColorLabel(session.squadNumber)} - Squad ${session.squadNumber}`;
}

export function contextSquadLabel(session: PactSession) {
  if (session.role !== "learner") return roleLabel(session.role);
  return session.squadNumber ? `Squad ${session.squadNumber}` : "Unassigned";
}

export function squadColorLabel(squadNumber: SquadNumber) {
  return {
    "1": "Red",
    "2": "Yellow",
    "3": "Green",
    "4": "Blue"
  }[squadNumber];
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
