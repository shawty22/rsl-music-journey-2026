import { useEffect, useState } from "react";
import "./index.css";
import { loadDataset, type Dataset } from "./data/loadData";
import { loadTaste, saveTaste, loadSavedJourneys, saveJourney, deleteJourney, loadSavedSets, toggleSavedSet, DEFAULT_TASTE } from "./lib/taste";
import { buildJourney, type JourneyStop } from "./lib/journey";
import { parseTimeInputToNightMinutes, nightMinutesFromHour24, formatNightMinutes, currentDraftTime } from "./lib/time";
import { genreTagToMoodKeys } from "./lib/radar";
import { RecommendationCard } from "./components/RecommendationCard";
import { BottomNav, type PrimaryTab } from "./components/BottomNav";
import { NowScreen } from "./screens/Now";
import { RadarScreen } from "./screens/Radar";
import { JourneyLandingScreen } from "./screens/JourneyLanding";
import { MyTasteScreen } from "./screens/MyTaste";
import { BuildMyNightScreen, type JourneyDraft } from "./screens/BuildMyNight";
import { JourneyResultsScreen } from "./screens/JourneyResults";
import { ActDetailScreen } from "./screens/ActDetail";
import { BrowseArtistsScreen } from "./screens/BrowseArtists";
import { ArtistDetailScreen } from "./screens/ArtistDetail";
import { PlayaMapScreen } from "./screens/PlayaMap";
import { HomeIcon, PeopleIcon } from "./components/icons";
import type { SavedJourney, ScoredRecommendation, TasteProfile } from "./types";

type View = PrimaryTab | "journeyDetails" | "results" | "actDetail" | "browseArtists" | "artistDetail" | "myTaste";

const PRIMARY_TABS: ReadonlySet<View> = new Set<PrimaryTab>(["now", "radar", "journey", "saved", "map"]);

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

      <div className="field-guide-block">
        <div className="section-label" style={{ marginTop: 28 }}>
          FIELD GUIDE
        </div>
        <p className="field-guide-note">
          Every Established/Emerging artist's bio, set times, camps, and locations — plus curated Wildcards — as one offline
          document. If the app fails on playa, this doesn't need it.
        </p>
        <a className="btn-secondary field-guide-link" href="field-guide.html" target="_blank" rel="noreferrer">
          Read online
        </a>
        <a className="btn-secondary field-guide-link" href="BMRI-Field-Guide-2026.pdf" download>
          Download PDF
        </a>
        <a className="btn-secondary field-guide-link" href="BMRI-Field-Guide-2026.epub" download>
          Download EPUB
        </a>
      </div>
    </div>
  );
}

