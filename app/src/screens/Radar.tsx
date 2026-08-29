import { useMemo, useState } from "react";
import type { Dataset } from "../data/loadData";
import { buildCandidatePool } from "../lib/recommend";
import { toDisplayRole } from "../lib/recommend";
import { RADAR_MOODS, radarWindow, moodGenreMatchCount, energyScore, type RadarWhen, type RadarTravel } from "../lib/radar";
import { estimateDistance, findLocation } from "../lib/distance";
import { nightMinutesFromHour24 } from "../lib/time";
import { dedupePerformances } from "../lib/liveStatus";
import { isSetSaved } from "../lib/taste";
import { GearIcon, PeopleIcon } from "../components/icons";
import { RecommendationCard } from "../components/RecommendationCard";
import type { PerformanceType, ScoredRecommendation, TasteProfile } from "../types";

const WHEN_OPTIONS: { key: RadarWhen; label: string }[] = [
  { key: "now", label: "Now" },
  { key: "tonight", label: "Tonight" },
  { key: "sunrise", label: "Sunrise" },
  { key: "tomorrow", label: "Tomorrow" },
];

const TRAVEL_OPTIONS: { key: RadarTravel; label: string }[] = [
  { key: "nearby", label: "Nearby" },
  { key: "short", label: "Short ride" },
  { key: "deep", label: "Deep playa" },
];

