// Serverless function on Vercel. It keeps the Gemini API key secret on the server.
// The browser sends only text (code, test results, session stats). Never video.
import type { VercelRequest, VercelResponse } from "@vercel/node";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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

const SUMMARY_RULES = `You write a short recap of a coding practice session for a student.
At most 3 sentences: one thing they did well, where they got stuck, and one concrete tip for next time.
Plain, honest words. No hype, no emojis, no code.`;

const INTERVIEW_QUESTION_RULES = `You are a friendly but serious job interviewer.
Ask exactly ONE interview question for the role given. Keep it under 30 words, spoken style, no lists.
If there are previous answers, ask a natural follow-up to the last answer (dig into something specific they said),
otherwise ask a common opening question. Output only the question.`;

const INTERVIEW_FEEDBACK_RULES = `You are an interview coach. You get each question, the candidate's answer transcript,
their speaking stats (pace, filler sounds, long pauses), and whether nerves seemed to help or hurt each answer.
Write at most 4 short sentences: their strongest moment, the answer that needs the most work and why,
and one specific thing to practice. Plain, honest, encouraging words. No lists, no emojis.`;

async function askGemini(system: string, user: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) throw new Error("Gemini returned no text");
  return text;
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
      return res.status(200).json({ text: await askGemini(NUDGE_RULES, prompt) });
    }
    if (body.kind === "summary") {
      const prompt = `Session data:\n${JSON.stringify(body.session).slice(0, 4000)}`;
      return res.status(200).json({ text: await askGemini(SUMMARY_RULES, prompt) });
    }
    if (body.kind === "interview-question") {
      const prompt = `Role: ${String(body.role)}\n\nConversation so far:\n${JSON.stringify(body.history ?? []).slice(0, 4000)}`;
      return res.status(200).json({ text: await askGemini(INTERVIEW_QUESTION_RULES, prompt) });
    }
    if (body.kind === "interview-feedback") {
      const prompt = `Role: ${String(body.role)}\n\nInterview:\n${JSON.stringify(body.answers ?? []).slice(0, 6000)}`;
      return res.status(200).json({ text: await askGemini(INTERVIEW_FEEDBACK_RULES, prompt) });
    }
    return res.status(400).json({ error: "Unknown kind" });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: String(err) });
  }
}
