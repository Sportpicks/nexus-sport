"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  getAdminDashboard,
  getAdminPayments,
  adminVerifyPayment,
  adminRejectPayment,
  type AdminDashboard,
  type AdminPayment,
} from "@/lib/api";

const C = {
  bg:      "#0B1220",
  card:    "#1E293B",
  border:  "rgba(255,255,255,0.08)",
  primary: "#F1F5F9",
  muted:   "#94A3B8",
  dim:     "#64748B",
  accent:  "#6366F1",
  violet:  "#A78BFA",
  green:   "#34D399",
  amber:   "#F59E0B",
  red:     "#F87171",
};

const STATUS_COLOR: Record<string, string> = {
  pending:  C.amber,
  verified: C.green,
  rejected: C.red,
};

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px", flex: 1, minWidth: 140 }}>
      <p style={{ margin: "0 0 6px", fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: color ?? C.primary }}>{value}</p>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? C.muted;
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: `${color}22`, color, border: `1px solid ${color}55`,
    }}>
      {status}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AdminPage() {
  const [apiKey, setApiKey] = useState<string>("");
  const [keyInput, setKeyInput] = useState("");
  const [keyError, setKeyError] = useState("");

  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load saved key
  useEffect(() => {
    const saved = localStorage.getItem("nexus_admin_key");
    if (saved) setApiKey(saved);
  }, []);

  const load = useCallback(async (key: string) => {
    setLoading(true);
    setError("");
    try {
      const [dashResult, pmtsResult] = await Promise.allSettled([
        getAdminDashboard(key),
        getAdminPayments(key),
      ]);

      if (dashResult.status === "fulfilled") {
        setDashboard(dashResult.value);
      } else {
        setDashboard({ total_pagos: 0, pagos_pendientes: 0, pagos_verificados: 0, ingresos_total_usd: 0 });
      }

      if (pmtsResult.status === "fulfilled") {
        setPayments(pmtsResult.value);
      } else {
        const msg = pmtsResult.reason instanceof Error ? pmtsResult.reason.message : "Error cargando pagos";
        setError(msg);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cargando datos");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!apiKey) return;
    load(apiKey);
    intervalRef.current = setInterval(() => load(apiKey), 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [apiKey, load]);

  async function handleLogin() {
    if (!keyInput.trim()) { setKeyError("Ingresa la SECRET_KEY"); return; }
    setKeyError("");
    setLoading(true);
    try {
      await getAdminDashboard(keyInput.trim());
      localStorage.setItem("nexus_admin_key", keyInput.trim());
      setApiKey(keyInput.trim());
    } catch {
      setKeyError("API key inválida o servidor no disponible");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(id: number) {
    setActionLoading(id);
    try {
      await adminVerifyPayment(id, apiKey);
      await load(apiKey);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al aprobar");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(id: number) {
    setActionLoading(id);
    try {
      await adminRejectPayment(id, apiKey);
      await load(apiKey);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error al rechazar");
    } finally {
      setActionLoading(null);
    }
  }

  // ── Login screen ────────────────────────────────────────────────────────────
  if (!apiKey) {
    return (
      <main style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 380, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32 }}>
          <p style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: C.primary }}>Panel Admin</p>
          <p style={{ margin: "0 0 24px", fontSize: 13, color: C.muted }}>Nexus Sport · ingresa tu SECRET_KEY</p>
          <input
            type="password"
            placeholder="SECRET_KEY"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%", background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`,
              borderRadius: 10, padding: "12px 14px", fontSize: 14, color: C.primary,
              outline: "none", boxSizing: "border-box", marginBottom: 10,
            }}
          />
          {keyError && <p style={{ color: C.red, fontSize: 12, margin: "0 0 10px" }}>{keyError}</p>}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%", background: "linear-gradient(135deg, #6366F1, #8B5CF6)", color: "#fff",
              border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Verificando…" : "Entrar →"}
          </button>
        </div>
      </main>
    );
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────
  return (
    <main style={{ minHeight: "100vh", background: C.bg, color: C.primary, paddingBottom: 60 }}>
      {/* Header */}
      <header style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: 16, color: C.primary }}>Panel Admin · Nexus Sport</span>
            {dashboard && (
              <span style={{ marginLeft: 12, background: "rgba(52,211,153,0.15)", color: C.green, border: `1px solid ${C.green}44`, borderRadius: 20, padding: "2px 12px", fontSize: 12, fontWeight: 700 }}>
                USD {dashboard.ingresos_total_usd.toFixed(2)} ingresos
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {loading && <span style={{ fontSize: 12, color: C.dim }}>Actualizando…</span>}
            <button
              onClick={() => load(apiKey)}
              style={{ background: "rgba(99,102,241,0.15)", border: `1px solid ${C.accent}44`, color: C.accent, borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}
            >
              ↻ Recargar
            </button>
            <button
              onClick={() => { localStorage.removeItem("nexus_admin_key"); setApiKey(""); }}
              style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>
        {error && (
          <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 12, padding: "12px 16px", color: C.red, marginBottom: 20, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Stats */}
        {dashboard && (
          <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
            <StatCard label="Total pagos" value={dashboard.total_pagos} />
            <StatCard label="Pendientes" value={dashboard.pagos_pendientes} color={C.amber} />
            <StatCard label="Verificados" value={dashboard.pagos_verificados} color={C.green} />
            <StatCard label="Ingresos USD" value={`$${dashboard.ingresos_total_usd.toFixed(2)}`} color={C.green} />
          </div>
        )}

        {/* Table */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.violet, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              💳 Pagos ({payments.length})
            </span>
          </div>

          {payments.length === 0 && !loading ? (
            <p style={{ textAlign: "center", color: C.muted, padding: "40px 0", fontSize: 14 }}>No hay pagos registrados.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {["ID", "Usuario", "Partido", "Monto", "Método", "Estado", "Fecha", "Acciones"].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.dim, fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                      <td style={{ padding: "11px 14px", color: C.dim }}>#{p.id}</td>
                      <td style={{ padding: "11px 14px", color: C.muted, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.email ?? "—"}
                      </td>
                      <td style={{ padding: "11px 14px", color: C.primary, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.match_name ?? "—"}
                      </td>
                      <td style={{ padding: "11px 14px", color: C.green, fontWeight: 600 }}>
                        ${Number(p.amount ?? 0).toFixed(2)}
                      </td>
                      <td style={{ padding: "11px 14px", color: C.muted, textTransform: "capitalize" }}>{p.method}</td>
                      <td style={{ padding: "11px 14px" }}><Badge status={p.status} /></td>
                      <td style={{ padding: "11px 14px", color: C.dim, whiteSpace: "nowrap" }}>
                        {p.created_at ? formatDate(p.created_at) : "—"}
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        {p.status === "pending" ? (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              onClick={() => handleVerify(p.id)}
                              disabled={actionLoading === p.id}
                              style={{
                                background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.4)",
                                color: C.green, borderRadius: 6, padding: "4px 10px", fontSize: 12,
                                fontWeight: 600, cursor: "pointer", opacity: actionLoading === p.id ? 0.5 : 1,
                              }}
                            >
                              Aprobar
                            </button>
                            <button
                              onClick={() => handleReject(p.id)}
                              disabled={actionLoading === p.id}
                              style={{
                                background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.35)",
                                color: C.red, borderRadius: 6, padding: "4px 10px", fontSize: 12,
                                fontWeight: 600, cursor: "pointer", opacity: actionLoading === p.id ? 0.5 : 1,
                              }}
                            >
                              Rechazar
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: C.dim, fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: C.dim, marginTop: 20 }}>
          Auto-refresh cada 30s · {new Date().toLocaleTimeString("es-PE")}
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
