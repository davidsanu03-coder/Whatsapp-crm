import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./quick-actions.css";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

function findAndClick(labels) {
  const wanted = labels.map(v => v.toLowerCase());
  const elements = [...document.querySelectorAll("button, a, [role='button']")];
  const match = elements.find(el => {
    const text = (el.textContent || el.getAttribute("aria-label") || "").trim().toLowerCase();
    return wanted.some(label => text === label || text.includes(label));
  });
  if (match) { match.click(); return true; }
  return false;
}

async function gmailRequest(path, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("Please sign in to ROYEXA first.");
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-oauth/${path}`, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Gmail connection request failed.");
  return body;
}

function GmailModal({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    gmailRequest("status")
      .then(result => { if (active) setStatus(result); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const connect = async () => {
    setConnecting(true); setError("");
    try {
      const result = await gmailRequest("start");
      if (!result.url) throw new Error("Google authorization URL was not returned.");
      window.location.assign(result.url);
    } catch (err) {
      setError(err.message || "Unable to start Gmail connection.");
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    setConnecting(true); setError("");
    try {
      await gmailRequest("disconnect", { method: "POST" });
      setStatus({ connected: false, connection: null });
    } catch (err) {
      setError(err.message || "Unable to disconnect Gmail.");
    } finally { setConnecting(false); }
  };

  const openInbox = () => window.open("https://mail.google.com/", "_blank", "noopener,noreferrer");

  return <div className="qa-overlay" onClick={onClose}>
    <div className="qa-modal" onClick={e => e.stopPropagation()}>
      <button type="button" className="qa-close" onClick={onClose} aria-label="Close Gmail">×</button>
      <div className="qa-icon gmail">G</div>
      <small>EMAIL ASSISTANT</small>
      <h2>{loading ? "Checking Gmail…" : status?.connected ? "Gmail Connected" : "Connect Gmail"}</h2>
      <p>{status?.connected ? `ROYEXA is connected to ${status.connection?.email || "your Gmail account"}. Your inbox is ready for the assistant.` : "Connect your business Gmail so ROYEXA can search emails, summarize conversations, draft replies and send messages when you explicitly authorize it."}</p>
      <div className="qa-permissions"><div><b>Read</b><span>Search and understand emails</span></div><div><b>Draft</b><span>Create replies and new messages</span></div><div><b>Send</b><span>Only after your approval</span></div></div>
      {error && <div className="qa-error">{error}</div>}
      {status?.connected ? <div className="qa-actions"><button type="button" className="qa-primary" onClick={openInbox}>Open Gmail Inbox</button><button type="button" className="qa-secondary" onClick={disconnect} disabled={connecting}>{connecting ? "Disconnecting…" : "Disconnect Gmail"}</button></div> : <button type="button" className="qa-primary" onClick={connect} disabled={connecting || loading}>{connecting ? "Opening Google…" : "Connect with Google"}</button>}
      <small className="qa-note">Secure OAuth connection · Your Google password is never shared with ROYEXA.</small>
    </div>
  </div>;
}

function QuickActions() {
  const [gmailOpen, setGmailOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => {
    const close = () => setMoreOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, []);
  const openGmail = () => { setMoreOpen(false); setGmailOpen(true); };
  const run = (labels) => { setMoreOpen(false); if (!findAndClick(labels)) window.scrollTo({ top: 0, behavior: "smooth" }); };
  return <>
    <div className="qa-desktop">
      <div className="qa-title">BUSINESS TOOLS</div>
      <button type="button" onClick={() => run(["AI Assistant", "AI assistant"])}><span>✦</span> AI Assistant</button>
      <button type="button" onClick={() => run(["Connect WhatsApp", "WhatsApp"])}><span>◉</span> Connect WhatsApp</button>
      <button type="button" onClick={openGmail}><span>G</span> Connect Gmail</button>
    </div>
    <div className="qa-mobile">
      <button type="button" onClick={() => run(["AI Assistant", "AI assistant"])}><span>✦</span> AI</button>
      <button type="button" onClick={() => run(["Connect WhatsApp", "WhatsApp"])}><span>◉</span> WhatsApp</button>
      <button type="button" onClick={openGmail}><span>G</span> Gmail</button>
      <button type="button" onClick={() => setMoreOpen(v => !v)}><span>⋯</span> More</button>
    </div>
    {moreOpen && <div className="qa-more"><button type="button" onClick={() => run(["Growth Analysis", "Growth Analytics"])}>↗ Growth Analysis</button><button type="button" onClick={() => run(["Business Assistant"])}>⌘ Business Assistant</button><button type="button" onClick={openGmail}>G Connect Gmail</button></div>}
    {gmailOpen && <GmailModal onClose={() => setGmailOpen(false)} />}
  </>;
}

const root = document.getElementById("quick-actions-root");
if (root) createRoot(root).render(<QuickActions />);
