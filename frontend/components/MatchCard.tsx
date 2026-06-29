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
  LAST_16: "Octavos de Final",
  ROUND_OF_16: "Octavos de Final",
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
      <div className="group relative flex flex-col gap-4 rounded-2xl bg-slate-800/60 border border-slate-700 p-5 hover:border-violet-500/60 hover:bg-slate-800 transition-all duration-200">
        {/* Stage badge */}
        <span className="self-start rounded-full bg-violet-900/50 px-3 py-0.5 text-xs font-semibold text-violet-300 tracking-wide">
          {stageLabel}
        </span>

        {/* Teams */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col items-center gap-2 flex-1 text-center">
            <img
              src={getFlagUrl(match.home_team)}
              alt={match.home_team}
              style={{ width: 48, height: 32, objectFit: "cover", borderRadius: 4 }}
            />
            <span className="text-sm font-semibold text-white leading-tight">
              {match.home_team}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-slate-400">vs</span>
          </div>

          <div className="flex flex-col items-center gap-2 flex-1 text-center">
            <img
              src={getFlagUrl(match.away_team)}
              alt={match.away_team}
              style={{ width: 48, height: 32, objectFit: "cover", borderRadius: 4 }}
            />
            <span className="text-sm font-semibold text-white leading-tight">
              {match.away_team}
            </span>
          </div>
        </div>

        {/* Date & price */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>📅 {formatDate(match.match_date)}</span>
          <span className="font-semibold text-green-400">
            USD {match.price_usd.toFixed(2)}
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={handleCTA}
          className="mt-1 w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 active:scale-95 transition-all"
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
