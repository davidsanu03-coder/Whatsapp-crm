import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const stages = ["new", "contacted", "interested", "proposal", "negotiating", "follow_up", "won"];
const labels = { new: "New", contacted: "Contacted", interested: "Interested", proposal: "Proposal", negotiating: "Negotiating", follow_up: "Follow-up", won: "Won" };

function isGmailTask(text) {
  return /\b(gmail|email|emails|inbox|mail)\b/i.test(text);
}
function gmailTaskFrom(text) {
  const t = text.toLowerCase();
  if (/\b(search|find|look for)\b/.test(t)) return { task: "search", query: text.replace(/.*?\b(search|find|look for)\b/i, "").replace(/\b(in|on)\s+(my\s+)?gmail\b/i, "").trim() };
  if (/\b(briefing|daily|today|important)\b/.test(t)) return { task: "briefing" };
  if (/\b(summarize|summary|summarise)\b/.test(t)) return { task: "summarize" };
  return { task: "inbox" };
}
function formatEmails(emails = []) {
  if (!emails.length) return "I checked your Gmail, but there are no matching emails.";
  return emails.map((e, i) => `${i + 1}. **${e.subject}**\nFrom: ${e.from}\nDate: ${e.date}\n${e.snippet || ""}`).join("\n\n");
}

function Assistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([{ role: "assistant", text: "Hi 👋 I’m your ROYEXA AI Assistant. Ask me about your CRM, sales, Gmail, writing, research, or anything else." }]);
  const [leads, setLeads] = useState([]);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState([]);
  const [error, setError] = useState("");

  async function loadLeads() { const { data } = await supabase.from("leads").select("*").order("updated_at", { ascending: false }); setLeads(data || []); }
  useEffect(() => {
    loadLeads();
    const openHandler = () => { setOpen(true); setError(""); };
    window.addEventListener("royexa:assistant-open", openHandler);
    return () => window.removeEventListener("royexa:assistant-open", openHandler);
  }, []);

  const context = useMemo(() => leads.slice(0, 100).map(l => ({ id: l.id, name: l.name, email: l.email, phone: l.phone, business_name: l.business_name, interest: l.interest, status: l.status, deal_value: l.deal_value, next_follow_up_at: l.next_follow_up_at })), [leads]);

  async function runGmail(text) {
    const task = gmailTaskFrom(text);
    const { data, error } = await supabase.functions.invoke("gmail-tasks", { body: task });
    if (error) throw new Error(error.message || "Gmail task failed.");
    if (!data?.ok) throw new Error(data?.error || "Gmail task failed.");
    if (task.task === "summarize" || task.task === "briefing") {
      const emails = data.emails || [];
      if (!emails.length) return "I checked your Gmail, but there are no recent emails to summarize.";
      const ai = await supabase.functions.invoke("ai-crm-assistant", { body: { action: "chat", message: `Analyze these Gmail messages and give me a concise business briefing. Highlight urgent items, people who need replies, deadlines, opportunities, and risks. Do not invent facts.\n\n${JSON.stringify(emails)}`, leads: context } });
      if (ai.error) throw new Error(ai.error.message || "AI email analysis failed.");
      return ai.data?.result || formatEmails(emails);
    }
    if (task.task === "search") return `Here are the Gmail results for **${task.query || "your search"}**:\n\n${formatEmails(data.emails)}`;
    return `📧 **Your latest Gmail**\n\n${formatEmails(data.emails)}`;
  }

  async function sendMessage(e) {
    e?.preventDefault(); const text = input.trim(); if (!text || busy) return;
    setInput(""); setError(""); setBusy(true); const next = [...messages, { role: "user", text }]; setMessages(next);
    try {
      if (isGmailTask(text)) {
        const result = await runGmail(text);
        setMessages(current => [...current, { role: "assistant", text: result }]);
        return;
      }
      const { data, error } = await supabase.functions.invoke("ai-crm-assistant", { body: { action: "chat", message: text, history: next.slice(-12), leads: context } });
      if (error) throw new Error(error.message || "AI request failed."); if (!data?.ok) throw new Error(data?.error || "AI request failed.");
      setMessages(current => [...current, { role: "assistant", text: data.result || "No response." }]); if (Array.isArray(data.actions)) setPending(data.actions);
    } catch (e) { setError(e.message || "Task failed."); } finally { setBusy(false); }
  }

  async function execute(action) {
    setBusy(true); setError("");
    try {
      const { data, error } = await supabase.functions.invoke("ai-crm-assistant", { body: { action: "execute_task", task: action } });
      if (error) throw new Error(error.message || "Task execution failed."); if (!data?.ok) throw new Error(data?.error || "Task execution failed.");
      setMessages(current => [...current, { role: "assistant", text: `✓ Done: ${data.message || action.label}` }]); setPending(current => current.filter(a => a.id !== action.id)); await loadLeads();
    } catch (e) { setError(e.message || "Task execution failed."); } finally { setBusy(false); }
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} aria-label="Open ROYEXA AI Assistant" style={fab}>🤖 AI Assistant</button>;
  return <div style={panel}>
    <div style={head}><div><strong>🤖 ROYEXA AI</strong><small> Assistant + Gmail + approved actions</small></div><button type="button" onClick={() => setOpen(false)} style={icon}>×</button></div>
    <div style={body}>{messages.map((m, i) => <div key={i} style={m.role === "user" ? userBubble : aiBubble}><b>{m.role === "user" ? "You" : "AI"}</b><div style={{ whiteSpace: "pre-wrap", marginTop: 5 }}>{m.text}</div></div>)}{pending.length > 0 && <div style={actionsBox}><b>Approval required</b>{pending.map(a => <div key={a.id} style={actionRow}><span>{a.label}</span><button type="button" disabled={busy} onClick={() => execute(a)} style={approve}>Approve & execute</button></div>)}</div>}{error && <div style={errorBox}>{error}</div>}{busy && <div style={typing}>Working…</div>}</div>
    <form onSubmit={sendMessage} style={composer}><input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything or give me a task…"/><button type="submit" disabled={busy || !input.trim()}>➤</button></form>
  </div>;
}

