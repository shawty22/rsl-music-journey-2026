// The 8 mood tiles shown on the taste-setup screen, each mapped to a real
// genre tag from taxonomy.json's controlled vocabulary. "Live" is the one
// exception — it's a performance-type preference, not a genre.
export interface MoodTile {
  key: string;
  emoji: string;
  label: string;
  genreTag: string | null; // null = performance-type tile, handled separately
}

export const MOOD_TILES: MoodTile[] = [
  { key: "organic", emoji: "🌿", label: "Organic", genreTag: "organic electronic" },
  { key: "psychedelic", emoji: "🌀", label: "Psychedelic", genreTag: "psychedelic" },
  { key: "experimental", emoji: "🌌", label: "Experimental", genreTag: "experimental electronic" },
  { key: "global", emoji: "🌍", label: "Global", genreTag: "global bass" },
  { key: "bass", emoji: "🔊", label: "Bass", genreTag: "bass house" },
  { key: "house", emoji: "🎛", label: "House", genreTag: "melodic house" },
  { key: "techno", emoji: "⚡", label: "Techno", genreTag: "techno" },
  { key: "live", emoji: "🎸", label: "Live", genreTag: null },
];
