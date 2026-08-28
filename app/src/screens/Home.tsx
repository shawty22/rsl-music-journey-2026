import { useEffect, useState } from "react";
import type { Dataset } from "../data/loadData";
import { GearIcon, ArrowRightIcon } from "../components/icons";

export function HomeScreen({
  dataset,
  onBuildJourney,
  onWhatsGoodNow,
  onSurpriseMe,
  onOpenArtists,
  onOpenSaved,
  onOpenPrefs,
}: {
  dataset: Dataset;
  onBuildJourney: () => void;
  onWhatsGoodNow: () => void;
  onSurpriseMe: () => void;
  onOpenArtists: () => void;
  onOpenSaved: () => void;
  onOpenPrefs: () => void;
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

  return (
    <div className="screen">
      <div className="screen-top">
        <span className="wordmark">RSL MUSIC JOURNEY</span>
        <div className="top-actions">
          <span className={`badge ${online ? "badge-online" : "badge-offline"}`}>
            <span className="badge-dot" />
            {online ? "ONLINE" : "OFFLINE READY"}
          </span>
          <button className="icon-btn" onClick={onOpenPrefs} aria-label="Preferences">
            <GearIcon />
          </button>
        </div>
      </div>

      <div className="home-hero">
        <div className="home-headline">
          What should you
          <br />
          go hear tonight?
        </div>
        <div className="home-sub">Tell us what you're feeling. We'll take it from there.</div>
      </div>

      <button className="cta-gradient" onClick={onBuildJourney}>
        <span>BUILD MY NIGHT</span>
        <ArrowRightIcon />
      </button>

      <div className="home-secondary-row">
        <button className="btn-ghost" onClick={onWhatsGoodNow}>
          WHAT'S GOOD NOW
        </button>
        <button className="btn-ghost btn-ghost-wildcard" onClick={onSurpriseMe}>
          SURPRISE ME
        </button>
      </div>

      <div className="home-footer">
        {dataset.metadata.artist_count.toLocaleString()} artists to discover · works fully offline
      </div>

      <div className="home-links">
        <button className="text-link" onClick={onOpenArtists}>
          Browse artists
        </button>
        <span className="text-link-sep">·</span>
        <button className="text-link" onClick={onOpenSaved}>
          Saved journeys
        </button>
      </div>
    </div>
  );
}
