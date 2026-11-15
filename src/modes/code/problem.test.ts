import { describe, expect, it } from "vitest";
import { FIX_PROBLEMS, MBPP_PROBLEMS, PROBLEMS } from "./problem";

describe("practice problems", () => {
  it("has the 3 fix-the-bug problems and 40 MBPP problems", () => {
    expect(FIX_PROBLEMS).toHaveLength(3);
    expect(MBPP_PROBLEMS).toHaveLength(40);
  });

  it("gives every problem a unique id", () => {
    expect(new Set(PROBLEMS.map((p) => p.id)).size).toBe(PROBLEMS.length);
  });

  it("gives every problem tests that call its function", () => {
    for (const p of PROBLEMS) {
      expect(p.tests.length).toBeGreaterThanOrEqual(3);
      for (const t of p.tests) {
        if ("assert" in t) expect(t.assert).toContain(`${p.functionName}(`);
      }
      expect(p.starterCode).toContain(`def ${p.functionName}(`);
      expect(p.fallbackHints).toHaveLength(4);
    }
  });

  it("credits MBPP on every MBPP problem", () => {
    for (const p of MBPP_PROBLEMS) expect(p.source).toBe("MBPP");
  });
});
