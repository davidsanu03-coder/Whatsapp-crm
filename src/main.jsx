import React, { useEffect, useState } from "react";
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

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
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
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />

            <button type="submit">
              Send magic link
            </button>

            {error && (
              <div className="error">{error}</div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

function Dashboard({ session }) {
  const [leads, setLeads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  async function loadLeads() {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("updated_at", {
        ascending: false,
      });

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
      current
        ? { ...current, status }
        : current
    );
  }

  function count(status) {
    return leads.filter(
      (lead) => lead.status === status
    ).length;
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
          onClick={() =>
            supabase.auth.signOut()
          }
        >
          Sign out
        </button>
      </aside>

      <main>
        <header>
          <small>SALES PIPELINE</small>

          <h1>Good to see you.</h1>

          <p>
            {session.user.email}
          </p>
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

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <section className="panel">
          <div className="panelHead">
            <h2>Lead pipeline</h2>
            <span>
              {leads.length} total leads
            </span>
          </div>

          <div className="pipeline">
            {stages.map((stage) => (
              <div
                className="column"
                key={stage}
              >
                <div className="columnHead">
                  <b>{labels[stage]}</b>
                  <span>{count(stage)}</span>
                </div>

                {leads
                  .filter(
                    (lead) =>
                      lead.status === stage
                  )
                  .map((lead) => (
                    <button
                      className="lead"
                      key={lead.id}
                      onClick={() =>
                        setSelected(lead)
                      }
                    >
                      <strong>
                        {lead.name ||
                          lead.whatsapp_name ||
                          lead.phone}
                      </strong>

                      <small>
                        {lead.business_name ||
                          "No business added"}
                      </small>

                      <small>
                        {lead.interest ||
                          "General enquiry"}
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

        {selected && (
          <div className="drawer">
            <button
              className="close"
              onClick={() =>
                setSelected(null)
              }
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
              {selected.business_name ||
                "No business name"}
            </p>

            <div className="details">
              <b>WhatsApp</b>
              <span>
                {selected.phone}
              </span>

              <b>Interest</b>
              <span>
                {selected.interest || "—"}
              </span>

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
                  <option
                    key={stage}
                    value={stage}
                  >
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
  const [session, setSession] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        setLoading(false);
      });

    const {
      data: listener,
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          setSession(session);
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

createRoot(
  document.getElementById("root")
).render(<App />);
