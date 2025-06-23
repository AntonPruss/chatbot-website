/* One-pane infographic: question shows instantly, answer fills in row-2 */

import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "loose",
  htmlLabels: true,
  theme: "default"
});

const txt  = document.getElementById("txt");
const send = document.getElementById("send");
const dia  = document.getElementById("diagram");

/* -------- state -------- */
let graphLines      = ["flowchart TD"];
let lastId          = "start";
let pendingNodeId   = null;
let pendingQuestion = "";
const history       = [];

/* get first backend question immediately */
awaitQuestion();             // kicks off

send.onclick = userTurn;
txt.addEventListener("keydown", e => e.key === "Enter" && userTurn());

async function userTurn() {
  if (!txt.value.trim()) return;
  const answer = txt.value.trim();
  txt.value = "";

  /* place answer inside the pending node */
  if (pendingNodeId) updateLastNode(pendingQuestion, answer);

  history.push({ role: "user", content: answer });
  await awaitQuestion();
}

/* ----- backend round trip ----- */
async function awaitQuestion() {
  const r = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history })
  });
  const j = await r.json();

  if (j.error) { alert(j.error); return; }

  if (j.end) {
    /* fill answer row of final node (summary) */
    if (pendingNodeId) updateLastNode(pendingQuestion, j.summary);
    return;
  }

  /* draw new node with question + blank answer row */
  pendingQuestion = j.question;
  addQuestionNode(j.question);
  history.push({ role: "assistant", content: JSON.stringify(j) });
}

/* -------- diagram helpers -------- */

function addQuestionNode(question) {
  const nodeId = uniq();

  /* link from previous node */
  graphLines.push(`${lastId} --> ${nodeId}`);

  /* node with Q row + empty A row */
  graphLines.push(`${nodeId}["${htmlTable(question,"")}"]:::qna`);
  lastId        = nodeId;
  pendingNodeId = nodeId;

  render();
}

function updateLastNode(question, answer) {
  const html = htmlTable(question, answer);
  /* replace last graph line (node definition) */
  graphLines[graphLines.length - 1] = `${pendingNodeId}["${html}"]:::qna`;
  pendingNodeId = null;
  render();
}

function render() {
  dia.removeAttribute("data-processed");
  dia.textContent = graphLines.join("\n");
  mermaid.init(undefined, dia);
}

function htmlTable(q, a) {
  const qBg = "#eef2ff";     // light indigo
  const aBg = "#fff7ed";     // light orange
  return `
<table style='border-collapse:collapse;font-size:13px;border-radius:12px;overflow:hidden'>
  <tr><td style="padding:8px 14px;background:${qBg};font-weight:600">${esc(q)}</td></tr>
  <tr><td style="padding:8px 14px;background:${aBg};">${esc(a || "&nbsp;")}</td></tr>
</table>`;
}

function uniq()      { return "n" + Math.random().toString(36).slice(2, 8); }
function esc(str="") { return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;"); }
