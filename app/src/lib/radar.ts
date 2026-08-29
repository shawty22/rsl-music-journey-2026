import type { Artist, PerformanceType } from "../types";
import { DAY_OPTIONS } from "./time";

export type RadarWhen = "now" | "tonight" | "sunrise" | "tomorrow";
export type RadarTravel = "nearby" | "short" | "deep";

export interface RadarMoodDef {
  key: string;
  label: string;
  kind: "genre" | "perfType" | "special";
  match?: string[];
  perfType?: PerformanceType;
}

// Maps the plain-language mood chips onto the real controlled genre-tag
// vocabulary via substring matching — no invented taxonomy, just a lens on
// the existing tags. "Live" is a performance-type filter, not a genre;
// "High energy" and "Surprise me" are scoring biases, not literal tags.
export const RADAR_MOODS: RadarMoodDef[] = [
  { key: "techno", label: "Techno", kind: "genre", match: ["techno"] },
  { key: "house", label: "House", kind: "genre", match: ["house"] },
  { key: "disco", label: "Disco", kind: "genre", match: ["disco", "funk"] },
  { key: "bass", label: "Bass", kind: "genre", match: ["bass"] },
  { key: "psychedelic", label: "Psychedelic", kind: "genre", match: ["psychedelic", "psytechno"] },
  { key: "organic", label: "Organic", kind: "genre", match: ["organic"] },
  { key: "experimental", label: "Experimental", kind: "genre", match: ["experimental", "glitch"] },
  { key: "global", label: "Global", kind: "genre", match: ["global", "world"] },
  { key: "ambient", label: "Ambient", kind: "genre", match: ["ambient", "downtempo"] },
  { key: "live", label: "Live", kind: "perfType", perfType: "LIVE" },
  { key: "high_energy", label: "High energy", kind: "special" },
  { key: "surprise", label: "Surprise me", kind: "special" },
];

export function moodGenreMatchCount(artist: Artist, moodKeys: string[]): number {
  const activeGenreMoods = RADAR_MOODS.filter((m) => m.kind === "genre" && moodKeys.includes(m.key));
  if (activeGenreMoods.length === 0) return 0;
  const tags = artist.genre_tags.map((t) => t.toLowerCase());
  let hits = 0;
  for (const mood of activeGenreMoods) {
    if (mood.match!.some((kw) => tags.some((t) => t.includes(kw)))) hits++;
  }
  return hits;
}

// Reverse lookup: which mood chip(s) does a real genre tag correspond to?
// Used to hand a Now-screen "Signal of the Moment" genre off to Radar as a
// preselected mood chip rather than a raw tag string.
export function genreTagToMoodKeys(tag: string): string[] {
  const t = tag.toLowerCase();
  return RADAR_MOODS.filter((m) => m.kind === "genre" && m.match!.some((kw) => t.includes(kw))).map((m) => m.key);
}

const PEAK_KEYWORDS = ["techno", "bass", "drum and bass", "psytechno", "acid", "hard"];
const CHILL_KEYWORDS = ["ambient", "downtempo", "organic", "world fusion"];

// -1 (chill) .. +1 (peak), 0 = no strong signal either way.
export function energyScore(artist: Artist): number {
  const tags = artist.genre_tags.map((t) => t.toLowerCase());
  let score = 0;
  for (const t of tags) {
    if (PEAK_KEYWORDS.some((k) => t.includes(k))) score += 1;
    if (CHILL_KEYWORDS.some((k) => t.includes(k))) score -= 1;
  }
  return Math.max(-1, Math.min(1, score));
}

export interface RadarWindow {
  day: string;
  nmMin: number;
  nmMax: number;
}

// "When" is a hard filter on which day/time-window of performances is even
// in play — unlike mood/energy/travel, which only re-sort within that set.
export function radarWindow(when: RadarWhen, now: Date, nowNightMinutes: number): RadarWindow {
  const todayIdx = now.getDay();
  if (when === "tomorrow") {
    return { day: DAY_OPTIONS[(todayIdx + 1) % 7], nmMin: 0, nmMax: 48 * 60 };
  }
  if (when === "tonight") {
    return { day: DAY_OPTIONS[todayIdx], nmMin: 18 * 60, nmMax: 26 * 60 };
  }
  if (when === "sunrise") {
    return { day: DAY_OPTIONS[todayIdx], nmMin: 29 * 60, nmMax: 33 * 60 }; // 5am-9am, pushed +24 per the overnight convention
  }
  return { day: DAY_OPTIONS[todayIdx], nmMin: nowNightMinutes, nmMax: 48 * 60 }; // "now" — from this moment through the rest of the listed day
}
