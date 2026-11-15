// Browser side of interview mode: talks to /api/voice (ElevenLabs) and /api/coach (Gemini).
// Every call has a fallback so the interview keeps going even if a service is down.
import type { Word } from "./speechStats";

// Used only if Gemini can't be reached. Picked at random so runs don't repeat.
const FALLBACK_QUESTIONS = [
  "Walk me through a project you're proud of. What was the hardest call you had to make?",
  "Tell me about a time something you built broke. What did you do first?",
  "Describe a time you disagreed with a teammate. How did it end?",
  "What's something you had to learn fast? How did you go about it?",
  "Explain the last technical thing you learned as if I'd never heard of it.",
  "Tell me about a mistake you made and what you do differently now.",
  "Why this role, and what would you want to get better at in your first three months?",
  "Tell me about a time you had too much to do. What did you drop, and why?",
];

// For presentations and pitches: what an audience would ask.
const FALLBACK_TALK_QUESTIONS = [
  "Give me your pitch in about a minute. Start with the problem.",
  "What's the one thing you want your audience to remember?",
  "Someone in the room isn't convinced. What would you tell them?",
  "What question are you most worried someone will ask? Answer it now.",
  "Explain your idea to someone who has never heard of it.",
];

// Fallbacks for the other kinds of interview, used only if Gemini can't be reached.
const FALLBACK_TECHNICAL_QUESTIONS = [
  "Explain the difference between a list and a set, and when you'd pick each.",
  "Walk me through what happens when you type a website address and press enter.",
  "How would you find out why a page in your app is slow?",
  "Tell me about a technical trade-off you made. What did you give up?",
  "How would you explain an API to someone who doesn't code?",
];
const FALLBACK_PROJECT_QUESTIONS = [
  "In one minute: what did you build, and who is it for?",
  "What was the hardest part to get working, and how did you get past it?",
  "What part of your demo is real, and what part is still a mock-up?",
  "If you had another month, what would you build next and why?",
  "Why would someone use this instead of what already exists?",
];

export type InterviewKind = "behavioral" | "technical" | "project" | "custom";

export function isTalk(role: string): boolean {
  return /pitch|presentation|talk|speech|demo/i.test(role);
}

export function pickFallbackQuestion(asked: string[], random = Math.random, role = "", kind: InterviewKind = "behavioral"): string {
  const all =
    kind === "project"
      ? FALLBACK_PROJECT_QUESTIONS
      : kind === "technical"
        ? FALLBACK_TECHNICAL_QUESTIONS
        : isTalk(role)
          ? FALLBACK_TALK_QUESTIONS
          : FALLBACK_QUESTIONS;
  const unused = all.filter((q) => !asked.includes(q));
  const pool = unused.length ? unused : all;
  return pool[Math.floor(random() * pool.length)];
}

