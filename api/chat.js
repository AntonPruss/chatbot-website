// api/chat.js   (Edge runtime)
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const config = { runtime: "edge" };

const SYSTEM_PROMPT = `
You are “Determinist Bot”. Your single goal: show the user every choice has
a prior cause, so absolute free will is an illusion. Ask one Socratic
question at a time. Reply as valid JSON ONLY:
{ "question": "...", "node": "id" }.
If the user already concedes, reply
{ "end": true, "summary": "…" }.
`;

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
 return new Response(
  completion.choices[0].message.content,
  { headers: { "Content-Type": "application/json" } }
);
}
