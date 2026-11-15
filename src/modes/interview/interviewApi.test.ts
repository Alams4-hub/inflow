import { describe, expect, it } from "vitest";
import { isTalk, pickFallbackQuestion } from "./interviewApi";

describe("pickFallbackQuestion", () => {
  it("never repeats a question already asked while unused ones remain", () => {
    const asked: string[] = [];
    for (let i = 0; i < 8; i++) asked.push(pickFallbackQuestion(asked));
    expect(new Set(asked).size).toBe(8);
  });

  it("opens with different questions on different runs", () => {
    expect(pickFallbackQuestion([], () => 0)).not.toBe(pickFallbackQuestion([], () => 0.99));
  });
});

describe("talks and pitches", () => {
  it("knows a pitch from a job interview", () => {
    expect(isTalk("Pitch your project")).toBe(true);
    expect(isTalk("Data / analytics job")).toBe(false);
  });
  it("asks audience questions for a pitch", () => {
    expect(pickFallbackQuestion([], () => 0, "Pitch your project")).toMatch(/pitch/i);
  });
});

describe("kinds of interview", () => {
  it("asks about your project in project mode", () => {
    expect(pickFallbackQuestion([], () => 0, "General job interview", "project")).toMatch(/build/i);
  });
  it("asks technical questions in technical mode", () => {
    expect(pickFallbackQuestion([], () => 0, "Software engineering", "technical")).toMatch(/list and a set/);
  });
});
