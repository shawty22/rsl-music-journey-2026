import type { SavedJourney, TasteProfile } from "../types";

const TASTE_KEY = "rsl.taste_profile.v1";
const JOURNEYS_KEY = "rsl.saved_journeys.v1";

export const DEFAULT_TASTE: TasteProfile = {
  favorite_artists: [],
  favorite_genres: [],
  favorite_styles: [],
  preferred_performance_types: [],
  discovery_level: 0.3,
  wildcard_level: 0.1,
  max_travel_minutes: 20,
  major_act_preference: "neutral",
  live_hybrid_preference: "neutral",
  avoid_genres: [],
};

export function loadTaste(): TasteProfile {
  try {
    const raw = localStorage.getItem(TASTE_KEY);
    if (!raw) return { ...DEFAULT_TASTE };
    return { ...DEFAULT_TASTE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_TASTE };
  }
}

export function saveTaste(profile: TasteProfile): void {
  try {
    localStorage.setItem(TASTE_KEY, JSON.stringify(profile));
  } catch {
    // localStorage unavailable (private mode etc) — taste just won't persist
  }
}

export function loadSavedJourneys(): SavedJourney[] {
  try {
    const raw = localStorage.getItem(JOURNEYS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveJourney(journey: SavedJourney): void {
  try {
    const existing = loadSavedJourneys();
    localStorage.setItem(JOURNEYS_KEY, JSON.stringify([journey, ...existing]));
  } catch {
    // ignore
  }
}

export function deleteJourney(id: string): void {
  try {
    const existing = loadSavedJourneys().filter((j) => j.id !== id);
    localStorage.setItem(JOURNEYS_KEY, JSON.stringify(existing));
  } catch {
    // ignore
  }
}
