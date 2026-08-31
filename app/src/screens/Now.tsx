import { useMemo, useState } from "react";
import type { Dataset } from "../data/loadData";
import { buildCandidatePool } from "../lib/recommend";
import { toDisplayRole } from "../lib/recommend";
import { classifyLiveState, computeSignalOfMoment, currentNightMinutes, dedupePerformances, formatStateLabel } from "../lib/liveStatus";
import { DAY_OPTIONS } from "../lib/time";
import { isSetSaved } from "../lib/taste";
import { GearIcon, PeopleIcon } from "../components/icons";
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
  onBuildJourney,
  onOpenMap,
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
  onBuildJourney: () => void;
  onOpenMap: () => void;
}) {
  const [now] = useState(() => new Date());

  // iOS never fires a native install prompt (Apple doesn't expose one) —
  // Android Chrome shows its own automatically once the manifest/service
  // worker qualify, no code needed. This just avoids nagging people who've
  // already installed it, on either platform.
  const [isStandalone] = useState(() => {
    try {
      return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    } catch {
      return false;
    }
  });
  const [installDismissed, setInstallDismissed] = useState(() => {
    try {
      return localStorage.getItem("bmri_install_prompt_dismissed_v1") === "1";
    } catch {
      return false;
    }
  });
  function dismissInstallPrompt() {
    setInstallDismissed(true);
    try {
      localStorage.setItem("bmri_install_prompt_dismissed_v1", "1");
    } catch {
      // localStorage unavailable — prompt just won't stay dismissed
    }
  }

  const [downloadToast, setDownloadToast] = useState<string | null>(null);
  function announceDownload(format: "EPUB" | "PDF") {
    setDownloadToast(
      format === "PDF"
        ? "Downloading PDF — look for it in the Files app (or tap Share → Save to Files if it opens as a preview instead)."
        : "Downloading EPUB — it should open straight into Apple Books.",
    );
    window.setTimeout(() => setDownloadToast(null), 6000);
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

      <div className="home-primary-actions">
        <button className="cta-gradient" onClick={onBuildJourney}>
          <span>BUILD MY JOURNEY</span>
        </button>
        <button className="btn-secondary home-map-btn" onClick={onOpenMap}>
          MAP
        </button>
      </div>

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

      <div className="home-footer-links">
        {!isStandalone && !installDismissed && (
          <div className="field-guide-strip install-prompt-strip">
            <span className="field-guide-strip-label">📲 Everything's in the app —</span>
            <button className="install-prompt-link" onClick={onOpenSettings}>
              install it for offline use on playa
            </button>
            <button className="welcome-dismiss install-prompt-dismiss" onClick={dismissInstallPrompt} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}

        <div className="field-guide-strip">
          <span className="field-guide-strip-label">📖 Field Guide</span>
          <a href="field-guide.html" target="_blank" rel="noreferrer">
            Read online
          </a>
          <span className="field-guide-strip-dot">·</span>
          <a href="BMRI-2026-Music-Field-Guide.epub" download onClick={() => announceDownload("EPUB")}>
            EPUB
          </a>
          <span className="field-guide-strip-dot">·</span>
          <a href="BMRI-2026-Music-Field-Guide.pdf" download onClick={() => announceDownload("PDF")}>
            PDF
          </a>
        </div>

        {downloadToast && (
          <div className="download-toast" role="status">
            {downloadToast}
          </div>
        )}
      </div>

      <div className="bottom-nav-spacer" />
    </div>
  );
}
