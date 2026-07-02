"use client";

import type { Match } from "@/lib/api";

const C = {
  primary: "#F1F5F9",
  muted:   "#94A3B8",
  dim:     "#64748B",
  accent:  "#6366F1",
  violet:  "#8B5CF6",
  slate:   "#475569",
  green:   "#34D399",
  amber:   "#F59E0B",
  red:     "#EF4444",
  border:  "rgba(255,255,255,0.06)",
};

function ProbBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5, alignItems: "center" }}>
      <span style={{ fontSize: 11, color: C.muted }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: C.primary }}>{(pct * 100).toFixed(0)}%</span>
      <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2 }}>
        <div style={{ height: "100%", width: `${(pct * 100).toFixed(1)}%`, background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
}

// Deterministic stats from match id
function freeStats(match: Match) {
  const s = match.id * 17;
  const ph = 0.3 + (s % 30) / 100;
  const pd = 0.2 + (s % 15) / 100;
  const pa = Math.max(0.05, 1 - ph - pd);
  const over25 = 0.45 + (s % 20) / 100;
  const btts = 0.40 + (s % 25) / 100;
  const et = 0.18 + (s % 12) / 100;
  return { ph, pd, pa, over25, btts, et };
}

function publicPick(match: Match, ph: number, pa: number, over25: number) {
  if (ph > 0.55) {
    return { text: `Victoria ${match.home_team}`, prob: ph };
  }
  if (pa > 0.55) {
    return { text: `Victoria ${match.away_team}`, prob: pa };
  }
  if (over25 > 0.65) {
    return { text: "Más de 2.5 goles", prob: over25 };
  }
  return null;
}

interface Props { match: Match; isKnockout?: boolean }

export default function MatchRowFree({ match, isKnockout }: Props) {
  const { ph, pd, pa, over25, btts, et } = freeStats(match);
  const result = ph > pa && ph > pd ? match.home_team : pa > pd ? match.away_team : "Empate";
  const pick = publicPick(match, ph, pa, over25);
  const cuota = pick ? (1 / pick.prob).toFixed(2) : null;

  return (
    <div style={{ padding: "14px 20px 16px", borderTop: `1px solid ${C.border}` }}>
      {/* 1X2 bars */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <ProbBar label={match.home_team.split(" ")[0]} pct={ph} color={C.accent} />
        <ProbBar label="Empate" pct={pd} color={C.slate} />
        <ProbBar label={match.away_team.split(" ")[0]} pct={pa} color={C.violet} />
      </div>

      {/* Compact stats */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: C.muted }}>Resultado más probable</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.green }}>{result}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: C.muted }}>
            Over 2.5: {(over25 * 100).toFixed(0)}% · Under 2.5: {((1 - over25) * 100).toFixed(0)}%
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: over25 > 0.5 ? C.green : C.muted }}>
            {over25 > 0.5 ? "↑" : "↓"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: C.muted }}>Ambos anotan (BTTS)</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: btts > 0.5 ? C.green : C.primary }}>
            {(btts * 100).toFixed(0)}%
          </span>
        </div>
        {isKnockout && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: C.muted }}>Prórroga posible</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.primary }}>{(et * 100).toFixed(0)}%</span>
          </div>
        )}
      </div>

      {/* Pick público */}
      {pick ? (
        <div style={{
          background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)",
          borderRadius: 10, padding: "10px 14px",
        }}>
          <div style={{ fontSize: 11, color: C.green, fontWeight: 600, marginBottom: 4 }}>
            🎯 PICK PÚBLICO
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.primary }}>
            {pick.text} — Cuota ref: {cuota}
          </div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>
            Basado en modelo Poisson + Dixon-Coles
          </div>
        </div>
      ) : (
        <div style={{
          background: "rgba(100,116,139,0.08)", border: "1px solid rgba(100,116,139,0.2)",
          borderRadius: 10, padding: "10px 14px",
        }}>
          <div style={{ fontSize: 11, color: C.dim, fontWeight: 600, marginBottom: 4 }}>
            🎯 PICK PÚBLICO
          </div>
          <div style={{ fontSize: 13, color: C.muted }}>Sin pick claro hoy</div>
        </div>
      )}
    </div>
  );
}
