import type { Dataset } from "../data/loadData";
import { HeartIcon } from "./icons";
import { SignalBadge, PerformanceTypeTag } from "./badges";
import { ArtistPhoto } from "./ArtistPhoto";

type Artist = Dataset["artists"][number];

const LISTEN_LINKS: { key: "spotify_url" | "soundcloud_url" | "bandcamp_url" | "apple_music_url"; label: string }[] = [
  { key: "spotify_url", label: "Spotify" },
  { key: "soundcloud_url", label: "SoundCloud" },
  { key: "bandcamp_url", label: "Bandcamp" },
  { key: "apple_music_url", label: "Apple Music" },
];

export function listenLinksFor(a: Artist) {
  return LISTEN_LINKS.filter((l) => a[l.key]);
}

export function geographyLine(artist: Artist): string | null {
  const parts = [artist.city, artist.state_region, artist.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

// The rich artist card used everywhere you browse a real, RSL-listed
// artist: Browse Artists and My Favorites both render this same row, so a
// fix to one (photo, listen links, favorite toggle) never drifts from the
// other.
export function ArtistRow({
  artist,
  isFavorite,
  onToggleFavorite,
  onClick,
}: {
  artist: Artist;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}) {
  const geo = geographyLine(artist);
  const listenLinks = listenLinksFor(artist);
  return (
    <div className="artist-row-rich" onClick={onClick}>
      <div className="artist-row-top">
        <ArtistPhoto artistId={artist.artist_id} alt={artist.artist} className="artist-row-thumb" />
        <span className="artist-row-name">{artist.artist}</span>
        <SignalBadge status={artist.signal_status} />
        <button
          className="icon-btn artist-row-favorite"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
        >
          <HeartIcon filled={isFavorite} color={isFavorite ? "#ff4d6d" : "var(--text-dim)"} />
        </button>
      </div>
      <div className="artist-row-genre">{artist.genre_tags.length > 0 ? artist.genre_tags.join(" · ") : "genre not yet tagged"}</div>
      <div className="artist-row-meta">
        <PerformanceTypeTag type={artist.performance_type} />
        {geo && <span className="artist-row-geo">{geo}</span>}
      </div>
      {listenLinks.length > 0 && (
        <div className="artist-row-listen" onClick={(e) => e.stopPropagation()}>
          {listenLinks.map((l) => (
            <a key={l.key} href={artist[l.key] as string} target="_blank" rel="noreferrer" className="listen-now-chip">
              ▶ {l.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
