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
    let list = q
      ? dataset.artists.filter((a) => a.artist_normalized.includes(q) || a.genre_tags.some((g) => g.toLowerCase().includes(q)))
      : dataset.artists;
    if (filter === "WILDCARD") list = list.filter((a) => a.signal_status.toUpperCase() === "UNKNOWN");
    else if (filter !== "ALL") list = list.filter((a) => a.signal_status.toUpperCase() === filter);
    // Established, then Emerging, then Unknown — alphabetical within each
    // tier. A flat A-Z sort buries every real artist under ~1,000
    // symbol-prefixed Unknown entries (names like "_nophones", "*rekless")
    // that sort before any letter.
    const tierRank: Record<string, number> = { ESTABLISHED: 0, EMERGING: 1 };
    list = [...list].sort((a, b) => {
      const ra = tierRank[a.signal_status.toUpperCase()] ?? 2;
      const rb = tierRank[b.signal_status.toUpperCase()] ?? 2;
      return ra !== rb ? ra - rb : a.artist.localeCompare(b.artist);
    });
    return list.slice(0, 200);
  }, [dataset, query, filter]);

  return (
    <div className="screen">
      <div className="screen-top">
        <button className="icon-btn icon-btn-labeled" onClick={onHome} aria-label="Home">
          <HomeIcon />
          <span className="icon-btn-label">Home</span>
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
