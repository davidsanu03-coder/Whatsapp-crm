import React,{useEffect,useState}from"react";
import{createRoot}from"react-dom/client";
import{createClient}from"@supabase/supabase-js";
import"./notifications.css";

const supabase=createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

function Notifications(){
 const[open,setOpen]=useState(false),[items,setItems]=useState([]),[unread,setUnread]=useState(0),[loading,setLoading]=useState(false),[error,setError]=useState("");
 const load=async()=>{const{data:{session}}=await supabase.auth.getSession();if(!session){setItems([]);setUnread(0);return}setLoading(true);setError("");try{const[{data:list,error:e1},{data:count,error:e2}]=await Promise.all([supabase.rpc("user_admin_notifications",{p_limit:50}),supabase.rpc("user_unread_admin_notification_count")]);if(e1)throw e1;if(e2)throw e2;setItems(list||[]);setUnread(Number(count||0));}catch(e){setError(e?.message||"Unable to load notifications.")}finally{setLoading(false)}};
 useEffect(()=>{load();const timer=setInterval(load,30000);const{data:{subscription}}=supabase.auth.onAuthStateChange(()=>load());return()=>{clearInterval(timer);subscription.unsubscribe()}},[]);
 const mark=async id=>{try{await supabase.rpc("mark_admin_notification_read",{p_message_id:id});setItems(x=>x.map(n=>n.id===id?{...n,is_read:true}:n));setUnread(x=>Math.max(0,x-1));}catch(e){setError(e?.message||"Unable to mark notification read.")}};
 return <><button className="royexa-notification-tab" aria-label="Notifications" onClick={()=>{setOpen(v=>!v);if(!open)load()}}>🔔<span>Notifications</span>{unread>0&&<b>{unread>99?"99+":unread}</b>}</button>{open&&<div className="royexa-notification-overlay" onClick={()=>setOpen(false)}><section className="royexa-notification-panel" onClick={e=>e.stopPropagation()}><header><div><small>ROYEXA</small><h2>Notifications</h2></div><button onClick={()=>setOpen(false)}>×</button></header>{error&&<div className="error">{error}</div>}{loading&&items.length===0?<p className="muted">Loading notifications…</p>:items.length===0?<div className="empty"><strong>You're all caught up.</strong><span>Important announcements and messages from ROYEXA will appear here.</span></div>:<div className="notification-list">{items.map(n=><article key={n.id} className={n.is_read?"read":"unread"} onClick={()=>!n.is_read&&mark(n.id)}><div className="notification-dot"/><div><div className="notification-meta"><b>{n.subject||"ROYEXA Admin"}</b><time>{new Date(n.created_at).toLocaleString()}</time></div><p>{n.body}</p>{!n.is_read&&<small>Tap to mark as read</small>}</div></article>)}</div>}</section></div>}</>;
}

function mount(){if(document.getElementById("royexa-notifications-root"))return;const el=document.createElement("div");el.id="royexa-notifications-root";document.body.appendChild(el);createRoot(el).render(<Notifications/>)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();