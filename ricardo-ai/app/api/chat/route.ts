import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.RICARDO_AI_MODEL || "gpt-5.6-luna",
      instructions: `You are Ricardo AI, by Riscasan. Be helpful, practical, clear and multilingual. 
Reply naturally in the user's language. You support English, Haitian Creole, French and Spanish.
Do not claim actions you did not perform.`,
      input: message
    });

    return NextResponse.json({ text: response.output_text });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
