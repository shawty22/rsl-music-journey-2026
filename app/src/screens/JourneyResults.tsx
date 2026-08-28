import type { JourneyStop } from "../lib/journey";
import { toDisplayRole, type DisplayRole } from "../lib/recommend";
import { formatNightMinutes } from "../lib/time";
import { BackIcon, PinIcon, ShareIcon } from "../components/icons";

const ROLE_META: Record<DisplayRole, { label: string; className: string }> = {
  STRONG_MATCH: { label: "STRONG MATCH", className: "role-strong" },
  DISCOVERY: { label: "DISCOVERY", className: "role-discovery" },
  WILDCARD: { label: "WILDCARD", className: "role-wildcard" },
  FINALE: { label: "FINALE", className: "role-finale" },
};

export function JourneyResultsScreen({
  stops,
  day,
  startLabel,
  startLocation,
  durationHours,
  onBack,
  onSelectStop,
  onShare,
  onSave,
}: {
  stops: JourneyStop[];
  day: string;
  startLabel: string;
  startLocation: string;
  durationHours: number;
  onBack: () => void;
  onSelectStop: (index: number) => void;
  onShare: () => void;
  onSave: () => void;
}) {
  return (
    <div className="screen">
      <div className="screen-top screen-top-centered">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <BackIcon />
        </button>
        <div className="results-title">
          <div className="results-title-label">YOUR NIGHT</div>
          <div className="results-title-main">
            {durationHours}h Journey · {day}
          </div>
        </div>
        <button className="icon-btn" onClick={onShare} aria-label="Share">
          <ShareIcon />
        </button>
      </div>

      {stops.length === 0 ? (
        <p className="empty">
          Couldn't find a fitting sequence for that night — try a different start time, location, or a wider travel budget in
          preferences.
        </p>
      ) : (
        <div className="timeline">
          <div className="timeline-row">
            <div className="timeline-rail">
              <div className="timeline-dot timeline-dot-start" />
              <div className="timeline-line" />
            </div>
            <div className="timeline-content timeline-start">
              <div className="timeline-eyebrow">START</div>
              <div className="timeline-start-line">
                {startLocation || "Your spot"} <span className="dim">· {startLabel}</span>
              </div>
            </div>
          </div>

          {stops.map((stop, i) => {
            const displayRole = toDisplayRole(stop.role, stop.isFinale);
            const meta = ROLE_META[displayRole];
            const isLast = i === stops.length - 1;
            const whyReason = stop.reasons.find((r) => r !== stop.transitionNote) ?? "Fits the mood and the moment.";
            return (
              <div className="timeline-row" key={stop.performance.performance_id} onClick={() => onSelectStop(i)}>
                <div className="timeline-rail">
                  <div className={`timeline-dot ${meta.className}`} />
                  {!isLast && <div className="timeline-line" />}
                </div>
                <div className="timeline-content timeline-clickable">
                  <div className="timeline-meta">
                    <span className={`timeline-role ${meta.className}`}>{meta.label}</span>
                    <span className="dim">· {formatNightMinutes(stop.arrivalNightMinutes)}</span>
                  </div>
                  <div className="timeline-artist">{stop.artist.artist}</div>
                  <div className="chip-row chip-row-tight">
                    {stop.artist.genre_tags.slice(0, 2).map((g) => (
                      <span key={g} className="tag-chip">
                        {g}
                      </span>
                    ))}
                    {stop.performance.performance_type !== "UNKNOWN" && (
                      <span className="tag-chip">{stop.performance.performance_type.toLowerCase()}</span>
                    )}
                  </div>
                  <div className="timeline-location">
                    <PinIcon size={13} />
                    {stop.performance.camp}
                  </div>
                  <div className="timeline-why">{whyReason}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {stops.length > 0 && (
        <div className="results-actions">
          <button className="btn-ghost" onClick={onShare}>
            <ShareIcon size={15} />
            SHARE THIS NIGHT
          </button>
          <button className="btn-ghost btn-ghost-muted" onClick={onSave}>
            SAVE
          </button>
        </div>
      )}
    </div>
  );
}
