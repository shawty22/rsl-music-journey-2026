import { useState } from "react";
import type { Dataset } from "../data/loadData";
import type { PerformanceType, TasteProfile } from "../types";
import { HomeIcon, BackIcon, CheckIcon, DerivedIcon, ArrowRightIcon } from "../components/icons";
import { MOOD_ICONS } from "../components/moodIcons";
import { MOOD_TILES } from "../lib/moods";
import { lookupKnownArtistGenres } from "../lib/knownArtistGenres";

const PRIMARY_PERF_TYPES: PerformanceType[] = ["DJ", "LIVE", "HYBRID", "B2B"];
const MORE_PERF_TYPES: PerformanceType[] = ["LIVE_BAND", "VOCALIST", "PERFORMANCE_MULTIMEDIA"];

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export function MyTasteScreen({
  dataset,
  taste,
  onChange,
  onBack,
  onHome,
  showBack,
  onNext,
}: {
  dataset: Dataset;
  taste: TasteProfile;
  onChange: (t: TasteProfile) => void;
  onBack: () => void;
  onHome: () => void;
  showBack: boolean;
  onNext?: () => void;
}) {
  const [favInput, setFavInput] = useState("");
  const [showMoreTypes, setShowMoreTypes] = useState(false);

  const selectedGenres = new Set(taste.favorite_genres.map((g) => g.toLowerCase()));
  const rslArtistNames = new Set(dataset.artists.map((a) => a.artist_normalized));

  function toggleMood(genreTag: string) {
    const has = selectedGenres.has(genreTag.toLowerCase());
    const next = has
      ? taste.favorite_genres.filter((g) => g.toLowerCase() !== genreTag.toLowerCase())
      : [...taste.favorite_genres, genreTag];
    onChange({ ...taste, favorite_genres: next });
  }

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
        <div className="nav-cluster">
          {showBack && (
            <button className="icon-btn" onClick={onBack} aria-label="Back">
              <BackIcon />
            </button>
          )}
          <button className="icon-btn" onClick={onHome} aria-label="Home">
            <HomeIcon />
          </button>
        </div>
        <div className="icon-btn-spacer" />
      </div>

      <h1 className="step-headline" style={{ fontSize: 26, marginTop: 16 }}>
        My Taste
      </h1>
      <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>This is used everywhere the app recommends something to you.</div>

      <div className="section">
        <div className="section-label">GENRE &amp; MOOD</div>
        <div className="mood-grid">
          {MOOD_TILES.map((tile) => {
            const selected = selectedGenres.has(tile.genreTag.toLowerCase());
            const Icon = MOOD_ICONS[tile.key];
            return (
              <button key={tile.key} className={`mood-tile ${selected ? "mood-tile-selected" : ""}`} onClick={() => toggleMood(tile.genreTag)}>
                <Icon size={22} color={selected ? "#ff6b35" : "#9797a8"} />
                <div className="mood-label">{tile.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="section">
        <div className="section-label">FAVORITE ARTISTS</div>
        <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 12 }}>
          Add anyone — they don't need to be playing this year. We'll use them to understand your taste.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {taste.favorite_artists.map((name) => {
            const isRsl = rslArtistNames.has(normalize(name));
            const knownGenres = !isRsl ? lookupKnownArtistGenres(name) : null;
            return (
              <div key={name} className={`fav-artist-row ${isRsl ? "" : "fav-artist-row-reference"}`}>
                <div>
                  <span className="fav-artist-name">{name}</span>
                  {knownGenres && <div className="fav-artist-hint">↳ informs {knownGenres.join(", ")}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {isRsl ? (
                    <span className="rsl-badge">
                      <CheckIcon size={10} color="#4fd1c5" /> PLAYING 2026
                    </span>
                  ) : (
                    <span className="reference-badge">
                      <DerivedIcon size={10} color="#9797a8" /> REFERENCE
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
        <div className="section-label">HOW DO YOU LIKE IT PLAYED?</div>
        <div className="pill-row" style={{ flexWrap: "wrap" }}>
          {PRIMARY_PERF_TYPES.map((t) => (
            <button
              key={t}
              className={`pill pill-inline ${taste.preferred_performance_types.includes(t) ? "pill-selected" : ""}`}
              onClick={() => togglePerfType(t)}
            >
              {t}
            </button>
          ))}
          {!showMoreTypes && (
            <button className="pill pill-inline pill-ghost" onClick={() => setShowMoreTypes(true)}>
              + more types
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

      {onNext ? (
        <>
          <div className="spacer" style={{ minHeight: 24 }} />
          <button className="cta-solid" onClick={onNext}>
            NEXT
            <ArrowRightIcon size={18} />
          </button>
        </>
      ) : (
        <div style={{ height: 20 }} />
      )}
    </div>
  );
}
