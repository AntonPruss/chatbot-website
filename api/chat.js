// api/chat.js  – FULL FILE  (Edge runtime, custom “major” script)

import OpenAI from "openai";
export const config = { runtime: "edge" };

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY          // set this in Vercel → Settings → Env Vars
});

/* ------------------------------------------------------------------
   SYSTEM PROMPT
   ------------------------------------------------------------------
   • Bot name: Determinist Bot
   • Goal: show the user that each choice is caused; absolute free will
     is an illusion.
   • Question script (exact wording, no options, no affirmations):

     Q1  What’s your major?
     Q2  Do you think you had control over choosing [MAJOR]?
     Q3  What was the main reason you chose your [MAJOR]?
     Q4  At that moment in your life, no one made you, so you yourself
         freely chose because of the [REASON]. Do you think you had
         control to not feel the [REASON]?
     Q5  If you didn't control the [REASON] that made you choose your
         [MAJOR], do you think you had control over your choice?

   • The bot asks ONE question at a time, exactly as above,
     substituting [MAJOR] and [REASON] with the user’s own words.

   • Output format (JSON only):
       { "question": "<next-question>", "node": "id123" }

   • When Q5 is answered, reply instead with:
       { "end": true,
         "summary": "Your choice of <MAJOR> was driven by <REASON>; you
                     confirmed you didn’t control that reason, so the
                     choice wasn’t absolutely free." }
------------------------------------------------------------------ */
const SYSTEM_PROMPT = `
You are Determinist Bot.

Your task is to guide the user through a five-question script that
demonstrates how prior causes shape their choices.

SCRIPT (ask one at a time, no extra words):
Q1  "What’s your major?"
Q2  "Do you think you had control over choosing [MAJOR]?"
Q3  "What was the main reason you chose your [MAJOR]?"
Q4  "At that moment in your life, no one made you, so you yourself freely
     chose because of the [REASON]. Do you think you had control to not
     feel the [REASON]?"
Q5  "If you didn't control the [REASON] that made you choose your [MAJOR],
     do you think you had control over your choice?"

Substitute [MAJOR] and [REASON] with the user’s exact earlier answers.
After Q5 is answered, respond with:
{ "end": true,
  "summary": "Your choice of <MAJOR> was driven by <REASON>; you confirmed
              you didn’t control that reason, so the choice wasn’t
              absolutely free." }

Response format for every turn must be valid JSON ONLY:
{ "question": "…", "node": "idXYZ" }
`;

/* ---------------------  EDGE HANDLER ---------------------------- */
export default async function handler(req) {
  try {
    const { history = [] } = await req.json();   // chat history from browser

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",                           // model you have access to
      response_format: { type: "json_object" },
      temperature: 0.0,                          // keep wording exact
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history
      ]
    });

    // content may arrive as object or string; normalise to object
    let data = completion.choices[0].message.content;
    if (typeof data === "string") data = JSON.parse(data);

    return new Response(
      JSON.stringify(data),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    // return error text so frontend can display it
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
