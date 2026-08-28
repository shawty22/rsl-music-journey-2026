import type { JourneyStop } from "../lib/journey";
import { toDisplayRole, type DisplayRole } from "../lib/recommend";
import { formatNightMinutes } from "../lib/time";
import { BackIcon, ClockIcon, PinIcon, ShareIcon } from "../components/icons";

const ROLE_LABEL: Record<DisplayRole, string> = {
  STRONG_MATCH: "STRONG MATCH",
  DISCOVERY: "DISCOVERY",
  WILDCARD: "WILDCARD",
  FINALE: "FINALE",
};

const ROLE_CLASS: Record<DisplayRole, string> = {
  STRONG_MATCH: "role-strong",
  DISCOVERY: "role-discovery",
  WILDCARD: "role-wildcard",
  FINALE: "role-finale",
};

export function ActDetailScreen({
  stop,
  actNumber,
  onBack,
}: {
  stop: JourneyStop;
  actNumber: number;
  onBack: () => void;
}) {
  const displayRole = toDisplayRole(stop.role, stop.isFinale);
  const isWildcard = displayRole === "WILDCARD";
  const whyReasons = stop.reasons.filter((r) => r !== stop.transitionNote);

  return (
    <div className="screen">
      <div className="screen-top">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <BackIcon />
        </button>
        <div className="icon-btn-spacer" />
        <button className="icon-btn" aria-label="Share">
          <ShareIcon />
        </button>
      </div>

      <div className={`detail-eyebrow ${ROLE_CLASS[displayRole]}`}>
        {ROLE_LABEL[displayRole]} · ACT {actNumber}
      </div>
      <div className="detail-name">{stop.artist.artist}</div>

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
        {stop.performance.performance_type !== "UNKNOWN" && (
          <span className="tag-chip tag-chip-lg">{stop.performance.performance_type.toLowerCase()} set</span>
        )}
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
        <div className="detail-why">
          {whyReasons.length > 0 ? whyReasons.join(" ") : "Fits the mood and the moment — scheduling and musical fit alone."}
        </div>
      </div>

      <div className="spacer" />

      <button className="btn-ghost btn-ghost-full" onClick={onBack}>
        <BackIcon size={16} />
        BACK TO YOUR NIGHT
      </button>
    </div>
  );
}
