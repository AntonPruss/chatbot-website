// api/chat.js  – FULL FILE  (Edge runtime, flexible branch + done guard)

import OpenAI from "openai";
export const config = { runtime: "edge" };

const apiKey = process.env.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey }) : null;

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

    if (!openai) {
      return new Response(JSON.stringify(mockDialog(history)), {
        headers: { "Content-Type": "application/json" }
      });
    }

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

function mockDialog(history){
  const lastAssistant = [...history].reverse()
    .find(msg => msg.role === "assistant" && looksLikeJSON(msg.content));
  const state = lastAssistant ? JSON.parse(lastAssistant.content) : {};

  const lastUser = [...history].reverse().find(msg => msg.role === "user");
  const lastAnswer = lastUser?.content?.trim().toLowerCase() || "";

  const job    = state.job || history.find(msg => msg.role === "user")?.content || "that role";
  const reason = state.reason || lastAnswer || "a strong nudge";
  const cause  = state.cause || lastAnswer || reason;

  switch(String(state.stage || 0)){
    case "0":
      return { question:"What was the last job you worked at?", node: "mock0", stage:1 };
    case "1":
      return { question:`Looking back, did choosing ${job} feel like entirely your own decision?`, node:"mock1", stage:2, job };
    case "2":
      return { question:`What was the single biggest factor that pushed you toward ${job}?`, node:"mock2", stage:3, job };
    case "3": {
      const answeredNo = /\bno\b/.test(lastAnswer);
      if (answeredNo) {
        return { question:`Could you control ${reason}?`, node:"mock4", stage:4, job, reason, cause: reason };
      }
      return { question:`What do you think caused you to feel ${reason}?`, node:"mock35", stage:3.5, job, reason };
    }
    case "3.5":
      return { question:`Could you control ${cause}?`, node:"mock4", stage:4, job, reason, cause };
    case "4": {
      const answeredNo = /\bno\b/.test(lastAnswer);
      if (answeredNo) {
        return { end:true, stage:"done", summary:`You said your biggest factor for choosing ${job} was ${reason} and acknowledged you didn't control that feeling/cause, suggesting the choice wasn't absolutely free.` };
      }
      return { end:true, stage:"done", summary:`You felt you could have changed both your feeling and its cause, suggesting that choice might have been more free than determined.` };
    }
    default:
      return { end:true, stage:"done", summary: state.summary || "Session complete." };
  }
}

function looksLikeJSON(text){
  try{ JSON.parse(text); return true; }catch{ return false; }
}
