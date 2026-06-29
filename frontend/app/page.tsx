"use client";

import { useEffect, useState } from "react";
import { getMatches, type Match } from "@/lib/api";
import MatchCard from "@/components/MatchCard";

const C = {
  bg: "#0B1220",
  card: "#1E293B",
  primary: "#F1F5F9",
  muted: "#64748B",
  accent: "#6366F1",
  border: "rgba(255,255,255,0.06)",
};

function HexLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <path
        d="M18 2L32 10V26L18 34L4 26V10L18 2Z"
        fill={C.accent}
        fillOpacity="0.2"
        stroke={C.accent}
        strokeWidth="1.5"
      />
      <text
        x="18" y="23"
        textAnchor="middle"
        fill={C.accent}
        fontSize="14"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        N
      </text>
    </svg>
  );
}

function SkeletonCard() {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {[28, 80, 56, 40].map((w, i) => (
        <div
          key={i}
          style={{
            height: i === 1 ? 64 : 16,
            width: `${w}%`,
            background: "rgba(255,255,255,0.07)",
            borderRadius: 8,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ))}
    </div>
  );
}

export default function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    getMatches()
      .then(setMatches)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Error al cargar partidos")
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  return (
    <main style={{ minHeight: "100vh", background: C.bg, color: C.primary }}>
      {/* Navbar */}
      <header
        style={{
          background: C.bg,
          borderBottom: `1px solid ${C.border}`,
          position: "sticky",
          top: 0,
          zIndex: 10,
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <HexLogo />
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: "#fff", lineHeight: 1.2 }}>
              Nexus Sport
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
              Predicciones IA · Mundial 2026
            </div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px 80px" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: C.primary, margin: 0 }}>
            Fase Eliminatoria
          </h1>
          <p style={{ fontSize: 15, color: C.muted, marginTop: 8 }}>
            Análisis con modelos estadísticos y machine learning
          </p>
        </div>

        {/* States */}
        {loading && (
          <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 16,
              padding: 32,
              textAlign: "center",
              color: "#FCA5A5",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8, color: "#fff" }}>
              No se pudo conectar con el servidor
            </div>
            <div style={{ fontSize: 13, marginBottom: 16 }}>{error}</div>
            <button
              onClick={load}
              style={{
                background: "rgba(239,68,68,0.3)",
                border: "1px solid rgba(239,68,68,0.5)",
                color: "#fff",
                borderRadius: 10,
                padding: "8px 20px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && matches.length === 0 && (
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 48,
              textAlign: "center",
              color: C.muted,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
            <div style={{ fontWeight: 600, color: C.primary, marginBottom: 8 }}>
              Partidos próximamente
            </div>
            <div style={{ fontSize: 13 }}>
              Los cruces de eliminatoria se publicarán cuando finalice la fase de grupos.
            </div>
          </div>
        )}

        {!loading && !error && matches.length > 0 && (
          <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {matches.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </main>
  );
}
