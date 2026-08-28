import type { Artist, DiscoveryRole, Location, Performance, Reason, ScoredRecommendation, TasteProfile, Taxonomy } from "../types";
import { scoreCandidate } from "./recommend";
import { estimateDistance, findLocation } from "./distance";
import { nightMinutesFromHour24 } from "./time";

export interface JourneyRequest {
  day: string; // e.g. "THU"
  startNightMinutes: number;
  startLocationString: string | null;
  durationHours: number;
}

export interface JourneyStop extends ScoredRecommendation {
  transitionNote: string;
  arrivalNightMinutes: number;
  isFinale: boolean;
}

const MIN_GAP_MINUTES = 10; // minimum time between one set ending (approx) and walking to the next
const MAX_STOPS = 8;
const MINUTES_PER_STOP = 75; // rough planning unit for how many acts a journey should aim for

function performanceNightMinutes(p: Performance): number | null {
  if (p.set_time_hour24 === null || p.set_time_minute === null) return null;
  return nightMinutesFromHour24(p.set_time_hour24, p.set_time_minute);
}

interface Candidate {
  rec: ScoredRecommendation;
  nm: number;
  journeyScore: number;
  note: string;
}

const STRONG_ROLES: DiscoveryRole[] = ["CORE_MATCH", "MAJOR_ACT", "LOCAL_GEM"];

export function buildJourney(
  performances: Performance[],
  artistsById: Map<string, Artist>,
  locations: Location[],
  taxonomy: Taxonomy,
  taste: TasteProfile,
  request: JourneyRequest,
): JourneyStop[] {
  const endMinutes = request.startNightMinutes + request.durationHours * 60;

  const windowCandidates = performances.filter((p) => {
    if (p.day_start !== request.day) return false;
    if (!p.set_time_valid) return false;
    const nm = performanceNightMinutes(p);
    if (nm === null) return false;
    return nm >= request.startNightMinutes && nm <= endMinutes;
  });

  const targetStops = Math.max(2, Math.min(MAX_STOPS, Math.round((request.durationHours * 60) / MINUTES_PER_STOP)));
  const wildcardChance = Math.max(0.15, Math.min(0.6, taste.wildcard_level + 0.15));

  let currentTime = request.startNightMinutes;
  let currentLocation = findLocation(locations, request.startLocationString);
  let lastCamp: string | null = null;
  const used = new Set<string>();
  const stops: JourneyStop[] = [];

  while (stops.length < MAX_STOPS) {
    const stopIndex = stops.length;
    const isLastPlanned = stopIndex === targetStops - 1;
    const wantWildcard = !isLastPlanned && Math.random() < wildcardChance;

    const strong: Candidate[] = [];
    const wildcard: Candidate[] = [];
    const rest: Candidate[] = [];

    for (const perf of windowCandidates) {
      if (used.has(perf.performance_id)) continue;
      const nm = performanceNightMinutes(perf)!;
      if (nm < currentTime + MIN_GAP_MINUTES) continue;

      const artist = artistsById.get(perf.artist_id);
      if (!artist) continue;

      const { score, baseRole, reasons, excluded } = scoreCandidate(artist, perf, taste, taxonomy);
      if (excluded) continue;

      const perfLocation = findLocation(locations, perf.location);
      const dist = estimateDistance(currentLocation, perfLocation);

      if (dist.confidence === "approximate" && dist.estMinutes) {
        const arriveBy = nm - currentTime;
        if (dist.estMinutes[0] > arriveBy) continue; // can't physically get there in time
      }

      const waitMinutes = nm - currentTime;
      let journeyScore = score;
      journeyScore -= waitMinutes * 0.15; // prefer sooner sets, mildly
      if (dist.confidence === "approximate") {
        if (dist.category === "very_close") journeyScore += 6;
        else if (dist.category === "short_walk") journeyScore += 3;
        else if (dist.category === "far_walk") journeyScore -= 6;
      }
      if (lastCamp && perf.camp === lastCamp) journeyScore -= 15; // discourage repeating the same camp back to back

      let note: string;
      if (dist.confidence === "approximate" && dist.estMinutes) {
        note = `~${dist.estMinutes[0]}-${dist.estMinutes[1]} min walk, starts ${waitMinutes} min after your last stop.`;
      } else {
        note = `Starts ${waitMinutes} min after your last stop. Walk time unknown — RSL location string ("${perf.location ?? "unspecified"}") isn't a walkable clock address.`;
      }

      const candidate: Candidate = { rec: { performance: perf, artist, role: baseRole, reasons, score }, nm, journeyScore, note };
      if (STRONG_ROLES.includes(baseRole)) strong.push(candidate);
      else if (baseRole === "UNKNOWN") wildcard.push(candidate);
      else rest.push(candidate);
    }

    const byScore = (a: Candidate, b: Candidate) => b.journeyScore - a.journeyScore;
    strong.sort(byScore);
    wildcard.sort(byScore);
    rest.sort(byScore);
    const all = [...strong, ...rest, ...wildcard].sort(byScore);

    let best: Candidate | null = null;
    let deliberateWildcard = false;
    if (isLastPlanned && strong.length > 0) {
      best = strong[0];
    } else if (wantWildcard && wildcard.length > 0) {
      best = wildcard[0];
      deliberateWildcard = true;
    } else {
      best = all[0] ?? null;
    }

    if (!best) break;

    used.add(best.rec.performance.performance_id);
    const reasons: Reason[] = [...best.rec.reasons];
    if (deliberateWildcard) {
      reasons.push({ text: "Deliberately included for discovery — limited external signal but musically/schedule-wise interesting.", provenance: "system" });
    }
    reasons.push({ text: best.note, provenance: "system" });

    stops.push({
      ...best.rec,
      reasons,
      transitionNote: best.note,
      arrivalNightMinutes: best.nm,
      isFinale: isLastPlanned,
    });
    currentTime = best.nm;
    currentLocation = findLocation(locations, best.rec.performance.location);
    lastCamp = best.rec.performance.camp;
  }

  // The loop plans for targetStops but may run past it if earlier picks were
  // skipped; make sure only the true last stop keeps the finale flag.
  return stops.map((s, i) => ({ ...s, isFinale: i === stops.length - 1 }));
}
