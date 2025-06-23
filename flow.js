/* flow.js – textarea + send button in each card */

import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";

mermaid.initialize({
  startOnLoad:false,
  securityLevel:"loose",
  htmlLabels:true,
  theme:"default"
});

const dia = document.getElementById("diagram");

/* ---------- state ---------- */
let graphLines      = ["flowchart TD"];
let lastId          = "start";
let pendingNodeId   = null;
let pendingQuestion = "";
const history       = [];

/* get first question */
awaitQuestion();

/* main send routine */
async function sendAnswer(answer){
  updateLastNode(pendingQuestion, answer);
  history.push({ role:"user", content:answer });
  await awaitQuestion();
}

/* backend round-trip */
async function awaitQuestion(){
  const r = await fetch("/api/chat",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ history })
  });
  const j = await r.json();

  if(j.error){ alert(j.error); return; }

  if(j.end){
    updateLastNode(pendingQuestion, j.summary);
    return;
  }

  pendingQuestion = j.question;
  addQuestionNode(j.question);
  history.push({ role:"assistant", content:JSON.stringify(j) });

  // after render, attach listeners
  setTimeout(()=>attachControls(pendingNodeId),50);
}

/* attach Enter & button for node */
function attachControls(nodeId){
  const ta  = document.getElementById("inp_"+nodeId);
  const btn = document.getElementById("btn_"+nodeId);
  if(!ta||!btn) return;

  autoResize(ta);
  ta.focus();

  ta.addEventListener("input", ()=>autoResize(ta));
  ta.addEventListener("keydown", e=>{
    if(e.key==="Enter" && !e.shiftKey){
      e.preventDefault();
      btn.click();
    }
  });
  btn.onclick = ()=> {
    const val = ta.value.trim();
    if(val) sendAnswer(val);
  };
}

/* auto height grow */
function autoResize(el){
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

/* build new node with textarea+button */
function addQuestionNode(question){
  const nodeId = uniq();
  graphLines.push(`${lastId} --> ${nodeId}`);
  graphLines.push(`${nodeId}["${htmlTable(question, inputHTML(nodeId))}"]:::qna`);
  lastId        = nodeId;
  pendingNodeId = nodeId;
  render();
}

/* replace node with fixed answer */
function updateLastNode(question, answer){
  const html = htmlTable(question, esc(answer));
  graphLines[graphLines.length-1] = `${pendingNodeId}["${html}"]:::qna`;
  pendingNodeId = null;
  render();
}

/* render Mermaid */
function render(){
  dia.removeAttribute("data-processed");
  dia.textContent = graphLines.join("\n");
  mermaid.init(undefined, dia);
}

/* ---------- HTML builders ---------- */
function htmlTable(q, a){
  const qBg = "#eef2ff";
  const aBg = "#fff7ed";
  return `
<table style='border-collapse:collapse;font-size:13px;border-radius:12px;overflow:hidden'>
  <tr><td style="padding:8px 14px;background:${qBg};font-weight:600">${esc(q)}</td></tr>
  <tr><td style="padding:0;background:${aBg};">${a}</td></tr>
</table>`;
}

function inputHTML(id){
  return `
<div style="display:flex;align-items:flex-start;padding:6px">
  <textarea id="inp_${id}" class="nodeInput" rows="1"
    placeholder="your answer…"></textarea>
  <button id="btn_${id}" class="nodeBtn">Send</button>
</div>`;
}

/* ---------- utils ---------- */
function uniq(){ return "n"+Math.random().toString(36).slice(2,8); }
function esc(s=""){ return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;"); }
