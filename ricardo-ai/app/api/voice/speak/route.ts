import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Voice is ready, but the server API key is not configured." }, { status: 503 });
    }

    const body = await req.json();
    const text = String(body?.text || "").trim();

    if (!text) {
      return NextResponse.json({ error: "Text is required." }, { status: 400 });
    }

    if (text.length > 4096) {
      return NextResponse.json({ error: "Text is too long for one voice response." }, { status: 413 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const audio = await client.audio.speech.create({
      model: process.env.RICARDO_AI_TTS_MODEL || "gpt-4o-mini-tts",
      voice: (process.env.RICARDO_AI_VOICE || "coral") as any,
      input: text,
      instructions: "Speak naturally, warmly, clearly, and professionally. Match the language of the text. This is Ricardo AI by Riscasan."
    });

    const buffer = Buffer.from(await audio.arrayBuffer());
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store"
      }
    });
  } catch (error: any) {
    console.error("Ricardo AI speech error", error);
    if (error?.status === 429 || error?.code === "credit_balance_exhausted" || error?.type === "insufficient_quota") {
      return NextResponse.json({ error: "Voice is connected, but API credits are currently unavailable." }, { status: 429 });
    }
    return NextResponse.json({ error: "Ricardo AI could not generate speech yet." }, { status: 500 });
  }
}
