import { describe, expect, it } from "vitest";
import { describeTest, pyRepr } from "./testDisplay";

describe("pyRepr", () => {
  it("prints values the way Python does", () => {
    expect(pyRepr(true)).toBe("True");
    expect(pyRepr(false)).toBe("False");
    expect(pyRepr(null)).toBe("None");
    expect(pyRepr("hi")).toBe("'hi'");
    expect(pyRepr([1, [2, 3]])).toBe("[1, [2, 3]]");
    expect(pyRepr(1.5)).toBe("1.5");
  });
});

describe("describeTest", () => {
  it("describes an args test", () => {
    expect(describeTest({ name: "x", args: [[3, 1, 2]], expected: 2 }, "second_largest")).toEqual({
      call: "second_largest([3, 1, 2])",
      expected: "2",
    });
  });

  it("splits an MBPP assert line into the call and the expected answer", () => {
    expect(describeTest({ name: "x", assert: 'assert remove_Occ("hello","l") == "heo"' }, "remove_Occ")).toEqual({
      call: 'remove_Occ("hello","l")',
      expected: '"heo"',
    });
  });

  it("uses the last == so answers that compare values still split correctly", () => {
    expect(describeTest({ name: "x", assert: "assert f(a == b) == True" }, "f").expected).toBe("True");
  });
});
