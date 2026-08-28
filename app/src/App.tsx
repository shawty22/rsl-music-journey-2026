import { useEffect, useMemo, useState } from "react";
import "./index.css";
import { loadDataset, type Dataset } from "./data/loadData";
import { loadTaste, saveTaste, loadSavedJourneys, saveJourney, deleteJourney, DEFAULT_TASTE } from "./lib/taste";
import { buildCandidatePool, applyDiscoveryMix } from "./lib/recommend";
import { buildJourney, type JourneyStop } from "./lib/journey";
import { DAY_OPTIONS, parseTimeInputToNightMinutes, nightMinutesFromHour24, formatNightMinutes } from "./lib/time";
import { RecommendationCard } from "./components/RecommendationCard";
import { HomeScreen } from "./screens/Home";
import { TasteSetupScreen } from "./screens/TasteSetup";
import { JourneySettingsScreen, type JourneyDraft } from "./screens/JourneySettings";
import { JourneyResultsScreen } from "./screens/JourneyResults";
import { ActDetailScreen } from "./screens/ActDetail";
import { BackIcon } from "./components/icons";
import type { SavedJourney, TasteProfile } from "./types";

type View = "home" | "taste" | "journeySettings" | "results" | "actDetail" | "discover" | "artists" | "saved";

const DEFAULT_DRAFT: JourneyDraft = { day: "FRI", hour: 7, minute: 0, meridiem: "PM", durationHours: 4, startLocation: "" };

function PreferencesPanel({ taste, onChange, onClose }: { taste: TasteProfile; onChange: (t: TasteProfile) => void; onClose: () => void }) {
  return (
    <div className="sheet">
      <div className="sheet-header">
        <h1 className="step-headline" style={{ margin: 0 }}>
          Preferences
        </h1>
        <button className="btn-close" onClick={onClose}>
          ✕
        </button>
      </div>

      <label className="field-label">Max travel per stop: {taste.max_travel_minutes} min</label>
      <input
        type="range"
        min={5}
        max={60}
        step={5}
        value={taste.max_travel_minutes}
        onChange={(e) => onChange({ ...taste, max_travel_minutes: parseInt(e.target.value, 10) })}
      />

      <label className="field-label">Major-act preference</label>
      <select
        value={taste.major_act_preference}
        onChange={(e) => onChange({ ...taste, major_act_preference: e.target.value as TasteProfile["major_act_preference"] })}
      >
        <option value="avoid">Avoid</option>
        <option value="neutral">Neutral</option>
        <option value="seek">Seek out</option>
      </select>

      <button className="btn-secondary" onClick={() => onChange({ ...DEFAULT_TASTE })}>
        Reset all taste settings
      </button>
    </div>
  );
}

function DiscoverScreen({ dataset, taste, onBack }: { dataset: Dataset; taste: TasteProfile; onBack: () => void }) {
  const [day, setDay] = useState<string>(DEFAULT_DRAFT.day);
  const [count, setCount] = useState(10);

  const recs = useMemo(() => {
    const dayPerfs = dataset.performances.filter((p) => p.day_start === day);
    const pool = buildCandidatePool(dayPerfs, dataset.artistsById, taste, dataset.taxonomy);
    return applyDiscoveryMix(pool, dataset.taxonomy, taste, count);
  }, [dataset, taste, day, count]);

  return (
    <div className="screen">
      <div className="screen-top">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <BackIcon />
        </button>
        <div className="icon-btn-spacer" />
      </div>
      <h1 className="step-headline">What's good now?</h1>
      <div className="input-row" style={{ marginTop: 16 }}>
        <select value={day} onChange={(e) => setDay(e.target.value)}>
          {DAY_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d} night
            </option>
          ))}
        </select>
        <button className="btn-add" onClick={() => setCount((c) => c + 10)}>
          More
        </button>
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

