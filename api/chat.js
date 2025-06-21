// api/chat.js  – FULL FILE (Edge runtime)

import OpenAI from "openai";
export const config = { runtime: "edge" };

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY          // make sure this key is set in Vercel
});

/* ----------  BOT PERSONA  ---------- */
const SYSTEM_PROMPT = `
You are “Determinist Bot”. Your goal: via short Socratic questions, help the
user realise every choice has a prior cause; hence absolute free will is an
illusion.

Rules:
• Ask ONE question at a time, ≤140 chars.
• Reply ONLY as valid JSON:
  { "question": "…", "node": "id123" }
• If the user already concedes, reply:
  { "end": true, "summary": "…" }.
`;

/* ----------  EDGE HANDLER  ---------- */
export default async function handler(req) {
  try {
    const { history = [] } = await req.json();          // chat history from browser

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",                                  // <— YOU HAVE ACCESS TO THIS
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history
      ]
    });

    // handle both string or object returns
    let data = completion.choices[0].message.content;
    if (typeof data === "string") data = JSON.parse(data);

    return new Response(
      JSON.stringify(data),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    // send error text back so it shows in the chat window
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
