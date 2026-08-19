import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const STYLE_ID = "royexa-ai-assistant-style";
const ROOT_ID = "royexa-ai-assistant";

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID}{position:fixed;right:22px;bottom:22px;z-index:99999;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .rx-ai-launch{border:0;border-radius:999px;padding:13px 18px;background:#111827;color:#fff;font-weight:700;box-shadow:0 14px 40px rgba(0,0,0,.22);cursor:pointer;display:flex;align-items:center;gap:9px;font-size:14px}
    .rx-ai-launch:hover{transform:translateY(-1px)}
    .rx-ai-panel{width:min(420px,calc(100vw - 28px));height:min(650px,calc(100vh - 110px));background:#fff;border:1px solid #e5e7eb;border-radius:20px;box-shadow:0 24px 70px rgba(0,0,0,.24);display:flex;flex-direction:column;overflow:hidden}
    .rx-ai-head{padding:16px 18px;border-bottom:1px solid #eef0f3;display:flex;align-items:center;justify-content:space-between;background:#fafafa}
    .rx-ai-title{display:flex;gap:10px;align-items:center}.rx-ai-orb{width:36px;height:36px;border-radius:12px;background:#111827;color:#fff;display:grid;place-items:center}.rx-ai-title strong{display:block;font-size:14px}.rx-ai-title small{display:block;color:#6b7280;font-size:11px;margin-top:2px}
    .rx-ai-close{border:0;background:transparent;font-size:22px;color:#6b7280;cursor:pointer}
    .rx-ai-messages{flex:1;overflow:auto;padding:16px;background:#f7f8fa;display:flex;flex-direction:column;gap:10px}
    .rx-ai-msg{max-width:88%;padding:11px 13px;border-radius:15px;font-size:13px;line-height:1.55;white-space:pre-wrap;word-break:break-word}.rx-ai-msg.ai{align-self:flex-start;background:#fff;border:1px solid #e5e7eb;color:#111827}.rx-ai-msg.user{align-self:flex-end;background:#111827;color:#fff}.rx-ai-msg.system{align-self:center;background:#eef2ff;color:#3730a3;font-size:11px}
    .rx-ai-tools{padding:10px 12px;border-top:1px solid #eef0f3;background:#fff;display:flex;gap:7px;overflow:auto}.rx-ai-chip{white-space:nowrap;border:1px solid #e5e7eb;background:#fff;border-radius:999px;padding:7px 10px;font-size:11px;cursor:pointer}.rx-ai-chip:hover{background:#f3f4f6}
    .rx-ai-form{padding:12px;border-top:1px solid #eef0f3;background:#fff;display:flex;gap:8px}.rx-ai-input{flex:1;resize:none;border:1px solid #d1d5db;border-radius:12px;padding:10px 12px;font:inherit;font-size:13px;min-height:42px;max-height:110px;outline:none}.rx-ai-input:focus{border-color:#111827}.rx-ai-send{border:0;border-radius:12px;background:#111827;color:#fff;padding:0 14px;font-weight:700;cursor:pointer}.rx-ai-send:disabled{opacity:.5;cursor:not-allowed}
    .rx-ai-searching{font-size:11px;color:#6b7280;padding:0 2px}.rx-ai-badge{display:inline-block;font-size:10px;color:#047857;background:#ecfdf5;border-radius:999px;padding:3px 7px;margin-top:6px}
    @media(max-width:640px){#${ROOT_ID}{right:12px;bottom:12px}.rx-ai-panel{width:calc(100vw - 24px);height:calc(100vh - 86px)}}
  `;
  document.head.appendChild(style);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function renderMarkdown(text) {
  const safe = escapeHtml(text);
  return safe
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
}

async function getContext() {
  const [{ data: leads }, { data: workspace }] = await Promise.all([
    supabase.from("leads").select("id,name,email,phone,business_name,interest,deal_value,status,next_follow_up_at,notes,updated_at").order("updated_at", { ascending: false }).limit(100),
    supabase.from("workspaces").select("business_name,display_name,industry,timezone").maybeSingle(),
  ]);
  return { leads: leads || [], workspace: workspace || null };
}

function mount() {
  if (document.getElementById(ROOT_ID)) return;
  injectStyles();
  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.innerHTML = `
    <button class="rx-ai-launch" aria-label="Open ROYEXA AI Assistant"><span>🤖</span><span>AI Assistant</span></button>
    <section class="rx-ai-panel" hidden>
      <header class="rx-ai-head"><div class="rx-ai-title"><div class="rx-ai-orb">✦</div><div><strong>ROYEXA AI Assistant</strong><small>Web research • Writing • CRM intelligence</small></div></div><button class="rx-ai-close" aria-label="Close">×</button></header>
      <div class="rx-ai-messages"><div class="rx-ai-msg ai">Hi! I’m your ROYEXA AI Assistant. Ask me anything, research something on the web, write content, analyze your CRM, or help plan your next task.</div></div>
      <div class="rx-ai-tools"><button class="rx-ai-chip">What should I focus on today?</button><button class="rx-ai-chip">Which leads need follow-up?</button><button class="rx-ai-chip">Research a competitor</button><button class="rx-ai-chip">Write a client message</button></div>
      <form class="rx-ai-form"><textarea class="rx-ai-input" rows="1" placeholder="Ask anything..."></textarea><button class="rx-ai-send" type="submit">Send</button></form>
    </section>`;
  document.body.appendChild(root);

  const launch = root.querySelector(".rx-ai-launch");
  const panel = root.querySelector(".rx-ai-panel");
  const close = root.querySelector(".rx-ai-close");
  const messages = root.querySelector(".rx-ai-messages");
  const form = root.querySelector(".rx-ai-form");
  const input = root.querySelector(".rx-ai-input");
  const send = root.querySelector(".rx-ai-send");

  const addMessage = (text, type = "ai", badge = "") => {
    const div = document.createElement("div");
    div.className = `rx-ai-msg ${type}`;
    div.innerHTML = renderMarkdown(text) + (badge ? `<div><span class="rx-ai-badge">${escapeHtml(badge)}</span></div>` : "");
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  };

  const setOpen = (open) => { panel.hidden = !open; launch.hidden = open; if (open) input.focus(); };
  launch.addEventListener("click", () => setOpen(true));
  close.addEventListener("click", () => setOpen(false));

  root.querySelectorAll(".rx-ai-chip").forEach((chip) => chip.addEventListener("click", () => {
    input.value = chip.textContent;
    form.requestSubmit();
  }));

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message || send.disabled) return;
    input.value = "";
    addMessage(message, "user");
    send.disabled = true;
    const thinking = document.createElement("div");
    thinking.className = "rx-ai-msg ai rx-ai-thinking";
    thinking.textContent = "Thinking…";
    messages.appendChild(thinking);
    messages.scrollTop = messages.scrollHeight;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) throw new Error("Please sign in to use the AI Assistant.");
      const context = await getContext();
      const { data, error } = await supabase.functions.invoke("ai-crm-assistant", { body: { action: "chat", message, leads: context.leads, workspace: context.workspace } });
      thinking.remove();
      if (error) throw new Error(error.message || "AI request failed.");
      if (data?.ok === false) throw new Error(data.error || "AI request failed.");
      addMessage(data?.result || "No response returned.", "ai", data?.webSearch ? "Web-aware" : "AI");
    } catch (error) {
      thinking.remove();
      addMessage(`AI error: ${error?.message || "Unknown error"}`, "system");
    } finally { send.disabled = false; input.focus(); }
  });
}

let mountedForSession = false;
async function sync() {
  const { data } = await supabase.auth.getSession();
  if (data?.session) { if (!mountedForSession) { mountedForSession = true; mount(); } }
  else { mountedForSession = false; document.getElementById(ROOT_ID)?.remove(); }
}

sync();
supabase.auth.onAuthStateChange(() => setTimeout(sync, 0));
