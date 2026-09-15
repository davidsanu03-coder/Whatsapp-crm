import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./royexa-shell.css";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const API = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recent-messages`;

const groups = [
  { title: "WORKSPACE", items: [["dashboard", "⌂", "Dashboard"], ["leads", "◎", "Leads"], ["messages", "◌", "Messages"], ["followups", "◷", "Follow-ups"]] },
  { title: "TOOLS", items: [["calendar", "□", "Calendar"], ["email", "@", "Gmail"], ["whatsapp", "◉", "WhatsApp"], ["analytics", "◒", "Analytics"], ["intelligence", "◈", "Intelligence"], ["automations", "⚡", "Automations"], ["client", "◇", "Client Experience"], ["notifications", "○", "Notifications"], ["post", "＋", "Make Post"]] }
];

function clickExisting(names) {
  const wanted = names.map(x => x.toLowerCase());
  const nodes = [...document.querySelectorAll("button,a,[role='button']")].filter(el => !el.closest("#royexa-workspace-shell"));
  const hit = nodes.find(el => {
    const text = (el.textContent || "").trim().toLowerCase();
    return wanted.some(x => text === x || text.includes(x));
  });
  if (hit) { hit.click(); return true; }
  return false;
}

function emit(name) { window.dispatchEvent(new Event(name)); }

function route(id) {
  if (id === "dashboard") return clickExisting(["Dashboard"]);
  if (id === "leads") return clickExisting(["Leads"]);
  if (id === "messages") return clickExisting(["Messages"]);
  if (id === "followups") return clickExisting(["Follow-ups", "Follow Ups"]);
  if (id === "analytics") return clickExisting(["Growth analytics", "Analysis", "Analytics"]) || emit("royexa:analytics-open");
  if (id === "calendar") return emit("royexa:calendar-open");
  if (id === "email") return emit("royexa:gmail-open");
  if (id === "whatsapp") return emit("royexa:whatsapp-open");
  if (id === "notifications") return emit("royexa:notifications-open");
  if (id === "client") return clickExisting(["Client Experience"]) || emit("royexa:client-tools");
  if (id === "post") return emit("royexa:social-scheduler-open");
  if (id === "automations") return clickExisting(["Automations", "ROYEXA Automations"]);
  if (id === "intelligence") return clickExisting(["Intelligence", "ROYEXA Intelligence"]);
  return false;
}

function ago(value) {
  if (!value) return "";
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d` : new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function initials(name) { return String(name || "?").trim().split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase() || "?"; }

function Shell({ aside }) {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState("dashboard");

  useEffect(() => {
    aside.style.width = collapsed ? "78px" : "286px";
    aside.style.minWidth = collapsed ? "78px" : "286px";
  }, [collapsed, aside]);

  async function loadRecent() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setLoading(false); return; }
      const r = await fetch(`${API}?limit=16`, { headers: { Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not load recent messages");
      setRecent(j.messages || []); setError("");
    } catch (e) { setError(e.message || "Recent messages unavailable"); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    loadRecent();
    const timer = setInterval(loadRecent, 30000);
    const channel = supabase.channel("royexa-recent-messages-shell").on("postgres_changes", { event: "*", schema: "public", table: "messages" }, loadRecent).subscribe();
    return () => { clearInterval(timer); supabase.removeChannel(channel); };
  }, []);

  const filteredGroups = useMemo(() => groups.map(group => ({ ...group, items: group.items.filter(([, , label]) => label.toLowerCase().includes(query.trim().toLowerCase())) })).filter(group => group.items.length), [query]);
  const filteredRecent = useMemo(() => recent.filter(m => [m.name, m.business_name, m.text, m.channel].join(" ").toLowerCase().includes(query.trim().toLowerCase())), [recent, query]);

  function go(id) { setActive(id); route(id); }
  function openMessage(m) { setActive("messages"); clickExisting(["Messages"]); setTimeout(() => window.dispatchEvent(new CustomEvent("royexa:open-lead", { detail: { leadId: m.lead_id, messageId: m.id } })), 100); }

  return <div className={`royexa-shell ${collapsed ? "is-collapsed" : ""}`}>
    <div className="royexa-shell-brand-row"><button className="royexa-collapse" onClick={() => setCollapsed(v => !v)} aria-label="Toggle navigation">☰</button><div className="royexa-shell-brand">ROYEXA <span>CRM</span></div></div>
    <div className="royexa-shell-search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search" aria-label="Search workspace" /><kbd>⌘K</kbd></div>
    <div className="royexa-shell-scroll">
      {filteredGroups.map(group => <section className="royexa-nav-group" key={group.title}><div className="royexa-nav-title">{group.title}</div>{group.items.map(([id, icon, label]) => <button key={id} className={`royexa-nav-item ${active === id ? "active" : ""}`} onClick={() => go(id)} title={label}><i>{icon}</i><span>{label}</span></button>)}</section>)}
      <section className="royexa-recent-section"><div className="royexa-recent-head"><span>RECENT MESSAGES</span><button onClick={loadRecent} aria-label="Refresh recent messages">↻</button></div>{loading ? <div className="royexa-recent-empty">Loading conversations…</div> : filteredRecent.length ? filteredRecent.map(m => <button className="royexa-recent" key={m.id} onClick={() => openMessage(m)}><span className="royexa-avatar">{initials(m.name)}</span><span className="royexa-recent-main"><b>{m.name}</b><small>{m.text || m.subject || "New conversation"}</small></span><time>{ago(m.created_at)}</time></button>) : <div className="royexa-recent-empty">{error || "No recent messages yet."}</div>}</section>
    </div>
    <div className="royexa-shell-footer"><div className="royexa-status"><span></span><b>Workspace online</b></div><button className="royexa-signout" onClick={() => supabase.auth.signOut()}>Sign out</button></div>
  </div>;
}

function mount() {
  const aside = document.querySelector(".app > aside");
  if (!aside || document.getElementById("royexa-workspace-shell")) return false;
  aside.id = "royexa-original-aside";
  const root = document.createElement("div"); root.id = "royexa-workspace-shell"; aside.appendChild(root);
  createRoot(root).render(<Shell aside={aside} />); return true;
}

function boot() {
  if (mount()) return;
  const observer = new MutationObserver(() => { if (mount()) observer.disconnect(); });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 15000);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();