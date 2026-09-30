"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; text: string };
type Artifact = { id: string; title: string; content: string; createdAt: string };

const greeting: Msg = { role: "assistant", text: "Hello. I’m Ricardo, your assistant from Riscasan AI. How can I help you today?" };

const starters = [
  "Help me write a professional email",
  "Translate something for me",
  "Help me understand a document",
  "Give me a business idea"
];

export default function Home() {
  const [view,setView]=useState<"chats"|"projects"|"code"|"artifacts">("chats");
  const [messages,setMessages]=useState<Msg[]>([greeting]);
  const [input,setInput]=useState("");
  const [busy,setBusy]=useState(false);
  const [listening,setListening]=useState(false);
  const [voiceMode,setVoiceMode]=useState(false);
  const [attachment,setAttachment]=useState<File|null>(null);
  const [projects,setProjects]=useState<string[]>([]);
  const [projectName,setProjectName]=useState("");
  const [codeDraft,setCodeDraft]=useState("");
  const [artifacts,setArtifacts]=useState<Artifact[]>([]);
  const fileRef=useRef<HTMLInputElement>(null);
  const recognitionRef=useRef<any>(null);
  const voiceModeRef=useRef(false);

  useEffect(()=>{
    const saved=localStorage.getItem("ricardo-ai-history");
    const savedProjects=localStorage.getItem("ricardo-ai-projects");
    const savedArtifacts=localStorage.getItem("ricardo-ai-artifacts");
    if(saved){
      try{ const parsed=JSON.parse(saved); if(Array.isArray(parsed)&&parsed.length) setMessages(parsed); }catch{}
    }
    if(savedProjects){
      try{ const parsed=JSON.parse(savedProjects); if(Array.isArray(parsed)) setProjects(parsed); }catch{}
    }
    if(savedArtifacts){
      try{ const parsed=JSON.parse(savedArtifacts); if(Array.isArray(parsed)) setArtifacts(parsed); }catch{}
    }
  },[]);

  useEffect(()=>{
    localStorage.setItem("ricardo-ai-history",JSON.stringify(messages.slice(-40)));
  },[messages]);

  useEffect(()=>{
    localStorage.setItem("ricardo-ai-projects",JSON.stringify(projects));
  },[projects]);

  useEffect(()=>{
    localStorage.setItem("ricardo-ai-artifacts",JSON.stringify(artifacts.slice(0,40)));
  },[artifacts]);

  function newChat(){
    setView("chats");
    setMessages([greeting]);
    setInput("");
    setAttachment(null);
    localStorage.removeItem("ricardo-ai-history");
  }

  function openChatWith(text:string){
    setView("chats");
    setInput(text);
  }

  function addProject(e?:FormEvent){
    e?.preventDefault();
    const name=projectName.trim();
    if(!name) return;
    setProjects(p=>[name,...p.filter(x=>x.toLowerCase()!==name.toLowerCase())]);
    setProjectName("");
  }

  function removeProject(name:string){
    setProjects(p=>p.filter(x=>x!==name));
  }

  function askAboutCode(){
    const code=codeDraft.trim();
    if(!code) return;
    openChatWith(`Please review this code, explain any problems, and help me improve it:\n\n${code}`);
  }

  function saveLastAnswer(){
    const last=[...messages].reverse().find(m=>m.role==="assistant" && m.text!==greeting.text);
    if(!last){
      alert("Ask Ricardo something first, then save the answer here.");
      return;
    }
    const item:Artifact={
      id:String(Date.now()),
      title:last.text.slice(0,55)+(last.text.length>55?"…":""),
      content:last.text,
      createdAt:new Date().toLocaleString()
    };
    setArtifacts(a=>[item,...a]);
  }

  function removeArtifact(id:string){
    setArtifacts(a=>a.filter(x=>x.id!==id));
  }

  function onFile(e:ChangeEvent<HTMLInputElement>){
    const f=e.target.files?.[0]||null;
    if(f && f.size>10*1024*1024){
      alert("Please choose a file smaller than 10 MB.");
      e.target.value="";
      return;
    }
    setAttachment(f);
  }

  function beginListening(){
    const w=window as any;
    const SpeechRecognition=w.SpeechRecognition||w.webkitSpeechRecognition;
    if(!SpeechRecognition){
      alert("Voice input is not supported in this browser yet.");
      voiceModeRef.current=false;
      setVoiceMode(false);
      return;
    }

    if(recognitionRef.current) return;

    const rec=new SpeechRecognition();
    recognitionRef.current=rec;
    rec.lang=navigator.language||"en-US";
    rec.interimResults=false;
    rec.continuous=false;

    rec.onstart=()=>setListening(true);
    rec.onresult=(event:any)=>{
      const text=event.results?.[0]?.[0]?.transcript||"";
      if(text) setInput(text);
    };
    rec.onerror=(event:any)=>{
      if(event?.error==="not-allowed" || event?.error==="service-not-allowed"){
        voiceModeRef.current=false;
        setVoiceMode(false);
      }
      setListening(false);
    };
    rec.onend=()=>{
      recognitionRef.current=null;
      setListening(false);
      if(voiceModeRef.current){
        window.setTimeout(()=>beginListening(),300);
      }
    };

    try{ rec.start(); }catch{}
  }

  function startVoice(){
    if(voiceModeRef.current){
      voiceModeRef.current=false;
      setVoiceMode(false);
      setListening(false);
      try{ recognitionRef.current?.abort(); }catch{}
      recognitionRef.current=null;
      return;
    }

    voiceModeRef.current=true;
    setVoiceMode(true);
    beginListening();
  }

  async function speak(text:string){
    try{
      const r=await fetch("/api/voice/speak",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({text})
      });
      if(!r.ok){
        throw new Error("TTS request failed");
      }
      const blob=await r.blob();
      const url=URL.createObjectURL(blob);
      const audio=new Audio(url);
      audio.onended=()=>URL.revokeObjectURL(url);
      await audio.play();
    }catch{
      if("speechSynthesis" in window){
        window.speechSynthesis.cancel();
        const utter=new SpeechSynthesisUtterance(text);
        utter.lang=navigator.language||"en-US";
        window.speechSynthesis.speak(utter);
      }
    }
  }

  async function send(e?:FormEvent){
    e?.preventDefault();
    const text=input.trim();
    if((!text&&!attachment)||busy) return;
    const shown=text || `Please analyze this file: ${attachment?.name}`;
    setMessages(m=>[...m,{role:"user",text:attachment?`${shown}\n📎 ${attachment.name}`:shown}]);
    setInput("");
    setBusy(true);
    try{
      const fd=new FormData();
      fd.append("message",shown);
      if(attachment) fd.append("file",attachment);
      const r=await fetch("/api/chat",{method:"POST",body:fd});
      const data=await r.json();
      setMessages(m=>[...m,{role:"assistant",text:data.text||data.error||"I couldn't answer that yet."}]);
      setAttachment(null);
      if(fileRef.current) fileRef.current.value="";
    }catch{
      setMessages(m=>[...m,{role:"assistant",text:"Connection issue. Please try again."}]);
    }finally{setBusy(false);}
  }

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="mark">R</div><div><strong>Riscasan AI</strong><span>Ask Ricardo</span></div></div>
      <button className="new" onClick={newChat}>＋ New chat</button>
      <nav className="sideNav" aria-label="Riscasan AI">
        <button className={"sideNavItem "+(view==="chats"?"active":"")} onClick={()=>setView("chats")}><span className="navIcon">◯</span><span>Chats</span></button>
        <button className={"sideNavItem "+(view==="projects"?"active":"")} onClick={()=>setView("projects")}><span className="navIcon">▰</span><span>Projects</span></button>
        <button className={"sideNavItem "+(view==="code"?"active":"")} onClick={()=>setView("code")}><span className="navIcon">&lt;/&gt;</span><span>Code</span></button>
        <button className={"sideNavItem "+(view==="artifacts"?"active":"")} onClick={()=>setView("artifacts")}><span className="navIcon">◫</span><span>Artifacts</span></button>
      </nav>
      <div className="sideBottom">Private by design · V1</div>
    </aside>

    <section className="main">
      <header><div><b>Riscasan AI</b><span className="dot">●</span><small>Online</small></div><button className="ghost" onClick={newChat}>New</button></header>

      <div className="conversation">
        {view==="chats" && messages.length===1 && <section className="welcome">
          <div className="welcomeGrid">
            <div className="welcomeCopy">
              <div className="eyebrow">RISCASAN AI</div>
              <h1>How can I help?</h1>
              <p>Work. Study. Business. Everyday life.<br/>One intelligent assistant, in your language.</p>
              <div className="languagePills"><span>English</span><span>Español</span><span>Français</span><span>Kreyòl</span></div>
              <div className="starters">{starters.map(s=><button key={s} onClick={()=>setInput(s)}>{s}</button>)}</div>
            </div>
            <div className="assistantVisual">
              <div className="visualGlow"></div>
              <img src="data:image/jpeg;base64,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" alt="Ask Ricardo — Riscasan AI" />
              <div className="visualBadge"><span className="dot">●</span> Ready when you are</div>
            </div>
          </div>
        </section>}

        {view==="chats" && <div className="messages">
          {messages.map((m,i)=><div key={i} className={"msgWrap "+m.role}>
            <div className={"msg "+m.role}>{m.text}</div>
            {m.role==="assistant"&&<button className="speak" onClick={()=>speak(m.text)} title="Read aloud">🔊</button>}
          </div>)}
          {busy&&<div className="msg assistant typing">Thinking…</div>}
        </div>}

        {view==="projects" && <section className="workspacePanel">
          <div className="workspaceHead"><div><span className="workspaceKicker">WORKSPACE</span><h2>Projects</h2><p>Keep long-running work organized and reopen it in chat anytime.</p></div></div>
          <form className="projectCreate" onSubmit={addProject}>
            <input value={projectName} onChange={e=>setProjectName(e.target.value)} placeholder="New project name" />
            <button>Create project</button>
          </form>
          <div className="projectGrid">
            {projects.length===0 && <div className="emptyState">No projects yet. Create your first one above.</div>}
            {projects.map(name=><div className="projectCard" key={name}>
              <div><strong>{name}</strong><span>Saved locally on this device</span></div>
              <div className="cardActions">
                <button onClick={()=>openChatWith(`We are working on my project "${name}". Help me continue it.`)}>Open in chat</button>
                <button className="dangerGhost" onClick={()=>removeProject(name)}>Remove</button>
              </div>
            </div>)}
          </div>
        </section>}

        {view==="code" && <section className="workspacePanel">
          <div className="workspaceHead"><div><span className="workspaceKicker">DEVELOPER</span><h2>Code</h2><p>Paste code here, then send it to Ricardo AI for review or debugging.</p></div></div>
          <textarea className="codeEditor" value={codeDraft} onChange={e=>setCodeDraft(e.target.value)} placeholder="// Paste code here..." spellCheck={false}/>
          <div className="workspaceActions">
            <button className="primaryAction" onClick={askAboutCode} disabled={!codeDraft.trim()}>Ask Ricardo about this code</button>
            <button className="secondaryAction" onClick={()=>setCodeDraft("")}>Clear</button>
          </div>
        </section>}

        {view==="artifacts" && <section className="workspacePanel">
          <div className="workspaceHead">
            <div><span className="workspaceKicker">LIBRARY</span><h2>Artifacts</h2><p>Save useful Ricardo AI answers so you can return to them later.</p></div>
            <button className="primaryAction" onClick={saveLastAnswer}>Save last answer</button>
          </div>
          <div className="artifactList">
            {artifacts.length===0 && <div className="emptyState">Nothing saved yet. After Ricardo answers, tap “Save last answer.”</div>}
            {artifacts.map(a=><article className="artifactCard" key={a.id}>
              <div className="artifactMeta"><strong>{a.title}</strong><span>{a.createdAt}</span></div>
              <p>{a.content}</p>
              <div className="cardActions">
                <button onClick={()=>openChatWith(`Continue working from this saved artifact:\n\n${a.content}`)}>Continue in chat</button>
                <button className="dangerGhost" onClick={()=>removeArtifact(a.id)}>Remove</button>
              </div>
            </article>)}
          </div>
        </section>}
      </div>

      {view==="chats" && attachment&&<div className="attachmentChip">📎 {attachment.name}<button onClick={()=>setAttachment(null)}>×</button></div>}

      {view==="chats" && <form className="composer" onSubmit={send}>
        <input ref={fileRef} className="hiddenFile" type="file" accept="image/*,.pdf,.txt,.md,.csv,.json" onChange={onFile}/>
        <button type="button" className="round" title="Attach image or document" onClick={()=>fileRef.current?.click()}>＋</button>
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder={voiceMode?(listening?"Voice Mode — listening…":"Voice Mode on…"):"Type or speak to Ricardo…"} />
        <button
          type="button"
          className={"round voiceMic "+(voiceMode?"activeMic":"")}
          title={voiceMode?(listening?"Voice Mode on — listening":"Voice Mode on"):"Turn on Voice Mode"}
          aria-label={voiceMode?"Turn off Voice Mode":"Turn on Voice Mode"}
          aria-pressed={voiceMode}
          onClick={startVoice}
        >{voiceMode?(listening?"●":"◉"):"🎙"}</button>
        <button className="send" disabled={busy}>↑</button>
      </form>}
      {view==="chats" && <div className="note">Riscasan AI can make mistakes. Check important information.</div>}
    </section>
  </main>
}
