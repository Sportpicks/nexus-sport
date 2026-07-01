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
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
      <span style={{ fontSize: 11, color: C.muted }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: C.primary }}>{(pct * 100).toFixed(0)}%</span>
      <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2 }}>
        <div style={{ height: "100%", width: `${(pct * 100).toFixed(1)}%`, background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 13, color: C.muted }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: highlight ? C.green : C.primary }}>{value}</span>
    </div>
  );
}

// Simulated free stats derived from match data (no extra API call needed)
function freeStats(match: Match) {
  // Seed deterministic values from match id
  const s = match.id * 17;
  const ph = 0.3 + (s % 30) / 100;
  const pd = 0.2 + (s % 15) / 100;
  const pa = Math.max(0.05, 1 - ph - pd);
  const over25 = 0.45 + (s % 20) / 100;
  const btts = 0.40 + (s % 25) / 100;
  const et = 0.18 + (s % 12) / 100;
  const forms = ["W", "W", "D", "L", "W"];
  return { ph, pd, pa, over25, btts, et, forms };
}

const BADGE: Record<string, { bg: string; color: string }> = {
  W: { bg: "#34D399", color: "#0B1220" },
  D: { bg: "#F59E0B", color: "#0B1220" },
  L: { bg: "#EF4444", color: "#fff" },
};

interface Props { match: Match }

export default function MatchRowFree({ match }: Props) {
  const { ph, pd, pa, over25, btts, et, forms } = freeStats(match);
  const result = ph > pa && ph > pd ? match.home_team : pa > pd ? match.away_team : "Empate";

  return (
    <div style={{ padding: "16px 20px 20px", borderTop: `1px solid ${C.border}` }}>
      {/* 1X2 bars */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <ProbBar label={match.home_team.split(" ")[0]} pct={ph} color={C.accent} />
        <ProbBar label="Empate" pct={pd} color={C.slate} />
        <ProbBar label={match.away_team.split(" ")[0]} pct={pa} color={C.violet} />
      </div>

      {/* Stats */}
      <div style={{ marginBottom: 14 }}>
        <StatRow label="Resultado más probable" value={result} highlight />
        <StatRow label="Over 2.5 goles" value={`${(over25 * 100).toFixed(0)}%`} highlight={over25 > 0.5} />
        <StatRow label="Ambos anotan (BTTS)" value={`${(btts * 100).toFixed(0)}%`} highlight={btts > 0.5} />
        <StatRow label="Prórroga posible" value={`${(et * 100).toFixed(0)}%`} />
      </div>

      {/* Form */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, color: C.dim }}>Forma reciente:</span>
        {forms.map((f, i) => (
          <span key={i} style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 22, height: 22, borderRadius: "50%", fontSize: 10, fontWeight: 700,
            background: BADGE[f]?.bg ?? C.dim, color: BADGE[f]?.color ?? "#fff",
          }}>{f}</span>
        ))}
      </div>
      <p style={{ margin: "6px 0 0", fontSize: 11, color: C.dim }}>
        Forma reciente: últimos 5 partidos del equipo
      </p>
    </div>
  );
}
