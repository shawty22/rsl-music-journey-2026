import type { ScoredRecommendation } from "../types";
import { toDisplayRole } from "../lib/recommend";
import { resolvePerformanceType } from "../lib/performanceType";
import { RoleBadge, SignalBadge, PerformanceTypeTag, ReasonRow } from "./badges";
import { PinIcon, ClockIcon } from "./icons";

export function RecommendationCard({ rec, onShowOnMap }: { rec: ScoredRecommendation; onShowOnMap?: () => void }) {
  const { artist, performance, role, reasons } = rec;
  const displayRole = toDisplayRole(role);
  const topReason = reasons[0];

  return (
    <div className="card">
      <div className="card-top">
        <RoleBadge role={displayRole} />
        <SignalBadge status={artist.signal_status} />
      </div>
      <div className="card-artist">{artist.artist}</div>
      {artist.genre_tags.length > 0 ? (
        <div className="chip-row chip-row-tight">
          {artist.genre_tags.slice(0, 2).map((g) => (
            <span key={g} className="tag-chip">
              {g}
            </span>
          ))}
          <PerformanceTypeTag type={resolvePerformanceType(performance, artist)} />
        </div>
      ) : (
        <div className="card-genre">genre not yet tagged</div>
      )}
      <div className="card-meta">
        <span>
          <PinIcon size={12} /> {performance.camp}
          {performance.location ? ` · ${performance.location}` : ""}
        </span>
        <span>
          <ClockIcon size={12} /> {performance.day_raw} @ {performance.set_time_raw}
        </span>
      </div>
      {performance.theme && <div className="card-theme">{performance.theme}</div>}
      {topReason && (
        <div className="card-why">
          <ReasonRow reason={topReason} />
        </div>
      )}
      {onShowOnMap && performance.location && (
        <button
          className="card-map-btn"
          onClick={(e) => {
            e.stopPropagation();
            onShowOnMap();
          }}
        >
          🧭 Show on map
        </button>
      )}
    </div>
  );
}
