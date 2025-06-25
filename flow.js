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

/* ----- first question ----- */
awaitQuestion();

/* ================= main helpers ================= */

async function sendAnswer(answer){
  updateLastNode(pendingQuestion, answer);
  history.push({ role:"user", content:answer });
  await awaitQuestion();
}

async function awaitQuestion(){
  const r = await fetch("/api/chat",{
    method:"POST", headers:{ "Content-Type":"application/json" },
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

  setTimeout(()=>attachControls(pendingNodeId),50);
}

/* ----- node creation / updating ----- */

function addQuestionNode(question){
  const nodeId = uniq();
  graphLines.push(`${lastId} --> ${nodeId}`);
  graphLines.push(`${nodeId}["${cardHTML(question, inputHTML(nodeId))}"]:::qna`);
  lastId        = nodeId;
  pendingNodeId = nodeId;
  render();
}

function updateLastNode(question, answer){
  graphLines[graphLines.length-1] =
    `${pendingNodeId}["${cardHTML(question, esc(answer))}"]:::qna`;
  pendingNodeId = null;
  render();
}

function render(){
  dia.removeAttribute("data-processed");
  dia.textContent = graphLines.join("\n");
  mermaid.init(undefined, dia);
}

/* ----- attach textarea + button events ----- */

function attachControls(nodeId){
  const ta  = document.getElementById("inp_"+nodeId);
  const btn = document.getElementById("btn_"+nodeId);
  if(!ta||!btn) return;

  autoResize(ta);
  ta.focus();

  ta.addEventListener("input", ()=>autoResize(ta));

  ta.addEventListener("keydown", e=>{
    if(e.key==="Enter"){               // Enter always sends
      e.preventDefault();
      btn.click();
    }
  });
  btn.onclick = ()=>{
    const val = ta.value.trim();
    if(val) sendAnswer(val);
  };
}

/* auto-growing textarea */
function autoResize(el){
  el.style.height="auto";
  el.style.height= el.scrollHeight+"px";
}

/* ---------- HTML builders ---------- */

function cardHTML(q, a){
  const qBg="#eef2ff", aBg="#fff7ed";
  return `
<table style="border-collapse:collapse;font-size:13px;border-radius:12px;overflow:hidden">
  <tr><td style="padding:8px 14px;background:${qBg};font-weight:600">${esc(q)}</td></tr>
  <tr><td style="padding:0;background:${aBg};">${a}</td></tr>
</table>`;
}

function inputHTML(id){
  /* flex row so textarea wraps before hitting the button */
  return `
<div style="display:flex;align-items:flex-start;padding:6px;gap:6px">
  <textarea id="inp_${id}" class="nodeInput" rows="1"
            placeholder="your answer…"
            style="flex:1;min-width:0;border:none;background:#fff7ed;padding:8px 12px;font-size:13px;line-height:1.35;outline:none;resize:none;"></textarea>
  <button id="btn_${id}" class="nodeBtn"
          style="border:none;background:#6366f1;color:#fff;padding:6px 14px;font-size:12px;border-radius:6px;cursor:pointer;">
    Send
  </button>
</div>`;
}

/* ---------- utils ---------- */
function uniq(){ return "n"+Math.random().toString(36).slice(2,8); }
function esc(s=""){ return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;"); }
