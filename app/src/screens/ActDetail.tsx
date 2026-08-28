import type { JourneyStop } from "../lib/journey";
import { toDisplayRole } from "../lib/recommend";
import { resolvePerformanceType } from "../lib/performanceType";
import { formatNightMinutes } from "../lib/time";
import { HomeIcon, BackIcon, ClockIcon, PinIcon, ShareIcon } from "../components/icons";
import { RoleBadge, SignalBadge, PerformanceTypeTag, ReasonRow } from "../components/badges";

export function ActDetailScreen({
  stop,
  actNumber,
  onBack,
  onHome,
  onOpenMap,
}: {
  stop: JourneyStop;
  actNumber: number;
  onBack: () => void;
  onHome: () => void;
  onOpenMap?: () => void;
}) {
  const displayRole = toDisplayRole(stop.role);
  const isWildcard = displayRole === "WILDCARD";
  const whyReasons = stop.reasons.filter((r) => r.text !== stop.transitionNote);

  return (
    <div className="screen">
      <div className="screen-top">
        <div className="nav-cluster">
          <button className="icon-btn" onClick={onBack} aria-label="Back">
            <BackIcon />
          </button>
          <button className="icon-btn" onClick={onHome} aria-label="Home">
            <HomeIcon />
          </button>
        </div>
        <button className="icon-btn" aria-label="Share">
          <ShareIcon />
        </button>
      </div>

      <div className="detail-badges">
        <RoleBadge role={displayRole} isFinale={stop.isFinale} />
        <span className="dim">· ACT {actNumber}</span>
      </div>
      <div className="detail-name">{stop.artist.artist}</div>
      <div style={{ marginTop: 6, marginBottom: 12 }}>
        <SignalBadge status={stop.artist.signal_status} size="md" />
      </div>

      <div className="chip-row">
        {stop.artist.genre_tags.length > 0 ? (
          stop.artist.genre_tags.map((g) => (
            <span key={g} className="tag-chip tag-chip-lg">
              {g}
            </span>
          ))
        ) : (
          <span className="tag-chip tag-chip-lg">genre not yet tagged</span>
        )}
        <PerformanceTypeTag type={resolvePerformanceType(stop.performance, stop.artist)} />
      </div>

      {isWildcard && (
        <div className="wildcard-callout">
          We don't know much about this artist yet.
          <br />
          That's exactly why it's worth a look.
        </div>
      )}

      <div className="detail-info-list">
        <div className="detail-info-row">
          <PinIcon size={18} color="#ff6b35" />
          <div>
            <div className="detail-info-main">{stop.performance.camp}</div>
            {stop.performance.location && <div className="detail-info-sub">{stop.performance.location}</div>}
          </div>
        </div>
        <div className="detail-info-row">
          <ClockIcon size={18} color="#ff6b35" />
          <div>
            <div className="detail-info-main">
              {stop.performance.day_start} · {formatNightMinutes(stop.arrivalNightMinutes)}
            </div>
            <div className="detail-info-sub">{stop.transitionNote}</div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-label">WHY IT'S IN YOUR NIGHT</div>
        <div className="reason-list">
          {whyReasons.length > 0 ? (
            whyReasons.map((r, i) => <ReasonRow key={i} reason={r} />)
          ) : (
            <ReasonRow reason={{ text: "Fits the mood and the moment — scheduling and musical fit alone.", provenance: "system" }} />
          )}
        </div>
      </div>

      <div className="spacer" />

      {onOpenMap && stop.performance.location && (
        <button className="btn-secondary" onClick={onOpenMap} style={{ marginTop: 0, marginBottom: 12 }}>
          🧭 View on Playa Map
        </button>
      )}

      <button className="btn-ghost btn-ghost-full" onClick={onBack}>
        <BackIcon size={16} />
        BACK TO YOUR NIGHT
      </button>
    </div>
  );
}
