import { useEffect, useMemo, useState } from "react";
import "./index.css";
import { loadDataset, type Dataset } from "./data/loadData";
import { loadTaste, saveTaste, loadSavedJourneys, saveJourney, deleteJourney, DEFAULT_TASTE } from "./lib/taste";
import { buildCandidatePool, applyDiscoveryMix } from "./lib/recommend";
import { buildJourney, type JourneyStop } from "./lib/journey";
import { DAY_OPTIONS, parseTimeInputToNightMinutes, formatNightMinutes } from "./lib/time";
import { RecommendationCard } from "./components/RecommendationCard";
import type { SavedJourney, TasteProfile } from "./types";

type View = "home" | "discover" | "journey" | "artists" | "saved";

function OfflineBadge() {
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
  return <span className={`badge ${online ? "badge-online" : "badge-offline"}`}>{online ? "ONLINE" : "OFFLINE READY ✓"}</span>;
}

function PreferencesPanel({ taste, onChange, onClose }: { taste: TasteProfile; onChange: (t: TasteProfile) => void; onClose: () => void }) {
  const [local, setLocal] = useState(taste);
  const [favInput, setFavInput] = useState("");

  function commit(next: TasteProfile) {
    setLocal(next);
    onChange(next);
  }

  return (
    <div className="sheet">
      <div className="sheet-header">
        <h2>Preferences</h2>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      <label className="field-label">Favorite artists</label>
      <div className="chip-row">
        {local.favorite_artists.map((a) => (
          <span key={a} className="chip">
            {a}
            <button onClick={() => commit({ ...local, favorite_artists: local.favorite_artists.filter((x) => x !== a) })}>✕</button>
          </span>
        ))}
      </div>
      <div className="input-row">
        <input value={favInput} onChange={(e) => setFavInput(e.target.value)} placeholder="e.g. Bonobo" />
        <button
          onClick={() => {
            if (!favInput.trim()) return;
            commit({ ...local, favorite_artists: [...local.favorite_artists, favInput.trim()] });
            setFavInput("");
          }}
        >
          Add
        </button>
      </div>

      <label className="field-label">Discovery level: {Math.round(local.discovery_level * 100)}%</label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={local.discovery_level}
        onChange={(e) => commit({ ...local, discovery_level: parseFloat(e.target.value) })}
      />

      <label className="field-label">Wildcard level: {Math.round(local.wildcard_level * 100)}%</label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={local.wildcard_level}
        onChange={(e) => commit({ ...local, wildcard_level: parseFloat(e.target.value) })}
      />

      <label className="field-label">Max travel: {local.max_travel_minutes} min</label>
      <input
        type="range"
        min={5}
        max={60}
        step={5}
        value={local.max_travel_minutes}
        onChange={(e) => commit({ ...local, max_travel_minutes: parseInt(e.target.value, 10) })}
      />

      <label className="field-label">Live / hybrid preference</label>
      <select value={local.live_hybrid_preference} onChange={(e) => commit({ ...local, live_hybrid_preference: e.target.value as TasteProfile["live_hybrid_preference"] })}>
        <option value="avoid">Avoid</option>
        <option value="neutral">Neutral</option>
        <option value="seek">Seek out</option>
      </select>

      <label className="field-label">Major-act preference</label>
      <select value={local.major_act_preference} onChange={(e) => commit({ ...local, major_act_preference: e.target.value as TasteProfile["major_act_preference"] })}>
        <option value="avoid">Avoid</option>
        <option value="neutral">Neutral</option>
        <option value="seek">Seek out</option>
      </select>

      <button className="btn-secondary" onClick={() => commit({ ...DEFAULT_TASTE })}>Reset to defaults</button>
    </div>
  );
}

function DiscoverView({ dataset, taste }: { dataset: Dataset; taste: TasteProfile }) {
  const [day, setDay] = useState<string>(DAY_OPTIONS[4]);
  const [count, setCount] = useState(10);

  const recs = useMemo(() => {
    const dayPerfs = dataset.performances.filter((p) => p.day_start === day);
    const pool = buildCandidatePool(dayPerfs, dataset.artistsById, taste, dataset.taxonomy);
    return applyDiscoveryMix(pool, dataset.taxonomy, taste, count);
  }, [dataset, taste, day, count]);

  return (
    <div className="view">
      <h1>Discover</h1>
      <div className="input-row">
        <select value={day} onChange={(e) => setDay(e.target.value)}>
          {DAY_OPTIONS.map((d) => (
            <option key={d} value={d}>{d} night</option>
          ))}
        </select>
        <button onClick={() => setCount((c) => c + 10)}>More</button>
      </div>
      <div className="card-list">
        {recs.map((r) => (
          <RecommendationCard key={r.performance.performance_id} rec={r} />
        ))}
        {recs.length === 0 && <p className="empty">No performances found for that night.</p>}
      </div>
    </div>
  );
}

