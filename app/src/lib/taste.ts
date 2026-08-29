import type { SavedJourney, ScoredRecommendation, TasteProfile } from "../types";

const TASTE_KEY = "rsl.taste_profile.v1";
const JOURNEYS_KEY = "rsl.saved_journeys.v1";
const SETS_KEY = "rsl.saved_sets.v1";

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

// Individual saved sets — separate from whole saved journeys, for a single
// act bookmarked from Now/Radar rather than a full built-out night.
export function loadSavedSets(): ScoredRecommendation[] {
  try {
    const raw = localStorage.getItem(SETS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function isSetSaved(performanceId: string, saved: ScoredRecommendation[]): boolean {
  return saved.some((s) => s.performance.performance_id === performanceId);
}

export function toggleSavedSet(rec: ScoredRecommendation): ScoredRecommendation[] {
  const existing = loadSavedSets();
  const next = isSetSaved(rec.performance.performance_id, existing)
    ? existing.filter((s) => s.performance.performance_id !== rec.performance.performance_id)
    : [rec, ...existing];
  try {
    localStorage.setItem(SETS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}
