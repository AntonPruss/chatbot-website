// flow.js  – FULL FILE

import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";
mermaid.initialize({ startOnLoad:false });

const log  = document.getElementById("log");
const txt  = document.getElementById("txt");
const send = document.getElementById("send");
const dia  = document.getElementById("diagram");

let graph = "flowchart TD\n";
let lastId = "start";
const history = [];

append("bot","Hi! What food did you pick for your last meal?");

send.onclick = async () => {
  if (!txt.value.trim()) return;
  append("user", txt.value);
  history.push({ role:"user", content: txt.value });
  txt.value = "";

  const r  = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history })
  });

  const j = await r.json();

  /* ===== if server sent an error, show it and stop ===== */
  if (j.error) {
    append("bot", `⚠️ SERVER ERROR: ${j.error}`);
    return;
  }

  /* ===== normal flow ===== */
  if (j.end) {
    append("bot", j.summary);
    return;
  }

  const nodeId = uniq();
  graph += `${lastId} --> ${nodeId}\n`;
  graph += `${nodeId}["${escape(j.question)}"]\n`;
  lastId = nodeId;
  dia.textContent = graph;
  mermaid.run({ nodes:[dia] });

  append("bot", j.question);
  history.push({ role:"assistant", content: JSON.stringify(j) });
};

function append(role,text){
  const d=document.createElement("div");
  d.innerHTML=`<strong>${role}:</strong> ${escape(text)}`;
  log.appendChild(d); log.scrollTop=log.scrollHeight;
}
function uniq(){ return "n"+Math.random().toString(36).slice(2,8); }
function escape(s){return s.replace(/"/g,'\\"');}
