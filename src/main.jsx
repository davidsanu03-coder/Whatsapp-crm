import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import "./styles.css";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const stages = [
  "new",
  "contacted",
  "interested",
  "proposal",
  "negotiating",
  "follow_up",
  "won",
];

const labels = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  proposal: "Proposal",
  negotiating: "Negotiating",
  follow_up: "Follow-up",
  won: "Won",
};

const emptyLead = {
  name: "",
  phone: "",
  whatsapp_name: "",
  business_name: "",
  interest: "",
  deal_value: "",
  status: "new",
  next_follow_up_at: "",
  notes: "",
};

function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function login(event) {
    event.preventDefault();
    setError("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="auth">
      <div className="authCard">
        <div className="brand">
          ROYEXA <span>CRM</span>
        </div>

        <h1>Sales, organized.</h1>

        <p>
          Sign in to manage your WhatsApp leads,
          conversations and follow-ups.
        </p>

        {sent ? (
          <div className="success">
            <strong>Check your email.</strong>
            <br />
            We sent you a secure login link.
          </div>
        ) : (
          <form onSubmit={login}>
            <input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <button type="submit">Send magic link</button>

            {error && <div className="error">{error}</div>}
          </form>
        )}
      </div>
    </div>
  );
}

function Dashboard({ session }) {
  const [leads, setLeads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyLead);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadLeads() {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      setError(error.message);
      return;
    }

    setLeads(data || []);
  }

  useEffect(() => {
    loadLeads();

    const channel = supabase
      .channel("crm-leads")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leads",
        },
        () => loadLeads()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function addLead(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      deal_value: form.deal_value
        ? Number(form.deal_value)
        : null,
      next_follow_up_at: form.next_follow_up_at || null,
    };

    const { error } = await supabase
      .from("leads")
      .insert(payload);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setForm(emptyLead);
    setShowAdd(false);
    await loadLeads();
  }

  async function updateStatus(id, status) {
    const { error } = await supabase
      .from("leads")
      .update({ status })
      .eq("id", id);

    if (error) {
      setError(error.message);
      return;
    }

    await loadLeads();

    setSelected((current) =>
      current ? { ...current, status } : current
    );
  }

  function count(status) {
    return leads.filter((lead) => lead.status === status).length;
  }

  const filteredLeads = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return leads;

    return leads.filter((lead) =>
      [
        lead.name,
        lead.phone,
        lead.whatsapp_name,
        lead.business_name,
        lead.interest,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        )
    );
  }, [leads, search]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <div className="app">
      <aside>
        <div className="brand">
          ROYEXA <span>CRM</span>
        </div>

        <p>WhatsApp sales command center</p>

        <nav>
          <b>Dashboard</b>
          <span>Leads</span>
          <span>Follow-ups</span>
          <span>Messages</span>
        </nav>

        <button
          className="logout"
          onClick={() => supabase.auth.signOut()}
        >
          Sign out
        </button>
      </aside>

      <main>
        <header>
          <small>SALES PIPELINE</small>
          <h1>Good to see you.</h1>
          <p>{session.user.email}</p>
        </header>

        <section className="stats">
          {[
            ["New", "new"],
            ["Interested", "interested"],
            ["Proposals", "proposal"],
            ["Follow-ups", "follow_up"],
            ["Won", "won"],
          ].map(([name, status]) => (
            <div key={status}>
              <small>{name}</small>
              <strong>{count(status)}</strong>
            </div>
          ))}
        </section>

        {error && <div className="error">{error}</div>}

        <section className="panel">
          <div className="panelHead">
            <div>
              <h2>Leads</h2>
              <span>{leads.length} total leads</span>
            </div>

            <button
              className="primaryButton"
              onClick={() => setShowAdd(true)}
            >
              + Add lead
            </button>
          </div>

          <div className="toolbar">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, phone, business..."
            />
          </div>

          <div className="pipeline">
            {stages.map((stage) => (
              <div className="column" key={stage}>
                <div className="columnHead">
                  <b>{labels[stage]}</b>
                  <span>{count(stage)}</span>
                </div>

                {filteredLeads
                  .filter((lead) => lead.status === stage)
                  .map((lead) => (
                    <button
                      className="lead"
                      key={lead.id}
                      onClick={() => setSelected(lead)}
                    >
                      <strong>
                        {lead.name ||
                          lead.whatsapp_name ||
                          lead.phone}
                      </strong>

                      <small>
                        {lead.business_name || "No business"}
                      </small>

                      <small>
                        {lead.interest || "General enquiry"}
                      </small>

                      {lead.deal_value && (
                        <em>
                          ₦
                          {Number(
                            lead.deal_value
                          ).toLocaleString()}
                        </em>
                      )}
                    </button>
                  ))}
              </div>
            ))}
          </div>
        </section>

        {showAdd && (
          <div className="modalBackdrop">
            <form className="modal" onSubmit={addLead}>
              <button
                type="button"
                className="close"
                onClick={() => setShowAdd(false)}
              >
                ×
              </button>

              <small>NEW LEAD</small>
              <h2>Add a client</h2>

              <div className="formGrid">
                <input
                  placeholder="Client name *"
                  value={form.name}
                  onChange={(e) =>
                    updateField("name", e.target.value)
                  }
                  required
                />

                <input
                  placeholder="WhatsApp number *"
                  value={form.phone}
                  onChange={(e) =>
                    updateField("phone", e.target.value)
                  }
                  required
                />

                <input
                  placeholder="WhatsApp display name"
                  value={form.whatsapp_name}
                  onChange={(e) =>
                    updateField("whatsapp_name", e.target.value)
                  }
                />

                <input
                  placeholder="Business name"
                  value={form.business_name}
                  onChange={(e) =>
                    updateField("business_name", e.target.value)
                  }
                />

                <input
                  placeholder="Service / interest"
                  value={form.interest}
                  onChange={(e) =>
                    updateField("interest", e.target.value)
                  }
                />

                <input
                  type="number"
                  min="0"
                  placeholder="Potential deal value"
                  value={form.deal_value}
                  onChange={(e) =>
                    updateField("deal_value", e.target.value)
                  }
                />

                <select
                  value={form.status}
                  onChange={(e) =>
                    updateField("status", e.target.value)
                  }
                >
                  {stages.map((stage) => (
                    <option key={stage} value={stage}>
                      {labels[stage]}
                    </option>
                  ))}
                </select>

                <input
                  type="datetime-local"
                  value={form.next_follow_up_at}
                  onChange={(e) =>
                    updateField(
                      "next_follow_up_at",
                      e.target.value
                    )
                  }
                />
              </div>

              <textarea
                placeholder="Notes about this client..."
                value={form.notes}
                onChange={(e) =>
                  updateField("notes", e.target.value)
                }
              />

              <button
                className="primaryButton full"
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving..." : "Create lead"}
              </button>
            </form>
          </div>
        )}

        {selected && (
          <div className="drawer">
            <button
              className="close"
              onClick={() => setSelected(null)}
            >
              ×
            </button>

            <small>LEAD DETAILS</small>

            <h2>
              {selected.name ||
                selected.whatsapp_name ||
                selected.phone}
            </h2>

            <p>
              {selected.business_name || "No business name"}
            </p>

            <div className="details">
              <b>WhatsApp</b>
              <span>{selected.phone}</span>

              <b>Interest</b>
              <span>{selected.interest || "—"}</span>

              <b>Deal value</b>
              <span>
                {selected.deal_value
                  ? `₦${Number(
                      selected.deal_value
                    ).toLocaleString()}`
                  : "—"}
              </span>

              <b>Next follow-up</b>
              <span>
                {selected.next_follow_up_at
                  ? new Date(
                      selected.next_follow_up_at
                    ).toLocaleString()
                  : "Not scheduled"}
              </span>

              <b>Notes</b>
              <span>{selected.notes || "—"}</span>
            </div>

            <label>
              Status

              <select
                value={selected.status}
                onChange={(event) =>
                  updateStatus(
                    selected.id,
                    event.target.value
                  )
                }
              >
                {stages.map((stage) => (
                  <option key={stage} value={stage}>
                    {labels[stage]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: listener,
    } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="center">
        Loading ROYEXA CRM...
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return <Dashboard session={session} />;
}

createRoot(document.getElementById("root")).render(
  <App />
);
