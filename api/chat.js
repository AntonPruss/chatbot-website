// api/chat.js  – FULL FILE  (Edge runtime, conversational five-step flow)

import OpenAI from "openai";
export const config = { runtime: "edge" };

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ------------------------------------------------------------------
   SYSTEM PROMPT – conversational wording
------------------------------------------------------------------ */
const SYSTEM_PROMPT = `
You are Determinist Bot.

• Your only topic is the user's **last job**.
• Run exactly one five-question sequence, no small-talk, no extras.
• Each assistant reply MUST be JSON only:
  { "question":"...", "node":"id123", "stage":<0-4>, "job":"...", "reason":"..." }

QUESTIONS
stage 0 → "What was the last job you worked at?"
stage 1 → "Looking back, did choosing [JOB] feel like it was entirely your own decision?"
stage 2 → "What was the single biggest factor that pushed you toward [JOB]?"
stage 3 → "In that moment, do you think you could have felt differently about [REASON]?"
stage 4 → "If you couldn’t choose whether to feel [REASON], would you say choosing [JOB] was fully under your control?"

• Replace [JOB] and [REASON] with user words.
• After the user answers stage 4, reply once with:
  { "end": true,
    "summary": "You said the biggest factor for choosing [JOB] was [REASON] and
                acknowledged you couldn't control that feeling, suggesting the
                choice wasn't absolutely free." }

• If the user drifts, say: "Let’s stay with your choice of [JOB] for a moment."
`;

export default async function handler(req) {
  try {
    const { history = [] } = await req.json();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history
      ]
    });

    // content may be json string or object
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