function ArtistsScreen({ dataset, onBack }: { dataset: Dataset; onBack: () => void }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? dataset.artists.filter((a) => a.artist_normalized.includes(q)) : dataset.artists;
    return list.slice(0, 100);
  }, [dataset, query]);

  const selectedArtist = selected ? dataset.artistsById.get(selected) : null;
  const selectedPerfs = selected ? dataset.performances.filter((p) => p.artist_id === selected) : [];

  return (
    <div className="screen">
      <div className="screen-top">
        <button className="icon-btn" onClick={() => (selectedArtist ? setSelected(null) : onBack())} aria-label="Back">
          <BackIcon />
        </button>
        <div className="icon-btn-spacer" />
      </div>

      {selectedArtist ? (
        <>
          <h1 className="step-headline">{selectedArtist.artist}</h1>
          <p className="empty" style={{ marginTop: 8 }}>
            {selectedArtist.genre_tags.length ? selectedArtist.genre_tags.join(", ") : "Genre not yet tagged."}
          </p>
          {selectedPerfs.map((p) => (
            <div key={p.performance_id} className="perf-row">
              <strong>{p.day_raw}</strong> @ {p.set_time_raw} — {p.camp}
              {p.location ? ` (${p.location})` : ""}
            </div>
          ))}
        </>
      ) : (
        <>
          <h1 className="step-headline">Artists</h1>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search artists…" style={{ marginTop: 16 }} />
          <div className="artist-list">
            {results.map((a) => (
              <div key={a.artist_id} className="artist-row" onClick={() => setSelected(a.artist_id)}>
                <span>{a.artist}</span>
                <span className="artist-count">{a.appearance_count} sets</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SavedScreen({ onBack }: { onBack: () => void }) {
  const [journeys, setJourneys] = useState<SavedJourney[]>(loadSavedJourneys());

  function remove(id: string) {
    deleteJourney(id);
    setJourneys(loadSavedJourneys());
  }

  return (
    <div className="screen">
      <div className="screen-top">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <BackIcon />
        </button>
        <div className="icon-btn-spacer" />
      </div>
      <h1 className="step-headline">Saved Journeys</h1>
      {journeys.length === 0 && (
        <p className="empty" style={{ marginTop: 12 }}>
          Nothing saved yet — build a journey and save it.
        </p>
      )}
      {journeys.map((j) => (
        <div key={j.id} className="saved-journey" style={{ marginTop: 20 }}>
          <div className="act-label">
            {j.day} night, {j.start_time_label}, {j.duration_hours}h — {j.stops.length} stops
          </div>
          {j.stops.map((s) => (
            <RecommendationCard key={s.performance.performance_id} rec={s} />
          ))}
          <button className="btn-secondary" onClick={() => remove(j.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [view, setView] = useState<View>("home");
  const [taste, setTaste] = useState<TasteProfile>(loadTaste());
  const [showPrefs, setShowPrefs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<JourneyDraft>(DEFAULT_DRAFT);
  const [journeyStops, setJourneyStops] = useState<JourneyStop[]>([]);
  const [detailStop, setDetailStop] = useState<{ stop: JourneyStop; actNumber: number } | null>(null);

  useEffect(() => {
    loadDataset()
      .then(setDataset)
      .catch((e) => setError(String(e)));
  }, []);

  function updateTaste(t: TasteProfile) {
    setTaste(t);
    saveTaste(t);
  }

  function generateJourney() {
    if (!dataset) return;
    const startNightMinutes = parseTimeInputToNightMinutes(draft.hour, draft.minute, draft.meridiem);
    const stops = buildJourney(dataset.performances, dataset.artistsById, dataset.locations, dataset.taxonomy, taste, {
      day: draft.day,
      startNightMinutes,
      startLocationString: draft.startLocation || null,
      durationHours: draft.durationHours,
    });
    setJourneyStops(stops);
    setView("results");
  }

  function surpriseMe() {
    if (!dataset) return;
    const dayPerfs = dataset.performances.filter((p) => p.day_start === draft.day && p.set_time_valid);
    const pool = buildCandidatePool(dayPerfs, dataset.artistsById, taste, dataset.taxonomy);
    const wildcardish = pool.filter((p) => p.role === "UNKNOWN" || p.role === "ADJACENT");
    const bag = wildcardish.length > 0 ? wildcardish : pool;
    if (bag.length === 0) return;
    const pick = bag[Math.floor(Math.random() * bag.length)];
    const nm =
      pick.performance.set_time_hour24 !== null && pick.performance.set_time_minute !== null
        ? nightMinutesFromHour24(pick.performance.set_time_hour24, pick.performance.set_time_minute)
        : 0;
    const stop: JourneyStop = {
      ...pick,
      reasons: [...pick.reasons, "Wildcard: a surprise pick for right now, deliberately outside your usual lane."],
      transitionNote: `${pick.performance.day_raw} at ${pick.performance.set_time_raw}.`,
      arrivalNightMinutes: nm,
      isFinale: false,
    };
    setDetailStop({ stop, actNumber: 1 });
    setView("actDetail");
  }

  function handleShare(stops: JourneyStop[]) {
    const text = `My RSL Music Journey (${draft.day} night, ${draft.durationHours}h):\n${stops
      .map((s, i) => `${i + 1}. ${s.artist.artist} — ${formatNightMinutes(s.arrivalNightMinutes)} @ ${s.performance.camp}`)
      .join("\n")}`;
    if (navigator.share) {
      navigator.share({ title: "My RSL Music Journey", text }).catch(() => {});
    } else {
      alert("Sharing isn't available in this browser — here's your night:\n\n" + text);
    }
  }

  function handleSaveJourney() {
    if (journeyStops.length === 0) return;
    const j: SavedJourney = {
      id: `${Date.now()}`,
      created_at: new Date().toISOString(),
      day: draft.day,
      start_time_label: `${draft.hour}:${String(draft.minute).padStart(2, "0")}${draft.meridiem}`,
      duration_hours: draft.durationHours,
      stops: journeyStops,
    };
    saveJourney(j);
  }

  if (error) return <div className="screen">Failed to load data: {error}</div>;
  if (!dataset) return <div className="screen">Loading dataset…</div>;

  return (
    <div className="app">
      {view === "home" && (
        <HomeScreen
          dataset={dataset}
          onBuildJourney={() => setView("taste")}
          onWhatsGoodNow={() => setView("discover")}
          onSurpriseMe={surpriseMe}
          onOpenArtists={() => setView("artists")}
          onOpenSaved={() => setView("saved")}
          onOpenPrefs={() => setShowPrefs(true)}
        />
      )}

      {view === "taste" && (
        <TasteSetupScreen taste={taste} onChange={updateTaste} onBack={() => setView("home")} onNext={() => setView("journeySettings")} />
      )}

      {view === "journeySettings" && (
        <JourneySettingsScreen
          taste={taste}
          onChangeTaste={updateTaste}
          draft={draft}
          onChangeDraft={setDraft}
          onBack={() => setView("taste")}
          onGo={generateJourney}
        />
      )}

      {view === "results" && (
        <JourneyResultsScreen
          stops={journeyStops}
          day={draft.day}
          startLabel={`${draft.hour}:${String(draft.minute).padStart(2, "0")}${draft.meridiem}`}
          startLocation={draft.startLocation}
          durationHours={draft.durationHours}
          onBack={() => setView("journeySettings")}
          onSelectStop={(i) => {
            setDetailStop({ stop: journeyStops[i], actNumber: i + 1 });
            setView("actDetail");
          }}
          onShare={() => handleShare(journeyStops)}
          onSave={handleSaveJourney}
        />
      )}

      {view === "actDetail" && detailStop && (
        <ActDetailScreen
          stop={detailStop.stop}
          actNumber={detailStop.actNumber}
          onBack={() => setView(journeyStops.length > 0 ? "results" : "home")}
        />
      )}

      {view === "discover" && <DiscoverScreen dataset={dataset} taste={taste} onBack={() => setView("home")} />}
      {view === "artists" && <ArtistsScreen dataset={dataset} onBack={() => setView("home")} />}
      {view === "saved" && <SavedScreen onBack={() => setView("home")} />}

      {showPrefs && <PreferencesPanel taste={taste} onChange={updateTaste} onClose={() => setShowPrefs(false)} />}
    </div>
  );
}
