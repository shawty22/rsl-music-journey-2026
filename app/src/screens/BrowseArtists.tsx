import { useMemo, useState } from "react";
import type { Dataset } from "../data/loadData";
import { HomeIcon, SearchIcon } from "../components/icons";
import { SignalBadge, PerformanceTypeTag } from "../components/badges";
import { ArtistPhoto } from "../components/ArtistPhoto";

type SignalFilter = "ALL" | "ESTABLISHED" | "EMERGING" | "WILDCARD";
type Artist = Dataset["artists"][number];

function geographyLine(artist: Artist): string | null {
  const parts = [artist.city, artist.state_region, artist.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

const LISTEN_LINKS: { key: "spotify_url" | "soundcloud_url" | "bandcamp_url" | "apple_music_url"; label: string }[] = [
  { key: "spotify_url", label: "Spotify" },
  { key: "soundcloud_url", label: "SoundCloud" },
  { key: "bandcamp_url", label: "Bandcamp" },
  { key: "apple_music_url", label: "Apple Music" },
];

function listenLinksFor(a: Artist) {
  return LISTEN_LINKS.filter((l) => a[l.key]);
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
  const [genre, setGenre] = useState<string | null>(null);

  // Top genres by how many artists carry them — a scrollable quick-pick row
  // so "go straight to a genre" doesn't require typing.
  const topGenres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of dataset.artists) {
      for (const g of a.genre_tags) counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24)
      .map(([g]) => g);
  }, [dataset]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q
      ? dataset.artists.filter((a) => a.artist_normalized.includes(q) || a.genre_tags.some((g) => g.toLowerCase().includes(q)))
      : dataset.artists;
    if (filter === "WILDCARD") list = list.filter((a) => a.signal_status.toUpperCase() === "UNKNOWN");
    else if (filter !== "ALL") list = list.filter((a) => a.signal_status.toUpperCase() === filter);
    if (genre) list = list.filter((a) => a.genre_tags.some((g) => g.toLowerCase() === genre.toLowerCase()));
    // Established, then Emerging, then Unknown — alphabetical within each
    // tier. A flat A-Z sort buries every real artist under ~1,000
    // symbol-prefixed Unknown entries (names like "_nophones", "*rekless")
    // that sort before any letter. Within a tier, artists you can actually
    // stream right now come first — that's the point of browsing by genre.
    const tierRank: Record<string, number> = { ESTABLISHED: 0, EMERGING: 1 };
    list = [...list].sort((a, b) => {
      const ra = tierRank[a.signal_status.toUpperCase()] ?? 2;
      const rb = tierRank[b.signal_status.toUpperCase()] ?? 2;
      if (ra !== rb) return ra - rb;
      const la = listenLinksFor(a).length > 0 ? 0 : 1;
      const lb = listenLinksFor(b).length > 0 ? 0 : 1;
      if (la !== lb) return la - lb;
      return a.artist.localeCompare(b.artist);
    });
    return list.slice(0, 200);
  }, [dataset, query, filter, genre]);

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

      <div className="field-label" style={{ marginTop: 14, marginBottom: 6 }}>
        Jump to a genre
      </div>
      <div className="genre-chip-row genre-chip-row-big">
        {genre && (
          <button className="filter-chip filter-chip-active" onClick={() => setGenre(null)}>
            {genre} ✕
          </button>
        )}
        {!genre &&
          topGenres.map((g) => (
            <button key={g} className="filter-chip" onClick={() => setGenre(g)}>
              {g}
            </button>
          ))}
      </div>

      <div className="search-field" style={{ marginTop: 14 }}>
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
          const listenLinks = listenLinksFor(a);
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
              {listenLinks.length > 0 && (
                <div className="artist-row-listen" onClick={(e) => e.stopPropagation()}>
                  {listenLinks.map((l) => (
                    <a key={l.key} href={a[l.key] as string} target="_blank" rel="noreferrer" className="listen-now-chip">
                      ▶ {l.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {results.length === 0 && <p className="empty">No artists match that search.</p>}
      </div>
    </div>
  );
}
