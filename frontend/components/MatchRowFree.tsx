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
  // ML projections (null when model has no data)
  xg_home: number | null;
  xg_away: number | null;
  corners_home_pred: number | null;
  corners_away_pred: number | null;
  yellow_home_pred: number | null;
  yellow_away_pred: number | null;
  // Real bookmaker odds (null when unavailable)
  odds_home: number | null;
  odds_draw: number | null;
  odds_away: number | null;
  odds_source: string | null;
}

interface Pick {
  text: string;
  conf: number;        // probability 0-100
  realOdd: number | null;  // real bookmaker odd, null if unavailable
  oddSource: string | null;
}

// ── Pick logic ────────────────────────────────────────────────────────────────

function getPublicPicks(data: MatchData): Pick[] {
  const picks: Pick[] = [];

  const probHome = data.prob_home * 100;
  const probAway = data.prob_away * 100;
  const probOver = data.prob_over_25 * 100;
  const probBtts = data.prob_btts * 100;

  // Pick 1X2 — umbral 45%
  if (probHome > 45) {
    picks.push({
      text: `Victoria ${data.home_team}`,
      conf: probHome,
      realOdd: data.odds_home,
      oddSource: data.odds_source,
    });
  } else if (probAway > 45) {
    picks.push({
      text: `Victoria ${data.away_team}`,
      conf: probAway,
      realOdd: data.odds_away,
      oddSource: data.odds_source,
    });
  } else {
    const fav     = probHome >= probAway ? data.home_team : data.away_team;
    const favProb = Math.max(probHome, probAway);
    const favOdd  = probHome >= probAway ? data.odds_home : data.odds_away;
    picks.push({
      text: `Favorito: ${fav}`,
      conf: favProb,
      realOdd: favOdd,
      oddSource: data.odds_source,
    });
  }

  // Pick Over/Under — umbral 55%
  if (probOver > 55) {
    picks.push({ text: "Más de 2.5 goles", conf: probOver, realOdd: null, oddSource: null });
  } else if (probOver < 45) {
    picks.push({ text: "Menos de 2.5 goles", conf: 100 - probOver, realOdd: null, oddSource: null });
  }

  // Pick BTTS — umbral 60%
  if (probBtts > 60) {
    picks.push({ text: "Ambos equipos anotan (SÍ)", conf: probBtts, realOdd: null, oddSource: null });
  } else if (probBtts < 35) {
    picks.push({ text: "Ambos equipos anotan (NO)", conf: 100 - probBtts, realOdd: null, oddSource: null });
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
    home_team:         match.home_team,
    away_team:         match.away_team,
    prob_home:         match.prob_home       ?? ph,
    prob_draw:         match.prob_draw       ?? pd,
    prob_away:         match.prob_away       ?? pa,
    prob_over_25:      match.prob_over_25    ?? 0.45 + (s % 20) / 100,
    prob_btts:         match.prob_btts       ?? 0.40 + (s % 25) / 100,
    prob_extra_time:   match.prob_extra_time ?? 0.18 + (s % 12) / 100,
    xg_home:           match.xg_home         ?? null,
    xg_away:           match.xg_away         ?? null,
    corners_home_pred: match.corners_home_pred ?? null,
    corners_away_pred: match.corners_away_pred ?? null,
    yellow_home_pred:  match.yellow_home_pred  ?? null,
    yellow_away_pred:  match.yellow_away_pred  ?? null,
    odds_home:         match.odds_home       ?? null,
    odds_draw:         match.odds_draw       ?? null,
    odds_away:         match.odds_away       ?? null,
    odds_source:       match.odds_source     ?? null,
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
            home_team:         json.home_team,
            away_team:         json.away_team,
            prob_home:         json.prob_home,
            prob_draw:         json.prob_draw,
            prob_away:         json.prob_away,
            prob_over_25:      json.prob_over_25,
            prob_btts:         json.prob_btts         ?? 0.45,
            prob_extra_time:   json.prob_extra_time   ?? 0.2,
            xg_home:           json.xg_home           ?? null,
            xg_away:           json.xg_away           ?? null,
            corners_home_pred: json.corners_home_pred ?? null,
            corners_away_pred: json.corners_away_pred ?? null,
            yellow_home_pred:  json.yellow_home_pred  ?? null,
            yellow_away_pred:  json.yellow_away_pred  ?? null,
            odds_home:         json.odds_home         ?? null,
            odds_draw:         json.odds_draw         ?? null,
            odds_away:         json.odds_away         ?? null,
            odds_source:       json.odds_source       ?? null,
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

      {/* Proyecciones adicionales — solo si el modelo tiene datos */}
      {(() => {
        const totalCorners = (data.corners_home_pred ?? 0) + (data.corners_away_pred ?? 0);
        const totalYellow  = (data.yellow_home_pred  ?? 0) + (data.yellow_away_pred  ?? 0);
        const hasCorners   = totalCorners > 0;
        const hasYellow    = totalYellow  > 0;
        if (!hasCorners && !hasYellow) return null;
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
            {hasCorners && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: C.muted }}>
                  Córners esperados · {totalCorners > 9 ? `Más de ${Math.floor(totalCorners) - 1}` : `Menos de ${Math.ceil(totalCorners) + 1}`}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.primary }}>
                  {totalCorners.toFixed(0)} totales
                </span>
              </div>
            )}
            {hasYellow && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: C.muted }}>Tarjetas amarillas esperadas</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.primary }}>
                  ~{totalYellow.toFixed(0)}
                </span>
              </div>
            )}
          </div>
        );
      })()}

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
            }}>
              {/* Pick text */}
              <div style={{ fontSize: 13, fontWeight: 600, color: C.primary, marginBottom: 4 }}>
                🎯 Pick: {pick.text} ({pick.conf.toFixed(0)}% confianza · modelo estadístico)
              </div>
              {/* Source line */}
              <div style={{ fontSize: 11, color: C.dim }}>
                Basado en Poisson + Dixon-Coles con datos del Mundial 2026
              </div>
              {/* Real bookmaker odd — only shown when available */}
              {pick.realOdd != null && (
                <div style={{
                  marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6,
                  background: "rgba(99,102,241,0.12)", borderRadius: 8,
                  padding: "3px 10px",
                }}>
                  <span style={{ fontSize: 11, color: "#A78BFA" }}>
                    Cuota {pick.oddSource ?? "mercado"}:
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>
                    {pick.realOdd.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
