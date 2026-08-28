import type { Artist, DiscoveryRole, Performance, Reason, ScoredRecommendation, TasteProfile, TasteReference, Taxonomy } from "../types";
import { resolvePerformanceType } from "./performanceType";

// Transparent, rule-based scoring. Every point added to `score` has a
// matching human-readable reason pushed to `reasons`, each tagged with WHERE
// it came from (user_selected / derived / system) — nothing here is a black
// box, and nothing here fabricates a signal the data doesn't have.

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function overlap(a: string[], b: string[]): string[] {
  const bSet = new Set(b.map(normalize));
  return a.filter((x) => bSet.has(normalize(x)));
}

function reason(text: string, provenance: Reason["provenance"]): Reason {
  return { text, provenance };
}

export interface CandidateScore {
  score: number;
  baseRole: DiscoveryRole;
  reasons: Reason[];
  excluded: boolean;
}

export function scoreCandidate(
  artist: Artist,
  performance: Performance,
  taste: TasteProfile,
  taxonomy: Taxonomy,
  tasteReferencesByName: Map<string, TasteReference> = new Map(),
): CandidateScore {
  const reasons: Reason[] = [];
  let score = 0;

  const avoidHit = overlap(artist.genre_tags, taste.avoid_genres);
  if (avoidHit.length > 0) {
    return { score: -Infinity, baseRole: "UNKNOWN", reasons: [reason(`Excluded: matches avoided genre(s) ${avoidHit.join(", ")}.`, "user_selected")], excluded: true };
  }

  const isFavoriteArtist = taste.favorite_artists.some((fav) => normalize(fav) === normalize(artist.artist));
  if (isFavoriteArtist) {
    score += 50;
    reasons.push(reason(`You added ${artist.artist} as a favorite.`, "user_selected"));
  }

  const genreHits = overlap(artist.genre_tags, taste.favorite_genres);
  if (genreHits.length > 0) {
    score += genreHits.length * 15;
    reasons.push(reason(`You selected: ${genreHits.join(", ")}.`, "user_selected"));
  }

  const styleHits = overlap(artist.style_tags, taste.favorite_styles);
  if (styleHits.length > 0) {
    score += styleHits.length * 10;
    reasons.push(reason(`Matches your favorite style(s): ${styleHits.join(", ")}.`, "user_selected"));
  }

  // Taste-reference artists (favorites not playing RSL 2026) can still
  // inform genre fit via a small curated lookup — always tagged "derived"
  // so it's never confused with something the user explicitly selected.
  let derivedGenreHits: string[] = [];
  let derivedFromArtist: string | null = null;
  for (const fav of taste.favorite_artists) {
    const ref = tasteReferencesByName.get(normalize(fav));
    if (!ref) continue;
    const hits = overlap(artist.genre_tags, ref.genres);
    if (hits.length > 0 && hits.length > derivedGenreHits.length) {
      derivedGenreHits = hits;
      derivedFromArtist = fav;
    }
  }
  if (derivedFromArtist && derivedGenreHits.length > 0) {
    score += derivedGenreHits.length * 9;
    reasons.push(reason(`Derived from ${derivedFromArtist}: similar ${derivedGenreHits.join(", ")}.`, "derived"));
  }

  const bias = taxonomy.electronic_bias_weights;
  const tagsLower = artist.genre_tags.map(normalize);
  if (bias.HIGH?.some((g) => tagsLower.includes(normalize(g)))) {
    score += 12;
    reasons.push(reason("Strong electronic preference match.", "system"));
  } else if (bias.MEDIUM_HIGH?.some((g) => tagsLower.includes(normalize(g)))) {
    score += 8;
    reasons.push(reason("House/techno/progressive — solid electronic fit.", "system"));
  } else if (bias.MEDIUM?.some((g) => tagsLower.includes(normalize(g)))) {
    score += 3;
  }

  if (artist.rsl_recommended) {
    score += 20;
    reasons.push(reason("RSL recommended.", "system"));
  }
  if (artist.bipoc_beats_artist) {
    score += 5;
    reasons.push(reason("BIPOC Beats artist.", "system"));
  }
  if (artist.bipoc_beats_friend) {
    score += 5;
    reasons.push(reason("BIPOC Beats friend of the program.", "system"));
  }

  if (artist.signal_status === "ESTABLISHED") {
    score += 10;
    reasons.push(reason("Established artist with an independent music career.", "system"));
  } else if (artist.signal_status === "EMERGING") {
    score += 6;
    reasons.push(reason("Emerging artist with a real catalogue.", "system"));
  }

  const resolvedType = resolvePerformanceType(performance, artist);
  if (taste.preferred_performance_types.includes(resolvedType)) {
    score += 8;
    reasons.push(reason(`You prefer ${resolvedType} sets.`, "user_selected"));
  }

  const isLiveish = resolvedType === "LIVE" || resolvedType === "HYBRID";
  if (taste.live_hybrid_preference === "seek" && isLiveish) {
    score += 10;
    reasons.push(reason("Live/hybrid set, matching your preference.", "user_selected"));
  } else if (taste.live_hybrid_preference === "avoid" && isLiveish) {
    score -= 10;
  }

  if (taste.major_act_preference === "seek" && artist.signal_status === "ESTABLISHED") {
    score += 5;
  } else if (taste.major_act_preference === "avoid" && artist.signal_status === "ESTABLISHED") {
    score -= 8;
  }

  let baseRole: DiscoveryRole;
  if (isFavoriteArtist || genreHits.length >= 2 || (genreHits.length >= 1 && styleHits.length >= 1)) {
    baseRole = "CORE_MATCH";
  } else if (genreHits.length === 1 || artist.rsl_recommended || artist.signal_status === "ESTABLISHED") {
    baseRole = "ADJACENT";
  } else if (derivedFromArtist || artist.signal_status === "EMERGING" || bias.HIGH?.some((g) => tagsLower.includes(normalize(g)))) {
    baseRole = "ADJACENT";
  } else {
    baseRole = "UNKNOWN";
    if (reasons.length === 0) {
      reasons.push(reason("No taste-profile or signal data yet for this artist — showing up on musical/scheduling fit alone.", "system"));
    }
  }

  return { score, baseRole, reasons, excluded: false };
}

