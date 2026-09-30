import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function toDataUrl(file: File, buffer: Buffer) {
  return `data:${file.type || "application/octet-stream"};base64,${buffer.toString("base64")}`;
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Ricardo AI is ready, but the server API key has not been configured yet." }, { status: 503 });
    }

    const form = await req.formData();
    const message = String(form.get("message") || "").trim();
    const file = form.get("file");

    if (!message && !(file instanceof File)) {
      return NextResponse.json({ error: "Message or file required" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const content: any[] = [];
    if (message) content.push({ type: "input_text", text: message });

    if (file instanceof File && file.size > 0) {
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "File too large. Maximum size is 10 MB for V1." }, { status: 413 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const dataUrl = toDataUrl(file, buffer);
      if (file.type.startsWith("image/")) {
        content.push({ type: "input_image", image_url: dataUrl });
      } else {
        content.push({ type: "input_file", filename: file.name, file_data: dataUrl });
      }
    }

    const response = await client.responses.create({
      model: process.env.RICARDO_AI_MODEL || "gpt-5.6-luna",
      instructions: `You are Ricardo AI, by Riscasan. Be helpful, practical, clear and multilingual.
Reply naturally in the user's language. You support English, Haitian Creole, French and Spanish.
When a user uploads a file, analyze only what is actually present in that file and say when something is unclear.
Do not claim actions you did not perform.`,
      input: [{ role: "user", content }] as any
    });

    return NextResponse.json({ text: response.output_text });
  } catch (error: any) {
    console.error(error);

    if (error?.status === 429 || error?.code === "credit_balance_exhausted" || error?.type === "insufficient_quota") {
      return NextResponse.json(
        { error: "Ricardo AI is connected correctly, but API credits are currently unavailable." },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: "Ricardo AI could not complete this request yet." }, { status: 500 });
  }
}
