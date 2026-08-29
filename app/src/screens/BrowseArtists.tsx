import { useMemo, useState } from "react";
import type { Dataset } from "../data/loadData";
import { HomeIcon, SearchIcon } from "../components/icons";
import { SignalBadge, PerformanceTypeTag } from "../components/badges";
import { ArtistPhoto } from "../components/ArtistPhoto";

type SignalFilter = "ALL" | "ESTABLISHED" | "EMERGING" | "WILDCARD";

function geographyLine(artist: Dataset["artists"][number]): string | null {
  const parts = [artist.city, artist.state_region, artist.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

export function BrowseArtistsScreen({
  dataset,
  onHome,
  onSelectArtist,
}: {
  dataset: Dataset;
  onHome: () => void;
  onSelectArtist: (artistId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SignalFilter>("ALL");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q ? dataset.artists.filter((a) => a.artist_normalized.includes(q)) : dataset.artists;
    if (filter === "WILDCARD") list = list.filter((a) => a.signal_status.toUpperCase() === "UNKNOWN");
    else if (filter !== "ALL") list = list.filter((a) => a.signal_status.toUpperCase() === filter);
    // Alphabetical, A-Z — the point of "browse" rather than search.
    list = [...list].sort((a, b) => a.artist.localeCompare(b.artist));
    return list.slice(0, 200);
  }, [dataset, query, filter]);

  return (
    <div className="screen">
      <div className="screen-top">
        <button className="icon-btn" onClick={onHome} aria-label="Home">
          <HomeIcon />
        </button>
        <span className="wordmark">ARTISTS</span>
        <div className="icon-btn-spacer" />
      </div>

      <div className="search-field" style={{ marginTop: 16 }}>
        <SearchIcon />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${dataset.metadata.artist_count.toLocaleString()} artists…`} />
      </div>

      <div className="filter-row">
        <button className={`filter-chip ${filter === "ALL" ? "filter-chip-active" : ""}`} onClick={() => setFilter("ALL")}>
          All
        </button>
        <button className={`filter-chip filter-chip-established ${filter === "ESTABLISHED" ? "filter-chip-active" : ""}`} onClick={() => setFilter("ESTABLISHED")}>
          🟢 Established
        </button>
        <button className={`filter-chip filter-chip-emerging ${filter === "EMERGING" ? "filter-chip-active" : ""}`} onClick={() => setFilter("EMERGING")}>
          🟡 Emerging
        </button>
        <button className={`filter-chip filter-chip-wildcard ${filter === "WILDCARD" ? "filter-chip-active" : ""}`} onClick={() => setFilter("WILDCARD")}>
          🟣 Wildcard
        </button>
      </div>

      <div className="artist-list">
        {results.map((a) => {
          const geo = geographyLine(a);
          return (
            <div key={a.artist_id} className="artist-row-rich" onClick={() => onSelectArtist(a.artist_id)}>
              <div className="artist-row-top">
                <ArtistPhoto artistId={a.artist_id} alt={a.artist} className="artist-row-thumb" />
                <span className="artist-row-name">{a.artist}</span>
                <SignalBadge status={a.signal_status} />
              </div>
              <div className="artist-row-genre">{a.genre_tags.length > 0 ? a.genre_tags.join(" · ") : "genre not yet tagged"}</div>
              <div className="artist-row-meta">
                <PerformanceTypeTag type={a.performance_type} />
                {geo && <span className="artist-row-geo">{geo}</span>}
              </div>
            </div>
          );
        })}
        {results.length === 0 && <p className="empty">No artists match that search.</p>}
      </div>
    </div>
  );
}
