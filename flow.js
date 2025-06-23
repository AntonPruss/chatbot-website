import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";

mermaid.initialize({
  startOnLoad:false,
  securityLevel:"loose",
  htmlLabels:true,
  theme:"default"
});

const dia = document.getElementById("diagram");

/* ---------- chat state ---------- */
let graphLines      = ["flowchart TD"];
let lastId          = "start";
let pendingNodeId   = null;          // node waiting for answer
let pendingQuestion = "";
const history       = [];

/* first backend question */
awaitQuestion();                     // auto-start

/* ------------- main functions ------------- */

function attachInput(nodeId){
  const inp = document.getElementById("inp_"+nodeId);
  if(!inp) return;
  inp.focus();
  inp.addEventListener("keydown", ev=>{
    if(ev.key==="Enter"){
      ev.preventDefault();
      const answer = inp.value.trim();
      if(!answer) return;
      submitAnswer(answer);
    }
  });
}

async function submitAnswer(answer){
  /* replace blank row with answer text */
  updateLastNode(pendingQuestion, answer);

  history.push({ role:"user", content:answer });
  await awaitQuestion();
}

async function awaitQuestion(){
  const r = await fetch("/api/chat",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ history })
  });
  const j = await r.json();

  if(j.error){ alert(j.error); return; }

  if(j.end){
    /* put summary into final answer row */
    updateLastNode(pendingQuestion, j.summary);
    return;
  }

  pendingQuestion = j.question;
  addQuestionNode(j.question);
  history.push({ role:"assistant", content:JSON.stringify(j) });
  attachInput(pendingNodeId);
}

/* ------------- diagram helpers ------------- */

function addQuestionNode(question){
  const nodeId = uniq();

  /* arrow from previous */
  graphLines.push(`${lastId} --> ${nodeId}`);

  /* node with input row */
  graphLines.push(`${nodeId}["${htmlTable(question,"<input id='inp_${nodeId}' class='nodeInput' placeholder='your answer…'>")}"]:::qna`);
  lastId        = nodeId;
  pendingNodeId = nodeId;

  render();
}

function updateLastNode(question, answer){
  const html = htmlTable(question, esc(answer));
  graphLines[graphLines.length-1] = `${pendingNodeId}["${html}"]:::qna`;
  pendingNodeId = null;
  render();
}

function render(){
  dia.removeAttribute("data-processed");
  dia.textContent = graphLines.join("\n");
  mermaid.init(undefined, dia);
}

function htmlTable(q, a){
  const qBg = "#eef2ff";
  const aBg = "#fff7ed";
  return `
<table style='border-collapse:collapse;font-size:13px;border-radius:12px;overflow:hidden'>
  <tr><td style="padding:8px 14px;background:${qBg};font-weight:600">${esc(q)}</td></tr>
  <tr><td style="padding:0;background:${aBg};">${a}</td></tr>
</table>`;
}

/* ------------- utils ------------- */
function uniq(){ return "n"+Math.random().toString(36).slice(2,8); }
function esc(s=""){ return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;"); }
