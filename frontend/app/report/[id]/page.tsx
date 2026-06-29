"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getReport, type PredictionReport } from "@/lib/api";
import { getToken } from "@/lib/tokens";
import { getFlagUrl } from "@/lib/flags";

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
};

function pct(v: number | null | undefined) {
  return `${((v ?? 0) * 100).toFixed(1)}%`;
}

function fix1(v: number | null | undefined) {
  return (v ?? 0).toFixed(1);
}

function fix2(v: number | null | undefined) {
  return (v ?? 0).toFixed(2);
}

function isHigh(v: number | null | undefined) {
  return (v ?? 0) > 0.5;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
      <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 600, color: C.violet, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "9px 0", borderBottom: `1px solid rgba(255,255,255,0.05)`,
    }}>
      <span style={{ fontSize: 13, color: C.muted }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: highlight ? C.green : C.primary }}>{value}</span>
    </div>
  );
}

function ProbBar({ label, prob, color }: { label: string; prob: number; color: string }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, color: C.muted, textAlign: "center" }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700, color: C.primary }}>{pct(prob)}</span>
      <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(prob * 100).toFixed(1)}%`, background: color, borderRadius: 3, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = Number(params.id);

  const [report, setReport] = useState<PredictionReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken(matchId);
    if (!token) { router.replace("/"); return; }
    getReport(matchId, token)
      .then(setReport)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error al cargar reporte"))
      .finally(() => setLoading(false));
  }, [matchId, router]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", border: "3px solid rgba(99,102,241,0.2)", borderTop: `3px solid ${C.accent}`, animation: "spin 0.8s linear infinite" }} />
          <p style={{ color: C.muted, fontSize: 14 }}>Generando análisis…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <p style={{ fontSize: 40 }}>⚠️</p>
          <p style={{ color: C.primary, fontWeight: 600, marginBottom: 8 }}>Error al cargar reporte</p>
          <p style={{ color: "#F87171", fontSize: 13, marginBottom: 20 }}>{error}</p>
          <button
            onClick={() => router.push("/")}
            style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${C.border}`, color: C.primary, borderRadius: 10, padding: "9px 20px", cursor: "pointer", fontSize: 13 }}
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const home = report.home_team ?? "Local";
  const away = report.away_team ?? "Visitante";

  const cornersHome  = report.corners?.home ?? report.corners?.home_pred ?? 0;
  const cornersAway  = report.corners?.away ?? report.corners?.away_pred ?? 0;
  const cornersTotal = report.corners?.total ?? cornersHome + cornersAway;

  const cardsHome  = report.cards?.home ?? report.cards?.home_pred ?? 0;
  const cardsAway  = report.cards?.away ?? report.cards?.away_pred ?? 0;
  const cardsTotal = report.cards?.total ?? cardsHome + cardsAway;

  const asianHandicap =
    report.asian_handicap && typeof report.asian_handicap === "object"
      ? (report.asian_handicap as Record<string, number>)
      : {};

  const valueBets = report.value_bets ?? [];

  return (
    <main style={{ minHeight: "100vh", background: C.bg, color: C.primary, paddingBottom: 64 }}>
      {/* Header */}
      <header style={{
        background: C.bg,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        position: "sticky", top: 0, zIndex: 10,
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => router.push("/")}
            style={{ background: "none", border: "none", color: C.accent, fontSize: 22, cursor: "pointer", lineHeight: 1, padding: 0 }}
          >
            ←
          </button>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <img src={getFlagUrl(home)} alt={home} style={{ width: 32, height: 21, objectFit: "cover", borderRadius: 3 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: C.primary }}>{home} vs {away}</span>
            <img src={getFlagUrl(away)} alt={away} style={{ width: 32, height: 21, objectFit: "cover", borderRadius: 3 }} />
          </div>
          <div style={{ width: 30 }} />
        </div>
      </header>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* 1X2 */}
        <Card title="🏆 Resultado 1X2">
          <div style={{ display: "flex", gap: 12 }}>
            <ProbBar label={home} prob={report.prob_home ?? 0} color={C.accent} />
            <ProbBar label="Empate"  prob={report.prob_draw ?? 0} color={C.amber} />
            <ProbBar label={away} prob={report.prob_away ?? 0} color="#8B5CF6" />
          </div>
        </Card>

        {/* xG */}
        <Card title="📊 Expected Goals (xG)">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[{ team: home, xg: report.xg_home }, { team: away, xg: report.xg_away }].map(({ team, xg }) => (
              <div key={team} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "14px 12px", textAlign: "center" }}>
                <p style={{ margin: "0 0 4px", fontSize: 12, color: C.muted }}>{team}</p>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: C.violet }}>{fix1(xg)}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* O/U */}
        <Card title="⚽ Goles Over/Under">
          <Row label="Over 2.5"  value={pct(report.prob_over_25)} highlight={isHigh(report.prob_over_25)} />
          <Row label="Under 2.5" value={pct(report.prob_under_25)} />
          <Row label="Over 3.5"  value={pct(report.prob_over_35)} highlight={isHigh(report.prob_over_35)} />
          <Row label="Ambos anotan (BTTS)" value={pct(report.prob_btts)} highlight={isHigh(report.prob_btts)} />
        </Card>

        {/* Asian Handicap */}
        <Card title="🎯 Hándicap Asiático">
          {Object.keys(asianHandicap).length === 0 ? (
            <p style={{ color: C.muted, fontSize: 13, textAlign: "center", margin: 0 }}>Sin datos de hándicap.</p>
          ) : (
            Object.entries(asianHandicap).map(([line, prob]) => (
              <Row key={line} label={`${home} ${line}`} value={pct(prob)} />
            ))
          )}
        </Card>

        {/* Corners */}
        <Card title="🚩 Córners Proyectados">
          <Row label={home} value={fix1(cornersHome)} />
          <Row label={away} value={fix1(cornersAway)} />
          <Row label="Total esperado" value={fix1(cornersTotal)} highlight />
        </Card>

        {/* Cards */}
        <Card title="🟨 Tarjetas Amarillas">
          <Row label={home} value={fix1(cardsHome)} />
          <Row label={away} value={fix1(cardsAway)} />
          <Row label="Total esperado" value={fix1(cardsTotal)} highlight />
        </Card>

        {/* Extra time */}
        <Card title="⏱️ Prórroga y Penales">
          <Row label="Prórroga" value={pct(report.prob_extra_time)} />
          <Row label="Penales"  value={pct(report.prob_penalties)} />
        </Card>

        {/* Value Bets */}
        <Card title="💰 Value Bets">
          {valueBets.length === 0 ? (
            <p style={{ color: C.muted, fontSize: 13, textAlign: "center", margin: 0 }}>
              Sin value bets detectadas en este partido.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {valueBets.map((vb, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: "rgba(52,211,153,0.08)",
                    border: "1px solid rgba(52,211,153,0.2)",
                    borderRadius: 12, padding: "12px 16px",
                  }}
                >
                  <div>
                    <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 600, color: C.primary }}>
                      {vb?.market ?? "—"} · {vb?.outcome ?? "—"}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
                      Prob: {pct(vb?.our_prob)}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 700, color: C.green }}>
                      {fix2(vb?.decimal_odd)}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: C.green }}>
                      +{pct(vb?.edge)} edge
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <p style={{ textAlign: "center", fontSize: 11, color: C.dim, padding: "0 16px" }}>
          Predicciones basadas en modelos estadísticos. No constituyen consejo de apuestas. Juega con responsabilidad.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
