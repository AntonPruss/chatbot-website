/* flow.js – centred diagram, fluid card width, no stray nodes, smooth scroll */

import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";

mermaid.initialize({
  startOnLoad:false,
  securityLevel:"loose",
  htmlLabels:true,
  theme:"default"
});

const dia          = document.getElementById("diagram");
const diagramPane  = document.getElementById("diagramPane");

/* ---------- conversation state ---------- */
let graphLines      = ["flowchart TD"];
let lastId          = "start";
let pendingNodeId   = null;
let pendingQuestion = "";
const history       = [];

/* get first question immediately */
await backendRound();

/* ---------------- helper: send answer ---------------- */
async function sendAnswer(answer){
  updateNode(pendingQuestion, answer);            // put answer in card
  history.push({ role:"user", content:answer });
  await backendRound();
}

/* ---------------- backend interaction ---------------- */
async function backendRound(){
  const r = await fetch("/api/chat",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ history })
  });
  const j = await r.json();
  if(j.error){ alert(j.error); return; }

  if(j.end){
    updateNode(pendingQuestion, j.summary);       // summary in same card
    return;
  }

  pendingQuestion = j.question;
  addQuestionNode(j.question);
  history.push({ role:"assistant", content:JSON.stringify(j) });

  setTimeout(()=>attachControls(pendingNodeId),50);
}

/* ---------------- attach textarea & button ------------- */
function attachControls(nodeId){
  const ta  = document.getElementById("inp_"+nodeId);
  const btn = document.getElementById("btn_"+nodeId);
  if(!ta||!btn) return;

  autoResize(ta);
  ta.focus();

  ta.addEventListener("input", ()=>autoResize(ta));

  ta.addEventListener("keydown", e=>{
    if(e.key==="Enter"){                    // Enter sends
      e.preventDefault();
      btn.click();
    }
  });
  btn.onclick = ()=>{
    const val = ta.value.trim();
    if(val) sendAnswer(val);
  };
}

/* auto-height textareas */
function autoResize(el){
  el.style.height="auto";
  el.style.height= el.scrollHeight+"px";
}

/* ---------------- Mermaid node helpers ---------------- */
function addQuestionNode(question){
  const nodeId = uniq();
  graphLines.push(`${lastId} --> ${nodeId}`);
  graphLines.push(
    `${nodeId}["${cardHTML(question, inputHTML(nodeId))}"]:::qna`
  );
  lastId        = nodeId;
  pendingNodeId = nodeId;
  render();
}

function updateNode(question, answer){
  /* Replace the CURRENT node definition (last line) */
  if(pendingNodeId){
    graphLines[graphLines.length-1] =
      `${pendingNodeId}["${cardHTML(question, esc(answer))}"]:::qna`;
    pendingNodeId = null;
    render();
  }
}

/* render + auto scroll */
function render(){
  dia.removeAttribute("data-processed");
  dia.textContent = graphLines.join("\n");
  mermaid.init(undefined, dia);
  diagramPane.scrollTo({ top: diagramPane.scrollHeight, behavior:"smooth" });
}

/* ---------------- card & input HTML ------------------- */
function cardHTML(q, a){
  const qBg="#eef2ff", aBg="#fff7ed";
  return `
<table style="border-collapse:collapse;font-size:13px;border-radius:12px;overflow:hidden;min-width:180px;max-width:320px">
  <tr><td style="padding:8px 14px;background:${qBg};font-weight:600;">
        <div style="word-wrap:break-word;white-space:normal;">${esc(q)}</div>
      </td></tr>
  <tr><td style="padding:0;background:${aBg};">
        <div style="word-wrap:break-word;white-space:normal;">${a}</div>
      </td></tr>
</table>`;
}

function inputHTML(id){
  return `
<div style="display:flex;align-items:flex-start;padding:6px;gap:6px">
  <textarea id="inp_${id}" class="nodeInput" rows="1"
            placeholder="your answer…"></textarea>
  <button id="btn_${id}" class="nodeBtn">Send</button>
</div>`;
}

/* ---------------- utility ---------------- */
function uniq(){ return "n"+Math.random().toString(36).slice(2,8); }
function esc(s=""){ return s.replace(/&/g,"&amp;")
                           .replace(/</g,"&lt;")
                           .replace(/"/g,"&quot;"); }
