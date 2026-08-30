import type { Dataset } from "../data/loadData";
import { HomeIcon, BackIcon, PinIcon } from "../components/icons";
import { SignalBadge, PerformanceTypeTag } from "../components/badges";
import { ArtistPhoto } from "../components/ArtistPhoto";

const LINK_LABELS: { key: "spotify_url" | "soundcloud_url" | "bandcamp_url" | "apple_music_url" | "website"; label: string }[] = [
  { key: "spotify_url", label: "Spotify" },
  { key: "soundcloud_url", label: "SoundCloud" },
  { key: "bandcamp_url", label: "Bandcamp" },
  { key: "apple_music_url", label: "Apple Music" },
  { key: "website", label: "Website" },
];

function geographyLine(artist: Dataset["artists"][number]): string | null {
  const parts = [artist.city, artist.state_region, artist.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

export function ArtistDetailScreen({
  dataset,
  artistId,
  onBack,
  onHome,
}: {
  dataset: Dataset;
  artistId: string;
  onBack: () => void;
  onHome: () => void;
}) {
  const artist = dataset.artistsById.get(artistId);
  if (!artist) return null;

  const performances = dataset.performances.filter((p) => p.artist_id === artistId);
  const geo = geographyLine(artist);
  const about = artist.bio || [artist.discovery_note, artist.catalogue_signal, artist.external_signal].filter(Boolean).join(" ");
  const links = LINK_LABELS.filter((l) => artist[l.key]);

  return (
    <div className="screen">
      <div className="screen-top">
        <div className="nav-cluster">
          <button className="icon-btn" onClick={onBack} aria-label="Back">
            <BackIcon />
          </button>
          <button className="icon-btn icon-btn-labeled" onClick={onHome} aria-label="Home">
            <HomeIcon />
            <span className="icon-btn-label">Home</span>
          </button>
        </div>
        <div className="icon-btn-spacer" />
      </div>

      <ArtistPhoto artistId={artist.artist_id} alt={artist.artist} className="detail-photo" />

      <div style={{ marginTop: 16 }}>
        <SignalBadge status={artist.signal_status} size="md" />
      </div>
      <div className="detail-name">{artist.artist}</div>
      {artist.artist_type && <div className="detail-subtitle">{artist.artist_type}</div>}

      <div className="chip-row" style={{ marginTop: 14 }}>
        {artist.genre_tags.length > 0 ? (
          artist.genre_tags.map((g) => (
            <span key={g} className="tag-chip tag-chip-lg">
              {g}
            </span>
          ))
        ) : (
          <span className="tag-chip tag-chip-lg">genre not yet tagged</span>
        )}
      </div>

      <div className="detail-info-list">
        {geo && (
          <div className="detail-info-row">
            <PinIcon size={17} color="var(--accent)" />
            <div className="detail-info-main">{geo}</div>
          </div>
        )}
        <div className="detail-info-row">
          <PerformanceTypeTag type={artist.performance_type} />
          {artist.career_stage && <div className="detail-info-main">{artist.career_stage}</div>}
        </div>
      </div>

      {about && (
        <div className="section">
          <div className="section-label">ABOUT</div>
          <div className="detail-why">{about}</div>
        </div>
      )}

      {(artist.notable_releases || artist.labels || artist.notable_collaborations || artist.burning_man_history) && (
        <div className="section">
          <div className="section-label">NOTABLE</div>
          <div className="detail-notable-list">
            {artist.labels && (
              <div className="detail-notable-row">
                <span className="detail-notable-label">Labels</span> {artist.labels}
              </div>
            )}
            {artist.notable_releases && (
              <div className="detail-notable-row">
                <span className="detail-notable-label">Releases</span> {artist.notable_releases}
              </div>
            )}
            {artist.notable_collaborations && (
              <div className="detail-notable-row">
                <span className="detail-notable-label">Collaborations</span> {artist.notable_collaborations}
              </div>
            )}
            {artist.burning_man_history && (
              <div className="detail-notable-row">
                <span className="detail-notable-label">Burning Man history</span> {artist.burning_man_history}
              </div>
            )}
          </div>
        </div>
      )}

      {links.length > 0 && (
        <div className="section">
          <div className="section-label">LINKS</div>
          <div className="chip-row">
            {links.map((l) => (
              <span key={l.key} className="link-chip">
                {l.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {performances.length > 0 && (
        <div className="section">
          <div className="section-label">PLAYING THIS WEEK</div>
          {performances.map((p) => (
            <div key={p.performance_id} className="perf-row">
              <strong>{p.day_raw}</strong> @ {p.set_time_raw} — {p.camp}
              {p.location ? ` (${p.location})` : ""}
            </div>
          ))}
        </div>
      )}

      {Array.from(new Set(performances.map((p) => p.camp))).map((campName) => {
        const camp = dataset.campsByName.get(campName.toLowerCase());
        if (!camp || !camp.description) return null;
        return (
          <div className="section" key={campName}>
            <div className="section-label">ABOUT {campName.toUpperCase()}</div>
            <div className="detail-why">{camp.description}</div>
            {camp.landmark && <div className="camp-landmark">📍 Look for: {camp.landmark}</div>}
            <div className="camp-as-of">
              {camp.hometown && `Hometown: ${camp.hometown} · `}
              As of {camp.as_of_year} — camp placement changes yearly, this is descriptive only.
            </div>
          </div>
        );
      })}

      {artist.sources.length > 0 && (
        <div className="detail-sources">
          Sources: {artist.sources.length} linked{artist.last_verified ? ` · verified ${artist.last_verified}` : ""}
        </div>
      )}

      <div style={{ height: 20 }} />
    </div>
  );
}
