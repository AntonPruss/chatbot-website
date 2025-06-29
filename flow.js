/********************************************************************
 *  No-Free-Will chatbot front-end
 *  • Automatic SpeechRecognition with animated wave indicator
 *  • SpeechSynthesis for bot messages (recogniser muted while talking)
 *  • Auto-restart recogniser if the user hasn’t answered yet
 ********************************************************************/

import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs";
mermaid.initialize({ startOnLoad:false, htmlLabels:true, securityLevel:"loose", theme:"default" });

const dia   = document.getElementById("diagram");
const pane  = document.getElementById("diagramPane");

/* -------------------------------------------------- */
/*   State                                            */
/* -------------------------------------------------- */
let lines      = ["flowchart TD"];
let lastId     = "start";
let pendingId  = null;        // node awaiting answer
let pendingQ   = "";
const history  = [];

/* Speech globals */
const SRclass = window.SpeechRecognition || window.webkitSpeechRecognition;
const canListen = !!SRclass && !!window.speechSynthesis;
let rec = canListen ? new SRclass() : null;
if(rec){
  rec.lang="en-US"; rec.interimResults=true; rec.continuous=true;
}

/* Kick-off */
await backendRound();

/* -------------------------------------------------- */
/*   Backend round-trip                               */
/* -------------------------------------------------- */
async function backendRound(){
  const r = await fetch("/api/chat",{
    method:"POST", headers:{ "Content-Type":"application/json"},
    body:JSON.stringify({ history })
  });
  const j = await r.json();
  if(j.error){alert(j.error);return;}

  if(j.end){
    finalizeNode(j.summary);
    speak(j.summary, ()=>{});            // no restart needed
    return;
  }

  pendingQ = j.question;
  addNode(j.question);
  speak(j.question, ()=>startListening());     // restart listening after bot speaks
  history.push({ role:"assistant", content:JSON.stringify(j) });
  setTimeout(()=>attachControls(pendingId),30);
}

/* -------------------------------------------------- */
/*   Diagram helpers                                  */
/* -------------------------------------------------- */
function addNode(question){
  const id = uniq();
  lines.push(`${lastId} --> ${id}`);
  lines.push(`${id}["${cardHTML(question, inputHTML(id))}"]:::qna`);
  lastId = id; pendingId = id;
  render();
}
function finalizeNode(answer){
  lines[lines.length-1] = `${pendingId}["${cardHTML(pendingQ, esc(answer))}"]:::qna`;
  pendingId = null; render();
}
function render(){
  dia.removeAttribute("data-processed");
  dia.textContent = lines.join("\n");
  mermaid.init(undefined, dia);
  pane.scrollTo({ top:pane.scrollHeight, behavior:"smooth" });
}

/* -------------------------------------------------- */
/*   Card / input HTML                                */
/* -------------------------------------------------- */
function cardHTML(q,a){
  const qBg="#eef2ff", aBg="#fff7ed";
  return `
<table style="border-collapse:collapse;font-size:13px;border-radius:12px;overflow:hidden;min-width:200px;max-width:360px">
  <tr><td style="padding:8px 14px;background:${qBg};font-weight:600">
        <div style="word-wrap:break-word">${esc(q)}</div></td></tr>
  <tr><td style="padding:0;background:${aBg}">
        <div style="word-wrap:break-word">${a}</div></td></tr>
</table>`;
}
function inputHTML(id){
  /* wave + textarea + send (flex row) */
  return `
<div style="display:flex;align-items:flex-end;padding:6px;gap:8px">
  <div id="wave_${id}" class="wave" style="display:none">
    <div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
  </div>
  <textarea id="inp_${id}" class="nodeInput" rows="1"
            placeholder="answer by voice or typing…"></textarea>
  <button id="btn_${id}" class="nodeBtn">Send</button>
</div>`;
}

/* -------------------------------------------------- */
/*   Attach events to new answer row                  */
/* -------------------------------------------------- */
function attachControls(id){
  const ta   = document.getElementById("inp_"+id);
  const btn  = document.getElementById("btn_"+id);
  const wave = document.getElementById("wave_"+id);
  if(!ta||!btn) return;

  autoGrow(ta); ta.focus();
  ta.addEventListener("input", ()=>autoGrow(ta));
  ta.addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.preventDefault(); btn.click(); }});
  btn.onclick = ()=>{ const v=ta.value.trim(); if(v) submit(v); };

  if(canListen) { beginListening(ta,wave); }
}

/* -------------------------------------------------- */
/*   Speech: speak bot message, then callback         */
/* -------------------------------------------------- */
function speak(text, cb){
  if(!window.speechSynthesis){ cb(); return; }
  if(rec && rec.recognizing) rec.abort();      // ensure recogniser off
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.onend = ()=>cb();
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

/* -------------------------------------------------- */
/*   SpeechRecognition control                        */
/* -------------------------------------------------- */
function beginListening(textarea, wave){
  if(!rec) return;
  textarea.classList.add("listening"); wave.style.display="flex";
  let silenceTimer;

  rec.onresult = e=>{
    clearTimeout(silenceTimer);
    textarea.value = Array.from(e.results).map(r=>r[0].transcript).join("");
    autoGrow(textarea);

    // restart 1.2-s silence timer
    silenceTimer = setTimeout(()=>stopAndMaybeSubmit(),1200);
  };
  rec.onerror = ()=>stop(false);
  rec.onend   = ()=>{          // auto-restart if user hasn’t answered yet
    if(textarea.value.trim()===""){ rec.start(); }
    else stop(false);
  };

  rec.start();

  function stop(send){
    textarea.classList.remove("listening"); wave.style.display="none";
    clearTimeout(silenceTimer);
    try{ rec.stop(); }catch{}
    if(send){ const v=textarea.value.trim(); if(v) submit(v); }
  }
  function stopAndMaybeSubmit(){ stop(true); }
}

/* -------------------------------------------------- */
/*   Submit answer, recurse                           */
/* -------------------------------------------------- */
async function submit(ans){
  finalizeNode(ans);
  history.push({ role:"user", content:ans });
  await backendRound();
}

/* -------------------------------------------------- */
/*   Utilities                                        */
/* -------------------------------------------------- */
function uniq(){ return "n"+Math.random().toString(36).slice(2,8); }
function esc(s=""){ return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,'&quot;'); }
function autoGrow(el){ el.style.height="auto"; el.style.height= el.scrollHeight+"px"; }
