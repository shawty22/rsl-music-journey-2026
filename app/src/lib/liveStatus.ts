import type { Performance, ScoredRecommendation } from "../types";
import { nightMinutesFromHour24 } from "./time";

// The data has no set END time — only a start time — so "LIVE NOW" can never
// be certain. Rather than invent a per-artist duration, this reuses the same
// 75-minute planning unit journey.ts already assumes for a typical stop
// (MINUTES_PER_STOP), so "how long is a set" isn't a second, different guess
// invented just for this screen.
export const ASSUMED_SET_MINUTES = 75;
export const STARTING_SOON_WINDOW_MINUTES = 90;

export type LiveState = "LIVE_NOW" | "STARTS_SOON" | "PAST" | "UNKNOWN_TIME";

export interface LiveClassification {
  state: LiveState;
  minutesUntilStart: number | null; // negative once started
}

// The RSL source data flags some rows as likely duplicate listings of the
// same set (same artist/day/time/camp, different performance_id) via
// is_possible_duplicate/duplicate_group_size. Collapsing them here so Now
// and Radar don't show the same set twice in a short, high-visibility list.
export function dedupePerformances(perfs: Performance[]): Performance[] {
  const seen = new Set<string>();
  const out: Performance[] = [];
  for (const p of perfs) {
    const key = p.is_possible_duplicate ? `${p.artist_id}__${p.day_start}__${p.set_time_raw}__${p.camp}` : p.performance_id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

export function performanceNightMinutes(p: Performance): number | null {
  if (p.set_time_hour24 === null || p.set_time_minute === null) return null;
  return nightMinutesFromHour24(p.set_time_hour24, p.set_time_minute);
}

export function classifyLiveState(p: Performance, nowNightMinutes: number): LiveClassification {
  const nm = performanceNightMinutes(p);
  if (nm === null || !p.set_time_valid) return { state: "UNKNOWN_TIME", minutesUntilStart: null };
  const delta = nm - nowNightMinutes;
  if (delta > STARTING_SOON_WINDOW_MINUTES) return { state: "PAST", minutesUntilStart: delta }; // too far out for "now"
  if (delta > 0) return { state: "STARTS_SOON", minutesUntilStart: delta };
  if (delta > -ASSUMED_SET_MINUTES) return { state: "LIVE_NOW", minutesUntilStart: delta };
  return { state: "PAST", minutesUntilStart: delta };
}

export function formatStateLabel(c: LiveClassification): string {
  if (c.state === "LIVE_NOW") return "LIVE NOW";
  if (c.state === "STARTS_SOON" && c.minutesUntilStart !== null) {
    if (c.minutesUntilStart <= 1) return "STARTING NOW";
    return `STARTS IN ${c.minutesUntilStart} MIN`;
  }
  return "SCHEDULED";
}

// A same-day "now" in night-minutes, matching the overnight-sort convention
// used everywhere else (PM hours as-is, AM hours pushed +24h).
export function currentNightMinutes(now: Date = new Date()): number {
  return nightMinutesFromHour24(now.getHours(), now.getMinutes());
}

export interface SignalOfMoment {
  label: string;
  detail: string;
  genreFilter: string[];
}

const TIME_LABELS: { maxHour: number; label: string }[] = [
  { maxHour: 9, label: "SUNRISE" },
  { maxHour: 17, label: "DAYTIME" },
  { maxHour: 21, label: "EVENING" },
  { maxHour: 26, label: "NIGHT" }, // 9pm-2am
  { maxHour: 29, label: "DEEP PLAYA AFTERHOURS" }, // 2am-5am
];

function timeOfDayLabel(hour24: number): string {
  const h = hour24 < 5 ? hour24 + 24 : hour24; // push post-midnight hours onto the same "night" scale
  for (const t of TIME_LABELS) {
    if (h < t.maxHour) return t.label;
  }
  return "LATE NIGHT";
}

// Purely descriptive, derived straight from the real candidate pool's genre
// tags and real counts — never a fabricated trend. Returns null when there
// isn't enough happening to say anything meaningful (fewer than 3 matches).
export function computeSignalOfMoment(candidates: ScoredRecommendation[], now: Date): SignalOfMoment | null {
  if (candidates.length < 3) return null;
  const tagCounts = new Map<string, number>();
  for (const c of candidates) {
    for (const g of c.artist.genre_tags) {
      tagCounts.set(g, (tagCounts.get(g) ?? 0) + 1);
    }
  }
  if (tagCounts.size === 0) return null;
  const [topTag] = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const timeLabel = timeOfDayLabel(now.getHours());
  return {
    label: `${timeLabel} → ${topTag.toUpperCase()} WINDOW`,
    detail: `${candidates.length} strong set${candidates.length === 1 ? "" : "s"} begin${candidates.length === 1 ? "s" : ""} within the next 45 minutes.`,
    genreFilter: [topTag],
  };
}
