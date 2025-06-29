/* flow.js – adds SpeechRecognition mic button */

import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";
mermaid.initialize({ startOnLoad:false, securityLevel:"loose", htmlLabels:true, theme:"default" });

const dia          = document.getElementById("diagram");
const diagramPane  = document.getElementById("diagramPane");

/* Conversation state */
let graphLines = ["flowchart TD"];
let lastId="start",  pendingNodeId=null, pendingQuestion="";
const history=[];

/* kick-off */
await backendRound();

/* ------------ voice recogniser singleton ------------- */
let recogniser=null;
function getRecogniser(){
  if(recogniser) return recogniser;
  const R = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!R) return null;
  recogniser = new R();
  recogniser.lang = "en-US";
  recogniser.interimResults = true;
  recogniser.maxAlternatives = 1;
  return recogniser;
}

/* ------------ backend round-trip ------------ */
async function backendRound(){
  const r = await fetch("/api/chat",{method:"POST",headers:{ "Content-Type":"application/json" },body:JSON.stringify({ history })});
  const j = await r.json();
  if(j.error){ alert(j.error); return; }

  if(j.end){ updateNode(pendingQuestion, j.summary); return; }

  pendingQuestion = j.question;
  addQuestionNode(j.question);
  history.push({ role:"assistant", content:JSON.stringify(j) });
  setTimeout(()=>attachControls(pendingNodeId),50);
}

/* ------------ node helpers ------------ */
function addQuestionNode(question){
  const nodeId = uniq();
  graphLines.push(`${lastId} --> ${nodeId}`);
  graphLines.push(`${nodeId}["${cardHTML(question, inputHTML(nodeId))}"]:::qna`);
  lastId=nodeId; pendingNodeId=nodeId; render();
}
function updateNode(q,a){
  graphLines[graphLines.length-1]=`${pendingNodeId}["${cardHTML(q, esc(a))}"]:::qna`;
  pendingNodeId=null; render();
}
function render(){
  dia.removeAttribute("data-processed");
  dia.textContent = graphLines.join("\n");
  mermaid.init(undefined, dia);
  diagramPane.scrollTo({top:diagramPane.scrollHeight,behavior:"smooth"});
}

/* ------------ attach textarea + mic + send ------------ */
function attachControls(nodeId){
  const ta  = document.getElementById("inp_"+nodeId);
  const btn = document.getElementById("btn_"+nodeId);
  const mic = document.getElementById("mic_"+nodeId);

  if(!ta||!btn) return;

  autoResize(ta); ta.focus();

  ta.addEventListener("input", ()=>autoResize(ta));
  ta.addEventListener("keydown", e=>{
      if(e.key==="Enter"){ e.preventDefault(); btn.click(); } });

  btn.onclick = ()=>{ const val = ta.value.trim(); if(val) sendAnswer(val); };

  /* voice support only if API present */
  const SR = getRecogniser();
  if(!SR){ mic.style.display="none"; return; }

  mic.onclick = ()=>{
    if(mic.classList.contains("recording")){
      SR.stop(); return;
    }
    ta.value=""; autoResize(ta);
    mic.classList.add("recording");
    SR.start();
    SR.onresult = e=>{
      const txt = Array.from(e.results).map(res=>res[0].transcript).join("");
      ta.value = txt; autoResize(ta);
      if(e.results[0].isFinal){
        mic.classList.remove("recording");
        SR.stop();
        const final = ta.value.trim();
        if(final) sendAnswer(final);
      }
    };
    SR.onerror = ()=>{ mic.classList.remove("recording"); SR.stop(); };
    SR.onend   = ()=> mic.classList.remove("recording");
  };
}

/* ------------ UI building ------------ */
function cardHTML(q,a){
  const qBg="#eef2ff", aBg="#fff7ed";
  return `
<table style="border-collapse:collapse;font-size:13px;border-radius:12px;overflow:hidden;min-width:180px;max-width:320px">
  <tr><td style="padding:8px 14px;background:${qBg};font-weight:600;">
      <div style="word-wrap:break-word;white-space:normal;">${esc(q)}</div></td></tr>
  <tr><td style="padding:0;background:${aBg};">
      <div style="word-wrap:break-word;white-space:normal;">${a}</div></td></tr>
</table>`;
}
function inputHTML(id){
  return `
<div style="display:flex;align-items:flex-start;padding:6px;gap:6px">
  <textarea id="inp_${id}" class="nodeInput" rows="1" placeholder="your answer…"></textarea>
  <button id="mic_${id}" class="micBtn" title="talk"><svg viewBox="0 0 24 24"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2zm-5 8v3m-4 0h8" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg></button>
  <button id="btn_${id}" class="nodeBtn">Send</button>
</div>`;
}

/* ------------ textarea auto-height ------------ */
function autoResize(el){ el.style.height="auto"; el.style.height= el.scrollHeight+"px"; }

/* ------------ send wrapper ------------ */
async function sendAnswer(answer){
  updateNode(pendingQuestion, answer);
  history.push({ role:"user", content:answer });
  await backendRound();
}

/* ------------ utils ------------ */
function uniq(){ return "n"+Math.random().toString(36).slice(2,8);}
function esc(s=""){ return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");}
