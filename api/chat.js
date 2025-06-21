// api/chat.js  – FULL FILE

import OpenAI from "openai";
export const config = { runtime: "edge" };

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
You are “Determinist Bot”. Your job is to prove every action
has a prior cause. Ask ONE short question at a time.
Reply ONLY as JSON:
  { "question": "…", "node": "id123" }
If the user concedes, reply:
  { "end": true, "summary": "…" }.
`;

export default async function handler(req) {
  try {
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

    // content may be an object OR a string – handle both safely
    let data = completion.choices[0].message.content;
    if (typeof data === "string") data = JSON.parse(data);

    return new Response(
      JSON.stringify(data),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    // send the error message back so we can read it in the browser
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
