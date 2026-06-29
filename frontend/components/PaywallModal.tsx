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

type Step = "instructions" | "verify" | "loading" | "error" | "success";

const YAPE_NUMBER = process.env.NEXT_PUBLIC_YAPE_NUMBER || "999-000-000";
const PLIN_NUMBER = process.env.NEXT_PUBLIC_PLIN_NUMBER || "999-000-001";

export default function PaywallModal({
  matchId,
  homeTeam,
  awayTeam,
  priceUsd,
  onClose,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("instructions");
  const [method, setMethod] = useState<"yape" | "plin">("yape");
  const [opNumber, setOpNumber] = useState("");
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const destNumber = method === "yape" ? YAPE_NUMBER : PLIN_NUMBER;

  async function handleVerify() {
    if (!opNumber.trim() || !email.trim()) {
      setErrorMsg("Completa todos los campos.");
      return;
    }
    setStep("loading");
    setErrorMsg("");

    try {
      const payload: PaymentSubmitPayload = {
        match_id: matchId,
        op_number: opNumber.trim(),
        method,
        email: email.trim(),
      };

      // Submit payment record
      await submitPayment(payload);

      // Verify and get token
      const result = await verifyPayment(opNumber.trim());

      if (result.token && result.expires_at) {
        saveToken(matchId, result.token, result.expires_at);
        setStep("success");
        setTimeout(() => router.push(`/report/${matchId}`), 1200);
      } else {
        setStep("error");
        setErrorMsg(
          result.message ||
            "Pago pendiente de verificación. Inténtalo en unos minutos."
        );
      }
    } catch (err: unknown) {
      setStep("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Error al procesar el pago."
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 p-5">
          <h2 className="text-lg font-semibold">
            🔐 Acceso al reporte
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Match info */}
          <p className="text-center text-slate-300 text-sm">
            {homeTeam} vs {awayTeam}
          </p>

          {/* Step: instructions */}
          {(step === "instructions" || step === "verify") && (
            <>
              {/* Method selector */}
              <div className="flex gap-2">
                {(["yape", "plin"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                      method === m
                        ? "bg-violet-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {m === "yape" ? "🟣 Yape" : "🔵 Plin"}
                  </button>
                ))}
              </div>

              {/* Payment instructions */}
              <div className="rounded-xl bg-slate-800 p-4 space-y-2 text-sm">
                <p className="text-slate-400">Envía el pago a:</p>
                <p className="text-2xl font-bold tracking-wider text-center text-white">
                  {destNumber}
                </p>
                <p className="text-slate-400 text-center">
                  Monto:{" "}
                  <span className="text-green-400 font-semibold">
                    S/ {(priceUsd * 3.7).toFixed(2)}
                  </span>{" "}
                  ≈{" "}
                  <span className="text-slate-300">
                    USD {priceUsd.toFixed(2)}
                  </span>
                </p>
              </div>

              {/* Form */}
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="Tu correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-violet-500"
                />
                <input
                  type="text"
                  placeholder="N° de operación (ej. 123456789)"
                  value={opNumber}
                  onChange={(e) => setOpNumber(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {errorMsg && (
                <p className="text-red-400 text-sm text-center">{errorMsg}</p>
              )}

              <button
                onClick={handleVerify}
                className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white hover:bg-violet-500 transition-colors"
              >
                Verificar pago →
              </button>
            </>
          )}

          {/* Step: loading */}
          {step === "loading" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="h-10 w-10 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
              <p className="text-slate-300 text-sm">Verificando pago...</p>
            </div>
          )}

          {/* Step: error */}
          {step === "error" && (
            <div className="space-y-4 text-center py-2">
              <p className="text-4xl">⚠️</p>
              <p className="text-red-400 text-sm">{errorMsg}</p>
              <button
                onClick={() => setStep("instructions")}
                className="text-violet-400 hover:text-violet-300 text-sm underline"
              >
                Intentar de nuevo
              </button>
            </div>
          )}

          {/* Step: success */}
          {step === "success" && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <p className="text-4xl">✅</p>
              <p className="text-green-400 font-semibold">
                ¡Pago verificado!
              </p>
              <p className="text-slate-400 text-sm">
                Redirigiendo al reporte…
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
