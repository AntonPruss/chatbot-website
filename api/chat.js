// api/chat.js   (Edge runtime)

import OpenAI from "openai";
export const config = { runtime: "edge" };

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ----------  BOT PERSONA & INSTRUCTIONS  ---------- */
const SYSTEM_PROMPT = `
You are “Determinist Bot”. Your sole aim is to help the user see that every
action has a prior cause, therefore absolute free will is an illusion.
Socratic rules:

1. Ask ONE short question at a time (≤140 chars).
2. Respond ONLY as valid JSON, no prose:
   { "question": "…", "node": "id123" }
3. If the user explicitly concedes lack of freedom, reply instead:
   { "end": true, "summary": "<one-sentence conclusion>" }.
`;

/* ----------  EDGE FUNCTION HANDLER  ---------- */
export default async function handler(req) {
  // Will be [{ role:"user",content:"..."}, { role:"assistant",content:"{…}" }, …]
  const { history = [] } = await req.json();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },   // forces JSON string output
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...history
    ]
  });

  /* --------------------------------------------------
     The model returns a JSON STRING (e.g. '{"question":"Why ..."}').
     Parse it into an object, then stringify once so the browser
     receives proper JSON — not a double-quoted string.
  -------------------------------------------------- */
  const dataObj = JSON.parse(completion.choices[0].message.content);

  return new Response(
    JSON.stringify(dataObj),                    // object → JSON
    { headers: { "Content-Type": "application/json" } }
  );
}