function JourneyView({ dataset, taste }: { dataset: Dataset; taste: TasteProfile }) {
  const [day, setDay] = useState<string>(DAY_OPTIONS[4]);
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);
  const [meridiem, setMeridiem] = useState<"AM" | "PM">("PM");
  const [startLocation, setStartLocation] = useState("");
  const [duration, setDuration] = useState(4);
  const [stops, setStops] = useState<JourneyStop[] | null>(null);

  function generate() {
    const startNightMinutes = parseTimeInputToNightMinutes(hour, minute, meridiem);
    const result = buildJourney(
      dataset.performances,
      dataset.artistsById,
      dataset.locations,
      dataset.taxonomy,
      taste,
      { day, startNightMinutes, startLocationString: startLocation || null, durationHours: duration },
    );
    setStops(result);
  }

  function save() {
    if (!stops || stops.length === 0) return;
    const journey: SavedJourney = {
      id: `${Date.now()}`,
      created_at: new Date().toISOString(),
      day,
      start_time_label: `${hour}:${String(minute).padStart(2, "0")}${meridiem}`,
      duration_hours: duration,
      stops,
    };
    saveJourney(journey);
    alert("Journey saved.");
  }

  return (
    <div className="view">
      <h1>Build a Journey</h1>
      <label className="field-label">Day</label>
      <select value={day} onChange={(e) => setDay(e.target.value)}>
        {DAY_OPTIONS.map((d) => (
          <option key={d} value={d}>{d} night</option>
        ))}
      </select>

      <label className="field-label">Start time</label>
      <div className="input-row">
        <select value={hour} onChange={(e) => setHour(parseInt(e.target.value, 10))}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <select value={minute} onChange={(e) => setMinute(parseInt(e.target.value, 10))}>
          {[0, 15, 30, 45].map((m) => (
            <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
          ))}
        </select>
        <select value={meridiem} onChange={(e) => setMeridiem(e.target.value as "AM" | "PM")}>
          <option value="PM">PM</option>
          <option value="AM">AM</option>
        </select>
      </div>

      <label className="field-label">Starting location (e.g. "7:00 & F", optional)</label>
      <input value={startLocation} onChange={(e) => setStartLocation(e.target.value)} placeholder="e.g. 7:00 & F" />

      <label className="field-label">Duration: {duration}h</label>
      <input type="range" min={1} max={8} step={0.5} value={duration} onChange={(e) => setDuration(parseFloat(e.target.value))} />

      <button className="btn-primary" onClick={generate}>Generate Journey</button>

      {stops && (
        <div className="journey-result">
          {stops.map((s, i) => (
            <div key={s.performance.performance_id}>
              <div className="act-label">ACT {i + 1} — {formatNightMinutes(s.arrivalNightMinutes)}</div>
              <RecommendationCard rec={s} />
            </div>
          ))}
          {stops.length === 0 && <p className="empty">Couldn't find a fitting sequence — try a different start time, location, or wider travel budget.</p>}
          {stops.length > 0 && (
            <button className="btn-secondary" onClick={save}>Save this journey</button>
          )}
        </div>
      )}
    </div>
  );
}