const fab = { position:"fixed", right:20, bottom:20, zIndex:9999, border:0, borderRadius:999, padding:"13px 17px", background:"#111", color:"#fff", fontWeight:700, boxShadow:"0 10px 30px rgba(0,0,0,.2)", cursor:"pointer" };
const panel = { position:"fixed", right:20, bottom:20, width:"min(390px, calc(100vw - 32px))", height:"min(650px, calc(100vh - 40px))", zIndex:10000, background:"#0b0b0d", color:"#f5f5f7", border:"1px solid #2a2a2e", borderRadius:20, boxShadow:"0 20px 60px rgba(0,0,0,.6)", display:"flex", flexDirection:"column", overflow:"hidden", fontFamily:"Inter, system-ui, sans-serif" };
const head = { padding:"16px 18px", borderBottom:"1px solid #2a2a2e", display:"flex", justifyContent:"space-between", alignItems:"center", color:"#fff" };
const icon = { border:0, background:"transparent", color:"#fff", fontSize:24, cursor:"pointer" };
const body = { flex:1, overflowY:"auto", padding:14, background:"#0b0b0d", color:"#f5f5f7" };
const userBubble = { maxWidth:"88%", margin:"8px 0 8px auto", padding:12, borderRadius:"16px 16px 4px 16px", background:"#2563eb", color:"#fff" };
const aiBubble = { maxWidth:"92%", margin:"8px auto 8px 0", padding:12, borderRadius:"16px 16px 16px 4px", background:"#1b1b20", color:"#f5f5f7", border:"1px solid #34343a", boxShadow:"0 2px 8px rgba(0,0,0,.2)" };
const actionsBox = { margin:"12px 0", padding:12, borderRadius:14, background:"#201b0b", color:"#fff", border:"1px solid #66551a" };
const actionRow = { display:"flex", gap:8, alignItems:"center", justifyContent:"space-between", padding:"9px 0", borderTop:"1px solid #403716", marginTop:8 };
const approve = { border:0, borderRadius:9, padding:"8px 10px", background:"#2563eb", color:"#fff", cursor:"pointer", fontWeight:600 };
const errorBox = { margin:"8px 0", padding:10, borderRadius:10, background:"#3a1417", color:"#ffb4b4", border:"1px solid #6e252b" };
const typing = { color:"#a7a7ad", padding:8 };
const composer = { display:"flex", gap:8, padding:12, borderTop:"1px solid #2a2a2e", background:"#0b0b0d" };

function mount() { if (document.getElementById("royexa-ai-root")) return; const node = document.createElement("div"); node.id = "royexa-ai-root"; document.body.appendChild(node); createRoot(node).render(<Assistant />); }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
