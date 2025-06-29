/* flow.js – auto-listen, live wave, colour cues */

import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";
mermaid.initialize({ startOnLoad:false, securityLevel:"loose", htmlLabels:true, theme:"default" });

const dia         = document.getElementById("diagram");
const diagramPane = document.getElementById("diagramPane");

/* ---------- speech-synthesis (bot voice) ---------- */
function speak(text){
  try{ const u=new SpeechSynthesisUtterance(text); u.lang="en-US";
       window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); }catch{}
}

/* ---------- speech-recognition singleton ---------- */
let rec; let silenceTimer;
function getRec(){
  if(rec) return rec;
  const R=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!R) return null;
  rec=new R(); rec.lang="en-US"; rec.interimResults=true; rec.continuous=true;
  return rec;
}

/* ---------- conversation state ---------- */
let lines=["flowchart TD"];
let lastId="start", pendingId=null, pendingQ="";
const history=[];

/* kick-off */
await round();

/* ---------- backend round ------------ */
async function round(){
  const r=await fetch("/api/chat",{method:"POST",headers:{ "Content-Type":"application/json"},body:JSON.stringify({history})});
  const j=await r.json();
  if(j.error){alert(j.error);return;}

  if(j.end){ finishNode(j.summary); speak(j.summary); return;}

  pendingQ=j.question;
  addNode(j.question);
  speak(j.question);
  history.push({role:"assistant",content:JSON.stringify(j)});
  setTimeout(()=>attachControls(pendingId),50);
}

/* ---------- diagram helpers ---------- */
function addNode(question){
  const id=uniq();
  lines.push(`${lastId} --> ${id}`);
  lines.push(`${id}["${card(question,inputHTML(id))}"]:::qna`);
  lastId=id; pendingId=id; render();
}
function finishNode(answer){
  lines[lines.length-1]=`${pendingId}["${card(pendingQ,esc(answer))}"]:::qna`;
  pendingId=null; render();
}
function render(){
  dia.removeAttribute("data-processed");
  dia.textContent=lines.join("\n");
  mermaid.init(undefined,dia);
  diagramPane.scrollTo({top:diagramPane.scrollHeight,behavior:"smooth"});
}

/* ---------- build card + input HTML ---------- */
function card(q,a){
  const qBg="#eef2ff", aBg="#fff7ed";
  return `
<table style="border-collapse:collapse;font-size:13px;border-radius:12px;overflow:hidden;min-width:180px;max-width:340px">
  <tr><td style="padding:8px 14px;background:${qBg};font-weight:600;">
      <div style="word-wrap:break-word">${esc(q)}</div></td></tr>
  <tr><td style="padding:0;background:${aBg};">
      <div style="word-wrap:break-word">${a}</div></td></tr>
</table>`;
}
function inputHTML(id){
  return `
<div style="display:flex;align-items:flex-start;padding:6px;gap:6px">
  <textarea id="inp_${id}" class="nodeInput" rows="1"
            placeholder="answer by voice or typing…"></textarea>
  <div id="wave_${id}" class="wave" style="display:none">
    <div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
  </div>
  <button id="btn_${id}" class="nodeBtn">Send</button>
</div>`;
}

/* ---------- attach events to textarea & send ---------- */
function attachControls(id){
  const ta=document.getElementById("inp_"+id);
  const btn=document.getElementById("btn_"+id);
  const wave=document.getElementById("wave_"+id);
  if(!ta||!btn) return;

  autoSize(ta); ta.focus();
  ta.addEventListener("input",()=>autoSize(ta));
  ta.addEventListener("keydown",e=>{ if(e.key==="Enter"){e.preventDefault();btn.click();}} );

  btn.onclick=()=>{ const val=ta.value.trim(); if(val) submit(val); };

  /* auto-start recognition if supported */
  const SR=getRec();
  if(!SR) return;

  ta.classList.add("listening"); wave.style.display="flex";
  SR.start(); SR.onresult=e=>{
    clearTimeout(silenceTimer);
    ta.value=Array.from(e.results).map(r=>r[0].transcript).join("");
    autoSize(ta);
    silenceTimer=setTimeout(stopAndSend,1000);           // 1 s silence
  };
  SR.onerror = ()=>stopRec();
  SR.onend   = ()=>stopRec();

  function stopRec(){ ta.classList.remove("listening"); wave.style.display="none"; }
  function stopAndSend(){
    SR.stop(); stopRec();
    const fin=ta.value.trim(); if(fin) submit(fin);
  }
}

/* ---------- submit wrapper ---------- */
function submit(answer){
  finishNode(answer);
  history.push({role:"user",content:answer});
  round();
}

/* ---------- utils ---------- */
function autoSize(el){ el.style.height="auto"; el.style.height=el.scrollHeight+"px";}
function uniq(){return"n"+Math.random().toString(36).slice(2,8);}
function esc(s=""){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,'&quot;');}
