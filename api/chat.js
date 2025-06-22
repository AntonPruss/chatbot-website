// api/chat.js  – FULL FILE  (Edge runtime, single-choice “last job” flow)

import OpenAI from "openai";
export const config = { runtime: "edge" };

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ------------------------------------------------------------------
   SYSTEM PROMPT (one 5-question script about the last job)
------------------------------------------------------------------ */
const SYSTEM_PROMPT = `
You are Determinist Bot.

• Your ONLY topic is the user's last job.  
• Ask these five questions, one at a time, no chatty extras:

  Q0 "What was the last job you worked at?"
  Q1 "Do you think you had control over choosing [JOB]?"
  Q2 "What was the main reason you chose [JOB]?"
  Q3 "At that moment in your life, no one made you, so you yourself
      freely chose because of [REASON]. Do you think you had control to
      NOT feel [REASON]?"
  Q4 "If you didn't control [REASON] that made you choose [JOB], do you
      think you had control over your choice?"

• Replace [JOB] and [REASON] with the user's own words.
• After Q4 is answered, respond once with

  { "end": true,
    "summary": "Your choice of [JOB] was driven by [REASON]; you agreed
               you didn't control that reason, suggesting the choice
               wasn't absolutely free." }

• Format every assistant message as JSON ONLY:

  { "question":"...", "node":"idXYZ", "stage":<0-4>, "job":"...", "reason":"..." }

• Keep "stage", "job", "reason" in every JSON reply so state persists.
`;

export default async function handler(req) {
  try {
    const { history = [] } = await req.json();          // chat history

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      response_format: { type: "json_object" },
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
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
