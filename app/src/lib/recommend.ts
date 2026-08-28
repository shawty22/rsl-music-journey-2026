import type { Artist, DiscoveryRole, Performance, ScoredRecommendation, TasteProfile, Taxonomy } from "../types";

// Transparent, rule-based scoring. Every point added to `score` has a
// matching human-readable reason pushed to `reasons` — nothing here is a
// black box, and nothing here fabricates a signal the data doesn't have.
// Given the current seed dataset has 0% enrichment (no genre_tags,
// signal_status is "unknown" for every artist), most non-favorite artists
// will legitimately score as UNKNOWN/WILDCARD today. That's correct
// behavior, not a bug — it should change automatically as enrichment lands.

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function overlap(a: string[], b: string[]): string[] {
  const bSet = new Set(b.map(normalize));
  return a.filter((x) => bSet.has(normalize(x)));
}

export interface CandidateScore {
  score: number;
  baseRole: DiscoveryRole;
  reasons: string[];
  excluded: boolean;
}

export function scoreCandidate(artist: Artist, performance: Performance, taste: TasteProfile, taxonomy: Taxonomy): CandidateScore {
  const reasons: string[] = [];
  let score = 0;

  const avoidHit = overlap(artist.genre_tags, taste.avoid_genres);
  if (avoidHit.length > 0) {
    return { score: -Infinity, baseRole: "UNKNOWN", reasons: [`Excluded: matches avoided genre(s) ${avoidHit.join(", ")}.`], excluded: true };
  }

  const isFavoriteArtist = taste.favorite_artists.some((fav) => normalize(fav) === normalize(artist.artist));
  if (isFavoriteArtist) {
    score += 50;
    reasons.push(`${artist.artist} is one of your favorite artists.`);
  }

  const genreHits = overlap(artist.genre_tags, taste.favorite_genres);
  if (genreHits.length > 0) {
    score += genreHits.length * 15;
    reasons.push(`Matches your favorite genre(s): ${genreHits.join(", ")}.`);
  }

  const styleHits = overlap(artist.style_tags, taste.favorite_styles);
  if (styleHits.length > 0) {
    score += styleHits.length * 10;
    reasons.push(`Matches your favorite style(s): ${styleHits.join(", ")}.`);
  }

  const bias = taxonomy.electronic_bias_weights;
  const tagsLower = artist.genre_tags.map(normalize);
  if (bias.HIGH?.some((g) => tagsLower.includes(normalize(g)))) {
    score += 12;
    reasons.push("Strong electronic preference match.");
  } else if (bias.MEDIUM_HIGH?.some((g) => tagsLower.includes(normalize(g)))) {
    score += 8;
    reasons.push("House/techno/progressive — solid electronic fit.");
  } else if (bias.MEDIUM?.some((g) => tagsLower.includes(normalize(g)))) {
    score += 3;
  }

  if (artist.rsl_recommended) {
    score += 20;
    reasons.push("RSL recommended.");
  }
  if (artist.bipoc_beats_artist) {
    score += 5;
    reasons.push("BIPOC Beats artist.");
  }
  if (artist.bipoc_beats_friend) {
    score += 5;
    reasons.push("BIPOC Beats friend of the program.");
  }

  if (artist.signal_status === "ESTABLISHED") {
    score += 10;
    reasons.push("Established artist with an independent music career.");
  } else if (artist.signal_status === "EMERGING") {
    score += 6;
    reasons.push("Emerging artist with a real catalogue.");
  }

  if (taste.preferred_performance_types.includes(performance.performance_type)) {
    score += 8;
    reasons.push(`Matches your preferred performance type (${performance.performance_type}).`);
  }

  const isLiveish = performance.performance_type === "LIVE" || performance.performance_type === "HYBRID";
  if (taste.live_hybrid_preference === "seek" && isLiveish) {
    score += 10;
    reasons.push("Live/hybrid set, matching your preference.");
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
  } else if (artist.signal_status === "EMERGING" || bias.HIGH?.some((g) => tagsLower.includes(normalize(g)))) {
    baseRole = "ADJACENT";
  } else {
    baseRole = "UNKNOWN";
    if (reasons.length === 0) {
      reasons.push("No taste-profile or signal data yet for this artist — showing up on musical/scheduling fit alone.");
    }
  }

  return { score, baseRole, reasons, excluded: false };
}

export function buildCandidatePool(
  performances: Performance[],
  artistsById: Map<string, Artist>,
  taste: TasteProfile,
  taxonomy: Taxonomy,
): ScoredRecommendation[] {
  const pool: ScoredRecommendation[] = [];
  for (const performance of performances) {
    const artist = artistsById.get(performance.artist_id);
    if (!artist) continue;
    const { score, baseRole, reasons, excluded } = scoreCandidate(artist, performance, taste, taxonomy);
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
    reasons: [...rec.reasons, "Wildcard: deliberately included for discovery — limited external signal but musically/schedule-wise interesting."],
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
