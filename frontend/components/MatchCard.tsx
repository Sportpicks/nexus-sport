"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Match } from "@/lib/api";
import { getToken } from "@/lib/tokens";
import { getFlag } from "@/lib/flags";
import PaywallModal from "./PaywallModal";

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
          <div className="flex flex-col items-center gap-1 flex-1 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-700/60 text-[26px]">
              {getFlag(match.home_team)}
            </div>
            <span className="text-sm font-semibold text-white leading-tight">
              {match.home_team}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-slate-400">vs</span>
          </div>

          <div className="flex flex-col items-center gap-1 flex-1 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-700/60 text-[26px]">
              {getFlag(match.away_team)}
            </div>
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
