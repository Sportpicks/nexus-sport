"use client";

import { useEffect, useState } from "react";
import { getMatches, type Match } from "@/lib/api";
import MatchRow from "@/components/MatchRow";
import WorldCupTable from "@/components/WorldCupTable";

const C = {
  bg:      "#0B1220",
  card:    "#1E293B",
  border:  "rgba(255,255,255,0.06)",
  primary: "#F1F5F9",
  muted:   "#64748B",
  accent:  "#6366F1",
  violet:  "#8B5CF6",
  green:   "#34D399",
};

function HexLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
      <path d="M18 2L32 10V26L18 34L4 26V10L18 2Z"
        fill={C.accent} fillOpacity="0.2" stroke={C.accent} strokeWidth="1.5" />
      <text x="18" y="23" textAnchor="middle" fill={C.accent}
        fontSize="14" fontWeight="700" fontFamily="system-ui, sans-serif">N</text>
    </svg>
  );
}

function SkeletonRow() {
  return (
    <div style={{
      background: "#111827", borderRadius: 14, padding: "14px 20px",
      border: "1px solid rgba(255,255,255,0.06)",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      {[40, 200, 60].map((w, i) => (
        <div key={i} style={{
          height: 14, width: w, borderRadius: 7,
          background: "rgba(255,255,255,0.07)",
          animation: "pulse 1.5s ease-in-out infinite",
          flex: i === 1 ? 1 : undefined,
        }} />
      ))}
    </div>
  );
}

function groupByDate(matches: Match[]): [string, Match[]][] {
  const map = new Map<string, Match[]>();
  for (const m of matches) {
    const key = new Date(m.match_date).toLocaleDateString("es-PE", {
      weekday: "long", day: "numeric", month: "long",
    });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return Array.from(map.entries());
}

function PricingSection() {
  return (
    <div style={{ marginTop: 48 }}>
      <h2 style={{ textAlign: "center", fontSize: 20, fontWeight: 700, color: C.primary, margin: "0 0 24px" }}>
        Planes de acceso
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Por partido */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
          <p style={{ margin: "0 0 4px", fontSize: 13, color: C.muted }}>Por partido</p>
          <p style={{ margin: "0 0 16px", fontSize: 28, fontWeight: 800, color: C.primary }}>S/18.50</p>
          <ul style={{ margin: "0 0 20px", paddingLeft: 18, color: C.muted, fontSize: 13, lineHeight: 1.8 }}>
            <li>Acceso 48 horas</li>
            <li>Reporte completo del partido</li>
            <li>Value bets incluidos</li>
            <li>Pago por Yape o Plin</li>
          </ul>
          <p style={{ margin: 0, fontSize: 12, color: C.muted, textAlign: "center" }}>
            Elige el partido en la lista ↑
          </p>
        </div>

        {/* Mensual */}
        <div style={{
          background: C.card, border: "1px solid rgba(99,102,241,0.4)",
          borderRadius: 16, padding: 24, position: "relative", overflow: "hidden",
        }}>
          <span style={{
            position: "absolute", top: 14, right: 14,
            background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
            color: "#fff", borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 700,
          }}>Popular</span>
          <p style={{ margin: "0 0 4px", fontSize: 13, color: C.muted }}>Suscripción mensual</p>
          <p style={{ margin: "0 0 16px", fontSize: 28, fontWeight: 800, color: C.primary }}>
            S/49.90<span style={{ fontSize: 14, fontWeight: 400, color: C.muted }}>/mes</span>
          </p>
          <ul style={{ margin: "0 0 20px", paddingLeft: 18, color: C.muted, fontSize: 13, lineHeight: 1.8 }}>
            <li>Todos los partidos eliminatorios</li>
            <li>Acceso ilimitado 30 días</li>
            <li>Value bets en tiempo real</li>
            <li>Pago por Yape o Plin</li>
          </ul>
          <button style={{
            width: "100%", background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
            color: "#fff", border: "none", borderRadius: 10, padding: "11px 0",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>
            Suscribirme →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    getMatches()
      .then((data) => {
        setMatches(data);
        if (data.length > 0) setExpandedId(data[0].id);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error al cargar partidos"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const groups = groupByDate(matches);
  const firstMatchId = matches[0]?.id ?? null;

  return (
    <main style={{ minHeight: "100vh", background: C.bg, color: C.primary, paddingBottom: 80 }}>
      {/* Navbar */}
      <header style={{
        background: C.bg, borderBottom: `1px solid ${C.border}`,
        position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(12px)",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "12px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <HexLogo />
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#fff", lineHeight: 1.2 }}>Nexus Sport</div>
              <div style={{ fontSize: 10, color: C.muted }}>Predicciones IA · Mundial 2026</div>
            </div>
            <span style={{
              marginLeft: "auto", fontSize: 11, fontWeight: 600, color: "#A78BFA",
              background: "rgba(99,102,241,0.12)", borderRadius: 20, padding: "3px 10px",
            }}>Mundial 2026 · Fase Eliminatoria</span>
          </div>
          {/* Banner */}
          <div style={{
            background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: 10, padding: "8px 14px", fontSize: 12, color: "#818CF8",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>🎁</span>
            <span><strong>1 análisis gratis hoy</strong> · Desbloquea el resto desde S/18.50</span>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 14, padding: 24, textAlign: "center",
          }}>
            <p style={{ color: "#FCA5A5", margin: "0 0 12px" }}>{error}</p>
            <button onClick={load} style={{
              background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)",
              color: "#fff", borderRadius: 8, padding: "7px 18px", cursor: "pointer", fontSize: 13,
            }}>Reintentar</button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && matches.length === 0 && (
          <div style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
            padding: 48, textAlign: "center", color: C.muted,
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
            <div style={{ fontWeight: 600, color: C.primary, marginBottom: 8 }}>Partidos próximamente</div>
            <div style={{ fontSize: 13 }}>Los cruces se publicarán al finalizar la fase de grupos.</div>
          </div>
        )}

        {/* Match list grouped by date */}
        {!loading && !error && groups.map(([date, dayMatches]) => (
          <div key={date} style={{ marginBottom: 24 }}>
            <div style={{
              background: "rgba(99,102,241,0.06)", borderRadius: 8,
              padding: "6px 14px", marginBottom: 10,
            }}>
              <span style={{
                fontSize: 11, fontWeight: 700, color: C.accent,
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>{date}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {dayMatches.map((m) => (
                <MatchRow
                  key={m.id}
                  match={m}
                  isFree={m.id === firstMatchId}
                  isExpanded={expandedId === m.id}
                  onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* World Cup standings */}
        {!loading && !error && <WorldCupTable />}

        {/* Pricing */}
        {!loading && <PricingSection />}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </main>
  );
}
