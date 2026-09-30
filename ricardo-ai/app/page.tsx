"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; text: string };

const greeting: Msg = {role:"assistant",text:"Hello. I’m Ricardo AI. How can I help you today?"};

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
  const [attachment,setAttachment]=useState<File|null>(null);
  const fileRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{
    const saved=localStorage.getItem("ricardo-ai-history");
    if(saved){
      try{ const parsed=JSON.parse(saved); if(Array.isArray(parsed)&&parsed.length) setMessages(parsed); }catch{}
    }
  },[]);

  useEffect(()=>{
    localStorage.setItem("ricardo-ai-history",JSON.stringify(messages.slice(-40)));
  },[messages]);

  function newChat(){
    setView("chats");
    setMessages([greeting]);
    setInput("");
    setAttachment(null);
    localStorage.removeItem("ricardo-ai-history");
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

  function startVoice(){
    const w=window as any;
    const SpeechRecognition=w.SpeechRecognition||w.webkitSpeechRecognition;
    if(!SpeechRecognition){
      alert("Voice input is not supported in this browser yet.");
      return;
    }
    const rec=new SpeechRecognition();
    rec.lang=navigator.language||"en-US";
    rec.interimResults=false;
    rec.continuous=false;
    setListening(true);
    rec.onresult=(event:any)=>{
      const text=event.results?.[0]?.[0]?.transcript||"";
      setInput(text);
    };
    rec.onerror=()=>setListening(false);
    rec.onend=()=>setListening(false);
    rec.start();
  }

  function speak(text:string){
    if(!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter=new SpeechSynthesisUtterance(text);
    utter.lang=navigator.language||"en-US";
    window.speechSynthesis.speak(utter);
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
      <div className="brand"><div className="mark">R</div><div><strong>Ricardo AI</strong><span>by Riscasan</span></div></div>
      <button className="new" onClick={newChat}>＋ New chat</button>
      <nav className="sideNav" aria-label="Ricardo AI">
        <button className={"sideNavItem "+(view==="chats"?"active":"")} onClick={()=>setView("chats")}>
          <span className="navIcon">◯</span><span>Chats</span>
        </button>
        <button className={"sideNavItem "+(view==="projects"?"active":"")} onClick={()=>setView("projects")}>
          <span className="navIcon">▰</span><span>Projects</span>
        </button>
        <button className={"sideNavItem "+(view==="code"?"active":"")} onClick={()=>setView("code")}>
          <span className="navIcon">&lt;/&gt;</span><span>Code</span>
        </button>
        <button className={"sideNavItem "+(view==="artifacts"?"active":"")} onClick={()=>setView("artifacts")}>
          <span className="navIcon">◫</span><span>Artifacts</span>
        </button>
      </nav>
      <div className="sideBottom">Private by design · V1</div>
    </aside>

    <section className="main">
      <header><div><b>Ricardo AI</b><span className="dot">●</span><small>Online</small></div><button className="ghost" onClick={newChat}>New</button></header>

      <div className="conversation">
        {view==="chats" && messages.length===1 && <section className="welcome">
          <div className="welcomeGrid">
            <div className="welcomeCopy">
              <div className="eyebrow">RICARDO AI · BY RISCASAN</div>
              <h1>How can I help?</h1>
              <p>Work. Study. Business. Everyday life.<br/>One intelligent assistant, in your language.</p>
              <div className="languagePills">
                <span>English</span><span>Español</span><span>Français</span><span>Kreyòl</span>
              </div>
              <div className="starters">{starters.map(s=><button key={s} onClick={()=>setInput(s)}>{s}</button>)}</div>
            </div>
            <div className="assistantVisual">
              <div className="visualGlow"></div>
              <img src="/ricardo-ai-man.svg" alt="Ricardo AI assistant" />
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

        {view!=="chats" && <section className="toolPanel">
          <div className="toolIcon">{view==="projects"?"▰":view==="code"?"</>":"◫"}</div>
          <h2>{view==="projects"?"Projects":view==="code"?"Code":"Artifacts"}</h2>
          <p>{view==="projects"
            ?"Organize work, files, and long-running ideas here."
            :view==="code"
              ?"A dedicated workspace for coding help will live here."
              :"Generated documents, images, and finished work will appear here."}</p>
          <button onClick={()=>setView("chats")}>Back to chat</button>
        </section>}
      </div>

      {view==="chats" && attachment&&<div className="attachmentChip">📎 {attachment.name}<button onClick={()=>setAttachment(null)}>×</button></div>}

      {view==="chats" && <form className="composer" onSubmit={send}>
        <input ref={fileRef} className="hiddenFile" type="file" accept="image/*,.pdf,.txt,.md,.csv,.json" onChange={onFile}/>
        <button type="button" className="round" title="Attach image or document" onClick={()=>fileRef.current?.click()}>＋</button>
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Message Ricardo AI…" />
        <button type="button" className={"round "+(listening?"activeMic":"")} title="Voice" onClick={startVoice}>{listening?"●":"🎙"}</button>
        <button className="send" disabled={busy}>↑</button>
      </form>}
      {view==="chats" && <div className="note">Ricardo AI can make mistakes. Check important information.</div>}
    </section>
  </main>
}
