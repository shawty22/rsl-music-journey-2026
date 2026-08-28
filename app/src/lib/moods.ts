// The 7 mood/genre tiles shown on Home, each mapped to a real genre tag from
// taxonomy.json's controlled vocabulary. Real emoji, not hand-drawn icons —
// the phone's native emoji font already renders these with full color/
// shading/dimension, which reads as "cute" in a way flat line art doesn't.
// Each also has a thematic accent color for the selected-state tile border.
export interface MoodTile {
  key: string;
  label: string;
  genreTag: string;
  emoji: string;
  color: string;
}

export const MOOD_TILES: MoodTile[] = [
  { key: "organic", label: "Organic", genreTag: "organic electronic", emoji: "🌿", color: "#4ade80" },
  { key: "psychedelic", label: "Psychedelic", genreTag: "psychedelic", emoji: "🌀", color: "#c084fc" },
  { key: "experimental", label: "Experimental", genreTag: "experimental electronic", emoji: "🌌", color: "#4fd1c5" },
  { key: "global", label: "Global", genreTag: "global bass", emoji: "🌍", color: "#60a5fa" },
  { key: "bass", label: "Bass", genreTag: "bass house", emoji: "🔊", color: "#ff6b35" },
  { key: "house", label: "House", genreTag: "melodic house", emoji: "🏠", color: "#f5c451" },
  { key: "techno", label: "Techno", genreTag: "techno", emoji: "⚡", color: "#ff5c8a" },
];
