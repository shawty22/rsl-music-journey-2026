import type { Location } from "../types";

// Approximate, non-authoritative distance between two Black Rock City
// "clock & street" addresses. We do NOT have real coordinates for 2026
// street rings, so this deliberately stays qualitative: a relative sense of
// how far apart two addresses are, not GPS-accurate meters. Per the product
// spec, unknown/non-address locations (deep playa, named camps without a
// clock address) are never assigned invented coordinates.

const RING_LETTERS = "ABCDEFGHIJKLMNOP".split("");
const RING_SPACING_FT = 250; // rough block depth, approximate
const ESPLANADE_RADIUS_FT = 2500; // rough, approximate

function clockToAngleDeg(clock: string): number | null {
  const m = clock.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10) % 12;
  const min = parseInt(m[2], 10);
  return ((h + min / 60) / 12) * 360;
}

function ringRadiusFt(letter: string): number | null {
  const idx = RING_LETTERS.indexOf(letter.trim().toUpperCase());
  if (idx === -1) return null;
  return ESPLANADE_RADIUS_FT + idx * RING_SPACING_FT;
}

export interface DistanceEstimate {
  category: "same_spot" | "very_close" | "short_walk" | "moderate_walk" | "far_walk" | "unknown";
  estMinutes: [number, number] | null;
  confidence: "approximate" | "none";
}

const WALK_FT_PER_MIN = 250; // rough average walking pace on playa terrain

export function estimateDistance(a: Location | null, b: Location | null): DistanceEstimate {
  if (!a || !b) return { category: "unknown", estMinutes: null, confidence: "none" };
  if (a.location_string === b.location_string) return { category: "same_spot", estMinutes: [0, 2], confidence: "approximate" };
  if (!a.address_components || !b.address_components) {
    return { category: "unknown", estMinutes: null, confidence: "none" };
  }

  const angleA = clockToAngleDeg(a.address_components.clock);
  const angleB = clockToAngleDeg(b.address_components.clock);
  const radiusA = ringRadiusFt(a.address_components.street);
  const radiusB = ringRadiusFt(b.address_components.street);

  if (angleA === null || angleB === null || radiusA === null || radiusB === null) {
    return { category: "unknown", estMinutes: null, confidence: "none" };
  }

  let angleDiff = Math.abs(angleA - angleB);
  if (angleDiff > 180) angleDiff = 360 - angleDiff;
  const avgRadius = (radiusA + radiusB) / 2;
  const arcFt = (angleDiff * Math.PI) / 180 * avgRadius;
  const radialFt = Math.abs(radiusA - radiusB);
  const approxFt = Math.sqrt(arcFt * arcFt + radialFt * radialFt);

  const minutes = approxFt / WALK_FT_PER_MIN;
  const low = Math.max(1, Math.round(minutes * 0.7));
  const high = Math.round(minutes * 1.3) + 1;

  let category: DistanceEstimate["category"] = "far_walk";
  if (approxFt < 300) category = "very_close";
  else if (approxFt < 900) category = "short_walk";
  else if (approxFt < 2000) category = "moderate_walk";

  return { category, estMinutes: [low, high], confidence: "approximate" };
}

export function findLocation(locations: Location[], locationString: string | null): Location | null {
  if (!locationString) return null;
  return locations.find((l) => l.location_string === locationString) ?? null;
}
