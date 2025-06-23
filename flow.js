/* public/flow.js  – one-card Q+A, no duplicate text */

import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "loose",
  htmlLabels: true,
  theme: "default"
});

/* -------- DOM refs -------- */
const log  = document.getElementById("log");
const txt  = document.getElementById("txt");
const send = document.getElementById("send");
const dia  = document.getElementById("diagram");

/* -------- state -------- */
let graph           = "flowchart TD\n";
let lastId          = "start";
let pendingQuestion = "";        // holds question awaiting user answer
const history       = [];

/* first backend question */
awaitQuestion();                 // kicks things off

/* ===== UI handlers ===== */
send.onclick = userTurn;
txt.addEventListener("keydown", e => e.key === "Enter" && userTurn());

async function userTurn() {
  if (!txt.value.trim()) return;
  const userAnswer = txt.value.trim();
  txt.value = "";

  /* show only the USER line in the left pane */
  appendUser(userAnswer);

  /* draw card for previous Q + this A */
  if (pendingQuestion) addCard(pendingQuestion, userAnswer);

  history.push({ role: "user", content: userAnswer });
  await awaitQuestion();
}

/* ask backend, store *next* pendingQuestion */
async function awaitQuestion() {
  const r = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history })
  });
  const j = await r.json();

  if (j.error) { appendUser(`⚠️ SERVER ERROR: ${j.error}`); return; }

  if (j.end) {                      // final summary = last card only
    addCard(pendingQuestion, j.summary);
    return;
  }

  pendingQuestion = j.question;     // save for next turn
  history.push({ role: "assistant", content: JSON.stringify(j) });
}

/* -------- helpers -------- */

function addCard(question, answer) {
  const nodeId = uniq();
  graph += `${lastId} --> ${nodeId}\n`;
  graph += `${nodeId}["${asHTML(question, answer)}"]:::qna\n`;
  lastId = nodeId;

  dia.removeAttribute("data-processed");
  dia.textContent = graph;
  mermaid.init(undefined, dia);
}

function asHTML(q, a) {
  const qBg = "#eef2ff";  // light indigo
  const aBg = "#fff7ed";  // light orange
  return `
<table style='border-collapse:collapse;font-size:13px;border-radius:12px;overflow:hidden'>
  <tr><td style="padding:8px 14px;background:${qBg};font-weight:600">${esc(q)}</td></tr>
  <tr><td style="padding:8px 14px;background:${aBg};">${esc(a)}</td></tr>
</table>`;
}

function appendUser(text) {
  const div = document.createElement("div");
  div.innerHTML = `<strong>you:</strong> ${esc(text)}`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function uniq()      { return "n" + Math.random().toString(36).slice(2, 8); }
function esc(str="") { return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;"); }
