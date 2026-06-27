import React, { useState, useEffect, useCallback } from "react";
import "./index.css";
import { api } from "./api";

// ─── Utilities ────────────────────────────────────────────────────────────────

function initials(name = "") {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
function fmtDate(iso = "") {
  if (!iso) return "—";
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
function fmtDateTime(iso = "") {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function useToast() {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return { toasts, toast };
}

function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{t.type === "success" ? "✓" : "✕"}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── Auth pages ───────────────────────────────────────────────────────────────

function AuthLayout({ children, title, sub }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: 20,
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🚗</div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text)",
              letterSpacing: "-0.3px",
            }}
          >
            RideSync
          </div>
          {title && (
            <div style={{ fontSize: 14, color: "var(--text2)", marginTop: 6 }}>
              {title}
            </div>
          )}
          {sub && (
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
              {sub}
            </div>
          )}
        </div>
        <div className="card" style={{ padding: 28 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("admin"); // 'admin' | 'rider' | 'driver'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const fn = mode === "admin" ? api.adminLogin : mode === "rider" ? api.riderLogin : api.driverLogin;
      const data = await fn({ email, password });
      api.saveSession(data.token, data.role, data.name);
      onLogin({
        role: data.role,
        name: data.name,
        isSuperAdmin: data.isSuperAdmin || false,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title={mode === "admin" ? "Admin sign in" : mode === "rider" ? "Rider sign in" : "Driver sign in"}>
      {/* Tab switcher */}
      <div
        style={{
          display: "flex",
          background: "var(--bg3)",
          borderRadius: "var(--radius)",
          padding: 3,
          marginBottom: 24,
        }}
      >
        {["admin", "rider", "driver"].map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setError("");
            }}
            style={{
              flex: 1,
              padding: "7px 0",
              borderRadius: 7,
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font)",
              fontSize: 13,
              fontWeight: 500,
              transition: "all .15s",
              background: mode === m ? "var(--bg2)" : "transparent",
              color: mode === m ? "var(--text)" : "var(--text3)",
              boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
            }}
          >
            {m === "admin" ? "🔧 Admin" : m === "rider" ? "👤 Rider" : "🚗 Driver"}
          </button>
        ))}
      </div>

      {error && (
        <div
          style={{
            background: "var(--red-bg)",
            border: "1px solid rgba(248,113,113,0.3)",
            borderRadius: "var(--radius)",
            padding: "9px 12px",
            fontSize: 13,
            color: "var(--red)",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={submit}>
        <div className="field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoFocus
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{
            width: "100%",
            padding: "11px 0",
            fontSize: 14,
            marginTop: 8,
            display: "block",
            textAlign: "center",
            borderRadius: "var(--radius)",
            background: "var(--accent2)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font)",
            fontWeight: 500,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}

function SetupAdminPage({ onSetup }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(ev) {
    ev.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError("All fields required");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await api.setupAdmin(form);
      api.saveSession(data.token, data.role, data.name);
      onSetup({
        role: data.role,
        name: data.name,
        isSuperAdmin: data.isSuperAdmin || false,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create admin account"
      sub="First-time setup — this only appears once"
    >
      {error && (
        <div
          style={{
            background: "var(--red-bg)",
            border: "1px solid rgba(248,113,113,0.3)",
            borderRadius: "var(--radius)",
            padding: "9px 12px",
            fontSize: 13,
            color: "var(--red)",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}
      <form onSubmit={submit}>
        <div className="field">
          <label>Your name</label>
          <input
            value={form.name}
            onChange={set("name")}
            placeholder="e.g. John Smith"
            autoFocus
          />
        </div>
        <div className="field">
          <label>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="admin@example.com"
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={set("password")}
            placeholder="Min. 6 characters"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{
            width: "100%",
            padding: "11px 0",
            fontSize: 14,
            marginTop: 8,
            display: "block",
            textAlign: "center",
            borderRadius: "var(--radius)",
            background: "var(--accent2)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font)",
            fontWeight: 500,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Creating…" : "Create admin account"}
        </button>
      </form>
    </AuthLayout>
  );
}

function SetupAccountPage({ onSetup }) {
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!password) {
      setError("Password is required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== password2) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.setupAccount({ inviteToken: token, password });
      setDone(true);
      setTimeout(() => {
        // Clear URL token and go to login
        window.history.replaceState({}, "", "/");
        onSetup(null); // null = go to login, not auto-login
      }, 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!token)
    return (
      <AuthLayout title="Invalid link">
        <p style={{ color: "var(--text3)", textAlign: "center" }}>
          This setup link is invalid or expired.
        </p>
      </AuthLayout>
    );

  return (
    <AuthLayout
      title="Set up your account"
      sub="Create a password to access the rider portal"
    >
      {done ? (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--green)",
              marginBottom: 8,
            }}
          >
            Account created successfully!
          </div>
          <div style={{ fontSize: 13, color: "var(--text3)" }}>
            Redirecting you to the login page…
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div
              style={{
                background: "var(--red-bg)",
                border: "1px solid rgba(248,113,113,0.3)",
                borderRadius: "var(--radius)",
                padding: "9px 12px",
                fontSize: 13,
                color: "var(--red)",
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}
          <form onSubmit={submit}>
            <div className="field">
              <label>New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                autoFocus
              />
            </div>
            <div className="field">
              <label>Confirm password</label>
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="Repeat password"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: "100%",
                padding: "11px 0",
                fontSize: 14,
                marginTop: 8,
                display: "block",
                textAlign: "center",
                borderRadius: "var(--radius)",
                background: "var(--accent2)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font)",
                fontWeight: 500,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Setting up…" : "Set password"}
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}

// ─── Rider Portal ─────────────────────────────────────────────────────────────

function RiderPortal({ user, onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [destination, setDestination] = useState("CCB");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true);
    try {
      const d = await api.getRiderMe();
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submitRequest() {
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await api.createRiderRequest({
        destination: destination || "CCB",
        notes,
      });
      setSuccess("Your ride request has been submitted!");
      setNotes("");
      setDestination("CCB");
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelRequest(id) {
    if (!window.confirm("Cancel this ride request?")) return;
    try {
      await api.cancelRiderRequest(id);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  const thisWeekReq = data?.requests?.find((r) => {
    const sun = getThisSundayLocal();
    return r.week_date === sun;
  });

  function getThisSundayLocal() {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 0 : 7 - day;
    const sun = new Date(now);
    sun.setDate(now.getDate() + diff);
    return `${sun.getFullYear()}-${String(sun.getMonth() + 1).padStart(2, "0")}-${String(sun.getDate()).padStart(2, "0")}`;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Top bar */}
      <div
        style={{
          background: "var(--bg2)",
          borderBottom: "1px solid var(--border)",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>🚗</span>
          <div>
            <div
              style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}
            >
              RideSync
            </div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>
              Rider portal
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="avatar">{initials(user.name)}</div>
          <div>
            <div
              style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}
            >
              {user.name}
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)" }}>
              {user.email}
            </div>
          </div>
          <button
            className="btn btn-sm"
            onClick={onLogout}
            style={{ marginLeft: 8 }}
          >
            Sign out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "32px auto", padding: "0 20px" }}>
        {/* This Sunday card */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div>
              <div className="card-title">🚗 This Sunday</div>
              <div className="card-sub">{fmtDate(getThisSundayLocal())}</div>
            </div>
          </div>
          <div style={{ padding: "20px 20px" }}>
            {loading ? (
              <div style={{ color: "var(--text3)", fontSize: 13 }}>
                Loading…
              </div>
            ) : thisWeekReq ? (
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <span className={`badge badge-${thisWeekReq.status}`}>
                      <span className="dot" />
                      {thisWeekReq.status.charAt(0).toUpperCase() +
                        thisWeekReq.status.slice(1)}
                    </span>
                    <span
                      style={{
                        marginLeft: 10,
                        fontSize: 13,
                        color: "var(--text2)",
                      }}
                    >
                      Destination: <strong>{thisWeekReq.destination}</strong>
                    </span>
                  </div>
                  {thisWeekReq.status === "pending" && (
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => cancelRequest(thisWeekReq.id)}
                    >
                      Cancel request
                    </button>
                  )}
                </div>
                {thisWeekReq.status === "approved" && (
                  <div
                    style={{
                      background: "var(--bg3)",
                      borderRadius: "var(--radius)",
                      padding: "14px 16px",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                      }}
                    >
                      {[
                        ["🧑‍✈️ Driver", thisWeekReq.driver_name || "TBD"],
                        ["🕐 Pickup time", thisWeekReq.pickup_time || "TBD"],
                        [
                          "📍 Pickup address",
                          thisWeekReq.pickup_address || "Your home address",
                        ],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text3)",
                              marginBottom: 2,
                            }}
                          >
                            {label}
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: "var(--text)",
                            }}
                          >
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--text2)",
                    marginBottom: 20,
                  }}
                >
                  You don't have a ride request for this Sunday yet. Submit one
                  below.
                </p>

                {error && (
                  <div
                    style={{
                      background: "var(--red-bg)",
                      border: "1px solid rgba(248,113,113,0.3)",
                      borderRadius: "var(--radius)",
                      padding: "9px 12px",
                      fontSize: 13,
                      color: "var(--red)",
                      marginBottom: 14,
                    }}
                  >
                    {error}
                  </div>
                )}
                {success && (
                  <div
                    style={{
                      background: "var(--green-bg)",
                      border: "1px solid rgba(52,211,153,0.3)",
                      borderRadius: "var(--radius)",
                      padding: "9px 12px",
                      fontSize: 13,
                      color: "var(--green)",
                      marginBottom: 14,
                    }}
                  >
                    {success}
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 14,
                    marginBottom: 16,
                  }}
                >
                  <div className="field" style={{ margin: 0 }}>
                    <label>Destination</label>
                    <input
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="CCB (default)"
                    />
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text3)",
                        marginTop: 4,
                      }}
                    >
                      Leave as CCB or enter custom
                    </div>
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label>Notes (optional)</label>
                    <input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. leaving early"
                    />
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={submitRequest}
                  disabled={submitting}
                >
                  {submitting ? "Submitting…" : "🚗 Request a ride this Sunday"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Past requests */}
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: 14,
          }}
        >
          Past requests
        </div>
        <div className="card">
          {!data?.requests?.length ? (
            <div className="empty">
              <div className="empty-sub">No past requests yet.</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Destination</th>
                  <th>Driver</th>
                  <th>Pickup</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.requests.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontSize: 12.5, color: "var(--text2)" }}>
                      {fmtDate(r.week_date)}
                    </td>
                    <td style={{ fontSize: 13, fontWeight: 500 }}>
                      {r.destination}
                    </td>
                    <td style={{ fontSize: 12.5, color: "var(--text2)" }}>
                      {r.driver_name || "—"}
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 12.5,
                        color: "var(--text2)",
                      }}
                    >
                      {r.pickup_time || "—"}
                    </td>
                    <td>
                      <span className={`badge badge-${r.status}`}>
                        <span className="dot" />
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Profile */}
        {data?.rider && (
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-header">
              <div className="card-title">My profile</div>
            </div>
            <div
              style={{
                padding: "16px 20px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              {[
                ["Name", data.rider.name],
                ["Email", data.rider.email],
                ["Phone", data.rider.phone || "—"],
                ["Home address", data.rider.address || "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text3)",
                      marginBottom: 2,
                      fontFamily: "var(--mono)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {label}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text)" }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Admin dashboard components ───────────────────────────────────────────────

function AssignDriverModal({ request, drivers, onAssign, onClose }) {
  const [driverId, setDriverId] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [pickupAddress, setPickupAddress] = useState(
    request.rider_address || "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const activeDrivers = drivers.filter((d) => d.active);

  async function submit() {
    if (!driverId) {
      setError("Please select a driver.");
      return;
    }
    if (!pickupTime) {
      setError("Please enter a pickup time.");
      return;
    }
    if (!pickupAddress.trim()) {
      setError("Please enter a pickup address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { request: updated } = await api.assignDriver(request.id, {
        driverId: Number(driverId),
        pickupTime,
        pickupAddress,
      });
      onAssign(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Assign driver</h2>
        <p className="modal-sub">
          Assigning to <strong>{request.rider_name}</strong> ·{" "}
          {request.destination}
        </p>
        {error && (
          <div
            style={{
              background: "var(--red-bg)",
              border: "1px solid rgba(248,113,113,0.3)",
              borderRadius: "var(--radius)",
              padding: "9px 12px",
              fontSize: 13,
              color: "var(--red)",
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}
        <div className="field">
          <label>Driver *</label>
          <select
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            className="select-field"
          >
            <option value="">— Select a driver —</option>
            {activeDrivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.phone ? ` (${d.phone})` : ""}
              </option>
            ))}
          </select>
          {activeDrivers.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--amber)", marginTop: 6 }}>
              ⚠ No active drivers.
            </div>
          )}
        </div>
        <div className="field">
          <label>Pickup time *</label>
          <input
            type="time"
            value={pickupTime}
            onChange={(e) => setPickupTime(e.target.value)}
            style={{ colorScheme: "dark" }}
          />
        </div>
        <div className="field">
          <label>Pickup address *</label>
          <input
            value={pickupAddress}
            onChange={(e) => setPickupAddress(e.target.value)}
            placeholder="Rider's home address"
          />
          <div style={{ fontSize: 11.5, color: "var(--text3)", marginTop: 5 }}>
            Pre-filled with home address. Change if different.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={loading || !activeDrivers.length}
          >
            {loading ? "Assigning…" : "✓ Approve & assign"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RiderModal({ rider, onSave, onClose }) {
  const isEdit = !!rider;
  const [form, setForm] = useState({
    name: rider?.name || "",
    email: rider?.email || "",
    phone: rider?.phone || "",
    address: rider?.address || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (!form.name || !form.email) {
      setError("Name and email required");
      return;
    }
    if (!form.phone) {
      setError("Phone number is required");
      return;
    }
    if (!form.address) {
      setError("Home address is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const fn = isEdit ? api.updateRider(rider.id, form) : api.addRider(form);
      const { rider: saved } = await fn;
      onSave(saved, isEdit);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? "Edit rider" : "Add a rider"}</h2>
        <p className="modal-sub">
          {isEdit
            ? `Update ${rider.name}'s info.`
            : "They'll get an email to set up their account."}
        </p>
        {error && (
          <div
            style={{
              background: "var(--red-bg)",
              border: "1px solid rgba(248,113,113,0.3)",
              borderRadius: "var(--radius)",
              padding: "9px 12px",
              fontSize: 13,
              color: "var(--red)",
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}
        <div className="field">
          <label>Full name *</label>
          <input
            value={form.name}
            onChange={set("name")}
            placeholder="e.g. Sarah Chen"
            autoFocus
          />
        </div>
        <div className="field">
          <label>Email *</label>
          <input
            value={form.email}
            onChange={set("email")}
            type="email"
            placeholder="sarah@example.com"
          />
        </div>
        <div className="field">
          <label>Phone *</label>
          <input
            value={form.phone}
            onChange={set("phone")}
            type="tel"
            placeholder="+1 555 000 0000"
          />
        </div>
        <div className="field">
          <label>Home address *</label>
          <input
            value={form.address}
            onChange={set("address")}
            placeholder="123 Main St"
          />
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={loading}
          >
            {loading
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : "Add & send setup email"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DriverModal({ driver, onSave, onClose }) {
  const isEdit = !!driver;
  const [form, setForm] = useState({
    name: driver?.name || "",
    email: driver?.email || "",
    phone: driver?.phone || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (!form.name || !form.email) {
      setError("Name and email required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const fn = isEdit
        ? api.updateDriver(driver.id, form)
        : api.addDriver(form);
      const { driver: saved } = await fn;
      onSave(saved, isEdit);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? "Edit driver" : "Add a driver"}</h2>
        {error && (
          <div
            style={{
              background: "var(--red-bg)",
              border: "1px solid rgba(248,113,113,0.3)",
              borderRadius: "var(--radius)",
              padding: "9px 12px",
              fontSize: 13,
              color: "var(--red)",
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}
        <div className="field">
          <label>Full name *</label>
          <input
            value={form.name}
            onChange={set("name")}
            placeholder="e.g. James Wilson"
            autoFocus
          />
        </div>
        <div className="field">
          <label>Email * (for assignment notifications)</label>
          <input
            value={form.email}
            onChange={set("email")}
            type="email"
            placeholder="james@example.com"
          />
        </div>
        <div className="field">
          <label>Phone (optional)</label>
          <input
            value={form.phone}
            onChange={set("phone")}
            placeholder="+1 555 000 0000"
          />
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={loading}
          >
            {loading ? "Saving…" : isEdit ? "Save changes" : "Add driver"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Admin tab components ─────────────────────────────────────────────────────

function RequestsTab({ toast }) {
  const [requests, setRequests] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [week, setWeek] = useState("");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [r, d] = await Promise.all([
        api.getCurrentRequests(),
        api.getDrivers(),
      ]);
      setRequests(r.requests);
      setWeek(r.week);
      setDrivers(d.drivers);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(id, status) {
    try {
      await api.updateStatus(id, status);
      setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
      toast(status === "declined" ? "Request declined" : "Updated");
    } catch (e) {
      toast(e.message, "error");
    }
  }

  function handleAssigned(updated) {
    setRequests((rs) =>
      rs.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
    );
    setAssigning(null);
    toast("Driver assigned & notifications sent ✓");
  }

  async function remove(id) {
    if (!window.confirm("Remove this request?")) return;
    try {
      await api.deleteRequest(id);
      setRequests((rs) => rs.filter((r) => r.id !== id));
      toast("Removed");
    } catch (e) {
      toast(e.message, "error");
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: 4,
            }}
          >
            This Sunday's requests
          </div>
          {week && (
            <div className="week-label">
              🚗 CCB · {fmtDate(week)} · {requests.length} responded
            </div>
          )}
        </div>
        <button className="btn btn-sm" onClick={load}>
          ↺ Refresh
        </button>
      </div>
      <div className="card">
        {loading ? (
          <div className="empty">
            <div className="empty-sub">Loading…</div>
          </div>
        ) : requests.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🚗</div>
            <div className="empty-title">No responses yet</div>
            <div className="empty-sub">
              Riders will appear here after they respond to the notification or
              submit via the portal.
            </div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Rider</th>
                <th>Destination</th>
                <th>Source</th>
                <th>Responded</th>
                <th>Driver</th>
                <th>Pickup</th>
                <th>Pickup Address</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td>
                    <div className="name-cell">
                      <div className="avatar">{initials(req.rider_name)}</div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{req.rider_name}</div>
                        <div style={{ fontSize: 11, color: "var(--text3)" }}>
                          {req.rider_email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, fontWeight: 500 }}>
                    {req.destination}
                  </td>
                  <td>
                    <span
                      className={`badge ${req.source === "rider" ? "badge-demo" : "badge-neutral"}`}
                    >
                      {req.source === "rider" ? "Portal" : "Email"}
                    </span>
                  </td>
                  <td style={{ fontSize: 12.5, color: "var(--text2)" }}>
                    {fmtDateTime(req.responded_at)}
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {req.driver_name ? (
                      <span style={{ color: "var(--green)", fontWeight: 500 }}>
                        {req.driver_name}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text3)" }}>Unassigned</span>
                    )}
                  </td>
                  <td
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 12.5,
                      color: "var(--text2)",
                    }}
                  >
                    {req.pickup_time || "—"}
                  </td>
                  <td
                    style={{
                      fontSize: 12.5,
                      color: "var(--text2)",
                      maxWidth: 140,
                    }}
                  >
                    {req.pickup_address || "—"}
                  </td>
                  <td>
                    <span className={`badge badge-${req.status}`}>
                      <span className="dot" />
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
                  </td>
                  <td>
                    <div className="action-row">
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => setAssigning(req)}
                      >
                        {req.status === "approved" ? "✎ Reassign" : "✓ Assign"}
                      </button>
                      {req.status !== "declined" && (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => setStatus(req.id, "declined")}
                        >
                          ✕
                        </button>
                      )}
                      {req.status === "declined" && (
                        <button
                          className="btn btn-sm"
                          onClick={() => setStatus(req.id, "pending")}
                        >
                          Reset
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-danger btn-icon"
                        onClick={() => remove(req.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {assigning && (
        <AssignDriverModal
          request={assigning}
          drivers={drivers}
          onAssign={handleAssigned}
          onClose={() => setAssigning(null)}
        />
      )}
    </div>
  );
}

function RidersTab({ toast }) {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { riders } = await api.getRiders();
      setRiders(riders);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleSave(saved, isEdit) {
    if (isEdit)
      setRiders((rs) => rs.map((r) => (r.id === saved.id ? saved : r)));
    else setRiders((rs) => [...rs, saved]);
    setModal(null);
    toast(isEdit ? "Rider updated" : `${saved.name} added — setup email sent`);
  }

  async function toggleActive(rider) {
    try {
      const { rider: u } = await api.updateRider(rider.id, {
        active: rider.active ? 0 : 1,
      });
      setRiders((rs) => rs.map((r) => (r.id === rider.id ? u : r)));
      toast(u.active ? `${rider.name} activated` : `${rider.name} deactivated`);
    } catch (e) {
      toast(e.message, "error");
    }
  }

  async function resendSetup(id, name) {
    try {
      await api.resendSetup(id);
      toast(`Setup email resent to ${name}`);
    } catch (e) {
      toast(e.message, "error");
    }
  }

  async function remove(id, name) {
    if (!window.confirm(`Remove ${name}?`)) return;
    try {
      await api.deleteRider(id);
      setRiders((rs) => rs.filter((r) => r.id !== id));
      toast(`${name} removed`);
    } catch (e) {
      toast(e.message, "error");
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: 4,
            }}
          >
            All riders
          </div>
          <div style={{ fontSize: 12, color: "var(--text3)" }}>
            {riders.length} total · {riders.filter((r) => r.active).length}{" "}
            active
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal("add")}>
          + Add rider
        </button>
      </div>
      <div className="card">
        {loading ? (
          <div className="empty">
            <div className="empty-sub">Loading…</div>
          </div>
        ) : riders.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">👤</div>
            <div className="empty-title">No riders yet</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Account</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {riders.map((rider) => (
                <tr key={rider.id}>
                  <td>
                    <div className="name-cell">
                      <div className="avatar">{initials(rider.name)}</div>
                      <span style={{ fontWeight: 500 }}>{rider.name}</span>
                    </div>
                  </td>
                  <td
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 12.5,
                      color: "var(--text2)",
                    }}
                  >
                    {rider.email}
                  </td>
                  <td style={{ fontSize: 12.5, color: "var(--text2)" }}>
                    {rider.phone || "—"}
                  </td>
                  <td style={{ fontSize: 12.5, color: "var(--text2)" }}>
                    {rider.address || "—"}
                  </td>
                  <td>
                    {rider.account_setup ? (
                      <span className="badge badge-approved">
                        <span className="dot" />
                        Set up
                      </span>
                    ) : (
                      <span className="badge badge-warn">
                        <span className="dot" />
                        Pending
                      </span>
                    )}
                  </td>
                  <td>
                    <div
                      className="toggle-wrap"
                      onClick={() => toggleActive(rider)}
                    >
                      <div className={`toggle ${rider.active ? "on" : ""}`}>
                        <div className="toggle-thumb" />
                      </div>
                      <span
                        style={{
                          fontSize: 12.5,
                          color: rider.active ? "var(--green)" : "var(--text3)",
                        }}
                      >
                        {rider.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="action-row">
                      <button
                        className="btn btn-sm"
                        onClick={() => setModal(rider)}
                      >
                        Edit
                      </button>
                      {!rider.account_setup && (
                        <button
                          className="btn btn-sm"
                          onClick={() => resendSetup(rider.id, rider.name)}
                          title="Resend setup email"
                        >
                          📧 Resend
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => remove(rider.id, rider.name)}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {modal && (
        <RiderModal
          rider={modal === "add" ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function DriversTab({ toast }) {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { drivers } = await api.getDrivers();
      setDrivers(drivers);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleSave(saved, isEdit) {
    if (isEdit)
      setDrivers((ds) => ds.map((d) => (d.id === saved.id ? saved : d)));
    else setDrivers((ds) => [...ds, saved]);
    setModal(null);
    toast(isEdit ? "Driver updated" : `${saved.name} added`);
  }

  async function toggleActive(driver) {
    try {
      const { driver: u } = await api.updateDriver(driver.id, {
        active: driver.active ? 0 : 1,
      });
      setDrivers((ds) => ds.map((d) => (d.id === driver.id ? u : d)));
      toast(
        u.active ? `${driver.name} activated` : `${driver.name} deactivated`,
      );
    } catch (e) {
      toast(e.message, "error");
    }
  }

  async function remove(id, name) {
    if (!window.confirm(`Remove ${name}?`)) return;
    try {
      await api.deleteDriver(id);
      setDrivers((ds) => ds.filter((d) => d.id !== id));
      toast(`${name} removed`);
    } catch (e) {
      toast(e.message, "error");
    }
  }

  async function resendSetup(id, name) {
    try {
      await api.resendDriverInvite(id);
      toast(`Setup email resent to ${name}`);
    } catch (e) {
      toast(e.message, "error");
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: 4,
            }}
          >
            All drivers
          </div>
          <div style={{ fontSize: 12, color: "var(--text3)" }}>
            {drivers.length} total · {drivers.filter((d) => d.active).length}{" "}
            active
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal("add")}>
          + Add driver
        </button>
      </div>
      <div className="card">
        {loading ? (
          <div className="empty">
            <div className="empty-sub">Loading…</div>
          </div>
        ) : drivers.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🧑‍✈️</div>
            <div className="empty-title">No drivers yet</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Account</th>
                <th>Availability</th>
                <th>Capacity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className="name-cell">
                      <div className="avatar">{initials(d.name)}</div>
                      <span style={{ fontWeight: 500 }}>{d.name}</span>
                    </div>
                  </td>
                  <td
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 12.5,
                      color: "var(--text2)",
                    }}
                  >
                    {d.email || "—"}
                  </td>
                  <td style={{ fontSize: 12.5, color: "var(--text2)" }}>
                    {d.phone || "—"}
                  </td>
                  <td>
                    {d.account_setup ? (
                      <span className="badge badge-approved">
                        <span className="dot" />
                        Set up
                      </span>
                    ) : (
                      <span className="badge badge-warn">
                        <span className="dot" />
                        Pending
                      </span>
                    )}
                  </td>
                  <td>
                    {d.availability_status ? (
                       <span style={{ color: "var(--green)", fontWeight: 500 }}>Available</span>
                    ) : (
                       <span style={{ color: "var(--text3)", fontWeight: 500 }}>Unavailable</span>
                    )}
                    {d.availability_message && <div style={{ fontSize: 11.5, color: "var(--text2)", marginTop: 4, fontStyle: "italic", maxWidth: 180, whiteSpace: "normal" }}>"{d.availability_message}"</div>}
                  </td>
                  <td>
                    {d.capacity || 4}
                  </td>
                  <td>
                    <div
                      className="toggle-wrap"
                      onClick={() => toggleActive(d)}
                    >
                      <div className={`toggle ${d.active ? "on" : ""}`}>
                        <div className="toggle-thumb" />
                      </div>
                      <span
                        style={{
                          fontSize: 12.5,
                          color: d.active ? "var(--green)" : "var(--text3)",
                        }}
                      >
                        {d.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="action-row">
                      <button
                        className="btn btn-sm"
                        onClick={() => setModal(d)}
                      >
                        Edit
                      </button>
                      {!d.account_setup && (
                        <button
                          className="btn btn-sm"
                          onClick={() => resendSetup(d.id, d.name)}
                          title="Resend setup email"
                        >
                          📧 Resend
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => remove(d.id, d.name)}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {modal && (
        <DriverModal
          driver={modal === "add" ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function HistoryTab({ toast }) {
  const [requests, setRequests] = useState([]);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getAllRequests(), api.getNotifyLog()])
      .then(([r, l]) => {
        setRequests(r.requests);
        setLog(l.log);
      })
      .catch((e) => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, []);

  const byWeek = requests.reduce((acc, r) => {
    (acc[r.week_date] = acc[r.week_date] || []).push(r);
    return acc;
  }, {});
  const weeks = Object.keys(byWeek).sort().reverse();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
      <div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: 18,
          }}
        >
          All ride requests
        </div>
        {loading ? (
          <div className="card">
            <div className="empty">
              <div className="empty-sub">Loading…</div>
            </div>
          </div>
        ) : weeks.length === 0 ? (
          <div className="card">
            <div className="empty">
              <div className="empty-icon">📋</div>
              <div className="empty-title">No history yet</div>
            </div>
          </div>
        ) : (
          weeks.map((w) => (
            <div key={w} className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <div>
                  <div className="card-title">🚗 {fmtDate(w)}</div>
                  <div className="card-sub">
                    {byWeek[w].length} requests ·{" "}
                    {byWeek[w].filter((r) => r.status === "approved").length}{" "}
                    approved
                  </div>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Rider</th>
                    <th>Destination</th>
                    <th>Driver</th>
                    <th>Pickup</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {byWeek[w].map((req) => (
                    <tr key={req.id}>
                      <td>
                        <div className="name-cell">
                          <div className="avatar">
                            {initials(req.rider_name)}
                          </div>
                          {req.rider_name}
                        </div>
                      </td>
                      <td style={{ fontSize: 13 }}>{req.destination}</td>
                      <td style={{ fontSize: 12.5, color: "var(--text2)" }}>
                        {req.driver_name || "—"}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 12.5,
                          color: "var(--text2)",
                        }}
                      >
                        {req.pickup_time || "—"}
                      </td>
                      <td>
                        <span className={`badge badge-${req.status}`}>
                          <span className="dot" />
                          {req.status.charAt(0).toUpperCase() +
                            req.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
      <div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: 18,
          }}
        >
          Notification history
        </div>
        <div className="card">
          {log.length === 0 ? (
            <div className="empty" style={{ padding: "28px 16px" }}>
              <div className="empty-sub">No notifications sent yet.</div>
            </div>
          ) : (
            log.map((l) => (
              <div key={l.id} className="log-row">
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {fmtDateTime(l.sent_at)}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "var(--text3)",
                      marginTop: 2,
                    }}
                  >
                    {l.rider_count} rider(s) notified
                  </div>
                </div>
                <span className="badge badge-demo">sent</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Cron helpers ────────────────────────────────────────────────────────────

const DAYS = [
  { label: "Sunday", value: "0" },
  { label: "Monday", value: "1" },
  { label: "Tuesday", value: "2" },
  { label: "Wednesday", value: "3" },
  { label: "Thursday", value: "4" },
  { label: "Friday", value: "5" },
  { label: "Saturday", value: "6" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 || 12;
  const ampm = i < 12 ? "AM" : "PM";
  return { label: `${h}:00 ${ampm}`, value: String(i) };
});

function parseCron(cron = "0 17 * * 4") {
  const parts = cron.trim().split(/\s+/);
  return { hour: parts[1] || "17", day: parts[4] || "4" };
}

function buildCron(hour, day) {
  return `0 ${hour} * * ${day}`;
}

function NotificationSettingsTab({ toast }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selDay, setSelDay] = useState("4");
  const [selHour, setSelHour] = useState("17");

  async function load() {
    setLoading(true);
    try {
      const { config } = await api.getNotifyConfig();
      setSettings(config);
      const parsed = parseCron(config.cron_schedule);
      setSelDay(parsed.day);
      setSelHour(parsed.hour);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleDayChange(val) {
    setSelDay(val);
    setSettings((s) => ({ ...s, cron_schedule: buildCron(selHour, val) }));
  }

  function handleHourChange(val) {
    setSelHour(val);
    setSettings((s) => ({ ...s, cron_schedule: buildCron(val, selDay) }));
  }

  async function save() {
    setSaving(true);
    try {
      const { config: updated } = await api.updateNotifyConfig(settings);
      setSettings(updated);
      toast("Notification settings saved ✓");
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings)
    return (
      <div className="empty">
        <div className="empty-sub">Loading…</div>
      </div>
    );

  const dayLabel = DAYS.find((d) => d.value === selDay)?.label || "Thursday";
  const hourLabel = HOURS.find((h) => h.value === selHour)?.label || "5:00 PM";

  return (
    <div style={{ maxWidth: 560 }}>
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: "var(--text)",
          marginBottom: 18,
        }}
      >
        Notification settings
      </div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="card-title">Auto-notification</div>
        </div>
        <div style={{ padding: "20px" }}>
          {/* Enable / disable toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 24,
              paddingBottom: 20,
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div>
              <div
                style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}
              >
                Send automatic notifications
              </div>
              <div
                style={{ fontSize: 12, color: "var(--text3)", marginTop: 3 }}
              >
                Emails all active riders on the schedule below asking if they
                need a ride
              </div>
            </div>
            <div
              className="toggle-wrap"
              onClick={() =>
                setSettings((s) => ({ ...s, enabled: s.enabled ? 0 : 1 }))
              }
            >
              <div className={`toggle ${settings.enabled ? "on" : ""}`}>
                <div className="toggle-thumb" />
              </div>
              <span
                style={{
                  fontSize: 13,
                  color: settings.enabled ? "var(--green)" : "var(--text3)",
                }}
              >
                {settings.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>

          {/* Day + Time pickers */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text2)",
                marginBottom: 12,
              }}
            >
              Send notification on
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div className="field" style={{ margin: 0 }}>
                <label>Day of week</label>
                <select
                  className="select-field"
                  value={selDay}
                  onChange={(e) => handleDayChange(e.target.value)}
                >
                  {DAYS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Time</label>
                <select
                  className="select-field"
                  value={selHour}
                  onChange={(e) => handleHourChange(e.target.value)}
                >
                  {HOURS.map((h) => (
                    <option key={h.value} value={h.value}>
                      {h.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Summary pill */}
            <div
              style={{
                marginTop: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "var(--blue-bg)",
                border: "1px solid rgba(108,143,255,0.2)",
                borderRadius: 20,
                padding: "5px 14px",
                fontSize: 12.5,
                color: "var(--accent)",
              }}
            >
              🔔 Will send every{" "}
              <strong style={{ marginLeft: 3 }}>
                {dayLabel} at {hourLabel}
              </strong>
            </div>
          </div>

          {/* Email message */}
          <div className="field">
            <label>Email message to riders</label>
            <input
              value={settings.message}
              onChange={(e) =>
                setSettings((s) => ({ ...s, message: e.target.value }))
              }
              placeholder="Do you want a ride to CCB this Sunday?"
            />
            <div
              style={{ fontSize: 11.5, color: "var(--text3)", marginTop: 5 }}
            >
              This is the question shown in the YES / NO email sent to riders.
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={save}
            disabled={saving}
            style={{ marginTop: 8 }}
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NotifyModal({ onClose, onDone, toast }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function send() {
    setLoading(true);
    try {
      const data = await api.sendNotification();
      setResult(data);
      toast(`Sent to ${data.sent} rider(s)`);
    } catch (e) {
      toast(e.message, "error");
      onClose();
    } finally {
      setLoading(false);
    }
  }

  if (result)
    return (
      <div className="modal-overlay" onClick={onDone}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h2>Notification sent ✓</h2>
          <p className="modal-sub">Asking riders about this Sunday's ride</p>
          <div style={{ maxHeight: 220, overflow: "auto" }}>
            {(result.results || []).map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border)",
                  fontSize: 13,
                }}
              >
                <span>{r.rider}</span>
                <span
                  className={`badge badge-${r.status === "sent" ? "approved" : r.status === "demo" ? "demo" : "declined"}`}
                >
                  {r.status}
                </span>
              </div>
            ))}
          </div>
          <div className="modal-footer">
            <button className="btn btn-primary" onClick={onDone}>
              Done
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Send ride notification</h2>
        <p className="modal-sub">
          Emails all active riders asking if they need a ride this Sunday.
          Normally fires automatically per the schedule.
        </p>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={send} disabled={loading}>
            {loading ? "Sending…" : "🔔 Send now"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

// ─── Admins tab ───────────────────────────────────────────────────────────────

function AdminsTab({ toast, currentUser }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const superAdminsCount = admins.filter((a) => a.is_super_admin === 1).length;
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const { admins } = await api.getAdmins();
      setAdmins(admins);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function invite(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { admin } = await api.addAdmin(form);
      setAdmins((as) => [...as, admin]);
      setForm({ name: "", email: "" });
      setShowAdd(false);
      toast(`Invite sent to ${admin.name} ✓`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function resend(id, name) {
    try {
      await api.resendAdminInvite(id);
      toast(`Invite resent to ${name}`);
    } catch (e) {
      toast(e.message, "error");
    }
  }

  async function remove(id, name) {
    if (
      !window.confirm(
        `Remove ${name} as admin? They will lose access immediately.`,
      )
    )
      return;
    try {
      await api.deleteAdmin(id);
      setAdmins((as) => as.filter((a) => a.id !== id));
      toast(`${name} removed`);
    } catch (e) {
      toast(e.message, "error");
    }
  }

  async function toggleRole(id, name, isCurrentlySuper) {
    const action = isCurrentlySuper ? "demote" : "promote";
    if (
      !window.confirm(
        `Are you sure you want to ${action} ${name} ${
          isCurrentlySuper ? "to a regular Admin" : "to a Super Admin"
        }?`
      )
    )
      return;
    try {
      const { admin } = await api.updateAdminRole(id, !isCurrentlySuper);
      setAdmins((as) =>
        as.map((a) => (a.id === id ? { ...a, is_super_admin: admin.is_super_admin } : a))
      );
      toast(
        `${name} is now ${
          admin.is_super_admin === 1 ? "a Super Admin" : "a regular Admin"
        }`
      );
    } catch (e) {
      toast(e.message, "error");
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: 4,
            }}
          >
            Admins
          </div>
          <div style={{ fontSize: 12, color: "var(--text3)" }}>
            {admins.length} admin{admins.length !== 1 ? "s" : ""} · Invite
            others to manage RideSync
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowAdd((v) => !v);
            setError("");
          }}
        >
          {showAdd ? "Cancel" : "+ Invite admin"}
        </button>
      </div>

      {showAdd && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: 14,
            }}
          >
            Invite a new admin
          </div>
          {error && (
            <div
              style={{
                background: "var(--red-bg)",
                border: "1px solid rgba(248,113,113,0.3)",
                borderRadius: "var(--radius)",
                padding: "9px 12px",
                fontSize: 13,
                color: "var(--red)",
                marginBottom: 14,
              }}
            >
              {error}
            </div>
          )}
          <form onSubmit={invite}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div className="field" style={{ margin: 0 }}>
                <label>Full name *</label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Jane Smith"
                  autoFocus
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Email address *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="jane@example.com"
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Sending invite…" : "📧 Send invite"}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty">
            <div className="empty-sub">Loading…</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Account</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td>
                    <div className="name-cell">
                      <div
                        className="avatar"
                        style={{
                          background:
                            currentUser?.email === admin.email
                              ? "var(--accent2)"
                              : undefined,
                        }}
                      >
                        {initials(admin.name)}
                      </div>
                      <div>
                        <span style={{ fontWeight: 500 }}>{admin.name}</span>
                        {currentUser?.email === admin.email && (
                          <span
                            className="badge badge-demo"
                            style={{ marginLeft: 8, fontSize: 10 }}
                          >
                            You
                          </span>
                        )}
                        {admin.is_super_admin === 1 && (
                          <span
                            className="badge"
                            style={{
                              marginLeft: 4,
                              fontSize: 10,
                              background: "rgba(251,191,36,0.15)",
                              color: "var(--amber)",
                            }}
                          >
                            Super admin
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 12.5,
                      color: "var(--text2)",
                    }}
                  >
                    {admin.email}
                  </td>
                  <td>
                    {admin.account_setup ? (
                      <span className="badge badge-approved">
                        <span className="dot" />
                        Active
                      </span>
                    ) : (
                      <span className="badge badge-warn">
                        <span className="dot" />
                        Pending setup
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="action-row">
                      {!admin.account_setup && (
                        <button
                          className="btn btn-sm"
                          onClick={() => resend(admin.id, admin.name)}
                        >
                          Resend invite
                        </button>
                      )}
                      {currentUser?.isSuperAdmin &&
                        currentUser?.email !== admin.email &&
                        admin.account_setup === 1 && (
                          <>
                            {admin.is_super_admin === 1 ? (
                              <button
                                className="btn btn-sm"
                                onClick={() => toggleRole(admin.id, admin.name, true)}
                                disabled={superAdminsCount <= 1}
                                title={superAdminsCount <= 1 ? "Cannot demote the only super admin" : "Demote to regular admin"}
                              >
                                Demote
                              </button>
                            ) : (
                              <button
                                className="btn btn-sm"
                                onClick={() => toggleRole(admin.id, admin.name, false)}
                                disabled={superAdminsCount >= 5}
                                title={superAdminsCount >= 5 ? "Maximum of 5 super admins reached" : "Promote to super admin"}
                              >
                                Promote
                              </button>
                            )}
                            {!admin.is_super_admin && (
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => remove(admin.id, admin.name)}
                              >
                                Remove
                              </button>
                            )}
                          </>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const TABS = [
  { id: "requests", label: "Ride requests", icon: "🚗" },
  { id: "riders", label: "Riders", icon: "👥" },
  { id: "drivers", label: "Drivers", icon: "🧑‍✈️" },
  { id: "history", label: "History", icon: "📋" },
  { id: "notifications", label: "Notifications", icon: "🔔" },
  { id: "admins", label: "Admins", icon: "🛡️", superAdminOnly: true },
];

function AdminDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("requests");
  const [stats, setStats] = useState(null);
  const [showNotify, setShowNotify] = useState(false);
  const { toasts, toast } = useToast();

  async function loadStats() {
    try {
      const { stats } = await api.getStats();
      setStats(stats);
    } catch (_) {}
  }

  useEffect(() => {
    loadStats();
  }, [tab]);

  // Periodically verify this admin's session is still valid (every 60 seconds)
  // If the super admin removed this account, they get signed out automatically
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await api.getMe();
      } catch {
        // getMe failed — account removed or token invalid, api.js will reload
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">
            <div className="logo-icon">🚗</div>
            <div>
              <div className="logo-text">RideSync</div>
              <div className="logo-sub">admin panel</div>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {TABS.filter((t) => !t.superAdminOnly || user?.isSuperAdmin).map(
            (t) => (
              <button
                key={t.id}
                className={`nav-item ${tab === t.id ? "active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                <span className="nav-icon">{t.icon}</span>
                <span>{t.label}</span>
                {t.id === "requests" && (stats?.thisWeek?.pending || 0) > 0 && (
                  <span className="nav-badge amber">
                    {stats.thisWeek.pending}
                  </span>
                )}
              </button>
            ),
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="schedule-chip">
            <div className="schedule-chip-label">Next ride</div>
            <div className="schedule-chip-value">
              {stats ? `Sunday, ${fmtDate(stats.thisWeek?.date)}` : "Sunday"}
              <span>Notification every Thursday at 5 PM</span>
            </div>
          </div>
          <div
            style={{
              marginTop: 10,
              padding: "0 4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: 12, color: "var(--text3)" }}>
              {user.name}
            </div>
            <button className="btn btn-sm" onClick={onLogout}>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div>
            <div className="page-title">
              {TABS.find((t) => t.id === tab)?.label}
            </div>
            {stats && (
              <div className="page-sub">
                {stats.activeRiders} riders · {stats.activeDrivers} drivers ·
                Sunday {fmtDate(stats.thisWeek?.date)}
              </div>
            )}
          </div>
          <div className="topbar-actions">
            <button
              className="btn notify-btn"
              onClick={() => setShowNotify(true)}
            >
              🔔 Send notification
            </button>
          </div>
        </div>

        <div className="content">
          {stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Riders</div>
                <div className="stat-value">{stats.totalRiders}</div>
                <div className="stat-sub">{stats.activeRiders} active</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Drivers</div>
                <div className="stat-value">{stats.totalDrivers}</div>
                <div className="stat-sub">{stats.activeDrivers} active</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">This Sunday</div>
                <div className="stat-value" style={{ color: "var(--green)" }}>
                  {stats.thisWeek.approved}
                </div>
                <div className="stat-sub">
                  {stats.thisWeek.pending} pending · {stats.thisWeek.total}{" "}
                  total
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Last notified</div>
                <div className="stat-value" style={{ fontSize: 18 }}>
                  {stats.lastNotification
                    ? fmtDateTime(stats.lastNotification.sent_at)
                    : "—"}
                </div>
                <div className="stat-sub">
                  {stats.lastNotification
                    ? `${stats.lastNotification.rider_count} rider(s)`
                    : "Never sent"}
                  {stats.notificationEnabled ? (
                    <span style={{ color: "var(--green)", marginLeft: 8 }}>
                      ● Auto on
                    </span>
                  ) : (
                    <span style={{ color: "var(--text3)", marginLeft: 8 }}>
                      ● Auto off
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "requests" && <RequestsTab toast={toast} />}
          {tab === "riders" && <RidersTab toast={toast} />}
          {tab === "drivers" && <DriversTab toast={toast} />}
          {tab === "history" && <HistoryTab toast={toast} />}
          {tab === "notifications" && <NotificationSettingsTab toast={toast} />}
          {tab === "admins" && user?.isSuperAdmin && (
            <AdminsTab toast={toast} currentUser={user} />
          )}
        </div>
      </div>

      {showNotify && (
        <NotifyModal
          onClose={() => setShowNotify(false)}
          onDone={() => {
            setShowNotify(false);
            loadStats();
          }}
          toast={toast}
        />
      )}
      <ToastContainer toasts={toasts} />
    </div>
  );
}

// ─── Driver Dashboard ─────────────────────────────────────────────────────────

function DriverDashboard({ user, onLogout }) {
  const { toast, toasts } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ requests: [], driver: {}, week: "" });
  
  const [availabilityStatus, setAvailabilityStatus] = useState(1);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await api.getDriverDashboard();
      setData(res);
      setAvailabilityStatus(res.driver.availability_status ?? 1);
      setAvailabilityMessage(res.driver.availability_message || "");
      setCapacity(res.driver.capacity ?? 4);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }
  
  async function saveStatus(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateDriverStatus({
        availability_status: availabilityStatus,
        availability_message: availabilityMessage,
        capacity: capacity
      });
      toast("Status updated");
    } catch(e) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;

  return (
    <div style={{ padding: "40px 20px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>🚗 Driver Dashboard</h1>
          <div style={{ color: "var(--text3)", marginTop: 4 }}>Welcome, {user.name}</div>
        </div>
        <button onClick={onLogout} className="btn">Sign out</button>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>My Status (Week of {fmtDate(data.week)})</h2>
        <form onSubmit={saveStatus}>
          <div className="field" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input 
              type="checkbox" 
              id="avail"
              checked={availabilityStatus === 1} 
              onChange={e => setAvailabilityStatus(e.target.checked ? 1 : 0)} 
              style={{ width: 18, height: 18 }}
            />
            <label htmlFor="avail" style={{ margin: 0, fontWeight: 500 }}>I am available to drive this week</label>
          </div>
          
          <div className="field">
            <label>Message to Admin (Optional)</label>
            <textarea
              value={availabilityMessage}
              onChange={e => setAvailabilityMessage(e.target.value)}
              placeholder="e.g. Can only drive in the morning..."
              rows={2}
            />
          </div>
          
          <div className="field">
            <label>Car Seat Capacity</label>
            <input
              type="number"
              min={1}
              max={15}
              value={capacity}
              onChange={e => setCapacity(parseInt(e.target.value, 10))}
              style={{ width: 100 }}
            />
          </div>
          
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Update Status"}
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>My Riders This Week</h2>
        {data.requests.length === 0 ? (
          <div style={{ color: "var(--text3)", fontStyle: "italic" }}>No riders assigned yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.requests.map(r => (
              <div key={r.id} style={{ padding: 16, border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{r.rider_name}</div>
                <div style={{ color: "var(--text2)", fontSize: 14, marginTop: 4 }}>📍 Pickup: {r.pickup_address || r.rider_address || "Not specified"}</div>
                {r.pickup_time && <div style={{ color: "var(--text2)", fontSize: 14, marginTop: 4 }}>⏰ Time: {r.pickup_time}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}

// ─── Root App — routing ───────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminExists, setAdminExists] = useState(true);

  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const isSetupPage = currentPath === "/setup-account";

  useEffect(() => {
    async function init() {
      // Check if this is the account setup page
      if (isSetupPage) {
        setLoading(false);
        return;
      }

      // Check if admin exists yet
      try {
        const { exists } = await api.checkAdminExists();
        setAdminExists(exists);
        if (!exists) {
          setLoading(false);
          return;
        }
      } catch {
        setLoading(false);
        return;
      }

      // Try to restore session from token
      const token = localStorage.getItem("ccb_token");
      if (token) {
        try {
          const { user } = await api.getMe();
          setUser(user);
        } catch {
          api.clearSession();
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  function handleLogin(u) {
    if (!u) {
      // null means setup complete — go to login page
      api.clearSession();
      setUser(null);
      window.history.replaceState({}, "", "/");
      setCurrentPath("/"); // trigger re-render so isSetupPage becomes false
      return;
    }
    const userObj =
      typeof u === "string" ? { role: u, name: api.getName() } : u;
    setUser(userObj);
    setAdminExists(true);
    window.history.replaceState({}, "", "/");
    setCurrentPath("/");
  }
  function handleLogout() {
    api.clearSession();
    setUser(null);
  }

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}
      >
        <div style={{ fontSize: 32 }}>🚗</div>
      </div>
    );

  // Account setup page (from email link)
  if (isSetupPage) return <SetupAccountPage onSetup={handleLogin} />;

  // First-time admin setup
  if (!adminExists) return <SetupAdminPage onSetup={handleLogin} />;

  // Not logged in
  if (!user) return <LoginPage onLogin={handleLogin} />;

  // Rider portal
  if (user.role === "rider")
    return <RiderPortal user={user} onLogout={handleLogout} />;

  // Driver portal
  if (user.role === "driver")
    return <DriverDashboard user={user} onLogout={handleLogout} />;

  // Admin dashboard
  return <AdminDashboard user={user} onLogout={handleLogout} />;
}