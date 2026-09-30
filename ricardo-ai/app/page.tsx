"use client";

import { FormEvent, useState } from "react";

type Msg = { role: "user" | "assistant"; text: string };

const starters = [
  "Help me write a professional email",
  "Translate something for me",
  "Help me understand a document",
  "Give me a business idea"
];

export default function Home() {
  const [messages,setMessages]=useState<Msg[]>([
    {role:"assistant",text:"Hello. I’m Ricardo AI. How can I help you today?"}
  ]);
  const [input,setInput]=useState("");
  const [busy,setBusy]=useState(false);

  async function send(e?:FormEvent){
    e?.preventDefault();
    const text=input.trim();
    if(!text||busy) return;
    setMessages(m=>[...m,{role:"user",text}]);
    setInput("");
    setBusy(true);
    try{
      const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:text})});
      const data=await r.json();
      setMessages(m=>[...m,{role:"assistant",text:data.text||"I couldn't answer that yet."}]);
    }catch{
      setMessages(m=>[...m,{role:"assistant",text:"Connection issue. Please try again."}]);
    }finally{setBusy(false);}
  }

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="mark">R</div><div><strong>Ricardo AI</strong><span>by Riscasan</span></div></div>
      <button className="new">＋ New chat</button>
      <div className="sideLabel">LANGUAGES</div>
      <div className="langs">English · Kreyòl · Français · Español</div>
      <div className="sideBottom">Private by design · V1</div>
    </aside>

    <section className="main">
      <header><div><b>Ricardo AI</b><span className="dot">●</span><small>Online</small></div><button className="ghost">⌘</button></header>

      <div className="conversation">
        {messages.length===1 && <section className="welcome">
          <div className="orb">R</div>
          <h1>How can I help?</h1>
          <p>Work. Study. Business. Everyday life.<br/>One intelligent assistant, in your language.</p>
          <div className="starters">{starters.map(s=><button key={s} onClick={()=>setInput(s)}>{s}</button>)}</div>
        </section>}
        <div className="messages">
          {messages.map((m,i)=><div key={i} className={"msg "+m.role}>{m.text}</div>)}
          {busy&&<div className="msg assistant typing">Thinking…</div>}
        </div>
      </div>

      <form className="composer" onSubmit={send}>
        <button type="button" className="round" title="Attach">＋</button>
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Message Ricardo AI…" />
        <button type="button" className="round" title="Voice">🎙</button>
        <button className="send" disabled={busy}>↑</button>
      </form>
      <div className="note">Ricardo AI can make mistakes. Check important information.</div>
    </section>
  </main>
}
