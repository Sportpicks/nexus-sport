"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  submitPayment,
  verifyPayment,
  type PaymentSubmitPayload,
} from "@/lib/api";
import { saveToken } from "@/lib/tokens";

interface Props {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  priceUsd: number;
  onClose: () => void;
}

type Step = "form" | "loading" | "pending" | "error" | "success";

const YAPE_NUMBER = process.env.NEXT_PUBLIC_YAPE_NUMBER || "999-000-000";
const PLIN_NUMBER = process.env.NEXT_PUBLIC_PLIN_NUMBER || "999-000-001";

const btn = {
  base: {
    background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "12px 0",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
  } as React.CSSProperties,
};

const input: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  padding: "12px 14px",
  fontSize: 14,
  color: "#F1F5F9",
  outline: "none",
  boxSizing: "border-box",
};

export default function PaywallModal({
  matchId,
  homeTeam,
  awayTeam,
  priceUsd,
  onClose,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [method, setMethod] = useState<"yape" | "plin">("yape");
  const [opNumber, setOpNumber] = useState("");
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const destNumber = method === "yape" ? YAPE_NUMBER : PLIN_NUMBER;

  async function tryVerify(op: string) {
    setStep("loading");
    setErrorMsg("");
    try {
      const result = await verifyPayment(op);
      if (result.token && result.expires_at) {
        saveToken(matchId, result.token, result.expires_at);
        setStep("success");
        setTimeout(() => router.push(`/report/${matchId}`), 1000);
      } else {
        setStep("pending");
      }
    } catch (err: unknown) {
      setStep("error");
      setErrorMsg(err instanceof Error ? err.message : "Error al verificar el pago.");
    }
  }

  async function handleSubmit() {
    if (!opNumber.trim() || !email.trim()) {
      setErrorMsg("Completa todos los campos.");
      return;
    }
    setStep("loading");
    setErrorMsg("");
    const op = opNumber.trim();
    try {
      const payload: PaymentSubmitPayload = {
        match_id: matchId,
        op_number: op,
        method,
        email: email.trim(),
      };
      await submitPayment(payload);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("422") && !msg.includes("409")) {
        setStep("error");
        setErrorMsg(msg || "Error al registrar el pago.");
        return;
      }
    }
    await tryVerify(op);
  }

  async function handleRetry() {
    await tryVerify(opNumber.trim());
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#1E293B",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 16, color: "#F1F5F9" }}>
            🔐 Acceso al reporte
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#64748B",
              fontSize: 20,
              cursor: "pointer",
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Match */}
          <p style={{ textAlign: "center", color: "#94A3B8", fontSize: 13, margin: 0 }}>
            {homeTeam} vs {awayTeam}
          </p>

          {/* ── form ── */}
          {step === "form" && (
            <>
              {/* Method selector */}
              <div style={{ display: "flex", gap: 8 }}>
                {(["yape", "plin"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    style={{
                      flex: 1,
                      padding: "9px 0",
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      background: method === m ? "#6366F1" : "transparent",
                      color: method === m ? "#fff" : "#94A3B8",
                      border: method === m
                        ? "1px solid #6366F1"
                        : "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    {m === "yape" ? "🟣 Yape" : "🔵 Plin"}
                  </button>
                ))}
              </div>

              {/* Destination */}
              <div
                style={{
                  background: "rgba(99,102,241,0.1)",
                  border: "1px solid rgba(99,102,241,0.3)",
                  borderRadius: 12,
                  padding: "14px 16px",
                  textAlign: "center",
                }}
              >
                <p style={{ margin: "0 0 4px", fontSize: 12, color: "#94A3B8" }}>
                  Envía el pago a:
                </p>
                <p style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 700, color: "#A78BFA" }}>
                  {destNumber}
                </p>
                <p style={{ margin: 0, fontSize: 13, color: "#94A3B8" }}>
                  Monto:{" "}
                  <span style={{ color: "#34D399", fontWeight: 700 }}>
                    S/ {(priceUsd * 3.7).toFixed(2)}
                  </span>{" "}
                  ≈{" "}
                  <span style={{ color: "#F1F5F9" }}>USD {priceUsd.toFixed(2)}</span>
                </p>
              </div>

              {/* Inputs */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  type="email"
                  placeholder="Tu correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={input}
                />
                <input
                  type="text"
                  placeholder="N° de operación"
                  value={opNumber}
                  onChange={(e) => setOpNumber(e.target.value)}
                  style={input}
                />
              </div>

              {errorMsg && (
                <p style={{ color: "#F87171", fontSize: 13, textAlign: "center", margin: 0 }}>
                  {errorMsg}
                </p>
              )}

              <button onClick={handleSubmit} style={btn.base}>
                Verificar pago →
              </button>
            </>
          )}

          {/* ── loading ── */}
          {step === "loading" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 0" }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                border: "3px solid rgba(99,102,241,0.2)",
                borderTop: "3px solid #6366F1",
                animation: "spin 0.8s linear infinite",
              }} />
              <p style={{ color: "#94A3B8", fontSize: 14, margin: 0 }}>Verificando pago…</p>
            </div>
          )}

          {/* ── pending ── */}
          {step === "pending" && (
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: 36, margin: 0 }}>⏳</p>
              <p style={{ color: "#F1F5F9", fontWeight: 600, margin: 0 }}>
                Pago pendiente de confirmación
              </p>
              <p style={{ color: "#94A3B8", fontSize: 12, margin: 0 }}>
                N° operación: <span style={{ color: "#A78BFA" }}>{opNumber}</span>
              </p>
              <button onClick={handleRetry} style={btn.base}>
                Reintentar verificación
              </button>
              <button
                onClick={() => setStep("form")}
                style={{ background: "none", border: "none", color: "#64748B", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
              >
                Cambiar N° de operación
              </button>
            </div>
          )}

          {/* ── error ── */}
          {step === "error" && (
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: 36, margin: 0 }}>⚠️</p>
              <p style={{ color: "#F87171", fontSize: 13, margin: 0 }}>{errorMsg}</p>
              <button onClick={handleRetry} style={btn.base}>
                Intentar de nuevo
              </button>
              <button
                onClick={() => setStep("form")}
                style={{ background: "none", border: "none", color: "#64748B", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
              >
                Cambiar N° de operación
              </button>
            </div>
          )}

          {/* ── success ── */}
          {step === "success" && (
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 10, padding: "16px 0" }}>
              <p style={{ fontSize: 40, margin: 0 }}>✅</p>
              <p style={{ color: "#34D399", fontWeight: 700, margin: 0 }}>¡Pago verificado!</p>
              <p style={{ color: "#94A3B8", fontSize: 13, margin: 0 }}>Redirigiendo al reporte…</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
