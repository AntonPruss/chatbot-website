// api/chat.js  – FULL FILE  (Edge runtime, flexible branch + done guard)

import OpenAI from "openai";
export const config = { runtime: "edge" };

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ------------------------------------------------------------------
   SYSTEM PROMPT
------------------------------------------------------------------ */
const SYSTEM_PROMPT = `
You are Determinist Bot.

• Topic: the user's **last job** only.
• Use JSON responses in *every* assistant turn, no extra text:

  { "question":"...", "node":"idXYZ",
    "stage":<number or "done">,
    "job":"...", "reason":"...", "cause":"..." }

STAGES
0 → ask:  "What was the last job you worked at?"
1 → ask:  "Looking back, did choosing [JOB] feel like entirely your own decision?"
2 → ask:  "What was the single biggest factor that pushed you toward [JOB]?"
3 → ask:  "At the time, could you have felt differently about [REASON]?"  
        • If user answers **no** → jump to 4  
        • If user answers **yes** → go to 3.5
3.5 → ask: "What do you think caused you to feel [REASON]?"
4 → ask:  "Could you control [CAUSE]?"  (if stage 3 said *no*, set CAUSE=REASON)

CONCLUDE
• If user says **no** at stage 3 or stage 4, send once:

  { "end":true, "stage":"done",
    "summary":"You said your biggest factor for choosing [JOB] was
               [REASON] and acknowledged you didn't control that
               feeling/cause, suggesting the choice wasn't absolutely free." }

• If user answers **yes** at both 3 and 4, send once:

  { "end":true, "stage":"done",
    "summary":"You felt you could have changed both your feeling and its
               cause, suggesting that choice might have been more free
               than determined." }

RULES
• After stage:"done" never start the script again.
• If user digresses, reply with:
  { "question":"Let's stay with your choice of [JOB] for a moment.", ... }
  keeping the same stage number.
`;

/* ------------------------------------------------------------------ */

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
