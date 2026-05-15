export const UI_PREF_KEYS = {
  taskFocus: "pact.ui.v1.taskFocus",
  queueCollapsed: "pact.ui.v1.queueCollapsed"
} as const;

export function readBooleanPreference(key: string, fallback = false) {
  try {
    const value = window.localStorage.getItem(key);
    if (value === "true") return true;
    if (value === "false") return false;
  } catch {
    return fallback;
  }
  return fallback;
}

export function writeBooleanPreference(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Browser storage can be disabled; the UI preference still works for the current session.
  }
}
