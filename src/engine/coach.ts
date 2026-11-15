// The decision engine: decides when to stay quiet and when to step in.
//
// Idea: struggling is how people learn, so InFlow stays quiet while you're
// making progress, even if you're stressed. It only helps when you're stuck.
// If you're stuck AND stressed, it helps sooner. If heart rate isn't available,
// it still helps after you've been stuck for a while (behavior alone).
// Each time it helps, it gives a little more (encouragement -> question -> hint -> idea).

import type { ProgressState } from "../progress/codeTracker";

export const STRESS_THRESHOLD = 0.06; // 6% above your resting heart rate
export const WAIT_IF_STRESSED_MS = 20_000; // stuck + stressed: help after 20s
export const WAIT_IF_CALM_MS = 45_000; // stuck but calm (or no heart rate): help after 45s
export const COOLDOWN_MS = 40_000; // at least 40s between nudges
export const MAX_LEVEL = 4;

export const LEVEL_NAMES = ["", "encouragement", "question", "hint", "idea"] as const;

export type CoachInput = {
  now: number;
  progress: ProgressState;
  progressReason: string;
  stress: number | null; // fraction above baseline, or null if unknown
};

export type CoachDecision =
  | { action: "quiet"; reason: string }
  | { action: "nudge"; level: number; reason: string };

export class Coach {
  private level = 0;
  private stuckSince: number | null = null;
  private lastNudgeAt = -Infinity;

  decide(input: CoachInput): CoachDecision {
    const { now, progress, stress } = input;
    const stressed = stress !== null && stress >= STRESS_THRESHOLD;

    if (progress === "not-started") {
      return { action: "quiet", reason: "Run your code when you're ready. I'll stay quiet while you work." };
    }

    if (progress === "solved") {
      this.stuckSince = null;
      return { action: "quiet", reason: "Solved! Nice work." };
    }

    if (progress === "progressing") {
      this.stuckSince = null;
      this.level = 0; // real progress resets the help ladder
      return {
        action: "quiet",
        reason: stressed
          ? "You're working hard and making progress. Staying quiet."
          : "You're making progress. Staying quiet.",
      };
    }

    // Stuck.
    if (this.stuckSince === null) this.stuckSince = now;
    const stuckFor = now - this.stuckSince;
    const waitNeeded = stressed ? WAIT_IF_STRESSED_MS : WAIT_IF_CALM_MS;
    const sinceLastNudge = now - this.lastNudgeAt;
    const why = input.progressReason.charAt(0).toLowerCase() + input.progressReason.slice(1);

    if (this.level >= MAX_LEVEL) {
      return { action: "quiet", reason: "That's all my hints. You've got this." };
    }
    if (stuckFor < waitNeeded) {
      const left = Math.ceil((waitNeeded - stuckFor) / 1000);
      return {
        action: "quiet",
        reason: `Looks like you're stuck (${why}). Giving you ${left}s more before I step in.`,
      };
    }
    if (sinceLastNudge < COOLDOWN_MS) {
      const left = Math.ceil((COOLDOWN_MS - sinceLastNudge) / 1000);
      return { action: "quiet", reason: `I just gave you a hint. I'll wait ${left}s before helping more.` };
    }

    this.level += 1;
    this.lastNudgeAt = now;
    return {
      action: "nudge",
      level: this.level,
      reason: `You've been stuck for ${Math.round(stuckFor / 1000)}s${stressed ? " and your heart rate is up" : ""}. Stepping in with a ${LEVEL_NAMES[this.level]}.`,
    };
  }

  currentLevel(): number {
    return this.level;
  }
}
