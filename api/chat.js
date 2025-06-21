// api/chat.js  – FULL FILE  (Edge runtime)

import OpenAI from "openai";
export const config = { runtime: "edge" };

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ----------  BOT PERSONA  ---------- */
const SYSTEM_PROMPT = `
You are “Determinist Bot”. Your goal is to guide the user, via short
Socratic questions, to notice every action has a prior cause
— hence absolute free will is an illusion.

• Ask ONE question at a time, ≤140 chars.
• Reply ONLY as valid JSON:
  { "question": "…", "node": "id123" }
• If the user already concedes, reply:
  { "end": true, "summary": "…" }.
`;

/* ----------  EDGE HANDLER  ---------- */
export default async function handler(req) {
  try {
    const { history = [] } = await req.json();

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",               // <— universally available
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history
      ]
    });

    let data = completion.choices[0].message.content;
    if (typeof data === "string") data = JSON.parse(data);

    return new Response(
      JSON.stringify(data),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