async function post<T>(url: string, body: unknown, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      // Use the server's error message if it sent one, so the real reason can be shown.
      const text = await res.text();
      let message = text;
      try {
        message = (JSON.parse(text) as { error?: string }).error ?? text;
      } catch {
        // not JSON; keep the raw text
      }
      throw new Error(message || `${url} failed with status ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export type QA = { question: string; answer: string };

export type InterviewerTone = "friendly" | "neutral" | "tough";

export async function nextQuestion(
  role: string,
  history: QA[],
  tone: InterviewerTone = "friendly",
  kind: InterviewKind = "behavioral",
  about = "",
): Promise<string> {
  try {
    const { text } = await post<{ text: string }>("/api/coach", { kind: "interview-question", role, history, tone, kind2: kind, about }, 22000);
    return text;
  } catch (err) {
    console.warn("Using built-in question:", err);
    return pickFallbackQuestion(
      history.map((h) => h.question),
      Math.random,
      role,
      kind,
    );
  }
}

// Loudness (0 to 1) of whatever an AnalyserNode is hearing right now.
function levelOf(analyser: AnalyserNode, buffer: Uint8Array<ArrayBuffer>): number {
  analyser.getByteTimeDomainData(buffer);
  let sum = 0;
  for (const v of buffer) sum += ((v - 128) / 128) ** 2;
  return Math.min(1, Math.sqrt(sum / buffer.length) * 4);
}

// Speaks text with the ElevenLabs voice. Falls back to the browser's built-in voice.
// `onLevel` gets a function that reads the voice's loudness, so the orb can move with it.
export async function speak(text: string, onLevel?: (level: (() => number) | null) => void): Promise<"elevenlabs" | "browser"> {
  try {
    const { audio } = await post<{ audio: string }>("/api/voice", { kind: "speak", text });
    const player = new Audio(`data:audio/mpeg;base64,${audio}`);

    // Route the voice through an analyser, but only if audio is allowed to run.
    // (If the AudioContext is blocked, routing through it would make the voice silent.)
    let ctx: AudioContext | null = null;
    try {
      ctx = new AudioContext();
      await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 300))]);
      if (ctx.state === "running") {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        const source = ctx.createMediaElementSource(player);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        const buffer = new Uint8Array(analyser.fftSize);
        onLevel?.(() => levelOf(analyser, buffer));
      } else {
        void ctx.close();
        ctx = null;
      }
    } catch {
      ctx = null; // no visual, but the voice still plays
    }

    try {
      await new Promise<void>((resolve, reject) => {
        player.onended = () => resolve();
        player.onerror = () => reject(new Error("Audio playback failed"));
        player.play().catch(reject);
      });
    } finally {
      onLevel?.(null);
      void ctx?.close();
    }
    return "elevenlabs";
  } catch (err) {
    console.warn("Using browser voice:", err);
    await new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.onend = () => resolve();
      u.onerror = () => resolve();
      speechSynthesis.speak(u);
    });
    return "browser";
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function transcribe(audio: Blob): Promise<{ text: string; words: Word[] }> {
  const base64 = await blobToBase64(audio);
  return post("/api/voice", { kind: "transcribe", audio: base64, mimeType: audio.type || "audio/webm" }, 30000);
}

// situation / action / result: short summaries of each part of the story, "" if it was missing.
export type Coaching = { worked: string; fix: string; stronger: string; situation?: string; action?: string; result?: string };

// Gemini's notes on one answer, plus a stronger way to say it. If it fails, says why.
export async function answerCoach(answer: unknown): Promise<Coaching | { error: string }> {
  try {
    return await post<Coaching>("/api/coach", { kind: "answer-coach", answer }, 45000);
  } catch (err) {
    console.warn("No answer coaching:", err);
    const reason = err instanceof Error ? err.message : String(err);
    return { error: /abort/i.test(reason) ? "Gemini took too long to answer." : reason.slice(0, 300) };
  }
}

// `fallback` is used if Gemini can't be reached; it's built from the real answers.
export async function interviewFeedback(role: string, answers: unknown[], fallback: string): Promise<string> {
  try {
    const { text } = await post<{ text: string }>("/api/coach", { kind: "interview-feedback", role, answers }, 45000);
    return text;
  } catch (err) {
    console.warn("Using built-in feedback:", err);
    return fallback;
  }
}

// Records microphone audio. Returns `stop` (gives the recording) and `level`
// (current loudness from 0 to 1, for the live mic bars).
export async function startRecording(): Promise<{ stop: () => Promise<Blob>; level: () => number }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.start();

  const audio = new AudioContext();
  const analyser = audio.createAnalyser();
  analyser.fftSize = 512;
  audio.createMediaStreamSource(stream).connect(analyser);
  const buffer = new Uint8Array(analyser.fftSize);
  const level = () => levelOf(analyser, buffer);

  const stop = () =>
    new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void audio.close();
        resolve(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
      };
      recorder.stop();
    });

  return { stop, level };
}