export function RadarScreen({
  dataset,
  taste,
  startLocation,
  savedSets,
  onToggleSave,
  onSelect,
  onShowOnMap,
  onOpenArtists,
  onOpenSettings,
  onBuildJourneyFrom,
  initialMoods,
}: {
  dataset: Dataset;
  taste: TasteProfile;
  startLocation: string;
  savedSets: ScoredRecommendation[];
  onToggleSave: (rec: ScoredRecommendation) => void;
  onSelect: (rec: ScoredRecommendation) => void;
  onShowOnMap: (rec: ScoredRecommendation) => void;
  onOpenArtists: () => void;
  onOpenSettings: () => void;
  onBuildJourneyFrom: (moods: string[]) => void;
  initialMoods?: string[];
}) {
  const [moods, setMoods] = useState<string[]>(initialMoods ?? taste.favorite_genres.slice(0, 3));
  const [when, setWhen] = useState<RadarWhen>("now");
  const [energy, setEnergy] = useState(0.5);
  const [travel, setTravel] = useState<RadarTravel | null>(null);
  const [results, setResults] = useState<ScoredRecommendation[] | null>(null);

  function toggleMood(key: string) {
    setMoods((m) => (m.includes(key) ? m.filter((x) => x !== key) : [...m, key]));
  }

  const runRadar = () => {
    const now = new Date();
    const nowNM = nightMinutesFromHour24(now.getHours(), now.getMinutes());
    const win = radarWindow(when, now, nowNM);
    const dayPerfs = dedupePerformances(
      dataset.performances.filter((p) => {
        if (p.day_start !== win.day || !p.set_time_valid || p.set_time_hour24 === null || p.set_time_minute === null) return false;
        const nm = nightMinutesFromHour24(p.set_time_hour24, p.set_time_minute);
        return nm >= win.nmMin && nm <= win.nmMax;
      }),
    );

    const wantLive = moods.includes("live");
    const wantSurprise = moods.includes("surprise");
    const wantHighEnergy = moods.includes("high_energy");
    const effectiveEnergy = wantHighEnergy ? Math.max(energy, 0.8) : energy;
    const startLoc = findLocation(dataset.locations, startLocation || null);

    const effectiveTaste: TasteProfile = wantSurprise ? { ...taste, wildcard_level: Math.min(0.6, taste.wildcard_level + 0.3) } : taste;

    let pool = buildCandidatePool(dayPerfs, dataset.artistsById, effectiveTaste, dataset.taxonomy, dataset.tasteReferencesByName);

    pool = pool.map((r) => {
      let bonus = 0;
      const genreHits = moodGenreMatchCount(r.artist, moods);
      bonus += genreHits * 14;
      if (wantLive) {
        const t: PerformanceType = r.performance.performance_type;
        if (t === "LIVE" || t === "HYBRID" || t === "LIVE_BAND") bonus += 12;
      }
      const eScore = energyScore(r.artist);
      bonus += eScore * (effectiveEnergy - 0.5) * 20; // aligned with slider position, either direction
      if (travel && startLoc) {
        const dist = estimateDistance(startLoc, findLocation(dataset.locations, r.performance.location));
        if (dist.confidence === "approximate") {
          const inBucket =
            (travel === "nearby" && (dist.category === "same_spot" || dist.category === "very_close")) ||
            (travel === "short" && (dist.category === "short_walk" || dist.category === "moderate_walk")) ||
            (travel === "deep" && dist.category === "far_walk");
          bonus += inBucket ? 10 : -6;
        }
      }
      return { ...r, score: r.score + bonus };
    });
    pool.sort((a, b) => b.score - a.score);

    setResults(pool.slice(0, 6));
  };

  const grouped = useMemo(() => {
    if (!results) return null;
    return {
      strong: results.filter((r) => toDisplayRole(r.role) === "STRONG_MATCH"),
      discovery: results.filter((r) => toDisplayRole(r.role) === "DISCOVERY"),
      wildcard: results.filter((r) => toDisplayRole(r.role) === "WILDCARD"),
    };
  }, [results]);

  return (
    <div className="screen">
      <div className="screen-top">
        <span className="wordmark">BMRI</span>
        <div className="top-actions">
          <button className="icon-btn" onClick={onOpenArtists} aria-label="Browse artists">
            <PeopleIcon size={16} />
          </button>
          <button className="icon-btn" onClick={onOpenSettings} aria-label="App settings">
            <GearIcon />
          </button>
        </div>
      </div>

      <h1 className="step-headline" style={{ marginTop: 16, fontSize: 24 }}>
        What are you seeking?
      </h1>
      <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>Tell us the feeling. We'll find a move.</div>

      <div className="chip-grid" style={{ marginTop: 16 }}>
        {RADAR_MOODS.map((m) => (
          <button key={m.key} className={`filter-chip ${moods.includes(m.key) ? "filter-chip-active" : ""}`} onClick={() => toggleMood(m.key)}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="section">
        <div className="section-label">WHEN</div>
        <div className="pill-row">
          {WHEN_OPTIONS.map((w) => (
            <button key={w.key} className={`pill pill-inline ${when === w.key ? "pill-selected" : ""}`} onClick={() => setWhen(w.key)}>
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-label">ENERGY</div>
        <div className="slider-labels">
          <span>RESET</span>
          <span className="slider-label-adventurous">PEAK</span>
        </div>
        <input
          type="range"
          className="slider-adventurous"
          min={0}
          max={1}
          step={0.05}
          value={energy}
          onChange={(e) => setEnergy(parseFloat(e.target.value))}
          style={{ ["--fill" as string]: `${energy * 100}%` }}
        />
      </div>

      <div className="section">
        <div className="section-label">TRAVEL</div>
        <div className="pill-row">
          {TRAVEL_OPTIONS.map((t) => (
            <button key={t.key} className={`pill pill-inline ${travel === t.key ? "pill-selected" : ""}`} onClick={() => setTravel(travel === t.key ? null : t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <button className="cta-gradient" onClick={runRadar} style={{ marginTop: 20 }}>
        <span>SHOW MY RADAR</span>
      </button>

      {grouped && (
        <div className="section">
          <div className="section-label">YOUR SIGNALS</div>
          {results!.length === 0 && <p className="empty">Nothing matches that combination right now — try loosening When or Travel.</p>}
          <div className="card-list">
            {[...grouped.strong, ...grouped.discovery, ...grouped.wildcard].map((r) => (
              <div key={r.performance.performance_id} onClick={() => onSelect(r)}>
                <RecommendationCard
                  rec={r}
                  isSaved={isSetSaved(r.performance.performance_id, savedSets)}
                  onToggleSave={() => onToggleSave(r)}
                  onShowOnMap={() => onShowOnMap(r)}
                />
              </div>
            ))}
          </div>
          {results!.length > 0 && (
            <button className="cta-gradient" onClick={() => onBuildJourneyFrom(moods)} style={{ marginTop: 16 }}>
              <span>BUILD A JOURNEY FROM THESE</span>
            </button>
          )}
        </div>
      )}

      <div style={{ height: 90 }} />
    </div>
  );
}
