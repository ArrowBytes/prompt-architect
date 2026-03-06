import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: Request) {
  try {
    // --- DEBUG TRAP ---
    console.log("🚨 API KEY CHECK:", process.env.OPENAI_API_KEY ? "✅ FOUND IT" : "❌ STILL MISSING");
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Server cannot find the OpenAI API Key" }, { status: 500 });
    }
    // ------------------

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { prompt } = await req.json();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", 
      messages: [
        {
          role: "system",
          content: `You are an elite AI Prompt Engineer operating under Google's prompt engineering best practices. Your sole objective is to take a user's raw, unstructured idea and transform it into a highly optimized, ready-to-use prompt.

You MUST structure your final output using the following framework:

1. [PERSONA]: Assign a highly specific role to the AI.
2. [CONTEXT]: Provide the background information extracted or inferred from the user's raw input.
3. [TASK]: Define the exact, actionable goal clearly and concisely.
4. [CONSTRAINTS]: List strict rules (e.g., tone, what to avoid, length limits).
5. [FORMAT]: Dictate exactly how the output should look.

=== RULES ===
- DO NOT include conversational filler.
- Output ONLY the final, usable prompt formatted nicely with Markdown bolding.
- If the user's raw input is vague, infer the most logical context to make the prompt robust.

=== EXAMPLE ===
User Raw Input: "make me a workout plan i have 20 mins and hate running"

Your Output:
**Act as** a certified personal trainer specializing in high-intensity, low-impact home workouts. 
**Context:** I am looking to improve my fitness but have limited time and a strong aversion to running. 
**Task:** Create a weekly workout schedule that maximizes fat burn without running. 
**Constraints:** Strictly 20 minutes or less. No running. Use bodyweight exercises.
**Format:** Markdown table with Day, Focus Area, Exercises, and Duration.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.5,
    });

    return NextResponse.json({ result: completion.choices[0].message.content });
  } catch (error) {
    console.error("OpenAI Error:", error);
    return NextResponse.json({ error: "Failed to generate prompt" }, { status: 500 });
  }
}