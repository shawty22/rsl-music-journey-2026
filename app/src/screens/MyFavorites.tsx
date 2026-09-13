import { useMemo } from "react";
import type { Dataset } from "../data/loadData";
import type { TasteProfile } from "../types";
import { HomeIcon, DerivedIcon } from "../components/icons";
import { ArtistRow } from "../components/ArtistRow";

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

// Your personal reference library — every artist you've hearted while
// browsing, in one place. Anyone still in this year's RSL data gets the
// full rich card (photo, genre, listen links); anyone added by name only
// (not playing this year) gets a plain reference row instead, since there's
// no photo or listen link to show for them.
export function MyFavoritesScreen({
  dataset,
  taste,
  onChangeTaste,
  onHome,
  onSelectArtist,
  onOpenArtists,
}: {
  dataset: Dataset;
  taste: TasteProfile;
  onChangeTaste: (t: TasteProfile) => void;
  onHome: () => void;
  onSelectArtist: (artistId: string) => void;
  onOpenArtists: () => void;
}) {
  const { matched, referenceOnly } = useMemo(() => {
    const artistByNormalizedName = new Map(dataset.artists.map((a) => [normalize(a.artist), a]));
    const matched: Dataset["artists"] = [];
    const referenceOnly: string[] = [];
    for (const name of taste.favorite_artists) {
      const a = artistByNormalizedName.get(normalize(name));
      if (a) matched.push(a);
      else referenceOnly.push(name);
    }
    matched.sort((a, b) => a.artist.localeCompare(b.artist));
    return { matched, referenceOnly };
  }, [dataset, taste.favorite_artists]);

  function removeFavorite(name: string) {
    onChangeTaste({ ...taste, favorite_artists: taste.favorite_artists.filter((a) => normalize(a) !== normalize(name)) });
  }

  const isEmpty = matched.length === 0 && referenceOnly.length === 0;

  return (
    <div className="screen">
      <div className="screen-top">
        <button className="icon-btn icon-btn-labeled" onClick={onHome} aria-label="Home">
          <HomeIcon />
          <span className="icon-btn-label">Home</span>
        </button>
        <span className="wordmark">FAVORITES</span>
        <div className="icon-btn-spacer" />
      </div>

      {isEmpty && (
        <div className="section" style={{ marginTop: 24, textAlign: "center" }}>
          <div style={{ fontSize: 15, color: "var(--text-dim)", marginBottom: 16 }}>
            You haven't favorited anyone yet. Tap the heart on any artist to start building your reference library of DJs and styles.
          </div>
          <button className="cta-gradient" onClick={onOpenArtists}>
            <span>BROWSE ARTISTS</span>
          </button>
        </div>
      )}

      {matched.length > 0 && (
        <div className="section" style={{ marginTop: 14 }}>
          <div className="section-label">{matched.length} FAVORITE{matched.length === 1 ? "" : "S"}</div>
          <div className="artist-list">
            {matched.map((a) => (
              <ArtistRow key={a.artist_id} artist={a} isFavorite onToggleFavorite={() => removeFavorite(a.artist)} onClick={() => onSelectArtist(a.artist_id)} />
            ))}
          </div>
        </div>
      )}

      {referenceOnly.length > 0 && (
        <div className="section" style={{ marginTop: 14 }}>
          <div className="section-label">ALSO IN YOUR LIBRARY</div>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 12 }}>Not playing this year — kept as a reference for your taste.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {referenceOnly.map((name) => {
              const ref = dataset.tasteReferencesByName.get(normalize(name));
              const knownGenres = ref && ref.genres.length > 0 ? ref.genres : null;
              return (
                <div key={name} className="fav-artist-row fav-artist-row-reference">
                  <div>
                    <span className="fav-artist-name">{name}</span>
                    {knownGenres && <div className="fav-artist-hint">↳ informs {knownGenres.join(", ")}</div>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="reference-badge">
                      <DerivedIcon size={10} color="var(--text-dim)" /> NOT PLAYING THIS YEAR
                    </span>
                    <button className="chip-remove" onClick={() => removeFavorite(name)}>
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ height: 20 }} />
    </div>
  );
}
