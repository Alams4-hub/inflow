// Serverless function for ElevenLabs. Keeps the ElevenLabs API key secret on the server.
//   kind "speak":      text -> spoken audio (the interviewer's voice)
//   kind "transcribe": recorded answer audio -> text with word timings
import type { VercelRequest, VercelResponse } from "@vercel/node";

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
const TTS_MODEL = "eleven_flash_v2_5"; // low latency, so the interviewer doesn't lag
const STT_MODELS = ["scribe_v2", "scribe_v1"]; // try the newest first, fall back if the plan doesn't allow it

function apiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
  return key;
}

async function speak(text: string): Promise<string> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey(), "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text: text.slice(0, 600), model_id: TTS_MODEL }),
  });
  if (!res.ok) throw new Error(`ElevenLabs speak error ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer()).toString("base64");
}

// Pick a file name extension that matches how the browser recorded (Chrome: webm, Safari: mp4).
function fileNameFor(mimeType: string): string {
  if (mimeType.includes("mp4")) return "answer.mp4";
  if (mimeType.includes("ogg")) return "answer.ogg";
  if (mimeType.includes("wav")) return "answer.wav";
  return "answer.webm";
}

async function transcribe(audioBase64: string, mimeType: string) {
  const bytes = Buffer.from(audioBase64, "base64");
  if (bytes.length < 1000) throw new Error("The recording was empty. Check that the browser can use your microphone.");

  let lastError = "";
  for (const model of STT_MODELS) {
    const form = new FormData();
    form.append("model_id", model);
    form.append("timestamps_granularity", "word");
    form.append("file", new Blob([bytes], { type: mimeType.split(";")[0] }), fileNameFor(mimeType));
    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey() },
      body: form,
    });
    if (res.ok) {
      const data = (await res.json()) as {
        text?: string;
        words?: { text: string; start: number; end: number; type?: string }[];
      };
      return { text: data.text ?? "", words: data.words ?? [], model };
    }
    lastError = `ElevenLabs transcribe error ${res.status} (${model}): ${await res.text()}`;
    console.error(lastError);
    // Wrong key or missing permission: trying another model won't help.
    if (res.status === 401 || res.status === 403) break;
  }
  throw new Error(lastError);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const body = (req.body ?? {}) as Record<string, unknown>;
  try {
    if (body.kind === "speak") {
      return res.status(200).json({ audio: await speak(String(body.text ?? "")) });
    }
    if (body.kind === "transcribe") {
      return res.status(200).json(await transcribe(String(body.audio ?? ""), String(body.mimeType || "audio/webm")));
    }
    return res.status(400).json({ error: "Unknown kind" });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: String(err) });
  }
}
