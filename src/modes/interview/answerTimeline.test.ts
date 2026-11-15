import { describe, expect, it } from "vitest";
import { answerNote, awayShare, fillerMoment, bpmAt, buildTimeline, compareAttempts, countHedges, fallbackFeedback, findHedges, referenceRate } from "./answerTimeline";
import { nervesVerdict, speechStats, type Word } from "./speechStats";
import type { BpmPoint } from "../../sensing/useSensing";

const START = 1_000_000; // Date.now() when recording started

function say(text: string, perSec = 2.5, from = 0): Word[] {
  return text.split(" ").map((t, i) => ({ text: t, start: from + i / perSec, end: from + i / perSec + 0.3, type: "word" }));
}

// One heart reading per second for `secs` seconds, using rate(second).
function heartFor(secs: number, rate: (s: number) => number): BpmPoint[] {
  return Array.from({ length: secs }, (_, s) => ({ t: START + s * 1000, bpm: rate(s) }));
}

describe("bpmAt", () => {
  const heart = heartFor(5, (s) => 70 + s);
  it("picks the closest reading", () => {
    expect(bpmAt(heart, START + 2100)).toBe(72);
  });
  it("ignores readings that are too far away", () => {
    expect(bpmAt(heart, START + 20_000)).toBeNull();
  });
});

describe("referenceRate", () => {
  it("uses the resting rate when known", () => {
    expect(referenceRate(65, heartFor(20, () => 90))).toBe(65);
  });
  it("falls back to the session's typical rate", () => {
    expect(referenceRate(null, heartFor(20, () => 80))).toBe(80);
  });
  it("gives up with too few readings", () => {
    expect(referenceRate(null, heartFor(3, () => 80))).toBeNull();
  });
});

describe("buildTimeline", () => {
  it("colors words by the heart zone at the moment they were said", () => {
    // Calm for 4 seconds, then heart rate jumps 20% above resting.
    const heart = heartFor(10, (s) => (s < 4 ? 70 : 84));
    const words = say("I built a heart rate app and the hardest part was the noise", 2);
    const t = buildTimeline(words, heart, START, 70);
    const runs = t.pieces.filter((p) => p.type === "run");
    expect(runs[0]).toMatchObject({ zone: "Calm" });
    expect(runs[runs.length - 1]).toMatchObject({ zone: "High" });
    expect(t.peak?.zone).toBe("High");
  });

  it("keeps the heart readings from during the answer, on the answer's clock", () => {
    const heart = heartFor(30, () => 75);
    const t = buildTimeline(say("one two three four five", 1), heart, START, 70);
    expect(t.duration).toBeCloseTo(4.3);
    expect(t.heart[0].t).toBe(0);
    expect(t.heart.every((p) => p.t <= 5.3)).toBe(true);
  });

  it("pulls out filler sounds and long pauses", () => {
    const words = [...say("so uh I think", 2.5, 0), ...say("it worked", 2.5, 5)];
    const t = buildTimeline(words, [], START, null);
    expect(t.pieces.some((p) => p.type === "filler" && p.text === "uh")).toBe(true);
    expect(t.pieces.some((p) => p.type === "pause")).toBe(true);
    expect(t.hasHeart).toBe(false);
  });

  it("doesn't point at a peak when you stayed calm", () => {
    const t = buildTimeline(say("calm answer here", 2), heartFor(5, () => 70), START, 70);
    expect(t.peak).toBeNull();
  });
});

describe("answerNote", () => {
  it("calls out a two-word answer instead of judging it", () => {
    const stats = speechStats(say("prompting cloud"));
    const note = answerNote(stats, buildTimeline([], [], START, null), nervesVerdict("High", stats));
    expect(note).toMatch(/2 words/);
    expect(note).not.toMatch(/nerves/i);
  });

  it("quotes where the pulse jumped when nerves hurt", () => {
    const text = Array(60).fill("word").join(" ") + " uh um uh um";
    const words = say(text, 3.5);
    const stats = speechStats(words);
    const t = buildTimeline(words, heartFor(25, () => 90), START, 70);
    const note = answerNote(stats, t, nervesVerdict("High", stats));
    expect(note).toMatch(/pulse jumped around "/);
    expect(note).toMatch(/filler sounds/);
  });
});

describe("fallbackFeedback", () => {
  it("never mentions verdicts that didn't happen", () => {
    const short = speechStats(say("prompting cloud"));
    const text = fallbackFeedback([{ stats: short, verdict: nervesVerdict("High", short) }]);
    expect(text).not.toMatch(/Nerves hurt/);
    expect(text).toMatch(/too short/);
  });
});

describe("compareAttempts", () => {
  it("reports what got better on a second try", () => {
    const firstWords = say(Array(30).fill("word").join(" ") + " uh um uh", 2.5);
    const secondWords = say(Array(40).fill("word").join(" "), 2.5);
    const before = { stats: speechStats(firstWords), timeline: buildTimeline(firstWords, heartFor(20, () => 90), START, 70) };
    const after = { stats: speechStats(secondWords), timeline: buildTimeline(secondWords, heartFor(20, () => 70), START, 70) };
    const changes = compareAttempts(before, after);
    expect(changes).toContain("filler sounds 3 → 0");
    expect(changes.some((c) => c.includes("heart rate up 100% → 0%"))).toBe(true);
  });

  it("says nothing when nothing changed", () => {
    const words = say(Array(30).fill("word").join(" "), 2.5);
    const same = { stats: speechStats(words), timeline: buildTimeline(words, [], START, null) };
    expect(compareAttempts(same, same)).toEqual([]);
  });
});

describe("findHedges", () => {
  it("marks unsure phrases but not normal words", () => {
    const words = "I guess it was kind of hard but I fixed it".split(" ");
    const marks = findHedges(words);
    expect(words.filter((_, i) => marks[i])).toEqual(["I", "guess", "kind", "of"]);
    expect(countHedges(marks)).toBe(2);
  });
  it("ignores punctuation and case", () => {
    expect(countHedges(findHedges(["Uh,", "I", "GUESS."]))).toBe(1);
  });
});

describe("awayShare", () => {
  it("measures how often you looked away", () => {
    const gaze = Array.from({ length: 20 }, (_, i) => ({ t: START + i * 150, onScreen: i % 4 !== 0 }));
    expect(awayShare(gaze, START, START + 3000)).toBeCloseTo(0.25);
  });
  it("gives no answer without enough data", () => {
    expect(awayShare([], START, START + 3000)).toBeNull();
  });
});

describe("fillerMoment", () => {
  it("quotes what you said right after a filler", () => {
    const words = say("I think um vibe coding without checking was my mistake", 2.5);
    const t = buildTimeline(words, [], START, null);
    expect(fillerMoment(t)).toEqual({ filler: "um", next: "vibe coding without" });
  });
});

describe("filler 'like'", () => {
  it("counts 'like,' set off by commas but not 'I like Python'", () => {
    const filler = buildTimeline(say("and, like, learning"), [], START, null);
    const normal = buildTimeline(say("I like Python"), [], START, null);
    expect(filler.pieces.some((p) => p.type === "filler")).toBe(true);
    expect(normal.pieces.some((p) => p.type === "filler")).toBe(false);
  });
});
