// The 7 mood/genre tiles shown on Home and My Taste, each mapped to a real
// genre tag from taxonomy.json's controlled vocabulary.
export interface MoodTile {
  key: string;
  label: string;
  genreTag: string;
}

export const MOOD_TILES: MoodTile[] = [
  { key: "organic", label: "Organic", genreTag: "organic electronic" },
  { key: "psychedelic", label: "Psychedelic", genreTag: "psychedelic" },
  { key: "experimental", label: "Experimental", genreTag: "experimental electronic" },
  { key: "global", label: "Global", genreTag: "global bass" },
  { key: "bass", label: "Bass", genreTag: "bass house" },
  { key: "house", label: "House", genreTag: "melodic house" },
  { key: "techno", label: "Techno", genreTag: "techno" },
];