export type DisplayRole = "STRONG_MATCH" | "DISCOVERY" | "WILDCARD";

// Collapses the engine's internal DiscoveryRole (which includes UNKNOWN —
// never shown to users, per "unknown never means bad") into the 3 roles the
// UI actually displays. "Finale" is conveyed as a separate flag/label
// suffix, not a fourth color, so the badge system stays consistent
// everywhere an artist appears.
export function toDisplayRole(role: DiscoveryRole): DisplayRole {
  if (role === "CORE_MATCH" || role === "MAJOR_ACT" || role === "LOCAL_GEM") return "STRONG_MATCH";
  if (role === "ADJACENT") return "DISCOVERY";
  return "WILDCARD"; // WILDCARD and UNKNOWN both read as wildcard to the user
}

export function buildCandidatePool(
  performances: Performance[],
  artistsById: Map<string, Artist>,
  taste: TasteProfile,
  taxonomy: Taxonomy,
  tasteReferencesByName: Map<string, TasteReference> = new Map(),
): ScoredRecommendation[] {
  const pool: ScoredRecommendation[] = [];
  for (const performance of performances) {
    const artist = artistsById.get(performance.artist_id);
    if (!artist) continue;
    const { score, baseRole, reasons, excluded } = scoreCandidate(artist, performance, taste, taxonomy, tasteReferencesByName);
    if (excluded) continue;
    pool.push({ performance, artist, role: baseRole, reasons, score });
  }
  return pool.sort((a, b) => b.score - a.score);
}

// Selects `count` recommendations from a scored pool honoring the
// CORE_MATCH / ADJACENT / WILDCARD discovery mix. Items pulled from the
// UNKNOWN pool specifically to fill the wildcard quota are relabeled
// WILDCARD with an explicit reason, matching the product's discovery roles.
export function applyDiscoveryMix(pool: ScoredRecommendation[], taxonomy: Taxonomy, taste: TasteProfile, count: number): ScoredRecommendation[] {
  const core = pool.filter((p) => p.role === "CORE_MATCH" || p.role === "MAJOR_ACT" || p.role === "LOCAL_GEM");
  const adjacent = pool.filter((p) => p.role === "ADJACENT");
  const unknown = pool.filter((p) => p.role === "UNKNOWN");

  const discoveryBoost = taste.discovery_level;
  const wildcardBoost = taste.wildcard_level;
  const weights = taxonomy.discovery_mix_defaults;

  const wildcardShare = Math.min(0.6, weights.wildcard_weight + wildcardBoost);
  const adjacentShare = Math.min(0.7, weights.adjacent_weight + discoveryBoost);
  const coreShare = Math.max(0, 1 - wildcardShare - adjacentShare);

  const nCore = Math.round(count * coreShare);
  const nAdjacent = Math.round(count * adjacentShare);
  const nWildcard = Math.max(0, count - nCore - nAdjacent);

  const picked: ScoredRecommendation[] = [];
  picked.push(...core.slice(0, nCore));
  picked.push(...adjacent.slice(0, nAdjacent));

  const wildcardPicks = unknown.slice(0, nWildcard).map((rec) => ({
    ...rec,
    role: "WILDCARD" as DiscoveryRole,
    reasons: [...rec.reasons, reason("Deliberately included for discovery — limited external signal but musically/schedule-wise interesting.", "system")],
  }));
  picked.push(...wildcardPicks);

  // Backfill if any bucket came up short.
  if (picked.length < count) {
    const used = new Set(picked.map((p) => p.performance.performance_id));
    for (const rec of [...adjacent, ...core, ...unknown]) {
      if (picked.length >= count) break;
      if (used.has(rec.performance.performance_id)) continue;
      picked.push(rec);
      used.add(rec.performance.performance_id);
    }
  }

  return picked.slice(0, count);
}
