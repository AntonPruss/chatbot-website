// flow.js  – FULL FILE  (no hard-coded greeting)

import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";
mermaid.initialize({ startOnLoad: false });

const log  = document.getElementById("log");
const txt  = document.getElementById("txt");
const send = document.getElementById("send");
const dia  = document.getElementById("diagram");

let graph  = "flowchart TD\n";
let lastId = "start";
const history = [];          // will hold user/assistant JSON exchanges

/* ----------------  kick off the first API call --------------- */
askAPI("");                  // empty content → stage 0 question from server

/* ----------------  UI event handlers  ----------------------- */
send.onclick = () => handleUser();
txt.addEventListener("keydown", e => (e.key === "Enter") && handleUser());

async function handleUser() {
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

  /* ----- update flowchart ----- */
  const nodeId = uniq();
  graph += `${lastId} --> ${nodeId}\n`;
  graph += `${nodeId}["${escape(j.question)}"]\n`;
  lastId = nodeId;
  dia.removeAttribute("data-processed");
  dia.textContent = graph;
  mermaid.init(undefined, dia);

  append("bot", j.question);
  history.push({ role: "assistant", content: JSON.stringify(j) });
}

function append(role, text) {
  const div = document.createElement("div");
  div.innerHTML = `<strong>${role}:</strong> ${escape(text)}`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function uniq()  { return "n" + Math.random().toString(36).slice(2, 8); }
function escape(s){ return s.replace(/"/g, '\\"'); }
