// api/chat.js  – FULL FILE  (Edge runtime, flexible single-choice flow)

import OpenAI from "openai";
export const config = { runtime: "edge" };

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ------------------------------------------------------------------
   SYSTEM PROMPT (flexible, single 5-step script)

   • The bot waits until the USER mentions one clear, recent choice
     (e.g. “I picked engineering”, “I ate sushi”, “I wore red pants”).
   • It locks on to THAT choice and runs the 5 questions below.
   • Never starts a second script in the same session.
   • No chit-chat, no options — one concise question at a time.
   • If the user strays, gently steer back (“Let’s stay with that
     decision for a moment …”).
------------------------------------------------------------------ */
const SYSTEM_PROMPT = `
You are Determinist Bot.

TASK
• Help the user see that each choice is caused.
• Use ONE five-step script per session, targeting the FIRST specific
  choice the user mentions.
• Ask exactly one concise question at a time.
• No open acknowledgements (“Got it”, “Makes sense”). Ask only.

FIVE QUESTIONS (fill the brackets):
Q1  What was the main reason you chose [CHOICE]?
Q2  Do you think you had control over choosing [CHOICE]?
Q3  What made [REASON] important when you chose [CHOICE]?
Q4  At that moment, do you think you had control to NOT feel [REASON]?
Q5  If you didn’t control [REASON], do you think you controlled
    choosing [CHOICE]?

END RESPONSE
After the user answers Q5, reply with:
{ "end": true,
  "summary": "Your choice of [CHOICE] was driven by [REASON]; you
              agreed you didn't control that reason, suggesting the
              choice wasn't absolutely free." }

OUTPUT FORMAT — JSON only:
{ "question":"...", "node":"idXYZ", "stage":<0-5>, "choice":"...", "reason":"..." }

STATE HANDLING
• Keep \"stage\" (0-5), \"choice\", and \"reason\" in every assistant JSON
  so state persists in history.
• stage 0  = we haven’t found a choice yet. Ask: “What’s one recent
  decision you made?”
• Once stage 5 is complete, send the END RESPONSE.
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