function SavedScreen({
  savedSets,
  onRemoveSet,
  onSelectSet,
  onShowOnMap,
  journeys,
  onRemoveJourney,
  onHome,
  onOpenArtists,
}: {
  savedSets: ScoredRecommendation[];
  onRemoveSet: (performanceId: string) => void;
  onSelectSet: (rec: ScoredRecommendation) => void;
  onShowOnMap: (rec: ScoredRecommendation) => void;
  journeys: SavedJourney[];
  onRemoveJourney: (id: string) => void;
  onHome: () => void;
  onOpenArtists: () => void;
}) {
  return (
    <div className="screen">
      <div className="screen-top">
        <span className="wordmark">SAVED</span>
        <div className="top-actions">
          <button className="icon-btn" onClick={onOpenArtists} aria-label="Browse artists">
            <PeopleIcon size={16} />
          </button>
          <button className="icon-btn" onClick={onHome} aria-label="Home">
            <HomeIcon />
          </button>
        </div>
      </div>

      <div className="section">
        <div className="section-label">SAVED SETS</div>
        {savedSets.length === 0 ? (
          <p className="empty">Nothing saved yet — tap the heart on a set in Now or Radar.</p>
        ) : (
          <div className="card-list">
            {savedSets.map((rec) => (
              <div key={rec.performance.performance_id} onClick={() => onSelectSet(rec)}>
                <RecommendationCard
                  rec={rec}
                  isSaved
                  onToggleSave={() => onRemoveSet(rec.performance.performance_id)}
                  onShowOnMap={() => onShowOnMap(rec)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section">
        <div className="section-label">SAVED JOURNEYS</div>
        {journeys.length === 0 ? (
          <p className="empty">Nothing saved yet — build a journey and save it.</p>
        ) : (
          journeys.map((j) => (
            <div key={j.id} className="saved-journey" style={{ marginBottom: 20 }}>
              <div className="act-label">
                {j.day} night, {j.start_time_label}, {j.duration_hours}h — {j.stops.length} stops
              </div>
              {j.stops.map((s) => (
                <RecommendationCard key={s.performance.performance_id} rec={s} onShowOnMap={() => onShowOnMap(s)} />
              ))}
              <button className="btn-secondary" onClick={() => onRemoveJourney(j.id)}>
                Delete
              </button>
            </div>
          ))
        )}
      </div>

      <div style={{ height: 90 }} />
    </div>
  );
}

export default function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [view, setView] = useState<View>("now");
  const [taste, setTaste] = useState<TasteProfile>(loadTaste());
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<JourneyDraft>(defaultDraft);
  const [journeyStops, setJourneyStops] = useState<JourneyStop[]>([]);
  const [detailStop, setDetailStop] = useState<{ stop: JourneyStop; actNumber: number } | null>(null);
  const [detailReturnTo, setDetailReturnTo] = useState<View>("now");
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);

  const [savedSets, setSavedSets] = useState<ScoredRecommendation[]>(loadSavedSets());
  const [savedJourneys, setSavedJourneys] = useState<SavedJourney[]>(loadSavedJourneys());
  const [radarSeed, setRadarSeed] = useState<{ moods: string[]; key: number } | undefined>(undefined);

  const [mapTarget, setMapTarget] = useState<{
    startAddress: string;
    stops: ScoredRecommendation[];
    actNumberOffset: number;
    journeyStartIndex: number | null;
    returnTo: View;
  } | null>(null);

  useEffect(() => {
    loadDataset()
      .then(setDataset)
      .catch((e) => setError(String(e)));
  }, []);

  function updateTaste(t: TasteProfile) {
    setTaste(t);
    saveTaste(t);
  }

  function goNow() {
    setView("now");
  }

  function toggleSave(rec: ScoredRecommendation) {
    setSavedSets(toggleSavedSet(rec));
  }

  // Wraps a bare recommendation (not part of a built journey — a Now/Radar
  // pick or a saved set) in the same shape ActDetailScreen already expects,
  // matching the pattern the old Surprise Me flow used.
  function openStandaloneDetail(rec: ScoredRecommendation, returnTo: View) {
    const nm =
      rec.performance.set_time_hour24 !== null && rec.performance.set_time_minute !== null
        ? nightMinutesFromHour24(rec.performance.set_time_hour24, rec.performance.set_time_minute)
        : 0;
    setDetailStop({
      stop: { ...rec, transitionNote: `${rec.performance.day_raw} at ${rec.performance.set_time_raw}.`, arrivalNightMinutes: nm, isFinale: false },
      actNumber: 1,
    });
    setDetailReturnTo(returnTo);
    setView("actDetail");
  }

  function openMapForJourneyFrom(idx: number, returnTo: View) {
    if (!dataset?.geoModel) return;
    const prevStop = idx >= 1 ? journeyStops[idx - 1] : null;
    const startAddress = prevStop ? (prevStop.performance.location ?? "") : draft.startLocation;
    setMapTarget({ startAddress, stops: journeyStops.slice(idx), actNumberOffset: idx, journeyStartIndex: idx, returnTo });
    setView("map");
  }

  function openMapForSingle(rec: ScoredRecommendation, returnTo: View) {
    if (!dataset?.geoModel) return;
    setMapTarget({ startAddress: draft.startLocation, stops: [rec], actNumberOffset: 0, journeyStartIndex: null, returnTo });
    setView("map");
  }

  function openStandaloneMap(returnTo: View) {
    setMapTarget({ startAddress: draft.startLocation, stops: journeyStops, actNumberOffset: 0, journeyStartIndex: journeyStops.length > 0 ? 0 : null, returnTo });
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

  function handleShare(stops: JourneyStop[]) {
    const text = `My BMRI Journey (${draft.day} night, ${draft.durationHours}h):\n${stops
      .map((s, i) => `${i + 1}. ${s.artist.artist} — ${formatNightMinutes(s.arrivalNightMinutes)} @ ${s.performance.camp}`)
      .join("\n")}`;
    if (navigator.share) {
      navigator.share({ title: "My BMRI Journey", text }).catch(() => {});
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
    setSavedJourneys(loadSavedJourneys());
  }

  if (error) return <div className="screen">Failed to load data: {error}</div>;
  if (!dataset) return <div className="screen">Loading dataset…</div>;

  const showBottomNav = PRIMARY_TABS.has(view);

  function selectPrimaryTab(tab: PrimaryTab) {
    if (tab === "map") {
      openStandaloneMap("now");
    }
    setView(tab);
  }

  return (
    <div className="app">
      {view === "now" && (
        <NowScreen
          dataset={dataset}
          taste={taste}
          savedSets={savedSets}
          onToggleSave={toggleSave}
          onSelect={(rec) => openStandaloneDetail(rec, "now")}
          onShowOnMap={(rec) => openMapForSingle(rec, "now")}
          onOpenSignal={(genres) => {
            const moods = genres.flatMap((g) => genreTagToMoodKeys(g));
            setRadarSeed({ moods: moods.length > 0 ? moods : genres, key: Date.now() });
            setView("radar");
          }}
          onSeeAllStartingSoon={() => {
            setRadarSeed({ moods: taste.favorite_genres.flatMap((g) => genreTagToMoodKeys(g)), key: Date.now() });
            setView("radar");
          }}
          onOpenArtists={() => setView("browseArtists")}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {view === "radar" && (
        <RadarScreen
          key={radarSeed?.key ?? "default"}
          dataset={dataset}
          taste={taste}
          startLocation={draft.startLocation}
          savedSets={savedSets}
          onToggleSave={toggleSave}
          onSelect={(rec) => openStandaloneDetail(rec, "radar")}
          onShowOnMap={(rec) => openMapForSingle(rec, "radar")}
          onOpenArtists={() => setView("browseArtists")}
          onOpenSettings={() => setShowSettings(true)}
          onBuildJourneyFrom={() => setView("journeyDetails")}
          initialMoods={radarSeed?.moods}
        />
      )}

      {view === "journey" && (
        <JourneyLandingScreen
          dataset={dataset}
          taste={taste}
          onChangeTaste={updateTaste}
          onBuildJourney={() => setView("journeyDetails")}
          onOpenMyTaste={() => setView("myTaste")}
          onOpenSettings={() => setShowSettings(true)}
          onOpenArtists={() => setView("browseArtists")}
        />
      )}

      {view === "myTaste" && <MyTasteScreen dataset={dataset} taste={taste} onChange={updateTaste} onHome={goNow} />}

      {view === "journeyDetails" && (
        <BuildMyNightScreen
          taste={taste}
          onChangeTaste={updateTaste}
          draft={draft}
          onChangeDraft={setDraft}
          onHome={goNow}
          onEditTaste={() => setView("myTaste")}
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
          onBack={() => setView("journeyDetails")}
          onHome={goNow}
          onSelectStop={(i) => {
            setDetailStop({ stop: journeyStops[i], actNumber: i + 1 });
            setDetailReturnTo("results");
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
          onBack={() => setView(detailReturnTo)}
          onHome={goNow}
          onOpenMap={
            dataset.geoModel
              ? () => {
                  const idx = detailStop.actNumber - 1;
                  const fromJourney = journeyStops.length > idx && journeyStops[idx]?.performance.performance_id === detailStop.stop.performance.performance_id;
                  if (fromJourney) openMapForJourneyFrom(idx, "actDetail");
                  else openMapForSingle(detailStop.stop, "actDetail");
                }
              : undefined
          }
        />
      )}

      {view === "map" && mapTarget && dataset.geoModel && (
        <PlayaMapScreen
          geoModel={dataset.geoModel}
          startAddress={mapTarget.startAddress}
          stops={mapTarget.stops}
          actNumberOffset={mapTarget.actNumberOffset}
          onSelectStop={
            mapTarget.journeyStartIndex !== null
              ? (i) => {
                  const globalIndex = mapTarget.journeyStartIndex! + i;
                  setDetailStop({ stop: journeyStops[globalIndex], actNumber: globalIndex + 1 });
                  setDetailReturnTo("map");
                  setView("actDetail");
                }
              : undefined
          }
          onBack={() => setView(mapTarget.returnTo)}
          onHome={goNow}
        />
      )}
      {view === "map" && (!mapTarget || !dataset.geoModel) && (
        <div className="screen">
          <div className="screen-top">
            <span className="wordmark">PLAYA MAP</span>
            <div className="icon-btn-spacer" />
          </div>
          <p className="empty" style={{ marginTop: 20 }}>
            Real 2026 Black Rock City geometry isn't available in this build.
          </p>
        </div>
      )}

      {view === "browseArtists" && (
        <BrowseArtistsScreen
          dataset={dataset}
          onHome={goNow}
          onSelectArtist={(id) => {
            setSelectedArtistId(id);
            setView("artistDetail");
          }}
        />
      )}

      {view === "artistDetail" && selectedArtistId && (
        <ArtistDetailScreen dataset={dataset} artistId={selectedArtistId} onBack={() => setView("browseArtists")} onHome={goNow} />
      )}

      {view === "saved" && (
        <SavedScreen
          savedSets={savedSets}
          onRemoveSet={(id) => {
            const rec = savedSets.find((s) => s.performance.performance_id === id);
            if (rec) setSavedSets(toggleSavedSet(rec));
          }}
          onSelectSet={(rec) => openStandaloneDetail(rec, "saved")}
          onShowOnMap={(rec) => openMapForSingle(rec, "saved")}
          journeys={savedJourneys}
          onRemoveJourney={(id) => {
            deleteJourney(id);
            setSavedJourneys(loadSavedJourneys());
          }}
          onHome={goNow}
          onOpenArtists={() => setView("browseArtists")}
        />
      )}

      {showBottomNav && <BottomNav active={view as PrimaryTab} onSelect={selectPrimaryTab} />}

      {showSettings && <AppSettingsPanel taste={taste} onChange={updateTaste} onClose={() => setShowSettings(false)} />}
    </div>
  );
}
