// api/chat.js   (Edge runtime)

import OpenAI from "openai";
export const config = { runtime: "edge" };

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
You are “Determinist Bot”…  (unchanged text)
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

    let data = completion.choices[0].message.content;
    if (typeof data === "string") data = JSON.parse(data);

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
