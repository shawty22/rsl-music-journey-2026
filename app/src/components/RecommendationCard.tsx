import type { ScoredRecommendation } from "../types";
import { toDisplayRole } from "../lib/recommend";
import { resolvePerformanceType } from "../lib/performanceType";
import { parseClockStreetAddress } from "../lib/geo";
import { SignalBadge, PerformanceTypeTag } from "./badges";
import { BookmarkIcon } from "./icons";

const ROLE_META: Record<string, { label: string; dot: string }> = {
  STRONG_MATCH: { label: "STRONG MATCH", dot: "var(--accent-2)" },
  DISCOVERY: { label: "DISCOVERY", dot: "var(--accent)" },
  WILDCARD: { label: "WILDCARD", dot: "var(--wildcard)" },
};

export function RecommendationCard({
  rec,
  onShowOnMap,
  stateBadge,
  isSaved,
  onToggleSave,
}: {
  rec: ScoredRecommendation;
  onShowOnMap?: () => void;
  // Overrides the default STRONG MATCH/DISCOVERY/WILDCARD role dot with a
  // live-status one (LIVE NOW / STARTS IN N MIN) — used on Now, where the
  // moment matters more than the taste-match role.
  stateBadge?: { label: string; tone: "live" | "soon" };
  isSaved?: boolean;
  onToggleSave?: () => void;
}) {
  const { artist, performance, role, reasons } = rec;
  const displayRole = toDisplayRole(role);
  const topReason = reasons[0];
  const dotColor = stateBadge ? (stateBadge.tone === "live" ? "var(--live)" : "var(--gold)") : ROLE_META[displayRole].dot;
  const label = stateBadge ? stateBadge.label : ROLE_META[displayRole].label;

  return (
    <div className="rec-row">
      <div className="rec-row-top">
        <span className="rec-dot" style={{ background: dotColor }} />
        <span className="rec-state-label" style={{ color: dotColor }}>
          {label}
        </span>
        <SignalBadge status={artist.signal_status} />
        {onToggleSave && (
          <button
            className="rec-save-btn"
            aria-label={isSaved ? "Remove from saved" : "Save"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave();
            }}
          >
            <BookmarkIcon size={15} color={isSaved ? "var(--gold)" : "var(--text-faint)"} />
          </button>
        )}
      </div>

      <div className="rec-artist">{artist.artist}</div>

      <div className="rec-sub">
        {artist.genre_tags.length > 0 ? artist.genre_tags.slice(0, 2).join(" / ") : "genre not yet tagged"}
        {" / "}
        <PerformanceTypeTag type={resolvePerformanceType(performance, artist)} inline />
      </div>

      <div className="rec-meta">
        {performance.camp}
        {performance.location ? ` · ${performance.location}` : ""} · {performance.day_raw} @ {performance.set_time_raw}
      </div>

      {topReason && <div className="rec-reason">{topReason.text}</div>}

      {onShowOnMap && performance.location && parseClockStreetAddress(performance.location) && (
        <button
          className="rec-map-link"
          onClick={(e) => {
            e.stopPropagation();
            onShowOnMap();
          }}
        >
          MAP →
        </button>
      )}
    </div>
  );
}
