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

function pickHint(match: Match): string | null {
  const ph  = (match.prob_home  ?? 0) * 100;
  const pa  = (match.prob_away  ?? 0) * 100;
  const btts = (match.prob_btts ?? 0) * 100;
  if (!ph && !pa) return null;

  const favName = ph >= pa ? match.home_team.split(" ")[0] : match.away_team.split(" ")[0];
  const parts: string[] = [`Fav: ${favName}`];
  if (btts > 55) parts.push(`BTTS ${btts.toFixed(0)}%`);
  return parts.join(" · ");
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
  const hint = !isExpanded ? pickHint(match) : null;

  function handleCTA(e: React.MouseEvent) {
    e.stopPropagation();
    if (hasToken) router.push(`/report/${match.id}`);
  }

  const stageLabel = STAGE_LABELS[match.stage] ?? match.stage;
  const isKnockout = match.stage in STAGE_LABELS;

  return (
    <div style={{
      background: "#111827",
      borderRadius: 14,
      overflow: "hidden",
      border: isExpanded ? "1px solid rgba(99,102,241,0.35)" : "1px solid rgba(255,255,255,0.06)",
      transition: "border-color 0.2s",
    }}>
      {/* Header row */}
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

        {/* Teams + hint */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <img src={getFlagUrl(match.home_team)} alt={match.home_team}
              width={32} height={21}
              style={{ objectFit: "cover", borderRadius: "3px", flexShrink: 0 }}
              onError={(e) => { e.currentTarget.src = "https://flagcdn.com/w40/un.png"; }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#F1F5F9", whiteSpace: "nowrap" }}>
              {match.home_team}
            </span>
            <span style={{ fontSize: 12, color: "#475569" }}>vs</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#F1F5F9", whiteSpace: "nowrap" }}>
              {match.away_team}
            </span>
            <img src={getFlagUrl(match.away_team)} alt={match.away_team}
              width={32} height={21}
              style={{ objectFit: "cover", borderRadius: "3px", flexShrink: 0 }}
              onError={(e) => { e.currentTarget.src = "https://flagcdn.com/w40/un.png"; }} />
          </div>
          {hint && (
            <div style={{ fontSize: 11, color: "#34D399", marginTop: 3, opacity: 0.8 }}>
              {hint}
            </div>
          )}
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* Stage badge */}
          <span style={{
            fontSize: 10, fontWeight: 600, color: "#A78BFA", letterSpacing: "0.04em",
            background: "rgba(99,102,241,0.12)", borderRadius: 20, padding: "2px 8px",
            whiteSpace: "nowrap",
          }}>{stageLabel}</span>

          {/* CTA */}
          {hasToken ? (
            <button onClick={handleCTA} style={{
              background: "linear-gradient(135deg, #6366F1, #8B5CF6)", color: "#fff",
              border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 11,
              fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
            }}>Ver reporte →</button>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 700, color: "#34D399", whiteSpace: "nowrap" }}>
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

      {/* Expanded content — always show free summary + premium lock */}
      {isExpanded && (
        <>
          <MatchRowFree match={match} isKnockout={isKnockout} />
          {hasToken ? (
            <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
              <button onClick={handleCTA} style={{
                background: "linear-gradient(135deg, #6366F1, #8B5CF6)", color: "#fff",
                border: "none", borderRadius: 10, padding: "10px 28px", fontSize: 13,
                fontWeight: 700, cursor: "pointer",
              }}>Ver reporte completo →</button>
            </div>
          ) : (
            <MatchRowPremium match={match} />
          )}
        </>
      )}
    </div>
  );
}
