import { useMemo, useState } from "react";
import type { Dataset } from "../data/loadData";
import type { TasteProfile } from "../types";
import { HomeIcon, SearchIcon } from "../components/icons";
import { ArtistRow, listenLinksFor } from "../components/ArtistRow";

type SignalFilter = "ALL" | "ESTABLISHED" | "EMERGING" | "WILDCARD";
type Artist = Dataset["artists"][number];

function normalizeName(s: string): string {
  return s.trim().toLowerCase();
}

export function BrowseArtistsScreen({
  dataset,
  onHome,
  onSelectArtist,
  taste,
  onChangeTaste,
}: {
  dataset: Dataset;
  onHome: () => void;
  onSelectArtist: (artistId: string) => void;
  taste: TasteProfile;
  onChangeTaste: (t: TasteProfile) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SignalFilter>("ALL");
  const [genre, setGenre] = useState<string | null>(null);

  // Every real genre tag (there are only 20 total), ranked by how many
  // artists carry it — an artist can land in more than one bucket, so
  // these counts don't sum to the artist total, which is expected.
  const topGenres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of dataset.artists) {
      for (const g of a.genre_tags) counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
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

  const favoriteSet = useMemo(() => new Set(taste.favorite_artists.map(normalizeName)), [taste.favorite_artists]);

  function toggleFavorite(artist: Artist) {
    const isFav = favoriteSet.has(normalizeName(artist.artist));
    onChangeTaste({
      ...taste,
      favorite_artists: isFav
        ? taste.favorite_artists.filter((a) => normalizeName(a) !== normalizeName(artist.artist))
        : [...taste.favorite_artists, artist.artist],
    });
  }

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
          topGenres.map(([g, count]) => (
            <button key={g} className="filter-chip" onClick={() => setGenre(g)}>
              {g} <span className="genre-chip-count">{count}</span>
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
        {results.map((a) => (
          <ArtistRow
            key={a.artist_id}
            artist={a}
            isFavorite={favoriteSet.has(normalizeName(a.artist))}
            onToggleFavorite={() => toggleFavorite(a)}
            onClick={() => onSelectArtist(a.artist_id)}
          />
        ))}
        {results.length === 0 && <p className="empty">No artists match that search.</p>}
      </div>
    </div>
  );
}
