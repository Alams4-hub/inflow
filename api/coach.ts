// Serverless function on Vercel. It keeps the Gemini API key secret on the server.
// The browser sends only text (code, test results, session stats). Never video.
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Google retires older models, so try a few current ones in order.
// GEMINI_MODEL (if set in Vercel / .env.local) is tried first. Lite is the fast fallback.
const MODELS = [...new Set([process.env.GEMINI_MODEL, "gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"].filter(Boolean))] as string[];
const FAST_MODEL = "gemini-3.5-flash-lite";

// If a model hasn't answered by then, give up on it and try the fast one instead.
const PER_MODEL_TIMEOUT_MS = 9000;

// Lets this function run longer than Vercel's default when Gemini is slow.
export const config = { maxDuration: 60 };

const NUDGE_RULES = `You are InFlow, a calm coding coach for students. The student is stuck.
Your job is to help them think, not to solve it for them.
Rules:
- Never write code. Never give the corrected line.
- 1 or 2 short sentences, plain and friendly words.
- Follow the help level exactly:
  1 = encouragement only, no hint at all.
  2 = ask one guiding question.
  3 = point to the part of the code to look at.
  4 = explain the idea of the fix in plain words, still no code.`;

const SUMMARY_RULES = `You write a short recap of a coding practice session for a student, talking to them as "you".
You get the problem, the session summary, and every event with its time in ms (runs with tests passed,
when they got stuck, hints given). heart.baseline is their usual heart rate.
At most 3 sentences and specific to THIS session: mention real numbers from it (how long, how many runs,
when they got stuck and for how long, how their heart rate changed compared with their usual),
then one concrete tip that fits what went wrong here. Never a generic line that could fit any session.
Plain, honest words. No hype, no emojis, no code.`;

const INTERVIEW_QUESTION_RULES = `You are a sharp, friendly job interviewer having a real conversation.
Ask exactly ONE question for the role given. Under 30 words, spoken style, no lists, no preamble.
If there are previous answers: react to the LAST answer and dig into something specific they actually said
(a decision, a claim, a vague part). If the last answer was very short or vague, push for a concrete example.
If there are no previous answers, open with a question in the style you are given, not "tell me about yourself".
The "Interviewer" line says how to act: friendly = warm and encouraging, neutral = professional,
tough = skeptical, presses on vague claims and asks "how do you know?".
If the role is a presentation, talk or pitch, act as an audience member instead of an interviewer:
first ask them to give it in about a minute, then ask the follow-ups a real audience would.
The "Interview type" line says what to ask about:
behavioral = real past situations (a time when...), dig for what THEY did and the result;
technical = concepts, design decisions and trade-offs for the role, asked out loud, one at a time, no live coding;
project = a deep dive on the project they describe in "About", like a sharp hackathon judge or investor:
  why it matters, how it works, the hardest part, trade-offs, what is real vs. demo, what is next;
custom = ask about exactly what they describe in "About".
Use details from "About" when it is given. Never invent facts about their project.
Never repeat a question already asked. Output only the question.`;

// Picked at random so every interview opens differently.
const OPENING_STYLES = [
  "a specific project story",
  "a time something failed",
  "a hard technical decision",
  "a disagreement with a teammate",
  "learning something fast under pressure",
  "why this role, asked in an unusual way",
  "a mistake they made and what changed after",
  "explaining something complex simply",
];

const INTERVIEW_FEEDBACK_RULES = `You are an interview coach. You get each question, the candidate's answer transcript,
their speaking stats (pace, filler sounds, long pauses), whether nerves seemed to help or hurt each answer,
and "heartPeakedAt": the phrase they were saying when their heart rate was highest (null if it never rose).
Write at most 3 short sentences, talking to them as "you": the answer that needs the most work and why,
and one specific thing to practice. Quote a few of their actual words when it helps.
If answers are only a few words long, say plainly that they were too short to judge and what a full answer needs.
Only mention things that are in the data. Plain, honest words. No lists, no emojis, no praise filler.`;

const ANSWER_COACH_RULES = `You are an interview coach giving feedback on ONE spoken answer.
You get the question, the transcript, speaking stats, and the phrase they were saying when their heart rate peaked.
Return ONLY a JSON object with these keys:
{"worked": string, "fix": string, "stronger": string,
 "situation": string, "action": string, "result": string}
- "worked": one sentence on what actually worked, quoting their words. If nothing did, say what they got right in intent.
- "fix": one sentence on the single most important thing to change (structure, specifics, ending, filler, rambling).
- "stronger": how they could say it, 2-3 spoken sentences in first person, built ONLY from facts they said.
  Keep their voice. Never invent achievements, numbers, or names. If the answer had no content, write an example
  opening line with a [placeholder] they fill in.
- "situation", "action", "result": the STAR parts of THEIR answer, each as a 2-6 word summary of what they said,
  or "" if that part is missing.
Talk to them as "you" in worked/fix. Plain words, no emojis.`;

