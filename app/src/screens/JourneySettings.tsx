import { BackIcon, PinIcon, ArrowRightIcon } from "../components/icons";
import { DAY_OPTIONS } from "../lib/time";
import type { TasteProfile } from "../types";

const DURATION_OPTIONS: { label: string; hours: number }[] = [
  { label: "2h", hours: 2 },
  { label: "3h", hours: 3 },
  { label: "4h", hours: 4 },
  { label: "6h+", hours: 6 },
];

export interface JourneyDraft {
  day: string;
  hour: number;
  minute: number;
  meridiem: "AM" | "PM";
  durationHours: number;
  startLocation: string;
}

export function JourneySettingsScreen({
  taste,
  onChangeTaste,
  draft,
  onChangeDraft,
  onBack,
  onGo,
}: {
  taste: TasteProfile;
  onChangeTaste: (t: TasteProfile) => void;
  draft: JourneyDraft;
  onChangeDraft: (d: JourneyDraft) => void;
  onBack: () => void;
  onGo: () => void;
}) {
  const adventurous = taste.discovery_level;

  function setAdventurous(v: number) {
    onChangeTaste({ ...taste, discovery_level: v, wildcard_level: Math.min(0.6, v * 0.4) });
  }

  return (
    <div className="screen">
      <div className="screen-top">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <BackIcon />
        </button>
        <div className="step-dots">
          <span className="dot dot-filled" />
          <span className="dot dot-filled" />
        </div>
        <div className="icon-btn-spacer" />
      </div>

      <div className="section">
        <h1 className="step-headline">
          How far down the
          <br />
          rabbit hole?
        </h1>
        <div className="slider-labels">
          <span>FAMILIAR</span>
          <span className="slider-label-adventurous">ADVENTUROUS</span>
        </div>
        <input
          type="range"
          className="slider-adventurous"
          min={0}
          max={1}
          step={0.05}
          value={adventurous}
          onChange={(e) => setAdventurous(parseFloat(e.target.value))}
          style={{ ["--fill" as string]: `${adventurous * 100}%` }}
        />
      </div>

      <div className="section">
        <h1 className="step-headline">
          How long have
          <br />
          you got?
        </h1>
        <div className="duration-row">
          {DURATION_OPTIONS.map((d) => (
            <button
              key={d.label}
              className={`duration-chip ${draft.durationHours === d.hours ? "duration-chip-selected" : ""}`}
              onClick={() => onChangeDraft({ ...draft, durationHours: d.hours })}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-label">WHICH NIGHT?</div>
        <div className="day-row">
          {DAY_OPTIONS.map((d) => (
            <button key={d} className={`day-chip ${draft.day === d ? "day-chip-selected" : ""}`} onClick={() => onChangeDraft({ ...draft, day: d })}>
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <h1 className="step-headline">
          Where are you
          <br />
          starting?
        </h1>
        <div className="location-field">
          <PinIcon size={18} color="#ff6b35" />
          <input
            value={draft.startLocation}
            onChange={(e) => onChangeDraft({ ...draft, startLocation: e.target.value })}
            placeholder="e.g. 7:15 & B"
          />
        </div>
        <div className="location-hint">Nearest intersection — that's close enough.</div>
      </div>

      <div className="spacer" />

      <button className="cta-gradient cta-go" onClick={onGo}>
        <span>TAKE ME SOMEWHERE</span>
        <ArrowRightIcon />
      </button>
    </div>
  );
}
