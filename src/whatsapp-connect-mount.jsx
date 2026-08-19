import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const APP_ID = import.meta.env.VITE_META_APP_ID;
const CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID;
let metaReady = null;
let signupContext = { code: null, phone_number_id: null, waba_id: null, business_id: null };

function loadMetaSDK() {
  if (metaReady) return metaReady;
  metaReady = new Promise((resolve, reject) => {
    if (!APP_ID) return reject(new Error("VITE_META_APP_ID is not configured."));
    if (!CONFIG_ID) return reject(new Error("VITE_META_CONFIG_ID is not configured."));
    if (window.FB) {
      window.FB.init({ appId: APP_ID, cookie: true, xfbml: true, version: "v23.0" });
      return resolve();
    }
    window.fbAsyncInit = () => {
      window.FB.init({ appId: APP_ID, cookie: true, xfbml: true, version: "v23.0" });
      resolve();
    };
    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.onerror = () => reject(new Error("Could not load Meta login."));
    document.body.appendChild(script);
  });
  return metaReady;
}

function addStyles() {
  if (document.getElementById("royexa-wa-connect-style")) return;
  const style = document.createElement("style");
  style.id = "royexa-wa-connect-style";
  style.textContent = `
    #royexa-wa-connect{position:fixed;right:24px;bottom:24px;z-index:9998;font-family:inherit}
    #royexa-wa-connect button{border:0;border-radius:12px;padding:12px 16px;background:#111;color:#fff;font-weight:700;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.18)}
    #royexa-wa-modal{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px}
    #royexa-wa-card{background:#fff;max-width:440px;width:100%;border-radius:18px;padding:26px;box-shadow:0 20px 60px rgba(0,0,0,.25);color:#111}
    #royexa-wa-card h2{margin:0 0 8px;font-size:22px}#royexa-wa-card p{color:#666;line-height:1.5}
    #royexa-wa-card .wa-close{float:right;background:transparent;color:#111;box-shadow:none;padding:2px 8px;font-size:20px}
    #royexa-wa-card .wa-connect{width:100%;margin-top:12px;background:#111}
    #royexa-wa-card .wa-status{margin-top:14px;font-size:13px;white-space:pre-wrap}
  `;
  document.head.appendChild(style);
}

function mount() {
  if (document.getElementById("royexa-wa-connect")) return;
  addStyles();
  const root = document.createElement("div");
  root.id = "royexa-wa-connect";
  root.innerHTML = `<button type="button">💬 Connect WhatsApp</button>`;
  document.body.appendChild(root);
  root.querySelector("button").addEventListener("click", openModal);
}

function openModal() {
  if (document.getElementById("royexa-wa-modal")) return;
  const modal = document.createElement("div");
  modal.id = "royexa-wa-modal";
  modal.innerHTML = `<div id="royexa-wa-card"><button class="wa-close" type="button">×</button><h2>Connect WhatsApp</h2><p>Connect your WhatsApp Business account securely through Meta. No tokens or technical setup to copy manually.</p><button class="wa-connect" type="button">Continue with Meta</button><div class="wa-status"></div></div>`;
  document.body.appendChild(modal);
  modal.querySelector(".wa-close").onclick = () => modal.remove();
  modal.querySelector(".wa-connect").onclick = startSignup;
}

async function startSignup() {
  const modal = document.getElementById("royexa-wa-modal");
  const status = modal?.querySelector(".wa-status");
  if (!status) return;
  try {
    await loadMetaSDK();
    signupContext = { code: null, phone_number_id: null, waba_id: null, business_id: null };
    status.textContent = "Opening Meta…";
    window.FB.login((response) => {
      if (!response?.authResponse?.code) {
        status.textContent = "Meta connection was cancelled or did not return an authorization code.";
        return;
      }
      signupContext.code = response.authResponse.code;
      status.textContent = "Meta approved. Finalizing your WhatsApp connection…";
      finishSignup(status);
    }, {
      config_id: CONFIG_ID,
      response_type: "code",
      override_default_response_type: true,
      extras: { setup: {} }
    });
  } catch (error) {
    status.textContent = error?.message || "Could not start Meta connection.";
  }
}

async function finishSignup(status) {
  if (!signupContext.code || !signupContext.phone_number_id) {
    status.textContent = "Meta connected, but the WhatsApp phone number details were not received. Please try again.";
    return;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    status.textContent = "Your CRM session expired. Please sign in again.";
    return;
  }
  const { data, error } = await supabase.functions.invoke("whatsapp-connect", {
    body: signupContext,
    headers: { Authorization: `Bearer ${session.access_token}` }
  });
  if (error || data?.ok === false) {
    status.textContent = data?.error || error?.message || "WhatsApp connection failed.";
    return;
  }
  status.textContent = `Connected ✓\n${data.verified_name || "WhatsApp Business"}${data.display_phone_number ? ` — ${data.display_phone_number}` : ""}`;
}

window.addEventListener("message", (event) => {
  if (!event.origin.endsWith("facebook.com")) return;
  let data = event.data;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch { return; }
  }
  if (!data || typeof data !== "object") return;
  const payload = data.data || data;
  if (payload.phone_number_id) signupContext.phone_number_id = String(payload.phone_number_id);
  if (payload.waba_id) signupContext.waba_id = String(payload.waba_id);
  if (payload.business_id) signupContext.business_id = String(payload.business_id);
  const status = document.querySelector("#royexa-wa-modal .wa-status");
  if (signupContext.code && signupContext.phone_number_id && status) finishSignup(status);
});

const observer = new MutationObserver(() => {
  if (document.querySelector("#root") && !document.getElementById("royexa-wa-connect")) mount();
});
observer.observe(document.documentElement, { childList: true, subtree: true });
setTimeout(mount, 800);
