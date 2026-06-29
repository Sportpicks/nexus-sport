"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getReport, type PredictionReport } from "@/lib/api";
import { getToken } from "@/lib/tokens";
import { getFlag } from "@/lib/flags";

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span
        className={`text-sm font-semibold ${highlight ? "text-green-400" : "text-white"}`}
      >
        {value}
      </span>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-slate-800/60 border border-slate-700 p-5">
      <h3 className="text-base font-semibold text-violet-300 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function pct(v: number | null | undefined) {
  return `${((v ?? 0) * 100).toFixed(1)}%`;
}

function fix1(v: number | null | undefined) {
  return (v ?? 0).toFixed(1);
}

function fix2(v: number | null | undefined) {
  return (v ?? 0).toFixed(2);
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
    if (!token) {
      router.replace("/");
      return;
    }
    getReport(matchId, token)
      .then(setReport)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Error al cargar reporte")
      )
      .finally(() => setLoading(false));
  }, [matchId, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4 text-white">
          <div className="h-12 w-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
          <p className="text-slate-400">Generando análisis…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <div className="max-w-sm text-center text-red-400 space-y-3">
          <p className="text-4xl">⚠️</p>
          <p className="font-semibold text-white">Error al cargar reporte</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-2 rounded-xl bg-slate-700 px-5 py-2 text-sm text-white hover:bg-slate-600"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const home_team = report.home_team ?? "Local";
  const away_team = report.away_team ?? "Visitante";

  // Corners: backend returns { home, away, total } but DB columns are
  // corners_home_pred / corners_away_pred — handle both shapes
  const cornersHome =
    report.corners?.home ?? report.corners?.home_pred ?? 0;
  const cornersAway =
    report.corners?.away ?? report.corners?.away_pred ?? 0;
  const cornersTotal =
    report.corners?.total ?? cornersHome + cornersAway;

  const cardsHome =
    report.cards?.home ?? report.cards?.home_pred ?? 0;
  const cardsAway =
    report.cards?.away ?? report.cards?.away_pred ?? 0;
  const cardsTotal =
    report.cards?.total ?? cardsHome + cardsAway;

  const asianHandicap =
    report.asian_handicap && typeof report.asian_handicap === "object"
      ? (report.asian_handicap as Record<string, number>)
      : {};

  const valueBets = report.value_bets ?? [];

  return (
    <main className="min-h-screen bg-slate-950 text-white pb-16">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <button
            onClick={() => router.push("/")}
            className="text-slate-400 hover:text-white text-sm"
          >
            ← Volver
          </button>
          <div className="flex flex-1 items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700/60 text-xl">
              {getFlag(home_team)}
            </div>
            <p className="text-sm font-semibold">
              {home_team} vs {away_team}
            </p>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700/60 text-xl">
              {getFlag(away_team)}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">

        {/* 1X2 */}
        <Section title="🏆 Resultado 1X2">
          <div className="grid grid-cols-3 gap-3 mb-1">
            {[
              { label: home_team, prob: report.prob_home, key: "home" },
              { label: "Empate",  prob: report.prob_draw, key: "draw" },
              { label: away_team, prob: report.prob_away, key: "away" },
            ].map(({ label, prob, key }) => (
              <div
                key={key}
                className="rounded-xl bg-slate-700/50 p-3 text-center"
              >
                <p className="text-xs text-slate-400 truncate">{label}</p>
                <p className="text-xl font-bold text-white mt-1">
                  {pct(prob)}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* xG */}
        <Section title="📊 Expected Goals (xG)">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-700/50 p-3 text-center">
              <p className="text-xs text-slate-400">{home_team}</p>
              <p className="text-2xl font-bold text-violet-400">
                {fix1(report.xg_home)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-700/50 p-3 text-center">
              <p className="text-xs text-slate-400">{away_team}</p>
              <p className="text-2xl font-bold text-violet-400">
                {fix1(report.xg_away)}
              </p>
            </div>
          </div>
        </Section>

        {/* Over / Under */}
        <Section title="⚽ Goles Over/Under">
          <Stat
            label="Over 2.5"
            value={pct(report.prob_over_25)}
            highlight={(report.prob_over_25 ?? 0) > 0.55}
          />
          <Stat label="Under 2.5" value={pct(report.prob_under_25)} />
          <Stat
            label="Over 3.5"
            value={pct(report.prob_over_35)}
            highlight={(report.prob_over_35 ?? 0) > 0.5}
          />
          <Stat
            label="Ambos anotan (BTTS)"
            value={pct(report.prob_btts)}
            highlight={(report.prob_btts ?? 0) > 0.55}
          />
        </Section>

        {/* Asian Handicap */}
        <Section title="🎯 Hándicap Asiático">
          {Object.keys(asianHandicap).length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-1">
              Sin datos de hándicap.
            </p>
          ) : (
            Object.entries(asianHandicap).map(([line, prob]) => (
              <Stat
                key={line}
                label={`${home_team} ${line}`}
                value={pct(prob)}
              />
            ))
          )}
        </Section>

        {/* Corners */}
        <Section title="🚩 Córners Proyectados">
          <Stat label={home_team} value={fix1(cornersHome)} />
          <Stat label={away_team} value={fix1(cornersAway)} />
          <Stat label="Total esperado" value={fix1(cornersTotal)} highlight />
        </Section>

        {/* Cards */}
        <Section title="🟨 Tarjetas Amarillas">
          <Stat label={home_team} value={fix1(cardsHome)} />
          <Stat label={away_team} value={fix1(cardsAway)} />
          <Stat label="Total esperado" value={fix1(cardsTotal)} highlight />
        </Section>

        {/* Extra time / Penalties */}
        <Section title="⏱️ Prórroga y Penales">
          <Stat label="Prórroga" value={pct(report.prob_extra_time)} />
          <Stat label="Penales"  value={pct(report.prob_penalties)} />
        </Section>

        {/* Value Bets */}
        <Section title="💰 Value Bets">
          {valueBets.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-2">
              Sin value bets detectadas en este partido.
            </p>
          ) : (
            <div className="space-y-3">
              {valueBets.map((vb, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-green-900/20 border border-green-700/40 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {vb?.market ?? "—"} · {vb?.outcome ?? "—"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Nuestra prob: {pct(vb?.our_prob)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-400">
                      {fix2(vb?.decimal_odd)}
                    </p>
                    <p className="text-xs text-green-500">
                      +{pct(vb?.edge)} edge
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Disclaimer */}
        <p className="text-center text-xs text-slate-600 px-4">
          Predicciones basadas en modelos estadísticos. No constituyen consejo
          de apuestas. Juega con responsabilidad.
        </p>
      </div>
    </main>
  );
}
