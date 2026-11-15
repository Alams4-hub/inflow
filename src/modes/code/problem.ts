import { MBPP } from "./mbppProblems";

// The practice problem for code mode. The starter code has two hidden bugs,
// so people make some progress, then get stuck on the second one.

// A test either calls the function with `args` and compares to `expected`,
// or is a Python assert line like "assert add(1, 2) == 3" (the style MBPP uses).
export type TestCase =
  | { name: string; args: unknown[]; expected: unknown }
  | { name: string; assert: string };

export type Problem = {
  id: string;
  kind: "fix" | "write"; // fix a buggy function, or write one from scratch
  source?: string; // where the problem comes from, for credit
  title: string;
  prompt: string;
  functionName: string;
  starterCode: string;
  tests: TestCase[];
  // Used if the AI can't be reached, so the demo never breaks. One per help level.
  fallbackHints: [string, string, string, string];
};

export const SECOND_LARGEST: Problem = {
  id: "fix-second-largest",
  kind: "fix",
  title: "Second largest number",
  prompt:
    "Fix second_largest(nums) so it returns the second largest number in the list. " +
    "The list always has at least two different numbers.",
  functionName: "second_largest",
  starterCode: `def second_largest(nums):
    largest = second = 0
    for n in nums:
        if n > largest:
            largest = n
        elif n > second:
            second = n
    return second
`,
  tests: [
    { name: "mixed order", args: [[3, 1, 2]], expected: 2 },
    { name: "two numbers", args: [[10, 5]], expected: 5 },
    { name: "sorted list", args: [[1, 2, 3, 4]], expected: 3 },
    { name: "all negative", args: [[-5, -2, -9]], expected: -5 },
  ],
  fallbackHints: [
    "You're closer than you think. Look at which tests still fail.",
    "What do the inputs of the failing tests have in common?",
    "Look at what happens to the old largest number when you find a new one, and at the starting values before the loop.",
    "When a new largest number shows up, the old largest should become the second largest. And starting both at 0 breaks lists where every number is negative.",
  ],
};

export const AVERAGE: Problem = {
  id: "fix-average",
  kind: "fix",
  title: "Average of a list",
  prompt:
    "Fix average(nums) so it returns the average of the numbers as a decimal. " +
    "If the list is empty, return 0.",
  functionName: "average",
  starterCode: `def average(nums):
    return sum(nums) // len(nums)
`,
  tests: [
    { name: "whole number result", args: [[1, 2, 3]], expected: 2 },
    { name: "one number", args: [[5]], expected: 5 },
    { name: "decimal result", args: [[1, 2]], expected: 1.5 },
    { name: "empty list", args: [[]], expected: 0 },
  ],
  fallbackHints: [
    "You're closer than you think. Look at which tests still fail.",
    "What's different about the inputs of the failing tests?",
    "Look at the kind of division you're using, and what happens when the list has nothing in it.",
    "// throws away the decimal part, so use / instead. And dividing by the length of an empty list crashes, so handle that case first.",
  ],
};

export const PALINDROME: Problem = {
  id: "fix-palindrome",
  kind: "fix",
  title: "Palindrome check",
  prompt:
    "Fix is_palindrome(text) so it returns True if the text reads the same forwards and backwards, " +
    "ignoring capital letters and spaces.",
  functionName: "is_palindrome",
  starterCode: `def is_palindrome(text):
    return text == text[::-1]
`,
  tests: [
    { name: "simple word", args: ["racecar"], expected: true },
    { name: "not a palindrome", args: ["hello"], expected: false },
    { name: "capital letter", args: ["Racecar"], expected: true },
    { name: "with spaces", args: ["never odd or even"], expected: true },
  ],
  fallbackHints: [
    "You're closer than you think. Look at which tests still fail.",
    "What do the failing inputs have that the passing ones don't?",
    "Think about what the text should look like before you compare it with its reverse.",
    "Make the text lowercase and remove the spaces first, then compare it with its reverse.",
  ],
};

// 40 beginner problems from MBPP (see mbppProblems.ts for the source and how they were checked).

const WRITE_HINTS: [string, string, string, string] = [
  "You're closer than you think. Look at which tests still fail and compare what you got with what was expected.",
  "What's the simplest case in the tests? Can you make just that one pass first?",
  "Try walking through one failing test by hand, step by step, and write down what your code does.",
  "Break it into two steps: first get the values you need, then build the answer from them. Check each step with a print.",
];

export const MBPP_PROBLEMS: Problem[] = MBPP.map((m) => ({
  id: `mbpp-${m.id}`,
  kind: "write",
  source: "MBPP",
  title: m.title,
  prompt: m.prompt,
  functionName: m.fn,
  starterCode: `def ${m.fn}(${m.sig}):\n    # Write your code here\n    pass\n`,
  tests: m.tests,
  fallbackHints: WRITE_HINTS,
}));

export const FIX_PROBLEMS: Problem[] = [SECOND_LARGEST, AVERAGE, PALINDROME];
export const PROBLEMS: Problem[] = [...FIX_PROBLEMS, ...MBPP_PROBLEMS];
