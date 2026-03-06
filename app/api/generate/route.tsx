import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: Request) {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // We now expect 'mode' and 'extraContext' from the frontend
    const { prompt, mode, extraContext } = await req.json();

    let systemPrompt = "";

    if (mode === 'text') {
      systemPrompt = `You are an elite Text AI Prompt Engineer. Transform the user's idea into a structured prompt.
Framework:
1. [PERSONA]: Assign a role.
2. [CONTEXT]: Background info.
3. [TASK]: Exact goal.
4. [CONSTRAINTS]: Strict rules.
5. [FORMAT]: Output format.
Output ONLY the final, usable prompt formatted nicely with Markdown bolding.`;
    } 
    else if (mode === 'image') {
      systemPrompt = `You are an elite Image AI Prompt Engineer (Midjourney/DALL-E expert). Transform the user's raw idea into a highly detailed, comma-separated image generation prompt.
Framework:
1. [SUBJECT]: What is the main focus?
2. [MEDIUM/STYLE]: (e.g., 3D render, oil painting, cyberpunk, photorealistic).
3. [ENVIRONMENT/BACKGROUND]: Where is it?
4. [LIGHTING/COLORS]: (e.g., cinematic lighting, neon glow, golden hour).
5. [CAMERA/LENS]: (e.g., wide angle, macro shot, 85mm lens).
Output ONLY the final image prompt. Do not use conversational filler.`;
    } 
    else if (mode === 'video') {
      systemPrompt = `You are an elite Video AI Prompt Engineer (Sora/Runway expert). Transform the user's raw idea into a highly detailed video generation prompt.
Framework:
1. [CAMERA MOVEMENT]: (e.g., slow pan right, drone flyover, static tracking shot).
2. [SUBJECT ACTION]: What is moving and how? Keep it continuous.
3. [ENVIRONMENT/SETTING]: Highly detailed background.
4. [LIGHTING & CINEMATOGRAPHY]: (e.g., cinematic, 24fps, grainy film stock, volumetric fog).
Output ONLY the final video prompt. Do not use conversational filler.`;
    }

    // Combine the user's main idea with the specific questions they answered
    const fullUserPrompt = `Main Idea: ${prompt}\nSpecific Details Provided: ${extraContext}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", 
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: fullUserPrompt }
      ],
      temperature: 0.6,
    });

    return NextResponse.json({ result: completion.choices[0].message.content });
  } catch (error) {
    console.error("OpenAI Error:", error);
    return NextResponse.json({ error: "Failed to generate prompt" }, { status: 500 });
  }
}