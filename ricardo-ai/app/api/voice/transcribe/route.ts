import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Voice is ready, but the server API key is not configured." }, { status: 503 });
    }

    const form = await req.formData();
    const audio = form.get("audio");

    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ error: "Audio file required." }, { status: 400 });
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "Audio is too large. Maximum size is 25 MB." }, { status: 413 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await client.audio.transcriptions.create({
      file: audio,
      model: process.env.RICARDO_AI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe"
    });

    return NextResponse.json({ text: result.text || "" });
  } catch (error: any) {
    console.error("Ricardo AI transcription error", error);
    if (error?.status === 429 || error?.code === "credit_balance_exhausted" || error?.type === "insufficient_quota") {
      return NextResponse.json({ error: "Voice is connected, but API credits are currently unavailable." }, { status: 429 });
    }
    return NextResponse.json({ error: "Ricardo AI could not transcribe this audio yet." }, { status: 500 });
  }
}
