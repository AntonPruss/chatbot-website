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

/* Backend detection: fall back to mock when running on GitHub Pages
   or if /api/chat is unreachable. A ?mode=mock URL param also forces
   mock mode; ?mode=api forces an API attempt even on GitHub Pages. */
const params     = new URLSearchParams(location.search);
const forceMock  = params.get("mode") === "mock";
const forceApi   = params.get("mode") === "api";
const backendUrl = params.get("api") || "/api/chat";
let   useMock    = forceMock || location.hostname.endsWith("github.io") || location.protocol === "file:";

const modeBadge = document.getElementById("modeBadge");
setModeBadge(useMock ? "mock" : "detect");

/* get first question immediately */
await backendRound();

/* ---------------- helper: send answer ---------------- */
async function sendAnswer(answer){
  updateNode(pendingQuestion, answer);            // put answer in card
  history.push({ role:"user", content:answer });
  await backendRound();
}

function setModeBadge(mode){
  if(!modeBadge) return;
  const map = {
    detect:{ text:"Checking backend…", color:"#0ea5e9" },
    api:{ text:"Live API", color:"#16a34a" },
    mock:{ text:"Mock mode (no API)", color:"#eab308" },
    fallback:{ text:"Mock mode (API unreachable)", color:"#f97316" }
  };
  const { text, color } = map[mode] || map.detect;
  modeBadge.textContent = text;
  modeBadge.style.background = color;
}

/* ---------------- backend interaction ---------------- */
async function backendRound(){
  const j = await requestChat(history);
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

async function requestChat(history){
  if(useMock && !forceApi){
    setModeBadge("mock");
    return mockDialog(history);
  }

  try{
    const r = await fetch(backendUrl,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ history })
    });

    if(!r.ok) throw new Error(`Backend returned ${r.status}`);
    const data = await r.json();
    setModeBadge("api");
    return data;
  }catch(err){
    console.warn("Falling back to mock mode:", err);
    useMock = true;
    setModeBadge("fallback");
    return mockDialog(history);
  }
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
      `${pendingNodeId}["${cardHTML(question, answerHTML(answer))}"]:::qna`;
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
  const escapedQuestion = esc(q).replace(/\n/g, "<br>");
  return `
<div class="card">
  <div class="question">${escapedQuestion}</div>
  <div class="answer">${a}</div>
</div>`;
}

function answerHTML(text){
  return esc(text).replace(/\n/g, "<br>");
}

function inputHTML(id){
  return `
<div class="inputRow">
  <textarea id="inp_${id}" class="nodeInput" rows="1"
            placeholder="your answer…"></textarea>
  <button id="btn_${id}" class="nodeBtn">Send</button>
</div>`;
}

/* ---------------- mock dialog (browser-side) ------------------- */
function mockDialog(history){
  const lastAssistant = [...history].reverse()
    .find(msg => msg.role === "assistant" && looksLikeJSON(msg.content));
  const state = lastAssistant ? JSON.parse(lastAssistant.content) : {};

  const lastUser  = [...history].reverse().find(msg => msg.role === "user");
  const lastAnswer = lastUser?.content?.trim().toLowerCase() || "";

  const job    = state.job || history.find(msg => msg.role === "user")?.content || "that role";
  const reason = state.reason || lastAnswer || "a strong nudge";
  const cause  = state.cause || lastAnswer || reason;

  switch(String(state.stage || 0)){
    case "0":
      return { question:"What was the last job you worked at?", node: "mock0", stage:1 };
    case "1":
      return { question:`Looking back, did choosing ${job} feel like entirely your own decision?`, node:"mock1", stage:2, job };
    case "2":
      return { question:`What was the single biggest factor that pushed you toward ${job}?`, node:"mock2", stage:3, job };
    case "3": {
      const answeredNo = /\bno\b/.test(lastAnswer);
      if (answeredNo) {
        return { question:`Could you control ${reason}?`, node:"mock4", stage:4, job, reason, cause: reason };
      }
      return { question:`What do you think caused you to feel ${reason}?`, node:"mock35", stage:3.5, job, reason };
    }
    case "3.5":
      return { question:`Could you control ${cause}?`, node:"mock4", stage:4, job, reason, cause };
    case "4": {
      const answeredNo = /\bno\b/.test(lastAnswer);
      if (answeredNo) {
        return { end:true, stage:"done", summary:`You said your biggest factor for choosing ${job} was ${reason} and acknowledged you didn't control that feeling/cause, suggesting the choice wasn't absolutely free.` };
      }
      return { end:true, stage:"done", summary:`You felt you could have changed both your feeling and its cause, suggesting that choice might have been more free than determined.` };
    }
    default:
      return { end:true, stage:"done", summary: state.summary || "Session complete." };
  }
}

/* ---------------- utility ---------------- */
function uniq(){ return "n"+Math.random().toString(36).slice(2,8); }
function esc(s=""){ return s.replace(/&/g,"&amp;")
                           .replace(/</g,"&lt;")
                           .replace(/"/g,"&quot;"); }
function looksLikeJSON(text){ try{ JSON.parse(text); return true; }catch{ return false; } }
