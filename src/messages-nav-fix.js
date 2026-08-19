import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const STYLE_ID = "royexa-messages-nav-style";
const VIEW_ID = "royexa-messages-view";

function styles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    [data-rx-messages-hidden="1"]{display:none!important}
    #${VIEW_ID}{padding:28px;min-height:100%;box-sizing:border-box;color:#eef7f1}
    .rx-msg-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:22px}
    .rx-msg-head h1{margin:0;font-size:28px}.rx-msg-head p{margin:5px 0 0;color:#91a39a}
    .rx-msg-refresh{border:1px solid rgba(82,255,117,.25);background:rgba(82,255,117,.08);color:#7dff91;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer}
    .rx-msg-grid{display:grid;grid-template-columns:340px 1fr;gap:16px;min-height:520px}
    .rx-msg-panel{background:rgba(8,22,19,.78);border:1px solid rgba(120,180,150,.14);border-radius:16px;overflow:hidden}
    .rx-msg-list{max-height:620px;overflow:auto}.rx-msg-item{width:100%;text-align:left;background:transparent;color:inherit;border:0;border-bottom:1px solid rgba(120,180,150,.09);padding:16px;cursor:pointer}.rx-msg-item:hover,.rx-msg-item.active{background:rgba(82,255,117,.07)}
    .rx-msg-name{font-weight:800}.rx-msg-meta{font-size:12px;color:#7f958a;margin-top:5px}.rx-msg-preview{font-size:13px;color:#b6c4bd;margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .rx-msg-convo{padding:20px}.rx-msg-empty{height:100%;display:grid;place-items:center;color:#71857b;text-align:center;padding:40px}
    .rx-bubble{max-width:72%;padding:11px 14px;border-radius:14px;margin:8px 0;line-height:1.45;font-size:14px}.rx-bubble.in{background:#132b23;margin-right:auto}.rx-bubble.out{background:#185d2a;margin-left:auto}.rx-time{display:block;font-size:10px;opacity:.6;margin-top:5px}
    @media(max-width:760px){#${VIEW_ID}{padding:18px 14px 100px}.rx-msg-grid{grid-template-columns:1fr}.rx-msg-convo{min-height:300px}.rx-msg-head h1{font-size:22px}}
  `;
  document.head.appendChild(s);
}

function textOf(m) {
  return m.content || m.body || m.message || m.text || m.message_text || m.payload?.text?.body || "Message";
}

async function loadView(root) {
  root.innerHTML = `<div class="rx-msg-head"><div><h1>Messages</h1><p>WhatsApp conversations from your CRM.</p></div><button class="rx-msg-refresh">Refresh</button></div><div class="rx-msg-grid"><section class="rx-msg-panel rx-msg-list"><div class="rx-msg-empty">Loading conversations…</div></section><section class="rx-msg-panel rx-msg-convo"><div class="rx-msg-empty">Select a conversation to view messages.</div></section></div>`;
  const list = root.querySelector(".rx-msg-list");
  root.querySelector(".rx-msg-refresh").onclick = () => loadView(root);
  const { data: leads } = await supabase.from("leads").select("id,name,whatsapp_name,business_name,phone").order("updated_at", { ascending: false });
  const { data: messages } = await supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(500);
  const byLead = new Map();
  (messages || []).forEach(m => { const id = String(m.lead_id || ""); if (!byLead.has(id)) byLead.set(id, []); byLead.get(id).push(m); });
  const conversations = (leads || []).filter(l => byLead.has(String(l.id)));
  if (!conversations.length) { list.innerHTML = `<div class="rx-msg-empty">No conversations yet.<br/>Connect WhatsApp and incoming messages will appear here.</div>`; return; }
  list.innerHTML = conversations.map((l,i) => { const ms = byLead.get(String(l.id)) || []; const last = ms[0]; const name = l.whatsapp_name || l.name || l.business_name || l.phone || "Unknown contact"; return `<button class="rx-msg-item ${i===0?"active":""}" data-lead="${l.id}"><div class="rx-msg-name">${escapeHtml(name)}</div><div class="rx-msg-meta">${ms.length} message${ms.length===1?"":"s"} · ${last?.created_at ? new Date(last.created_at).toLocaleString() : ""}</div><div class="rx-msg-preview">${escapeHtml(String(last ? textOf(last) : ""))}</div></button>`; }).join("");
  const show = id => { list.querySelectorAll(".rx-msg-item").forEach(x => x.classList.toggle("active", x.dataset.lead === String(id))); const ms = byLead.get(String(id)) || []; const panel = root.querySelector(".rx-msg-convo"); panel.innerHTML = ms.length ? ms.slice().reverse().map(m => `<div class="rx-bubble ${String(m.direction||"").toLowerCase().includes("out") ? "out" : "in"}">${escapeHtml(String(textOf(m)))}<span class="rx-time">${m.created_at ? new Date(m.created_at).toLocaleString() : ""}</span></div>`).join("") : `<div class="rx-msg-empty">No messages for this contact.</div>`; };
  list.querySelectorAll(".rx-msg-item").forEach(x => x.onclick = () => show(x.dataset.lead));
  show(conversations[0].id);
}

function escapeHtml(v){ return String(v).replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c])); }

function openMessages() {
  styles();
  let root = document.getElementById(VIEW_ID);
  if (!root) { root = document.createElement("div"); root.id = VIEW_ID; document.body.appendChild(root); }
  root.style.display = "block";
  document.querySelectorAll("#root > *").forEach(el => { if (el.id !== VIEW_ID) el.dataset.rxMessagesHidden = "1"; });
  loadView(root);
}

function bind(){
  document.querySelectorAll("button,a").forEach(el=>{
    if(el.dataset.rxMsgBound) return;
    const label=(el.textContent||"").trim().toLowerCase();
    if(label === "messages" || label.includes("messages")){ el.dataset.rxMsgBound="1"; el.addEventListener("click", e=>{e.preventDefault();e.stopPropagation();openMessages();},{capture:true}); }
  });
}

const observer=new MutationObserver(bind); observer.observe(document.documentElement,{childList:true,subtree:true});
bind();
