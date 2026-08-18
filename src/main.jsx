import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./styles.css";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const stages = ["new", "contacted", "interested", "proposal", "negotiating", "follow_up", "won"];
const labels = { new:"New", contacted:"Contacted", interested:"Interested", proposal:"Proposal", negotiating:"Negotiating", follow_up:"Follow-up", won:"Won" };
const emptyLead = { name:"", email:"", phone:"", whatsapp_name:"", business_name:"", interest:"", deal_value:"", status:"new", next_follow_up_at:"", notes:"" };

function Login(){
  const [email,setEmail]=useState(""); const [sent,setSent]=useState(false); const [error,setError]=useState("");
  async function login(e){e.preventDefault();setError("");const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.origin}});if(error)setError(error.message);else setSent(true);}
  return <div className="auth"><div className="authCard"><div className="brand">ROYEXA <span>CRM</span></div><h1>Sales, organized.</h1><p>Manage leads, follow-ups, messages and AI-assisted sales from one place.</p>{sent?<div className="success"><strong>Check your email.</strong><br/>We sent you a secure login link.</div>:<form onSubmit={login}><input type="email" placeholder="Your email address" value={email} onChange={e=>setEmail(e.target.value)} required/><button type="submit">Send magic link</button>{error&&<div className="error">{error}</div>}</form>}</div></div>;
}

