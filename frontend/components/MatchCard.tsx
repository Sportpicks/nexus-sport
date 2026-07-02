"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Match } from "@/lib/api";
import { getToken } from "@/lib/tokens";
import PaywallModal from "./PaywallModal";

const FLAG_CODES: Record<string, string> = {
  "brasil": "br", "argentina": "ar", "francia": "fr", "alemania": "de",
  "españa": "es", "portugal": "pt", "inglaterra": "gb-eng", "uruguay": "uy",
  "colombia": "co", "méxico": "mx", "mexico": "mx", "estados unidos": "us",
  "usa": "us", "canadá": "ca", "canada": "ca", "marruecos": "ma",
  "japón": "jp", "japon": "jp", "croacia": "hr", "países bajos": "nl",
  "holanda": "nl", "suiza": "ch", "senegal": "sn", "australia": "au",
  "corea del sur": "kr", "italia": "it", "bélgica": "be", "belgica": "be",
  "polonia": "pl", "serbia": "rs", "dinamarca": "dk", "ecuador": "ec",
  "perú": "pe", "peru": "pe", "chile": "cl", "venezuela": "ve",
  "ghana": "gh", "nigeria": "ng", "turquía": "tr", "turquia": "tr",
  "ucrania": "ua", "austria": "at", "escocia": "gb-sct", "gales": "gb-wls",
  "grecia": "gr",
};

function getFlagUrl(name: string): string {
  const code = FLAG_CODES[name.toLowerCase().trim()] ?? "un";
  return `https://flagcdn.com/w80/${code}.png`;
}

const STAGE_LABELS: Record<string, string> = {
  LAST_16: "Octavos",
  ROUND_OF_16: "Octavos",
  QUARTER_FINALS: "Cuartos de Final",
  SEMI_FINALS: "Semifinal",
  THIRD_PLACE: "Tercer Puesto",
  FINAL: "Gran Final",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-PE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  match: Match;
}

export default function MatchCard({ match }: Props) {
  const router = useRouter();
  const [showPaywall, setShowPaywall] = useState(false);
  const [hovered, setHovered] = useState(false);

  function handleCTA() {
    const token = getToken(match.id);
    if (token) {
      router.push(`/report/${match.id}`);
    } else {
      setShowPaywall(true);
    }
  }

  const stageLabel = STAGE_LABELS[match.stage] ?? match.stage;

  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: "#1E293B",
          border: hovered
            ? "1px solid rgba(99,102,241,0.5)"
            : "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          transition: "border-color 0.2s, transform 0.2s",
          transform: hovered ? "translateY(-2px)" : "none",
          cursor: "default",
        }}
      >
        {/* Stage badge */}
        <span
          style={{
            display: "inline-block",
            alignSelf: "flex-start",
            background: "rgba(99,102,241,0.2)",
            color: "#A78BFA",
            borderRadius: 20,
            padding: "3px 12px",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          {stageLabel}
        </span>

        {/* Teams */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Home */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <img
              src={getFlagUrl(match.home_team)}
              alt={match.home_team}
              style={{ width: 48, height: 32, objectFit: "cover", borderRadius: 4 }}
            />
            <span style={{ fontSize: 15, fontWeight: 600, color: "#F1F5F9", textAlign: "center", lineHeight: 1.3 }}>
              {match.home_team}
            </span>
          </div>

          {/* VS */}
          <div style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>vs</div>

          {/* Away */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <img
              src={getFlagUrl(match.away_team)}
              alt={match.away_team}
              style={{ width: 48, height: 32, objectFit: "cover", borderRadius: 4 }}
            />
            <span style={{ fontSize: 15, fontWeight: 600, color: "#F1F5F9", textAlign: "center", lineHeight: 1.3 }}>
              {match.away_team}
            </span>
          </div>
        </div>

        {/* Date & price */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#64748B" }}>
            📅 {formatDate(match.match_date)}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#34D399" }}>
            USD {match.price_usd.toFixed(2)}
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={handleCTA}
          style={{
            background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "11px 0",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          Ver predicción →
        </button>
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
