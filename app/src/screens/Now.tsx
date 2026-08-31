import { useMemo, useState } from "react";
import type { Dataset } from "../data/loadData";
import { buildCandidatePool } from "../lib/recommend";
import { toDisplayRole } from "../lib/recommend";
import { classifyLiveState, computeSignalOfMoment, currentNightMinutes, dedupePerformances, formatStateLabel } from "../lib/liveStatus";
import { DAY_OPTIONS } from "../lib/time";
import { isSetSaved } from "../lib/taste";
import { GearIcon, PeopleIcon, ArrowRightIcon } from "../components/icons";
import { LiveStatusBar } from "../components/LiveStatus";
import { RecommendationCard } from "../components/RecommendationCard";
import type { ScoredRecommendation, TasteProfile } from "../types";

export function NowScreen({
  dataset,
  taste,
  savedSets,
  onToggleSave,
  onSelect,
  onShowOnMap,
  onOpenSignal,
  onSeeAllStartingSoon,
  onOpenArtists,
  onOpenSettings,
}: {
  dataset: Dataset;
  taste: TasteProfile;
  savedSets: ScoredRecommendation[];
  onToggleSave: (rec: ScoredRecommendation) => void;
  onSelect: (rec: ScoredRecommendation) => void;
  onShowOnMap: (rec: ScoredRecommendation) => void;
  onOpenSignal: (genres: string[]) => void;
  onSeeAllStartingSoon: () => void;
  onOpenArtists: () => void;
  onOpenSettings: () => void;
}) {
  const [now] = useState(() => new Date());
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => {
    try {
      return localStorage.getItem("bmri_welcome_dismissed_v1") === "1";
    } catch {
      return false;
    }
  });
  function dismissWelcome() {
    setWelcomeDismissed(true);
    try {
      localStorage.setItem("bmri_welcome_dismissed_v1", "1");
    } catch {
      // localStorage unavailable (private mode etc) — banner just won't stay dismissed
    }
  }

  const { happeningNow, startingSoon, signal, bestNext } = useMemo(() => {
    const nowNM = currentNightMinutes(now);
    const today = DAY_OPTIONS[now.getDay()];
    const dayPerfs = dedupePerformances(dataset.performances.filter((p) => p.day_start === today));
    const pool = buildCandidatePool(dayPerfs, dataset.artistsById, taste, dataset.taxonomy, dataset.tasteReferencesByName);

    const withState = pool.map((r) => ({ r, c: classifyLiveState(r.performance, nowNM) }));
    const live = withState.filter((x) => x.c.state === "LIVE_NOW");
    const soon = withState.filter((x) => x.c.state === "STARTS_SOON").sort((a, b) => (a.c.minutesUntilStart ?? 0) - (b.c.minutesUntilStart ?? 0));
    const nowOrSoon = [...live, ...soon];

    const signalCandidates = nowOrSoon.filter((x) => (x.c.state === "LIVE_NOW" || (x.c.minutesUntilStart ?? 999) <= 45) && toDisplayRole(x.r.role) !== "WILDCARD");
    const signal = computeSignalOfMoment(
      signalCandidates.map((x) => x.r),
      now,
    );

    // Best-next fallback when nothing is live or starting soon at all.
    const bestNext =
      nowOrSoon.length === 0
        ? pool
            .map((r) => ({ r, c: classifyLiveState(r.performance, nowNM) }))
            .filter((x) => x.c.state !== "PAST" && x.c.state !== "UNKNOWN_TIME")
            .sort((a, b) => (a.c.minutesUntilStart ?? 0) - (b.c.minutesUntilStart ?? 0))[0]
        : null;

    return { happeningNow: nowOrSoon.slice(0, 2), startingSoon: nowOrSoon.slice(2, 8), signal, bestNext };
  }, [dataset, taste, now]);

  return (
    <div className="screen">
      <div className="hero-banner">
        <div className="hero-banner-nav">
          <div className="top-actions">
            <button className="icon-btn" onClick={onOpenArtists} aria-label="Browse artists">
              <PeopleIcon size={16} />
            </button>
            <button className="icon-btn" onClick={onOpenSettings} aria-label="App settings">
              <GearIcon />
            </button>
          </div>
        </div>
        <div className="hero-banner-caption">
          <span className="hero-mark">BMRI</span>
          <div className="hero-title">Burning Man Rave Intelligence</div>
          <div className="hero-tagline">The app and the 2026 field guide, in one place.</div>
        </div>
      </div>

      <div className="book-promo book-promo-top">
        <div className="section-label">BMRI FIELD GUIDE 2026 · DOWNLOADABLE</div>
        <p className="book-promo-note">
          Every Established and Emerging artist — photo, bio, and every set — as one offline document. Download it for
          offline use and perusal on playa.
        </p>
        <a className="cta-gradient book-promo-primary" href="field-guide.html" target="_blank" rel="noreferrer">
          <span>READ THE FIELD GUIDE ONLINE</span>
          <ArrowRightIcon />
        </a>
        <div className="book-promo-downloads">
          <a className="btn-secondary book-promo-download" href="BMRI-2026-Music-Field-Guide.epub" download>
            ⬇ Download EPUB
          </a>
          <a className="btn-secondary book-promo-download" href="BMRI-2026-Music-Field-Guide.pdf" download>
            ⬇ Download PDF
          </a>
        </div>
      </div>

      {!welcomeDismissed && (
        <div className="welcome-banner">
          <button className="welcome-dismiss" onClick={dismissWelcome} aria-label="Dismiss">
            ×
          </button>
          <p>
            Some website functionality is still under construction. Try out <b>Build My Journey</b> and the <b>Map</b> to
            plan your own custom route through Burning Man.
          </p>
          <p className="welcome-signoff">
            Happy burn. See you on the dance floor.
            <br />
            — Ciaran aka Papi Chuleto 2026 · Find me at Snack Shack @ 2:45 &amp; B x
          </p>
        </div>
      )}

      <LiveStatusBar geoModel={dataset.geoModel} />

      {signal && (
        <div className="section">
          <div className="section-label">SIGNAL OF THE MOMENT</div>
          <button className="signal-card" onClick={() => onOpenSignal(signal.genreFilter)}>
            <div className="signal-card-label">{signal.label}</div>
            <div className="signal-card-detail">{signal.detail}</div>
            <div className="signal-card-cta">EXPLORE THIS SIGNAL →</div>
          </button>
        </div>
      )}

      {happeningNow.length > 0 && (
        <div className="section">
          <div className="section-label">HAPPENING NOW</div>
          <div className="card-list">
            {happeningNow.map(({ r, c }) => (
              <div key={r.performance.performance_id} onClick={() => onSelect(r)}>
                <RecommendationCard
                  rec={r}
                  stateBadge={{ label: formatStateLabel(c), tone: c.state === "LIVE_NOW" ? "live" : "soon" }}
                  isSaved={isSetSaved(r.performance.performance_id, savedSets)}
                  onToggleSave={() => onToggleSave(r)}
                  onShowOnMap={() => onShowOnMap(r)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {happeningNow.length === 0 && bestNext && (
        <div className="section">
          <div className="now-empty-headline">Nothing strong is live right now.</div>
          <div className="section-label" style={{ marginTop: 14 }}>
            BEST NEXT SET
          </div>
          <div onClick={() => onSelect(bestNext.r)}>
            <RecommendationCard
              rec={bestNext.r}
              stateBadge={{ label: formatStateLabel(bestNext.c), tone: "soon" }}
              isSaved={isSetSaved(bestNext.r.performance.performance_id, savedSets)}
              onToggleSave={() => onToggleSave(bestNext.r)}
              onShowOnMap={() => onShowOnMap(bestNext.r)}
            />
          </div>
          <button className="btn-secondary" onClick={onSeeAllStartingSoon} style={{ marginTop: 12 }}>
            OPEN RADAR
          </button>
        </div>
      )}

      {startingSoon.length > 0 && (
        <div className="section">
          <div className="section-label-row">
            <div className="section-label">STARTING SOON</div>
            <button className="text-link" onClick={onSeeAllStartingSoon}>
              SEE ALL
            </button>
          </div>
          <div className="starting-soon-list">
            {startingSoon.map(({ r, c }) => (
              <div key={r.performance.performance_id} className="starting-soon-row" onClick={() => onSelect(r)}>
                <div className="starting-soon-top">
                  <span className="starting-soon-time">{formatStateLabel(c)}</span>
                  <span className="starting-soon-artist">{r.artist.artist}</span>
                </div>
                <div className="starting-soon-sub">
                  {r.artist.genre_tags[0] ?? "genre not yet tagged"} · {r.performance.camp}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bottom-nav-spacer" />
    </div>
  );
}