async function callModel(model: string, key: string, payload: unknown): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PER_MODEL_TIMEOUT_MS);
  try {
    return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// `quick` = a live moment (a hint, the next question): use the fast model first.
async function askGemini(system: string, user: string, opts: { json?: boolean; quick?: boolean } = {}): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const base = {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
  };
  const extra = opts.json ? { responseMimeType: "application/json" } : {};
  // Minimal thinking: these are short replies, and speed matters more than deep reasoning.
  const fast = { ...base, generationConfig: { maxOutputTokens: 2048, thinkingConfig: { thinkingLevel: "minimal" }, ...extra } };
  // At most two models per request, so a slow day can't stack up long waits.
  const best = MODELS.find((m) => m !== FAST_MODEL) ?? FAST_MODEL;
  const order = opts.quick ? [FAST_MODEL, best] : [best, FAST_MODEL];

  const problems: string[] = [];
  for (const model of order) {
    const started = Date.now();
    try {
      let res = await callModel(model, key, fast);
      if (res.status === 400) {
        // This model doesn't take one of those settings. Retry with fewer settings.
        res = await callModel(model, key, opts.json ? { ...base, generationConfig: extra } : base);
      }
      if (!res.ok) {
        problems.push(`${model}: ${res.status} ${(await res.text()).slice(0, 160)}`);
        if (res.status === 401 || res.status === 403) break; // key problem: other models won't help
        continue;
      }
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
      };
      const text = data.candidates?.[0]?.content?.parts
        ?.filter((p) => !p.thought)
        .map((p) => p.text ?? "")
        .join("")
        .trim();
      if (!text) {
        problems.push(`${model}: empty reply`);
        continue;
      }
      console.log(`[gemini] ${model} answered in ${Date.now() - started} ms`);
      return text;
    } catch (err) {
      const slow = err instanceof Error && err.name === "AbortError";
      problems.push(`${model}: ${slow ? `no answer in ${PER_MODEL_TIMEOUT_MS / 1000}s` : String(err)}`);
    }
  }
  console.error("[gemini] every model failed:", problems);
  throw new Error(`Gemini failed. ${problems.join(" | ")}`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const body = (req.body ?? {}) as Record<string, unknown>;

  try {
    if (body.kind === "nudge") {
      const prompt = [
        `Help level: ${Number(body.level)}`,
        `Problem: ${String(body.problem)}`,
        `Their code:\n${String(body.code).slice(0, 4000)}`,
        `Test results:\n${String(body.results).slice(0, 2000)}`,
      ].join("\n\n");
      return res.status(200).json({ text: await askGemini(NUDGE_RULES, prompt, { quick: true }) });
    }
    if (body.kind === "summary") {
      const prompt = `Session data:\n${JSON.stringify(body.session).slice(0, 4000)}`;
      return res.status(200).json({ text: await askGemini(SUMMARY_RULES, prompt) });
    }
    if (body.kind === "interview-question") {
      const history = Array.isArray(body.history) ? body.history : [];
      const style = OPENING_STYLES[Math.floor(Math.random() * OPENING_STYLES.length)];
      const tone = ["friendly", "neutral", "tough"].includes(String(body.tone)) ? String(body.tone) : "friendly";
      const kind = ["behavioral", "technical", "project", "custom"].includes(String(body.kind2)) ? String(body.kind2) : "behavioral";
      const about = String(body.about ?? "").slice(0, 800);
      const prompt = `Role: ${String(body.role).slice(0, 120)}\nInterviewer: ${tone}\nInterview type: ${kind}\n${about ? `About: ${about}\n` : ""}${history.length === 0 ? `Opening style: ${style}\n` : ""}\nConversation so far:\n${JSON.stringify(history).slice(0, 4000)}`;
      return res.status(200).json({ text: await askGemini(INTERVIEW_QUESTION_RULES, prompt, { quick: true }) });
    }
    if (body.kind === "interview-feedback") {
      const prompt = `Role: ${String(body.role)}\n\nInterview:\n${JSON.stringify(body.answers ?? []).slice(0, 6000)}`;
      return res.status(200).json({ text: await askGemini(INTERVIEW_FEEDBACK_RULES, prompt) });
    }
    if (body.kind === "answer-coach") {
      const prompt = `Answer data:\n${JSON.stringify(body.answer ?? {}).slice(0, 5000)}`;
      const raw = await askGemini(ANSWER_COACH_RULES, prompt, { json: true });
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as Record<string, unknown>;
      } catch {
        throw new Error(`Gemini's reply wasn't valid JSON: ${raw.slice(0, 200)}`);
      }
      const str = (k: string) => (typeof parsed[k] === "string" ? (parsed[k] as string) : "");
      if (!str("fix") || !str("stronger")) throw new Error(`Gemini's reply was missing parts: ${raw.slice(0, 200)}`);
      return res.status(200).json({
        worked: str("worked"),
        fix: str("fix"),
        stronger: str("stronger"),
        situation: str("situation"),
        action: str("action"),
        result: str("result"),
      });
    }
    return res.status(400).json({ error: "Unknown kind" });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: String(err) });
  }
}
