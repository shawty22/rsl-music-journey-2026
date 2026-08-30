import { useState } from "react";
import type { Dataset } from "../data/loadData";
import type { PerformanceType, TasteProfile } from "../types";
import { HomeIcon, CheckIcon, DerivedIcon } from "../components/icons";

const MORE_PERF_TYPES: PerformanceType[] = ["B2B", "LIVE_BAND", "VOCALIST", "PERFORMANCE_MULTIMEDIA"];

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export function MyTasteScreen({
  dataset,
  taste,
  onChange,
  onHome,
}: {
  dataset: Dataset;
  taste: TasteProfile;
  onChange: (t: TasteProfile) => void;
  onHome: () => void;
}) {
  const [favInput, setFavInput] = useState("");
  const [showMoreTypes, setShowMoreTypes] = useState(false);

  const rslArtistNames = new Set(dataset.artists.map((a) => a.artist_normalized));

  function togglePerfType(t: PerformanceType) {
    const has = taste.preferred_performance_types.includes(t);
    const next = has ? taste.preferred_performance_types.filter((x) => x !== t) : [...taste.preferred_performance_types, t];
    onChange({ ...taste, preferred_performance_types: next });
  }

  function addFavorite() {
    const v = favInput.trim();
    if (!v) return;
    if (taste.favorite_artists.some((a) => normalize(a) === normalize(v))) {
      setFavInput("");
      return;
    }
    onChange({ ...taste, favorite_artists: [...taste.favorite_artists, v] });
    setFavInput("");
  }

  return (
    <div className="screen">
      <div className="screen-top">
        <button className="icon-btn icon-btn-labeled" onClick={onHome} aria-label="Home">
          <HomeIcon />
          <span className="icon-btn-label">Home</span>
        </button>
        <div className="icon-btn-spacer" />
      </div>

      <h1 className="step-headline" style={{ fontSize: 26, marginTop: 16 }}>
        My Taste
      </h1>
      <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>
        Genre and DJ/LIVE/HYBRID are set right on Home. This is everything else.
      </div>

      <div className="section">
        <div className="section-label">FAVORITE ARTISTS</div>
        <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 12 }}>
          Add anyone — they don't need to be playing this year. We'll use them to understand your taste.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {taste.favorite_artists.map((name) => {
            const isRsl = rslArtistNames.has(normalize(name));
            const ref = !isRsl ? dataset.tasteReferencesByName.get(normalize(name)) : null;
            const knownGenres = ref && ref.genres.length > 0 ? ref.genres : null;
            return (
              <div key={name} className={`fav-artist-row ${isRsl ? "" : "fav-artist-row-reference"}`}>
                <div>
                  <span className="fav-artist-name">{name}</span>
                  {knownGenres && <div className="fav-artist-hint">↳ informs {knownGenres.join(", ")}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {isRsl ? (
                    <span className="rsl-badge">
                      <CheckIcon size={10} color="var(--accent-2)" /> PLAYING THIS YEAR
                    </span>
                  ) : (
                    <span className="reference-badge">
                      <DerivedIcon size={10} color="var(--text-dim)" /> NOT PLAYING THIS YEAR
                    </span>
                  )}
                  <button
                    className="chip-remove"
                    onClick={() => onChange({ ...taste, favorite_artists: taste.favorite_artists.filter((a) => a !== name) })}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="input-row" style={{ marginTop: 10 }}>
          <input
            value={favInput}
            onChange={(e) => setFavInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addFavorite()}
            placeholder="Add an artist…"
          />
          <button className="btn-add" onClick={addFavorite}>
            Add
          </button>
        </div>
      </div>

      <div className="section">
        <div className="section-label">ANY OTHER WAYS YOU LIKE IT PLAYED?</div>
        <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 10 }}>DJ / Live / Hybrid are set on Home — these are the less common ones.</div>
        <div className="pill-row" style={{ flexWrap: "wrap" }}>
          {!showMoreTypes && (
            <button className="pill pill-inline pill-ghost" onClick={() => setShowMoreTypes(true)}>
              + show more types
            </button>
          )}
          {showMoreTypes &&
            MORE_PERF_TYPES.map((t) => (
              <button
                key={t}
                className={`pill pill-inline ${taste.preferred_performance_types.includes(t) ? "pill-selected" : ""}`}
                onClick={() => togglePerfType(t)}
              >
                {t.replace("_", " ")}
              </button>
            ))}
        </div>
      </div>

      <div className="section">
        <div className="section-label">HOW ADVENTUROUS ARE YOU, GENERALLY?</div>
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
          value={taste.discovery_level}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange({ ...taste, discovery_level: v, wildcard_level: Math.min(0.6, v * 0.4) });
          }}
          style={{ ["--fill" as string]: `${taste.discovery_level * 100}%` }}
        />
        <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 8 }}>You can still adjust this per journey when you build a night.</div>
      </div>

      <div style={{ height: 20 }} />
    </div>
  );
}
