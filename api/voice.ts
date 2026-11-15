// Serverless function for ElevenLabs. Keeps the ElevenLabs API key secret on the server.
//   kind "speak":      text -> spoken audio (the interviewer's voice)
//   kind "transcribe": recorded answer audio -> text with word timings
import type { VercelRequest, VercelResponse } from "@vercel/node";

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
const TTS_MODEL = "eleven_flash_v2_5"; // low latency, so the interviewer doesn't lag
const STT_MODEL = "scribe_v2";

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

async function transcribe(audioBase64: string, mimeType: string) {
  const form = new FormData();
  form.append("model_id", STT_MODEL);
  form.append("timestamps_granularity", "word");
  form.append("file", new Blob([Buffer.from(audioBase64, "base64")], { type: mimeType }), "answer.webm");
  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": apiKey() },
    body: form,
  });
  if (!res.ok) throw new Error(`ElevenLabs transcribe error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    text?: string;
    words?: { text: string; start: number; end: number; type?: string }[];
  };
  return { text: data.text ?? "", words: data.words ?? [] };
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
