import { describe, expect, it } from "vitest";
import { nervesVerdict, speechStats, type Word } from "./speechStats";

// Builds words spaced evenly: `perSec` words per second, starting at `from` seconds.
function say(text: string, perSec = 2.5, from = 0): Word[] {
  return text.split(" ").map((t, i) => ({ text: t, start: from + i / perSec, end: from + i / perSec + 0.3, type: "word" }));
}

describe("speechStats", () => {
  it("handles no words", () => {
    expect(speechStats([]).pace).toBe("Too short to tell");
  });

  it("ignores spacing and sound events from the API", () => {
    const words: Word[] = [
      { text: "Hello", start: 0, end: 0.4, type: "word" },
      { text: " ", start: 0.4, end: 0.5, type: "spacing" },
      { text: "(laughs)", start: 0.5, end: 1, type: "audio_event" },
      { text: "there", start: 1, end: 1.4, type: "word" },
    ];
    expect(speechStats(words).words).toBe(2);
  });

  it("measures a good pace (about 150 words per minute)", () => {
    const s = speechStats(say(Array(40).fill("word").join(" "), 2.5));
    expect(s.wordsPerMinute).toBeGreaterThan(140);
    expect(s.wordsPerMinute).toBeLessThan(165);
    expect(s.pace).toBe("Good");
  });

  it("flags speaking too fast", () => {
    expect(speechStats(say(Array(60).fill("word").join(" "), 3.5)).pace).toBe("Too fast");
  });

  it("flags speaking too slow", () => {
    expect(speechStats(say(Array(20).fill("word").join(" "), 1.5)).pace).toBe("Too slow");
  });

  it("counts filler sounds but not normal words like 'like'", () => {
    const s = speechStats(say("um I like to uh build things um yes", 2.5));
    expect(s.fillers).toBe(3);
    expect(s.fillerWords).toEqual(["um", "uh", "um"]);
  });

  it("handles fillers with punctuation and capitals", () => {
    expect(speechStats(say("Um, I think, uh... yes", 2.5)).fillers).toBe(2);
  });

  it("finds long pauses over 2 seconds", () => {
    const words = [...say("I worked on a project", 2.5, 0), ...say("called InFlow", 2.5, 5)];
    const s = speechStats(words);
    expect(s.longPauses).toHaveLength(1);
    expect(s.longPauses[0].seconds).toBeGreaterThan(2);
  });

  it("does not count short pauses", () => {
    const words = [...say("I worked on", 2.5, 0), ...say("a project", 2.5, 2)];
    expect(speechStats(words).longPauses).toHaveLength(0);
  });
});

describe("nervesVerdict", () => {
  const clean = speechStats(say(Array(40).fill("word").join(" "), 2.5));
  const messy = speechStats(say(Array(60).fill("word").join(" "), 3.5));

  it("says nerves helped when heart rate is up but delivery is clean", () => {
    expect(nervesVerdict("High", clean)).toBe("Nerves helped");
  });

  it("says nerves hurt when heart rate is up and delivery is messy", () => {
    expect(nervesVerdict("High", messy)).toBe("Nerves hurt");
  });

  it("says steady when calm", () => {
    expect(nervesVerdict("Calm", messy)).toBe("Steady");
  });

  it("won't judge a two-word answer, even with a high heart rate", () => {
    expect(nervesVerdict("High", speechStats(say("prompting cloud", 2.5)))).toBe("Too short to judge");
  });

  it("says no reading when heart rate wasn't available", () => {
    expect(nervesVerdict("Calibrating", clean)).toBe("No heart reading");
  });
});
