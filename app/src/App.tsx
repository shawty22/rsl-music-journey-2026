import { useEffect, useMemo, useState } from "react";
import "./index.css";
import { loadDataset, type Dataset } from "./data/loadData";
import { loadTaste, saveTaste, loadSavedJourneys, saveJourney, deleteJourney, DEFAULT_TASTE } from "./lib/taste";
import { buildCandidatePool, applyDiscoveryMix } from "./lib/recommend";
import { buildJourney, type JourneyStop } from "./lib/journey";
import { DAY_OPTIONS, parseTimeInputToNightMinutes, nightMinutesFromHour24, formatNightMinutes, currentDraftTime } from "./lib/time";
import { RecommendationCard } from "./components/RecommendationCard";
import { HomeScreen } from "./screens/Home";
import { MyTasteScreen } from "./screens/MyTaste";
import { BuildMyNightScreen, type JourneyDraft } from "./screens/BuildMyNight";
import { JourneyResultsScreen } from "./screens/JourneyResults";
import { ActDetailScreen } from "./screens/ActDetail";
import { BrowseArtistsScreen } from "./screens/BrowseArtists";
import { ArtistDetailScreen } from "./screens/ArtistDetail";
import { PlayaMapScreen } from "./screens/PlayaMap";
import { HomeIcon } from "./components/icons";
import type { SavedJourney, TasteProfile } from "./types";

type View = "home" | "myTaste" | "buildMyNight" | "results" | "actDetail" | "whatsGoodNow" | "browseArtists" | "artistDetail" | "saved" | "playaMap";

function defaultDraft(): JourneyDraft {
  return { ...currentDraftTime(), durationHours: 4, startLocation: "" };
}

