import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Fast, cheap, and extremely capable for this task
      messages: [
        {
          role: "system",
          content: "You are an expert prompt engineer. The user will provide a raw idea. Convert it into a highly structured prompt using the Role-Task-Format-Constraint framework. Output ONLY the refined prompt. Do not include introductory or concluding remarks. Just the final prompt ready to be copied."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    return NextResponse.json({ result: completion.choices[0].message.content });
  } catch (error) {
    console.error("OpenAI Error:", error);
    return NextResponse.json({ error: "Failed to generate prompt" }, { status: 500 });
  }
}