import { useEffect, useState } from "react";
import type { Dataset } from "../data/loadData";
import { GearIcon, ArrowRightIcon, PeopleIcon } from "../components/icons";
import { OrbitGraphic } from "../components/OrbitGraphic";
import { MOOD_TILES } from "../lib/moods";
import type { PerformanceType, TasteProfile } from "../types";

const PERF_TYPES: PerformanceType[] = ["DJ", "LIVE", "HYBRID"];

// The Journey tab's landing step — taste/mood selection, then hands off to
// the existing day/time/location/duration builder. This is the former Home
// screen, trimmed: What's Good Now, Surprise Me, and the map preview moved
// to the Now/Radar/Map tabs, so this screen does one job.
export function JourneyLandingScreen({
  dataset,
  taste,
  onChangeTaste,
  onBuildJourney,
  onOpenMyTaste,
  onOpenSettings,
  onOpenArtists,
}: {
  dataset: Dataset;
  taste: TasteProfile;
  onChangeTaste: (t: TasteProfile) => void;
  onBuildJourney: () => void;
  onOpenMyTaste: () => void;
  onOpenSettings: () => void;
  onOpenArtists: () => void;
}) {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const selectedGenres = new Set(taste.favorite_genres.map((g) => g.toLowerCase()));

  function toggleMood(genreTag: string) {
    const has = selectedGenres.has(genreTag.toLowerCase());
    const next = has
      ? taste.favorite_genres.filter((g) => g.toLowerCase() !== genreTag.toLowerCase())
      : [...taste.favorite_genres, genreTag];
    onChangeTaste({ ...taste, favorite_genres: next });
  }

  function togglePerfType(t: PerformanceType) {
    const has = taste.preferred_performance_types.includes(t);
    const next = has ? taste.preferred_performance_types.filter((x) => x !== t) : [...taste.preferred_performance_types, t];
    onChangeTaste({ ...taste, preferred_performance_types: next });
  }

  return (
    <div className="screen">
      <div className="screen-top">
        <span className="wordmark">BMRI</span>
        <div className="top-actions">
          <span className={`badge ${online ? "badge-online" : "badge-offline"}`}>
            <span className="badge-dot" />
            {online ? "ONLINE" : "OFFLINE"}
          </span>
          <button className="icon-btn" onClick={onOpenArtists} aria-label="Browse artists">
            <PeopleIcon size={16} />
          </button>
          <button className="icon-btn" onClick={onOpenSettings} aria-label="App settings">
            <GearIcon />
          </button>
        </div>
      </div>

      <div className="home-headline-block">
        <div className="home-headline">Build a rave journey</div>
        <div className="home-sub">Pick a sound, a starting point, and how long you have. We'll create your next sequence of music.</div>
      </div>

      <div className="taste-module">
        <div className="taste-module-header">
          <span className="section-label" style={{ margin: 0 }}>
            YOUR TASTE
          </span>
          <button className="text-link" onClick={onOpenMyTaste}>
            Edit →
          </button>
        </div>
        <div className="chip-grid">
          {MOOD_TILES.map((tile) => {
            const selected = selectedGenres.has(tile.genreTag.toLowerCase());
            return (
              <button key={tile.key} className={`filter-chip ${selected ? "filter-chip-active" : ""}`} onClick={() => toggleMood(tile.genreTag)}>
                {tile.label}
              </button>
            );
          })}
          <button className="filter-chip" onClick={onOpenMyTaste}>
            ★ {taste.favorite_artists.length} favorites
          </button>
        </div>
        <div className="pill-row" style={{ marginTop: 14 }}>
          {PERF_TYPES.map((t) => (
            <button
              key={t}
              className={`pill pill-inline ${taste.preferred_performance_types.includes(t) ? "pill-selected" : ""}`}
              onClick={() => togglePerfType(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="orbit-wrap">
        <OrbitGraphic />
      </div>

      <button className="cta-gradient" onClick={onBuildJourney}>
        <span>BUILD MY JOURNEY</span>
        <ArrowRightIcon />
      </button>

      <div className="spacer" />
      <div className="home-footer">{dataset.metadata.artist_count.toLocaleString()} artists to discover · works fully offline</div>
      <div className="bottom-nav-spacer" />
    </div>
  );
}
