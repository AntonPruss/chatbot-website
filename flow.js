import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";

/* Mermaid with HTML labels & loose security so we can inject <table> */
mermaid.initialize({
  startOnLoad: false,
  securityLevel: "loose",
  htmlLabels: true,
  theme: "default"
});

const log  = document.getElementById("log");
const txt  = document.getElementById("txt");
const send = document.getElementById("send");
const dia  = document.getElementById("diagram");

let graph  = "flowchart TD\n";
let lastId = "start";
const history = [];

/* first question comes from backend immediately */
askAPI("");

send.onclick = () => userTurn();
txt.addEventListener("keydown", e => (e.key === "Enter") && userTurn());

async function userTurn() {
  if (!txt.value.trim()) return;
  append("user", txt.value);
  history.push({ role: "user", content: txt.value });
  const userText = txt.value;
  txt.value = "";
  await askAPI(userText);
}

async function askAPI(content) {
  const r = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history })
  });
  const j = await r.json();

  if (j.error) { append("bot", `⚠️ SERVER ERROR: ${j.error}`); return; }

  if (j.end) {
    append("bot", j.summary);
    return;
  }

  /* ------------- build pretty node ------------- */
  const nodeId = uniq();
  const html = nodeHTML(j.question, content);   // question|answer in one node
  graph += `${lastId} --> ${nodeId}\n`;
  graph += `${nodeId}["${html}"]:::qna\n`;
  lastId = nodeId;

  dia.removeAttribute("data-processed");
  dia.textContent = graph;
  mermaid.init(undefined, dia);

  append("bot", j.question);
  history.push({ role: "assistant", content: JSON.stringify(j) });
}

function nodeHTML(question, answer) {
  /* rounded rectangle with two rows, different subtle fills */
  const qBg = "#eef2ff";  // soft indigo
  const aBg = "#fff7ed";  // soft orange
  return `
<table style='border-collapse:collapse;font-size:13px;border-radius:12px;overflow:hidden'>
  <tr><td style="padding:8px 14px;background:${qBg};font-weight:600">${escape(question)}</td></tr>
  <tr><td style="padding:8px 14px;background:${aBg};">${answer ? escape(answer) : ""}</td></tr>
</table>`;
}

function append(role, text) {
  const div = document.createElement("div");
  div.innerHTML = `<strong>${role}:</strong> ${escape(text)}`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function uniq()  { return "n" + Math.random().toString(36).slice(2, 8); }
function escape(s){ return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,'&quot;'); }
