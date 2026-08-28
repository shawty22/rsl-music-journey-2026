import type { Artist, Location, Performance, ScoredRecommendation, TasteProfile, Taxonomy } from "../types";
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
}

const MIN_GAP_MINUTES = 10; // minimum time between one set ending (approx) and walking to the next
const MAX_STOPS = 8;

function performanceNightMinutes(p: Performance): number | null {
  if (p.set_time_hour24 === null || p.set_time_minute === null) return null;
  return nightMinutesFromHour24(p.set_time_hour24, p.set_time_minute);
}

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

  let currentTime = request.startNightMinutes;
  let currentLocation = findLocation(locations, request.startLocationString);
  let lastCamp: string | null = null;
  const used = new Set<string>();
  const stops: JourneyStop[] = [];

  while (stops.length < MAX_STOPS) {
    let best: { rec: ScoredRecommendation; nm: number; journeyScore: number; note: string } | null = null;

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
        note = `${baseRole === "WILDCARD" || baseRole === "UNKNOWN" ? "Wildcard" : "Good fit"}, ~${dist.estMinutes[0]}-${dist.estMinutes[1]} min walk, starts ${waitMinutes} min after your last stop.`;
      } else {
        note = `Starts ${waitMinutes} min after your last stop. Walk time unknown — RSL location string ("${perf.location ?? "unspecified"}") isn't a walkable clock address.`;
      }

      if (!best || journeyScore > best.journeyScore) {
        best = {
          rec: { performance: perf, artist, role: baseRole, reasons, score },
          nm,
          journeyScore,
          note,
        };
      }
    }

    if (!best) break;

    used.add(best.rec.performance.performance_id);
    stops.push({
      ...best.rec,
      reasons: [...best.rec.reasons, best.note],
      transitionNote: best.note,
      arrivalNightMinutes: best.nm,
    });
    currentTime = best.nm;
    currentLocation = findLocation(locations, best.rec.performance.location);
    lastCamp = best.rec.performance.camp;
  }

  return stops;
}