function AppSettingsPanel({ taste, onChange, onClose }: { taste: TasteProfile; onChange: (t: TasteProfile) => void; onClose: () => void }) {
  return (
    <div className="sheet">
      <div className="sheet-header">
        <h1 className="step-headline" style={{ margin: 0 }}>
          App Settings
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

function WhatsGoodNowScreen({ dataset, taste, onHome }: { dataset: Dataset; taste: TasteProfile; onHome: () => void }) {
  const [day, setDay] = useState<string>(() => currentDraftTime().day);
  const [count, setCount] = useState(10);

  const recs = useMemo(() => {
    const dayPerfs = dataset.performances.filter((p) => p.day_start === day);
    const pool = buildCandidatePool(dayPerfs, dataset.artistsById, taste, dataset.taxonomy, dataset.tasteReferencesByName);
    return applyDiscoveryMix(pool, dataset.taxonomy, taste, count);
  }, [dataset, taste, day, count]);

  return (
    <div className="screen">
      <div className="screen-top">
        <button className="icon-btn" onClick={onHome} aria-label="Home">
          <HomeIcon />
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

function SavedScreen({ onHome }: { onHome: () => void }) {
  const [journeys, setJourneys] = useState<SavedJourney[]>(loadSavedJourneys());

  function remove(id: string) {
    deleteJourney(id);
    setJourneys(loadSavedJourneys());
  }

  return (
    <div className="screen">
      <div className="screen-top">
        <button className="icon-btn" onClick={onHome} aria-label="Home">
          <HomeIcon />
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
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<JourneyDraft>(defaultDraft);
  const [journeyStops, setJourneyStops] = useState<JourneyStop[]>([]);
  const [detailStop, setDetailStop] = useState<{ stop: JourneyStop; actNumber: number } | null>(null);
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);

  const [tasteReturnTo, setTasteReturnTo] = useState<"home" | "buildMyNight">("home");
  const [tasteShowNext, setTasteShowNext] = useState(false);

  const [mapTarget, setMapTarget] = useState<{ startAddress: string; nextStopAddress: string | null; nextStopLabel: string } | null>(null);

  useEffect(() => {
    loadDataset()
      .then(setDataset)
      .catch((e) => setError(String(e)));
  }, []);

  function updateTaste(t: TasteProfile) {
    setTaste(t);
    saveTaste(t);
  }

  function goHome() {
    setView("home");
  }

  function openMyTasteFromHome() {
    setTasteReturnTo("home");
    setTasteShowNext(false);
    setView("myTaste");
  }

  function startBuildMyNight() {
    setTasteReturnTo("home");
    setTasteShowNext(true);
    setView("myTaste");
  }

  function editTasteFromBuildMyNight() {
    setTasteReturnTo("buildMyNight");
    setTasteShowNext(false);
    setView("myTaste");
  }

  function generateJourney() {
    if (!dataset) return;
    const startNightMinutes = parseTimeInputToNightMinutes(draft.hour, draft.minute, draft.meridiem);
    const stops = buildJourney(
      dataset.performances,
      dataset.artistsById,
      dataset.locations,
      dataset.taxonomy,
      taste,
      {
        day: draft.day,
        startNightMinutes,
        startLocationString: draft.startLocation || null,
        durationHours: draft.durationHours,
      },
      dataset.tasteReferencesByName,
    );
    setJourneyStops(stops);
    setView("results");
  }

  function surpriseMe() {
    if (!dataset) return;
    const dayPerfs = dataset.performances.filter((p) => p.day_start === draft.day && p.set_time_valid);
    const pool = buildCandidatePool(dayPerfs, dataset.artistsById, taste, dataset.taxonomy, dataset.tasteReferencesByName);
    const wildcardish = pool.filter((p) => p.role === "UNKNOWN" || p.role === "ADJACENT");
    const bag = wildcardish.length > 0 ? wildcardish : pool;
    if (bag.length === 0) return;
    const pick = bag[Math.floor(Math.random() * bag.length)];
    const nm =
      pick.performance.set_time_hour24 !== null && pick.performance.set_time_minute !== null
        ? nightMinutesFromHour24(pick.performance.set_time_hour24, pick.performance.set_time_minute)
        : 0;
    const transitionNote = `${pick.performance.day_raw} at ${pick.performance.set_time_raw}.`;
    const stop: JourneyStop = {
      ...pick,
      reasons: [...pick.reasons, { text: "A surprise pick for right now, deliberately outside your usual lane.", provenance: "system" }],
      transitionNote,
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
          taste={taste}
          onChangeTaste={updateTaste}
          onBuildJourney={startBuildMyNight}
          onWhatsGoodNow={() => setView("whatsGoodNow")}
          onSurpriseMe={surpriseMe}
          onOpenArtists={() => setView("browseArtists")}
          onOpenSaved={() => setView("saved")}
          onOpenMyTaste={openMyTasteFromHome}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {view === "myTaste" && (
        <MyTasteScreen
          dataset={dataset}
          taste={taste}
          onChange={updateTaste}
          showBack={tasteShowNext === false && tasteReturnTo === "buildMyNight"}
          onBack={() => setView(tasteReturnTo)}
          onHome={goHome}
          onNext={tasteShowNext ? () => setView("buildMyNight") : undefined}
        />
      )}

      {view === "buildMyNight" && (
        <BuildMyNightScreen
          taste={taste}
          onChangeTaste={updateTaste}
          draft={draft}
          onChangeDraft={setDraft}
          onBack={() => setView("myTaste")}
          onHome={goHome}
          onEditTaste={editTasteFromBuildMyNight}
          onGo={generateJourney}
          geoModel={dataset.geoModel}
        />
      )}

      {view === "results" && (
        <JourneyResultsScreen
          stops={journeyStops}
          day={draft.day}
          startLabel={`${draft.hour}:${String(draft.minute).padStart(2, "0")}${draft.meridiem}`}
          startLocation={draft.startLocation}
          durationHours={draft.durationHours}
          onBack={() => setView("buildMyNight")}
          onHome={goHome}
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
          camp={dataset.campsByName.get(detailStop.stop.performance.camp.toLowerCase())}
          onBack={() => setView(journeyStops.length > 0 ? "results" : "home")}
          onHome={goHome}
          onOpenMap={
            dataset.geoModel
              ? () => {
                  const prevStop = detailStop.actNumber >= 2 ? journeyStops[detailStop.actNumber - 2] : null;
                  const startAddress = prevStop ? prevStop.performance.location ?? "" : draft.startLocation;
                  setMapTarget({
                    startAddress,
                    nextStopAddress: detailStop.stop.performance.location,
                    nextStopLabel: `${detailStop.stop.artist.artist} at ${detailStop.stop.performance.camp}`,
                  });
                  setView("playaMap");
                }
              : undefined
          }
        />
      )}

      {view === "playaMap" && mapTarget && (
        <PlayaMapScreen
          geoModel={dataset.geoModel}
          startAddress={mapTarget.startAddress}
          nextStopAddress={mapTarget.nextStopAddress}
          nextStopLabel={mapTarget.nextStopLabel}
          onBack={() => setView("actDetail")}
          onHome={goHome}
        />
      )}

      {view === "whatsGoodNow" && <WhatsGoodNowScreen dataset={dataset} taste={taste} onHome={goHome} />}

      {view === "browseArtists" && (
        <BrowseArtistsScreen
          dataset={dataset}
          onHome={goHome}
          onSelectArtist={(id) => {
            setSelectedArtistId(id);
            setView("artistDetail");
          }}
        />
      )}

      {view === "artistDetail" && selectedArtistId && (
        <ArtistDetailScreen dataset={dataset} artistId={selectedArtistId} onBack={() => setView("browseArtists")} onHome={goHome} />
      )}

      {view === "saved" && <SavedScreen onHome={goHome} />}

      {showSettings && <AppSettingsPanel taste={taste} onChange={updateTaste} onClose={() => setShowSettings(false)} />}
    </div>
  );
}