function ArtistsView({ dataset }: { dataset: Dataset }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? dataset.artists.filter((a) => a.artist_normalized.includes(q)) : dataset.artists;
    return list.slice(0, 100);
  }, [dataset, query]);

  const selectedArtist = selected ? dataset.artistsById.get(selected) : null;
  const selectedPerfs = selected ? dataset.performances.filter((p) => p.artist_id === selected) : [];

  if (selectedArtist) {
    return (
      <div className="view">
        <button className="btn-back" onClick={() => setSelected(null)}>← Back</button>
        <h1>{selectedArtist.artist}</h1>
        <p className="empty">{selectedArtist.genre_tags.length ? selectedArtist.genre_tags.join(", ") : "Genre not yet tagged."}</p>
        {selectedPerfs.map((p) => (
          <div key={p.performance_id} className="perf-row">
            <strong>{p.day_raw}</strong> @ {p.set_time_raw} — {p.camp}{p.location ? ` (${p.location})` : ""}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="view">
      <h1>Artists</h1>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search artists…" />
      <div className="artist-list">
        {results.map((a) => (
          <div key={a.artist_id} className="artist-row" onClick={() => setSelected(a.artist_id)}>
            <span>{a.artist}</span>
            <span className="artist-count">{a.appearance_count} sets</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SavedView() {
  const [journeys, setJourneys] = useState<SavedJourney[]>(loadSavedJourneys());

  function remove(id: string) {
    deleteJourney(id);
    setJourneys(loadSavedJourneys());
  }

  return (
    <div className="view">
      <h1>Saved Journeys</h1>
      {journeys.length === 0 && <p className="empty">Nothing saved yet — build a journey and save it.</p>}
      {journeys.map((j) => (
        <div key={j.id} className="saved-journey">
          <div className="act-label">{j.day} night, {j.start_time_label}, {j.duration_hours}h — {j.stops.length} stops</div>
          {j.stops.map((s) => (
            <RecommendationCard key={s.performance.performance_id} rec={s} />
          ))}
          <button className="btn-secondary" onClick={() => remove(j.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}

function HomeView({ onNavigate, dataset }: { onNavigate: (v: View) => void; dataset: Dataset }) {
  return (
    <div className="view home">
      <h1>RSL Music Journey</h1>
      <p className="tagline">Given what you like, where you are, and how much time you have — go discover something.</p>
      <div className="home-grid">
        <button className="home-btn" onClick={() => onNavigate("discover")}>WHAT'S GOOD NOW?</button>
        <button className="home-btn" onClick={() => onNavigate("journey")}>BUILD A JOURNEY</button>
        <button className="home-btn" onClick={() => onNavigate("artists")}>EXPLORE ARTISTS</button>
        <button className="home-btn wildcard" onClick={() => onNavigate("discover")}>WILDCARD ME</button>
      </div>
      <p className="dataset-note">
        {dataset.metadata.artist_count} artists · {dataset.metadata.record_count} performances · {dataset.metadata.camp_count} camps
        <br />
        {dataset.metadata.enrichment_status}
      </p>
    </div>
  );
}

export default function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [view, setView] = useState<View>("home");
  const [taste, setTaste] = useState<TasteProfile>(loadTaste());
  const [showPrefs, setShowPrefs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDataset()
      .then(setDataset)
      .catch((e) => setError(String(e)));
  }, []);

  function updateTaste(t: TasteProfile) {
    setTaste(t);
    saveTaste(t);
  }

  if (error) return <div className="view">Failed to load data: {error}</div>;
  if (!dataset) return <div className="view">Loading dataset…</div>;

  return (
    <div className="app">
      <header className="header">
        <span className="brand">RSL 2026</span>
        <OfflineBadge />
        <button className="gear" onClick={() => setShowPrefs(true)}>⚙</button>
      </header>

      <main className="main">
        {view === "home" && <HomeView onNavigate={setView} dataset={dataset} />}
        {view === "discover" && <DiscoverView dataset={dataset} taste={taste} />}
        {view === "journey" && <JourneyView dataset={dataset} taste={taste} />}
        {view === "artists" && <ArtistsView dataset={dataset} />}
        {view === "saved" && <SavedView />}
      </main>

      <nav className="bottom-nav">
        <button className={view === "home" ? "active" : ""} onClick={() => setView("home")}>Home</button>
        <button className={view === "discover" ? "active" : ""} onClick={() => setView("discover")}>Discover</button>
        <button className={view === "journey" ? "active" : ""} onClick={() => setView("journey")}>Journey</button>
        <button className={view === "artists" ? "active" : ""} onClick={() => setView("artists")}>Artists</button>
        <button className={view === "saved" ? "active" : ""} onClick={() => setView("saved")}>Saved</button>
      </nav>

      {showPrefs && <PreferencesPanel taste={taste} onChange={updateTaste} onClose={() => setShowPrefs(false)} />}
    </div>
  );
}
