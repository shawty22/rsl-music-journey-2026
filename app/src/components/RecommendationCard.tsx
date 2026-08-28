import type { ScoredRecommendation } from "../types";

const ROLE_LABEL: Record<string, string> = {
  CORE_MATCH: "⭐ WORTH CHECKING",
  ADJACENT: "🎯 ADJACENT PICK",
  WILDCARD: "🧪 WILDCARD",
  MAJOR_ACT: "🎪 MAJOR ACT",
  LOCAL_GEM: "💎 LOCAL GEM",
  UNKNOWN: "❔ UNKNOWN QUANTITY",
};

const SIGNAL_LABEL: Record<string, string> = {
  ESTABLISHED: "🟢 Established",
  EMERGING: "🟡 Emerging",
  unknown: "⚪ Unknown signal",
};

export function RecommendationCard({ rec }: { rec: ScoredRecommendation }) {
  const { artist, performance, role, reasons } = rec;
  const genres = artist.genre_tags.length ? artist.genre_tags.join(", ") : "genre not yet tagged";
  const signalKey = artist.signal_status === "ESTABLISHED" || artist.signal_status === "EMERGING" ? artist.signal_status : "unknown";

  return (
    <div className="card">
      <div className="card-role">{ROLE_LABEL[role] ?? role}</div>
      <div className="card-artist">{artist.artist}</div>
      <div className="card-genre">{genres}</div>
      <div className="card-meta">
        <span>🎧 {performance.performance_type}</span>
        <span>{SIGNAL_LABEL[signalKey]}</span>
      </div>
      <div className="card-meta">
        <span>📍 {performance.camp}{performance.location ? ` — ${performance.location}` : ""}</span>
      </div>
      <div className="card-meta">
        <span>🕙 {performance.day_raw} @ {performance.set_time_raw}</span>
      </div>
      {performance.theme && <div className="card-theme">{performance.theme}</div>}
      <div className="card-why">
        <div className="card-why-label">Why:</div>
        <ul>
          {reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
