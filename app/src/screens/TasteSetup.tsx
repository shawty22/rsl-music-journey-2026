import { useState } from "react";
import type { PerformanceType, TasteProfile } from "../types";
import { BackIcon, ArrowRightIcon } from "../components/icons";
import { MOOD_TILES } from "../lib/moods";

const PERF_TYPES: PerformanceType[] = ["DJ", "LIVE", "HYBRID"];

export function TasteSetupScreen({
  taste,
  onChange,
  onBack,
  onNext,
}: {
  taste: TasteProfile;
  onChange: (t: TasteProfile) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [favInput, setFavInput] = useState("");

  const selectedGenres = new Set(taste.favorite_genres.map((g) => g.toLowerCase()));
  const liveTileSelected = taste.preferred_performance_types.includes("LIVE") && taste.preferred_performance_types.includes("HYBRID");

  function toggleMood(genreTag: string | null) {
    if (genreTag === null) {
      // "Live" tile toggles LIVE+HYBRID preference together
      if (liveTileSelected) {
        onChange({ ...taste, preferred_performance_types: taste.preferred_performance_types.filter((t) => t !== "LIVE" && t !== "HYBRID") });
      } else {
        const next = new Set(taste.preferred_performance_types);
        next.add("LIVE");
        next.add("HYBRID");
        onChange({ ...taste, preferred_performance_types: Array.from(next) });
      }
      return;
    }
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
    if (taste.favorite_artists.some((a) => a.toLowerCase() === v.toLowerCase())) {
      setFavInput("");
      return;
    }
    onChange({ ...taste, favorite_artists: [...taste.favorite_artists, v] });
    setFavInput("");
  }

  return (
    <div className="screen">
      <div className="screen-top">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <BackIcon />
        </button>
        <div className="step-dots">
          <span className="dot dot-filled" />
          <span className="dot" />
        </div>
        <div className="icon-btn-spacer" />
      </div>

      <h1 className="step-headline">
        What are you
        <br />
        feeling tonight?
      </h1>

      <div className="mood-grid">
        {MOOD_TILES.map((tile) => {
          const selected = tile.genreTag ? selectedGenres.has(tile.genreTag.toLowerCase()) : liveTileSelected;
          return (
            <button key={tile.key} className={`mood-tile ${selected ? "mood-tile-selected" : ""}`} onClick={() => toggleMood(tile.genreTag)}>
              <div className="mood-emoji">{tile.emoji}</div>
              <div className="mood-label">{tile.label}</div>
            </button>
          );
        })}
      </div>

      <div className="section">
        <div className="section-label">
          FAVORITE ARTISTS <span className="section-label-optional">(optional)</span>
        </div>
        <div className="chip-row">
          {taste.favorite_artists.map((a) => (
            <span key={a} className="chip">
              {a}
              <button
                className="chip-remove"
                onClick={() => onChange({ ...taste, favorite_artists: taste.favorite_artists.filter((x) => x !== a) })}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className="input-row">
          <input
            value={favInput}
            onChange={(e) => setFavInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addFavorite()}
            placeholder="e.g. Bonobo"
          />
          <button className="btn-add" onClick={addFavorite}>
            Add
          </button>
        </div>
      </div>

      <div className="section">
        <div className="section-label">HOW DO YOU LIKE IT PLAYED?</div>
        <div className="pill-row">
          {PERF_TYPES.map((t) => (
            <button
              key={t}
              className={`pill ${taste.preferred_performance_types.includes(t) ? "pill-selected" : ""}`}
              onClick={() => togglePerfType(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="spacer" />

      <button className="cta-solid" onClick={onNext}>
        NEXT
        <ArrowRightIcon size={18} />
      </button>
    </div>
  );
}
