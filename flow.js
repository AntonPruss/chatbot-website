/* flow.js  – automatic speech input + speech-synthesis output */

import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";
mermaid.initialize({ startOnLoad:false, securityLevel:"loose", htmlLabels:true, theme:"default" });

const dia         = document.getElementById("diagram");
const diagramPane = document.getElementById("diagramPane");

/* ------------------------------------------------------------------ */
/*  SECTION 1 : simple speech-synthesis helper                         */
/* ------------------------------------------------------------------ */
function speak(text){
  try{
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang  = "en-US";
    window.speechSynthesis.cancel();     // stop any previous speech
    window.speechSynthesis.speak(utt);
  }catch{ /* silently ignore if unsupported */ }
}

/* ------------------------------------------------------------------ */
/*  SECTION 2 : singleton speech-recogniser with silence timer        */
/* ------------------------------------------------------------------ */
let recogniser;
let silenceTimer;
function getRecognizer(){
  if(recogniser) return recogniser;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  recogniser = new SR();
  recogniser.lang            = "en-US";
  recogniser.interimResults  = true;
  recogniser.continuous      = true;
  return recogniser;
}
/* start listening and stream interim text into textarea */
function listenInto(textarea, onFinal){
  const SR = getRecognizer();
  if(!SR){ return; }

  // reset textarea + style
  textarea.value=""; autoResize(textarea);
  textarea.classList.add("listening");

  SR.start();
  SR.onresult = e=>{
    clearTimeout(silenceTimer);
    const txt = Array.from(e.results).map(r=>r[0].transcript).join("");
    textarea.value = txt; autoResize(textarea);

    // restart silence timer – 1s
    silenceTimer = setTimeout(()=>stopAndFinalize(),1000);

    function stopAndFinalize(){
      SR.stop();
      textarea.classList.remove("listening");
      const final = textarea.value.trim();
      if(final) onFinal(final);
    }
  };
  SR.onerror = ()=>{ SR.stop(); textarea.classList.remove("listening"); };
  SR.onend   = ()=> textarea.classList.remove("listening"); // safety
}

/* ------------------------------------------------------------------ */
/*  SECTION 3 : chat / diagram logic                                  */
/* ------------------------------------------------------------------ */
let graphLines = ["flowchart TD"];
let lastId="start", pendingNodeId=null, pendingQuestion="";
const history=[];

/* kick off */
await backendRound();

/* ---------------- backend interaction ---------------- */
async function backendRound(){
  const r = await fetch("/api/chat",{method:"POST",headers:{ "Content-Type":"application/json" },body:JSON.stringify({ history })});
  const j = await r.json();
  if(j.error){ alert(j.error); return; }

  if(j.end){ updateNode(pendingQuestion, j.summary); speak(j.summary); return; }

  pendingQuestion = j.question;
  addQuestionNode(j.question);
  speak(j.question);
  history.push({ role:"assistant", content:JSON.stringify(j) });

  setTimeout(()=>attachControls(pendingNodeId),50);
}

/* ---------------- render helpers ---------------- */
function addQuestionNode(question){
  const nodeId = uniq();
  graphLines.push(`${lastId} --> ${nodeId}`);
  graphLines.push(`${nodeId}["${cardHTML(question, inputHTML(nodeId))}"]:::qna`);
  lastId=nodeId; pendingNodeId=nodeId;
  render();
}
function updateNode(q,a){
  graphLines[graphLines.length-1] = `${pendingNodeId}["${cardHTML(q, esc(a))}"]:::qna`;
  pendingNodeId=null; render();
}
function render(){
  dia.removeAttribute("data-processed");
  dia.textContent = graphLines.join("\n");
  mermaid.init(undefined, dia);
  diagramPane.scrollTo({top:diagramPane.scrollHeight, behavior:"smooth"});
}

/* ---------------- UI building ---------------- */
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
  <textarea id="inp_${id}" class="nodeInput" rows="1" placeholder="answer by voice or typing…"></textarea>
  <button id="btn_${id}" class="nodeBtn">Send</button>
</div>`;
}

/* ---------------- attach controls to new node ---------------- */
function attachControls(nodeId){
  const ta  = document.getElementById("inp_"+nodeId);
  const btn = document.getElementById("btn_"+nodeId);
  if(!ta||!btn) return;

  autoResize(ta); ta.focus();

  // auto-start microphone
  listenInto(ta, sendAnswer);

  ta.addEventListener("input", ()=>autoResize(ta));
  ta.addEventListener("keydown", e=>{
    if(e.key==="Enter"){ e.preventDefault(); btn.click(); }
  });
  btn.onclick = ()=>{
    const val = ta.value.trim();
    if(val) sendAnswer(val);
  };
}

/* auto-height */
function autoResize(el){ el.style.height="auto"; el.style.height= el.scrollHeight+"px"; }

/* send & recurse */
async function sendAnswer(answer){
  updateNode(pendingQuestion, answer);
  history.push({ role:"user", content:answer });
  await backendRound();
}

/* utils */
function uniq(){ return "n"+Math.random().toString(36).slice(2,8); }
function esc(s=""){ return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,'&quot;'); }
