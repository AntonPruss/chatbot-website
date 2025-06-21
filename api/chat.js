// api/chat.js   (Edge runtime)

import OpenAI from "openai";
export const config = { runtime: "edge" };

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ----------  BOT PERSONA  ---------- */
const SYSTEM_PROMPT = `
You are “Determinist Bot”. Your goal: via short Socratic questions, help
the user realise every action has a prior cause (no absolute free will).

• Ask ONE question at a time, ≤140 chars.
• Answer ONLY as valid JSON, no extra text:
  { "question": "…", "node": "id123" }
• If the user already concedes, reply instead:
  { "end": true, "summary": "<one-sentence conclusion>" }.
`;

/* ----------  EDGE HANDLER  ---------- */
export default async function handler(req) {
  const { history = [] } = await req.json();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...history
    ]
  });

  /* content can be **string** or **object** depending on API internals */
  let data = completion.choices[0].message.content;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch (e) {
      // If parsing fails, wrap the raw string so client can show it.
      data = { question: data, node: "raw" };
    }
  }

  return new Response(
    JSON.stringify(data),                       // object → JSON
    { headers: { "Content-Type": "application/json" } }
  );
}
