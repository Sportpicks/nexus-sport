"use client";

import { useRouter } from "next/navigation";
import type { Match } from "@/lib/api";
import { getToken } from "@/lib/tokens";
import { getFlagUrl } from "@/lib/flags";
import MatchRowFree from "./MatchRowFree";
import MatchRowPremium from "./MatchRowPremium";

const STAGE_LABELS: Record<string, string> = {
  LAST_32: "16avos de final", LAST_16: "Octavos de final", ROUND_OF_16: "Octavos de final",
  QUARTER_FINALS: "Cuartos de final", SEMI_FINALS: "Semifinal",
  THIRD_PLACE: "3er lugar", FINAL: "Final",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

interface Props {
  match: Match;
  isFree: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function MatchRow({ match, isFree, isExpanded, onToggle }: Props) {
  const router = useRouter();
  const hasToken = !!getToken(match.id);

  function handleCTA(e: React.MouseEvent) {
    e.stopPropagation();
    if (hasToken) router.push(`/report/${match.id}`);
  }

  const stageLabel = STAGE_LABELS[match.stage] ?? match.stage;

  return (
    <div style={{
      background: "#111827",
      borderRadius: 14,
      overflow: "hidden",
      border: isExpanded ? "1px solid rgba(99,102,241,0.35)" : "1px solid rgba(255,255,255,0.06)",
      transition: "border-color 0.2s",
    }}>
      {/* Header row — clickable to expand */}
      <div
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", gap: 12, padding: "14px 20px",
          cursor: "pointer",
          background: isExpanded ? "rgba(99,102,241,0.05)" : "transparent",
          transition: "background 0.15s",
        }}
      >
        {/* Time */}
        <span style={{ fontSize: 12, color: "#64748B", minWidth: 40, flexShrink: 0 }}>
          {formatTime(match.match_date)}
        </span>

        {/* Teams */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
          <img src={getFlagUrl(match.home_team)} alt={match.home_team}
            style={{ width: 28, height: 19, objectFit: "cover", borderRadius: 3 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#F1F5F9" }}>{match.home_team}</span>
          <span style={{ fontSize: 12, color: "#475569", margin: "0 2px" }}>vs</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#F1F5F9" }}>{match.away_team}</span>
          <img src={getFlagUrl(match.away_team)} alt={match.away_team}
            style={{ width: 28, height: 19, objectFit: "cover", borderRadius: 3 }} />
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {/* Stage badge */}
          <span style={{
            fontSize: 10, fontWeight: 600, color: "#A78BFA", letterSpacing: "0.04em",
            background: "rgba(99,102,241,0.12)", borderRadius: 20, padding: "2px 8px",
          }}>{stageLabel}</span>

          {/* Free badge or price */}
          {isFree ? (
            <span style={{
              fontSize: 10, fontWeight: 700, color: "#34D399",
              background: "rgba(52,211,153,0.12)", borderRadius: 20, padding: "2px 8px",
            }}>GRATIS</span>
          ) : hasToken ? (
            <button onClick={handleCTA} style={{
              background: "linear-gradient(135deg, #6366F1, #8B5CF6)", color: "#fff",
              border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 11,
              fontWeight: 700, cursor: "pointer",
            }}>Ver reporte →</button>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 700, color: "#34D399" }}>
              S/{(match.price_usd * 3.7).toFixed(2)}
            </span>
          )}

          {/* Chevron */}
          <span style={{
            fontSize: 14, color: "#64748B",
            transform: isExpanded ? "rotate(180deg)" : "none",
            transition: "transform 0.2s", display: "inline-block",
          }}>▾</span>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        isFree ? (
          <>
            <MatchRowFree match={match} />
            <MatchRowPremium match={match} />
          </>
        ) : hasToken ? (
          <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
            <button onClick={handleCTA} style={{
              background: "linear-gradient(135deg, #6366F1, #8B5CF6)", color: "#fff",
              border: "none", borderRadius: 10, padding: "10px 28px", fontSize: 13,
              fontWeight: 700, cursor: "pointer",
            }}>Ver reporte completo →</button>
          </div>
        ) : (
          <MatchRowPremium match={match} />
        )
      )}
    </div>
  );
}
