import { useEffect, useRef, useState } from "react";
import { HomeIcon, PinIcon, ArrowRightIcon } from "../components/icons";
import { DAY_OPTIONS } from "../lib/time";
import { latLngToBrcAddress, type BrcGeoModel } from "../lib/geo";
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

export function BuildMyNightScreen({
  taste,
  onChangeTaste,
  draft,
  onChangeDraft,
  onHome,
  onEditTaste,
  onGo,
  geoModel,
}: {
  taste: TasteProfile;
  onChangeTaste: (t: TasteProfile) => void;
  draft: JourneyDraft;
  onChangeDraft: (d: JourneyDraft) => void;
  onHome: () => void;
  onEditTaste: () => void;
  onGo: () => void;
  geoModel: BrcGeoModel | null;
}) {
  const adventurous = taste.discovery_level;
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [autoLocated, setAutoLocated] = useState(false);

  // Geolocation resolves asynchronously, sometimes seconds after the user
  // has already changed the day/duration/time — read the LATEST draft via a
  // ref rather than closing over the `draft` prop, or a slow GPS callback
  // would silently overwrite whatever the user picked in the meantime.
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  function useMyLocation(silent = false) {
    if (!geoModel || !navigator.geolocation) {
      if (!silent) setLocateError("Location isn't available on this device/browser.");
      return;
    }
    setLocating(true);
    if (!silent) setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const addr = latLngToBrcAddress(geoModel, { lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (addr.beyondCity) {
          if (!silent) setLocateError("You look like you're outside the city grid — enter your intersection manually.");
          return;
        }
        onChangeDraft({ ...draftRef.current, startLocation: `${addr.clock} & ${addr.street}` });
        setAutoLocated(true);
      },
      (err) => {
        setLocating(false);
        if (!silent) setLocateError(err.message || "Couldn't get your location.");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  function setAdventurous(v: number) {
    onChangeTaste({ ...taste, discovery_level: v, wildcard_level: Math.min(0.6, v * 0.4) });
  }

  // Default to "here, now" the way Google Maps defaults to your current
  // location — try once, silently, and only if the field is still empty.
  // Any manual edit (including a re-tap of the button) is never overwritten.
  useEffect(() => {
    if (draft.startLocation) return;
    useMyLocation(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="screen">
      <div className="screen-top">
        <button className="icon-btn" onClick={onHome} aria-label="Home">
          <HomeIcon />
        </button>
        <div className="icon-btn-spacer" />
      </div>

      <h1 className="step-headline" style={{ marginTop: 16 }}>
        Build My Night
      </h1>

      <div className="taste-summary-card">
        <div className="taste-module-header">
          <span className="section-label" style={{ margin: 0 }}>
            YOUR TASTE
          </span>
          <button className="text-link" onClick={onEditTaste}>
            Edit →
          </button>
        </div>
        <div className="chip-row chip-row-tight">
          {taste.favorite_genres.length > 0 ? (
            taste.favorite_genres.map((g) => (
              <span key={g} className="tag-chip">
                {g}
              </span>
            ))
          ) : (
            <span className="tag-chip tag-chip-dim">no genres picked yet</span>
          )}
        </div>
        <div className="taste-summary-footer">
          {taste.favorite_artists.length} favorite artist{taste.favorite_artists.length === 1 ? "" : "s"}
          {taste.preferred_performance_types.length > 0 ? ` · ${taste.preferred_performance_types.join(" / ")} preferred` : ""}
        </div>
      </div>

      <div className="section">
        <div className="section-label">TONIGHT'S ADVENTURE LEVEL</div>
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
        <div className="section-label">HOW LONG HAVE YOU GOT?</div>
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
        <div className="section-label">WHEN ARE YOU STARTING?</div>
        <div className="input-row">
          <select value={draft.hour} onChange={(e) => onChangeDraft({ ...draft, hour: parseInt(e.target.value, 10) })}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <select value={draft.minute} onChange={(e) => onChangeDraft({ ...draft, minute: parseInt(e.target.value, 10) })}>
            {[0, 15, 30, 45].map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, "0")}
              </option>
            ))}
          </select>
          <select value={draft.meridiem} onChange={(e) => onChangeDraft({ ...draft, meridiem: e.target.value as "AM" | "PM" })}>
            <option value="PM">PM</option>
            <option value="AM">AM</option>
          </select>
        </div>
      </div>

      <div className="section">
        <div className="section-label">WHERE ARE YOU STARTING?</div>
        <div className="location-field">
          <PinIcon size={18} color="#ff6b35" />
          <input
            value={draft.startLocation}
            onChange={(e) => {
              setAutoLocated(false);
              onChangeDraft({ ...draft, startLocation: e.target.value });
            }}
            placeholder="e.g. 2:35 & B"
          />
          {autoLocated && <span className="location-auto-tag">CURRENT</span>}
        </div>
        <div className="location-row">
          <div className="location-hint">{autoLocated ? "Detected from your location — tap to edit." : "Nearest intersection — that's close enough."}</div>
          {geoModel && (
            <button className="text-link" onClick={() => useMyLocation(false)} disabled={locating}>
              {locating ? "Locating…" : "📍 Use my location"}
            </button>
          )}
        </div>
        {locateError && <div className="location-error">{locateError}</div>}
      </div>

      <div className="spacer" />

      <button className="cta-gradient cta-go" onClick={onGo}>
        <span>TAKE ME SOMEWHERE</span>
        <ArrowRightIcon />
      </button>
    </div>
  );
}