function Dashboard({session}){
  const [leads,setLeads]=useState([]),[selected,setSelected]=useState(null),[showAdd,setShowAdd]=useState(false),[search,setSearch]=useState(""),[form,setForm]=useState(emptyLead),[saving,setSaving]=useState(false),[error,setError]=useState(""),[aiResult,setAiResult]=useState(""),[aiLoading,setAiLoading]=useState(false),[activeView,setActiveView]=useState("dashboard"),[activities,setActivities]=useState([]);

  async function loadLeads(){const {data,error}=await supabase.from("leads").select("*").order("updated_at",{ascending:false});if(error)setError(error.message);else setLeads(data||[]);}
  async function loadActivities(leadId){const {data}=await supabase.from("messages").select("*").eq("lead_id",leadId).order("created_at",{ascending:false}).limit(30);setActivities(data||[]);}
  useEffect(()=>{loadLeads();const channel=supabase.channel("crm-leads").on("postgres_changes",{event:"*",schema:"public",table:"leads"},loadLeads).subscribe();return()=>supabase.removeChannel(channel)},[]);
  useEffect(()=>{if(selected)loadActivities(selected.id)},[selected]);

  async function addLead(e){e.preventDefault();setSaving(true);setError("");const payload={...form,deal_value:form.deal_value?Number(form.deal_value):null,next_follow_up_at:form.next_follow_up_at||null};const {error}=await supabase.from("leads").insert(payload);setSaving(false);if(error){setError(error.message);return}setForm(emptyLead);setShowAdd(false);loadLeads();}
  async function updateStatus(id,status){const {error}=await supabase.from("leads").update({status}).eq("id",id);if(error)setError(error.message);else{loadLeads();setSelected(c=>c?{...c,status}:c)}}
  async function deleteLead(lead){if(!confirm(`Delete ${lead.name||lead.phone||"this lead"}? This cannot be undone.`))return;const {error}=await supabase.from("leads").delete().eq("id",lead.id);if(error)setError(error.message);else{setSelected(null);loadLeads();}}
  function count(status){return leads.filter(l=>l.status===status).length}
  const filteredLeads=useMemo(()=>{const q=search.toLowerCase().trim();if(!q)return leads;return leads.filter(l=>[l.name,l.email,l.phone,l.whatsapp_name,l.business_name,l.interest].filter(Boolean).some(v=>String(v).toLowerCase().includes(q)))},[leads,search]);
  const followUps=useMemo(()=>leads.filter(l=>l.next_follow_up_at).sort((a,b)=>new Date(a.next_follow_up_at)-new Date(b.next_follow_up_at)),[leads]);
  function updateField(f,v){setForm(c=>({...c,[f]:v}))}
  function openEmail(lead){if(!lead.email)return;const subject=encodeURIComponent(`Following up with ${lead.name||"you"}`);const body=encodeURIComponent(`Hi ${lead.name||"there"},\n\nI’m following up regarding ${lead.interest||"your enquiry"}.\n\nBest regards,\nROYEXA`);window.location.href=`mailto:${lead.email}?subject=${subject}&body=${body}`}
  async function askAI(action){
    if(!selected)return;
    setAiLoading(true);setAiResult("");setError("");
    try {
      const {data,error}=await supabase.functions.invoke("ai-crm-assistant",{body:{action,lead:selected,messages:activities}});
      if(error){
        let detail="";
        try { if(error.context){ const body=await error.context.json(); detail=body?.error||body?.message||JSON.stringify(body); } } catch(_) {}
        throw new Error(detail||error.message||"AI request failed.");
      }
      if(data?.ok===false) throw new Error(data.error||"AI request failed.");
      setAiResult(data?.result||data?.message||"No AI result.");
    } catch(e) {
      setAiResult(`AI error: ${e?.message||"Unknown error"}`);
    } finally { setAiLoading(false); }
  }

  return <div className="app"><aside><div className="brand">ROYEXA <span>CRM</span></div><p>Sales command center</p><nav><button className={activeView==="dashboard"?"navActive":""} onClick={()=>setActiveView("dashboard")}>Dashboard</button><button className={activeView==="followups"?"navActive":""} onClick={()=>setActiveView("followups")}>Follow-ups <span>{followUps.length}</span></button><button className={activeView==="leads"?"navActive":""} onClick={()=>setActiveView("leads")}>Leads</button><button className={activeView==="messages"?"navActive":""} onClick={()=>setActiveView("messages")}>Messages</button></nav><button className="logout" onClick={()=>supabase.auth.signOut()}>Sign out</button></aside>
  <main><header><small>ROYEXA CRM</small><h1>{activeView==="followups"?"Follow-ups":activeView==="messages"?"Messages":"Good to see you."}</h1><p>{session.user.email}</p></header>
  {error&&<div className="error">{error}</div>}
  {activeView==="followups"?<section className="panel"><div className="panelHead"><div><h2>Follow-up queue</h2><span>{followUps.length} scheduled</span></div><button className="primaryButton" onClick={()=>setActiveView("dashboard")}>Back to dashboard</button></div><div className="followupList">{followUps.length===0?<div className="empty">No follow-ups scheduled yet.</div>:followUps.map(l=><button className="followupItem" key={l.id} onClick={()=>{setSelected(l);setActiveView("dashboard")}}><div><strong>{l.name||l.phone}</strong><small>{l.interest||"General enquiry"}</small></div><time>{new Date(l.next_follow_up_at).toLocaleString()}</time></button>)}</div></section>:activeView==="messages"?<section className="panel"><div className="panelHead"><div><h2>Messages</h2><span>Activity is shown inside each lead</span></div></div><div className="empty">Open a lead to view its activity timeline and ask the AI assistant for a reply.</div></section>:<>
  <section className="stats">{[["New","new"],["Interested","interested"],["Proposals","proposal"],["Follow-ups","follow_up"],["Won","won"]].map(([n,s])=><div key={s}><small>{n}</small><strong>{count(s)}</strong></div>)}</section>
  <section className="panel"><div className="panelHead"><div><h2>Leads</h2><span>{leads.length} total leads</span></div><button className="primaryButton" onClick={()=>setShowAdd(true)}>+ Add lead</button></div><div className="toolbar"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email, phone, business..."/></div><div className="pipeline">{stages.map(stage=><div className="column" key={stage}><div className="columnHead"><b>{labels[stage]}</b><span>{count(stage)}</span></div>{filteredLeads.filter(l=>l.status===stage).map(lead=><button className="lead" key={lead.id} onClick={()=>setSelected(lead)}><strong>{lead.name||lead.whatsapp_name||lead.phone}</strong><small>{lead.email||"No email"}</small><small>{lead.business_name||"No business"}</small><small>{lead.interest||"General enquiry"}</small>{lead.next_follow_up_at&&<small>⏰ {new Date(lead.next_follow_up_at).toLocaleDateString()}</small>}{lead.deal_value&&<em>₦{Number(lead.deal_value).toLocaleString()}</em>}</button>)}</div>)}</div></section></>}

  {showAdd&&<div className="modalBackdrop"><form className="modal" onSubmit={addLead}><button type="button" className="close" onClick={()=>setShowAdd(false)}>×</button><small>NEW LEAD</small><h2>Add a client</h2><div className="formGrid"><input placeholder="Client name *" value={form.name} onChange={e=>updateField("name",e.target.value)} required/><input type="email" placeholder="Email address" value={form.email} onChange={e=>updateField("email",e.target.value)}/><input placeholder="WhatsApp number *" value={form.phone} onChange={e=>updateField("phone",e.target.value)} required/><input placeholder="WhatsApp display name" value={form.whatsapp_name} onChange={e=>updateField("whatsapp_name",e.target.value)}/><input placeholder="Business name" value={form.business_name} onChange={e=>updateField("business_name",e.target.value)}/><input placeholder="Service / interest" value={form.interest} onChange={e=>updateField("interest",e.target.value)}/><input type="number" min="0" placeholder="Potential deal value" value={form.deal_value} onChange={e=>updateField("deal_value",e.target.value)}/><select value={form.status} onChange={e=>updateField("status",e.target.value)}>{stages.map(s=><option key={s} value={s}>{labels[s]}</option>)}</select><input type="datetime-local" value={form.next_follow_up_at} onChange={e=>updateField("next_follow_up_at",e.target.value)}/></div><textarea placeholder="Notes about this client..." value={form.notes} onChange={e=>updateField("notes",e.target.value)}/><button className="primaryButton full" type="submit" disabled={saving}>{saving?"Saving...":"Create lead"}</button></form></div>}

  {selected&&<div className="drawer"><button className="close" onClick={()=>setSelected(null)}>×</button><small>LEAD DETAILS</small><h2>{selected.name||selected.whatsapp_name||selected.phone}</h2><p>{selected.business_name||"No business name"}</p><div className="details"><b>Email</b><span>{selected.email||"No email added"}</span><b>WhatsApp</b><span>{selected.phone}</span><b>Interest</b><span>{selected.interest||"—"}</span><b>Deal value</b><span>{selected.deal_value?`₦${Number(selected.deal_value).toLocaleString()}`:"—"}</span><b>Next follow-up</b><span>{selected.next_follow_up_at?new Date(selected.next_follow_up_at).toLocaleString():"Not scheduled"}</span><b>Notes</b><span>{selected.notes||"—"}</span></div><div className="drawerActions"><button className="primaryButton full" disabled={!selected.email} onClick={()=>openEmail(selected)}>✉ Email client</button>{selected.phone&&<a className="secondaryButton full" href={`https://wa.me/${String(selected.phone).replace(/\D/g,"")}`} target="_blank" rel="noreferrer">Open WhatsApp</a>}<button className="secondaryButton full" onClick={()=>askAI("next_action")} disabled={aiLoading}>🤖 {aiLoading?"Thinking...":"AI Next Action"}</button><button className="secondaryButton full" onClick={()=>askAI("reply")} disabled={aiLoading}>✍️ AI Draft Reply</button></div>{aiResult&&<div className="aiBox"><b>AI Assistant</b><p>{aiResult}</p><button className="secondaryButton full" onClick={()=>navigator.clipboard?.writeText(aiResult)}>Copy result</button></div>}<div className="timeline"><h3>Activity timeline</h3>{activities.length===0?<small>No messages recorded yet.</small>:activities.map(m=><div className="activity" key={m.id}><b>{m.channel||"message"}</b><small>{m.created_at?new Date(m.created_at).toLocaleString():""}</small><p>{m.content||m.body||m.message||""}</p></div>)}</div><label>Status<select value={selected.status} onChange={e=>updateStatus(selected.id,e.target.value)}>{stages.map(s=><option key={s} value={s}>{labels[s]}</option>)}</select></label><button className="deleteButton" onClick={()=>deleteLead(selected)}>Delete lead</button></div>}
  </main></div>;
}

function App(){const [session,setSession]=useState(null),[loading,setLoading]=useState(true);useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)});const {data:listener}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>listener.subscription.unsubscribe()},[]);if(loading)return <div className="center">Loading ROYEXA CRM...</div>;if(!session)return <Login/>;return <Dashboard session={session}/>}
createRoot(document.getElementById("root")).render(<App/>);
