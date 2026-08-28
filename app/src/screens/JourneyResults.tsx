import type { JourneyStop } from "../lib/journey";
import { toDisplayRole } from "../lib/recommend";
import { resolvePerformanceType } from "../lib/performanceType";
import { formatNightMinutes } from "../lib/time";
import { HomeIcon, BackIcon, PinIcon, ShareIcon } from "../components/icons";
import { RoleBadge, SignalBadge, PerformanceTypeTag, ReasonRow } from "../components/badges";

export function JourneyResultsScreen({
  stops,
  day,
  startLabel,
  startLocation,
  durationHours,
  onBack,
  onHome,
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
  onHome: () => void;
  onSelectStop: (index: number) => void;
  onShare: () => void;
  onSave: () => void;
}) {
  return (
    <div className="screen">
      <div className="screen-top screen-top-centered">
        <div className="nav-cluster">
          <button className="icon-btn" onClick={onBack} aria-label="Back">
            <BackIcon />
          </button>
          <button className="icon-btn" onClick={onHome} aria-label="Home">
            <HomeIcon />
          </button>
        </div>
        <div className="results-title">
          <div className="results-title-label">YOUR NIGHT</div>
          <div className="results-title-main">
            {durationHours}h · {day}
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
            const displayRole = toDisplayRole(stop.role);
            const isLast = i === stops.length - 1;
            const topReason = stop.reasons.find((r) => r.text !== stop.transitionNote);
            return (
              <div className="timeline-row" key={stop.performance.performance_id} onClick={() => onSelectStop(i)}>
                <div className="timeline-rail">
                  <div className={`timeline-dot role-dot-${displayRole === "STRONG_MATCH" ? "strong" : displayRole === "DISCOVERY" ? "discovery" : "wildcard"}`} />
                  {!isLast && <div className="timeline-line" />}
                </div>
                <div className="timeline-content timeline-clickable">
                  <div className="timeline-meta">
                    <RoleBadge role={displayRole} isFinale={stop.isFinale} />
                    <span className="dim">· {formatNightMinutes(stop.arrivalNightMinutes)}</span>
                  </div>
                  <div className="timeline-artist-row">
                    <div className="timeline-artist">{stop.artist.artist}</div>
                    <SignalBadge status={stop.artist.signal_status} />
                  </div>
                  {stop.artist.genre_tags.length > 0 ? (
                    <div className="chip-row chip-row-tight">
                      {stop.artist.genre_tags.slice(0, 2).map((g) => (
                        <span key={g} className="tag-chip">
                          {g}
                        </span>
                      ))}
                      <PerformanceTypeTag type={resolvePerformanceType(stop.performance, stop.artist)} />
                    </div>
                  ) : (
                    <div className="card-genre">genre not yet tagged</div>
                  )}
                  <div className="timeline-location">
                    <PinIcon size={13} />
                    {stop.performance.camp}
                  </div>
                  {topReason && <ReasonRow reason={topReason} />}
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
