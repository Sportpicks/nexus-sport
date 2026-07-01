"use client";

import { useState } from "react";
import type { Match } from "@/lib/api";
import PaywallModal from "./PaywallModal";

const PREMIUM_ITEMS = [
  "xG y modelo Dixon-Coles",
  "Hándicap asiático",
  "Córners proyectados",
  "Tarjetas amarillas",
  "Value bets detectadas",
  "Penales y prórroga detallado",
];

interface Props { match: Match }

export default function MatchRowPremium({ match }: Props) {
  const [showPaywall, setShowPaywall] = useState(false);

  return (
    <>
      <div style={{ padding: "0 20px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ position: "relative", marginTop: 16 }}>
          {/* Blurred content */}
          <div style={{ filter: "blur(4px)", userSelect: "none", pointerEvents: "none" }}>
            {PREMIUM_ITEMS.map((item) => (
              <div key={item} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}>
                <span style={{ fontSize: 13, color: "#94A3B8" }}>{item}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#F1F5F9" }}>██%</span>
              </div>
            ))}
          </div>

          {/* Overlay */}
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(11,18,32,0.7)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 12, borderRadius: 10,
          }}>
            <span style={{ fontSize: 28 }}>🔒</span>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#F1F5F9", textAlign: "center" }}>
              Análisis completo
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#94A3B8", textAlign: "center" }}>
              Desbloquea xG, hándicap, córners y value bets
            </p>
            <button
              onClick={() => setShowPaywall(true)}
              style={{
                background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                color: "#fff", border: "none", borderRadius: 10,
                padding: "10px 24px", fontSize: 13, fontWeight: 700,
                cursor: "pointer", marginTop: 4,
              }}
            >
              Desbloquear · S/{(match.price_usd * 3.7).toFixed(2)}
            </button>
          </div>
        </div>
      </div>

      {showPaywall && (
        <PaywallModal
          matchId={match.id}
          homeTeam={match.home_team}
          awayTeam={match.away_team}
          priceUsd={match.price_usd}
          onClose={() => setShowPaywall(false)}
        />
      )}
    </>
  );
}
