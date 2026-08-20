import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./quick-actions.css";

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

function GmailModal({ onClose }) {
  return <div className="qa-overlay" onClick={onClose}>
    <div className="qa-modal" onClick={e => e.stopPropagation()}>
      <button className="qa-close" onClick={onClose}>×</button>
      <div className="qa-icon gmail">G</div>
      <small>EMAIL ASSISTANT</small>
      <h2>Connect Gmail</h2>
      <p>Connect your business Gmail so ROYEXA can search emails, summarize conversations, draft replies and send messages when you explicitly authorize it.</p>
      <div className="qa-permissions"><div><b>Read</b><span>Search and understand emails</span></div><div><b>Draft</b><span>Create replies and new messages</span></div><div><b>Send</b><span>Only after your approval</span></div></div>
      <button className="qa-primary" onClick={() => alert("Gmail OAuth is the next integration step. No Google credentials are stored in the browser.")}>Connect with Google</button>
      <small className="qa-note">Secure OAuth connection · Your password is never shared with ROYEXA.</small>
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
  const run = (labels) => {
    setMoreOpen(false);
    if (!findAndClick(labels)) window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return <>
    <div className="qa-desktop">
      <div className="qa-title">BUSINESS TOOLS</div>
      <button onClick={() => run(["AI Assistant", "AI assistant"])}><span>✦</span> AI Assistant</button>
      <button onClick={() => run(["Connect WhatsApp", "WhatsApp"])}><span>◉</span> Connect WhatsApp</button>
      <button onClick={() => setGmailOpen(true)}><span>G</span> Connect Gmail</button>
    </div>
    <div className="qa-mobile">
      <button onClick={() => run(["AI Assistant", "AI assistant"])}><span>✦</span> AI</button>
      <button onClick={() => run(["Connect WhatsApp", "WhatsApp"])}><span>◉</span> WhatsApp</button>
      <button onClick={() => setGmailOpen(true)}><span>G</span> Gmail</button>
      <button onClick={() => setMoreOpen(v => !v)}><span>⋯</span> More</button>
    </div>
    {moreOpen && <div className="qa-more"><button onClick={() => run(["Growth Analysis", "Growth Analytics"])}>↗ Growth Analysis</button><button onClick={() => run(["Business Assistant"])}>⌘ Business Assistant</button><button onClick={() => setGmailOpen(true)}>G Connect Gmail</button></div>}
    {gmailOpen && <GmailModal onClose={() => setGmailOpen(false)} />}
  </>;
}

const root = document.getElementById("quick-actions-root");
if (root) createRoot(root).render(<QuickActions />);
