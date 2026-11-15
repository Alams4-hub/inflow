// Browser side of interview mode: talks to /api/voice (ElevenLabs) and /api/coach (Gemini).
// Every call has a fallback so the interview keeps going even if a service is down.
import type { Word } from "./speechStats";

const FALLBACK_QUESTIONS = [
  "Tell me about yourself and why you're interested in this role.",
  "Tell me about a project you're proud of. What was the hardest part?",
  "Describe a time something went wrong on a team or project. What did you do?",
  "Where do you want to grow most in the next year?",
];

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
    if (!res.ok) throw new Error(`${url} error ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export type QA = { question: string; answer: string };

export async function nextQuestion(role: string, history: QA[]): Promise<string> {
  try {
    const { text } = await post<{ text: string }>("/api/coach", { kind: "interview-question", role, history });
    return text;
  } catch (err) {
    console.warn("Using built-in question:", err);
    return FALLBACK_QUESTIONS[history.length % FALLBACK_QUESTIONS.length];
  }
}

// Speaks text with the ElevenLabs voice. Falls back to the browser's built-in voice.
export async function speak(text: string): Promise<"elevenlabs" | "browser"> {
  try {
    const { audio } = await post<{ audio: string }>("/api/voice", { kind: "speak", text });
    const player = new Audio(`data:audio/mpeg;base64,${audio}`);
    await new Promise<void>((resolve, reject) => {
      player.onended = () => resolve();
      player.onerror = () => reject(new Error("Audio playback failed"));
      player.play().catch(reject);
    });
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

export async function interviewFeedback(role: string, answers: unknown[]): Promise<string> {
  try {
    const { text } = await post<{ text: string }>("/api/coach", { kind: "interview-feedback", role, answers });
    return text;
  } catch (err) {
    console.warn("Using built-in feedback:", err);
    return "Look at the answers marked 'Nerves hurt' first. Practice those questions again out loud until your pace and pauses feel steady.";
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

  const level = () => {
    analyser.getByteTimeDomainData(buffer);
    let sum = 0;
    for (const v of buffer) sum += ((v - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(sum / buffer.length) * 4); // loudness, scaled to 0-1
  };

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
