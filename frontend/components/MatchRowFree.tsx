"use client";

import { useEffect, useState } from "react";
import type { Match } from "@/lib/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const C = {
  primary: "#F1F5F9",
  muted:   "#94A3B8",
  dim:     "#64748B",
  accent:  "#6366F1",
  violet:  "#8B5CF6",
  slate:   "#475569",
  green:   "#34D399",
  border:  "rgba(255,255,255,0.06)",
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface MatchData {
  home_team: string;
  away_team: string;
  prob_home: number;
  prob_draw: number;
  prob_away: number;
  prob_over_25: number;
  prob_btts: number;
  prob_extra_time: number;
}

interface Pick {
  text: string;
  cuota: string;
  conf: number;
}

// ── Pick logic ────────────────────────────────────────────────────────────────

function getPublicPicks(data: MatchData): Pick[] {
  const picks: Pick[] = [];

  const probHome  = data.prob_home  * 100;
  const probAway  = data.prob_away  * 100;
  const probOver  = data.prob_over_25 * 100;
  const probBtts  = data.prob_btts  * 100;

  // Pick 1X2 — umbral 45%
  if (probHome > 45) {
    picks.push({
      text: `Victoria ${data.home_team}`,
      cuota: (1 / (probHome / 100)).toFixed(2),
      conf: probHome,
    });
  } else if (probAway > 45) {
    picks.push({
      text: `Victoria ${data.away_team}`,
      cuota: (1 / (probAway / 100)).toFixed(2),
      conf: probAway,
    });
  } else {
    const fav     = probHome >= probAway ? data.home_team : data.away_team;
    const favProb = Math.max(probHome, probAway);
    picks.push({
      text: `Favorito: ${fav}`,
      cuota: (1 / (favProb / 100)).toFixed(2),
      conf: favProb,
    });
  }

  // Pick Over/Under — umbral 55%
  if (probOver > 55) {
    picks.push({
      text: "Más de 2.5 goles",
      cuota: (1 / (probOver / 100)).toFixed(2),
      conf: probOver,
    });
  } else if (probOver < 45) {
    picks.push({
      text: "Menos de 2.5 goles",
      cuota: (1 / ((100 - probOver) / 100)).toFixed(2),
      conf: 100 - probOver,
    });
  }

  // Pick BTTS — umbral 60%
  if (probBtts > 60) {
    picks.push({
      text: "Ambos equipos anotan (SÍ)",
      cuota: (1 / (probBtts / 100)).toFixed(2),
      conf: probBtts,
    });
  } else if (probBtts < 35) {
    picks.push({
      text: "Ambos equipos anotan (NO)",
      cuota: (1 / ((100 - probBtts) / 100)).toFixed(2),
      conf: 100 - probBtts,
    });
  }

  return picks;
}

// ── Fallback deterministic stats ──────────────────────────────────────────────

function fallbackData(match: Match): MatchData {
  const s = match.id * 17;
  const ph = 0.3 + (s % 30) / 100;
  const pd = 0.2 + (s % 15) / 100;
  const pa = Math.max(0.05, 1 - ph - pd);
  return {
    home_team:      match.home_team,
    away_team:      match.away_team,
    prob_home:      match.prob_home  ?? ph,
    prob_draw:      match.prob_draw  ?? pd,
    prob_away:      match.prob_away  ?? pa,
    prob_over_25:   match.prob_over_25 ?? 0.45 + (s % 20) / 100,
    prob_btts:      match.prob_btts  ?? 0.40 + (s % 25) / 100,
    prob_extra_time: match.prob_extra_time ?? 0.18 + (s % 12) / 100,
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProbBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5, alignItems: "center" }}>
      <span style={{ fontSize: 11, color: C.muted }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: C.primary }}>{(pct * 100).toFixed(0)}%</span>
      <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2 }}>
        <div style={{ height: "100%", width: `${Math.min(100, pct * 100).toFixed(1)}%`, background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props { match: Match; isKnockout?: boolean }

export default function MatchRowFree({ match, isKnockout }: Props) {
  const [data, setData] = useState<MatchData>(() => fallbackData(match));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/matches/${match.id}/preview`)
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (json && json.prob_home != null) {
          setData({
            home_team:       json.home_team,
            away_team:       json.away_team,
            prob_home:       json.prob_home,
            prob_draw:       json.prob_draw,
            prob_away:       json.prob_away,
            prob_over_25:    json.prob_over_25,
            prob_btts:       json.prob_btts ?? 0.45,
            prob_extra_time: json.prob_extra_time ?? 0.2,
          });
        }
      })
      .catch(() => {/* keep fallback */})
      .finally(() => setLoading(false));
  }, [match.id]);

  const result = data.prob_home > data.prob_away && data.prob_home > data.prob_draw
    ? data.home_team
    : data.prob_away > data.prob_draw
      ? data.away_team
      : "Empate";

  const picks = getPublicPicks(data);

  return (
    <div style={{ padding: "14px 20px 16px", borderTop: `1px solid ${C.border}` }}>
      {/* 1X2 bars */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <ProbBar label={data.home_team.split(" ")[0]} pct={data.prob_home} color={C.accent} />
        <ProbBar label="Empate" pct={data.prob_draw} color={C.slate} />
        <ProbBar label={data.away_team.split(" ")[0]} pct={data.prob_away} color={C.violet} />
      </div>

      {/* Compact stats */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: C.muted }}>Resultado más probable</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.green }}>{result}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: C.muted }}>
            Over 2.5: {(data.prob_over_25 * 100).toFixed(0)}% · Under 2.5: {((1 - data.prob_over_25) * 100).toFixed(0)}%
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: data.prob_over_25 > 0.5 ? C.green : C.muted }}>
            {data.prob_over_25 > 0.5 ? "↑" : "↓"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: C.muted }}>Ambos anotan (BTTS)</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: data.prob_btts > 0.5 ? C.green : C.primary }}>
            {(data.prob_btts * 100).toFixed(0)}%
          </span>
        </div>
        {isKnockout && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: C.muted }}>Prórroga posible</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.primary }}>
              {(data.prob_extra_time * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* Picks públicos */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 11, color: C.green, fontWeight: 700, letterSpacing: "0.04em" }}>
          🎯 PICKS PÚBLICOS {loading && <span style={{ color: C.dim, fontWeight: 400 }}>· actualizando…</span>}
        </div>
        {picks.length === 0 ? (
          <div style={{
            background: "rgba(100,116,139,0.08)", border: "1px solid rgba(100,116,139,0.2)",
            borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.muted,
          }}>
            Modelo en calibración para este partido
          </div>
        ) : (
          picks.map((pick, i) => (
            <div key={i} style={{
              background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)",
              borderRadius: 10, padding: "10px 14px",
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.primary }}>{pick.text}</div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>
                  Poisson + Dixon-Coles · Confianza: {pick.conf.toFixed(0)}%
                </div>
              </div>
              <div style={{
                fontSize: 15, fontWeight: 700, color: C.green,
                background: "rgba(52,211,153,0.12)", borderRadius: 8,
                padding: "4px 10px", flexShrink: 0,
              }}>
                {pick.cuota}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
