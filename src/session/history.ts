// Saves past session summaries in the browser (localStorage).
// Later this moves to a database once there are accounts.
import type { SessionSummary } from "./session";

const KEY = "inflow.history.v1";
const MAX = 50;

// localStorage can be missing or blocked (private mode), so every call is wrapped.
export function loadHistory(): SessionSummary[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionSummary[]) : [];
  } catch {
    return [];
  }
}

export function saveToHistory(summary: SessionSummary): SessionSummary[] {
  const next = [summary, ...loadHistory().filter((s) => s.id !== summary.id)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Saving failed (storage full or blocked). The report still shows; history just won't persist.
  }
  return next;
}

// Compares this session with the one before it, in plain words.
export function compareToLast(current: SessionSummary, history: SessionSummary[]): string | null {
  const previous = history.find((s) => s.id !== current.id);
  if (!previous) return null;
  const diff = Math.round((previous.timeStuckMs - current.timeStuckMs) / 1000);
  if (Math.abs(diff) < 5) return "About the same time stuck as last session.";
  return diff > 0 ? `${diff}s less time stuck than last session.` : `${-diff}s more time stuck than last session.`;
}
