import type { Artist, Performance, PerformanceType } from "../types";

// The RSL extraction never populated performance-level type (it's UNKNOWN on
// every scheduled set) — only artist-level enrichment did. Fall back to what
// we know about the artist generally rather than treating every set as
// type-unknown when we actually have a real signal.
export function resolvePerformanceType(performance: Performance, artist?: Artist): PerformanceType {
  if (performance.performance_type !== "UNKNOWN") return performance.performance_type;
  if (artist && artist.performance_type !== "UNKNOWN") return artist.performance_type;
  return "UNKNOWN";
}
