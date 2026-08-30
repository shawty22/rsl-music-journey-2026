#!/usr/bin/env node
// Normalizes the raw RSL 2026 extraction seed into the interface-independent
// data layer: data/normalized/{artists,performances,locations,taxonomy,metadata}.json
//
// Source of truth for schedule facts is the RSL 2026 PDF; this script only
// reshapes the already-extracted seed (data/source/rsl_2026_music_intelligence.json).
// It does not invent facts — anything not present in the source is left null
// and flagged, never guessed.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "data", "source", "rsl_2026_music_intelligence.json");
const OUT_DIR = path.join(ROOT, "data", "normalized");

mkdirSync(OUT_DIR, { recursive: true });

const raw = JSON.parse(readFileSync(SRC, "utf-8"));

const DAY_ORDER = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseDayRange(dayRaw) {
  // e.g. "THU PM — FRI AM" -> { day_start: "THU", day_end: "FRI", raw }
  const parts = String(dayRaw || "").split(/\s*[—–-]\s*/);
  const startTok = (parts[0] || "").trim().split(/\s+/)[0] || null;
  const endTok = (parts[1] || "").trim().split(/\s+/)[0] || null;
  return {
    day_start: startTok && DAY_ORDER[startTok] !== undefined ? startTok : null,
    day_end: endTok && DAY_ORDER[endTok] !== undefined ? endTok : null,
    raw: dayRaw || null,
  };
}

function parseSetTime(setTimeRaw) {
  // e.g. "10:30pm", "12am", "6am"
  const m = String(setTimeRaw || "")
    .trim()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (!m) return { hour24: null, minute: null, valid: false, raw: setTimeRaw || null };
  let hour = parseInt(m[1], 10);
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  const mer = m[3].toLowerCase();
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
    return { hour24: null, minute: null, valid: false, raw: setTimeRaw || null };
  }
  let hour24;
  if (mer === "pm") hour24 = hour === 12 ? 12 : hour + 12;
  else hour24 = hour === 12 ? 0 : hour;
  return { hour24, minute, valid: true, raw: setTimeRaw || null };
}

function nightSortMinutes(hour24, minute) {
  // Continuous ordering across a PM->AM overnight block, anchored at noon.
  // AM hours (post-midnight) sort after all PM hours of the same day_start.
  if (hour24 === null) return null;
  const base = hour24 * 60 + minute;
  return hour24 < 12 ? base + 24 * 60 : base;
}

// ---------- Artists ----------

const artistIdByNormalized = new Map();
const artists = raw.artists.map((a) => {
  const id = slugify(a.artist_normalized || a.artist);
  artistIdByNormalized.set(a.artist_normalized, id);
  return {
    artist_id: id,
    artist: a.artist,
    artist_normalized: a.artist_normalized,
    appearance_count: a.appearance_count ?? null,

    artist_type: a.artist_type || null,
    gender_identity: a.gender_identity || null,
    country: a.country || null,
    state_region: a.state_region || null,
    city: a.city || null,
    origin_type: a.origin_type || null,
    current_base: a.current_base || null,
    home_scene: a.home_scene || null,

    genre_tags: a.genre_tags ? a.genre_tags.split(/[,;]\s*/).filter(Boolean) : [],
    style_tags: a.style_tags ? a.style_tags.split(/[,;]\s*/).filter(Boolean) : [],
    performance_type: a.performance_type || "UNKNOWN",
    instruments: a.instruments ? a.instruments.split(/[,;]\s*/).filter(Boolean) : [],
    languages: a.languages ? a.languages.split(/[,;]\s*/).filter(Boolean) : [],

    career_stage: a.career_stage || null,
    labels: a.labels || null,
    notable_releases: a.notable_releases || null,
    notable_collaborations: a.notable_collaborations || null,

    signal_status: a.signal_status || "unknown",
    spotify_found: a.spotify_found || null,
    soundcloud_found: a.soundcloud_found || null,
    bandcamp_found: a.bandcamp_found || null,
    apple_music_found: a.apple_music_found || null,
    catalogue_signal: a.catalogue_signal || null,
    external_signal: a.external_signal || null,

    website: a.website || null,
    spotify_url: a.spotify_url || null,
    soundcloud_url: a.soundcloud_url || null,
    bandcamp_url: a.bandcamp_url || null,
    apple_music_url: a.apple_music_url || null,

    rsl_recommended: false,
    bipoc_beats_artist: false,
    bipoc_beats_friend: false,
    live_music_stage: false,
    mutant_vehicle: false,
    wheelchair_friendly: false,

    camp_affiliations: [],
    burning_man_history: null,

    discovery_character: a.discovery_character || null,
    discovery_note: a.discovery_note || null,

    research_confidence: "unverified",
    sources: a.sources ? [a.sources] : [],
    last_verified: a.last_verified || null,
  };
});

// ---------- Performances ----------

const perfIdCounts = new Map();
const dupTupleCounts = new Map();
for (const p of raw.performances) {
  const key = [p.artist_normalized, p.day, p.set_time, p.camp].join("||");
  dupTupleCounts.set(key, (dupTupleCounts.get(key) || 0) + 1);
}
const dupTupleSeen = new Map();

const performances = raw.performances.map((p) => {
  const artist_id = artistIdByNormalized.get(p.artist_normalized) || slugify(p.artist_normalized);
  const dayParsed = parseDayRange(p.day);
  const timeParsed = parseSetTime(p.set_time);
  const sortMinutes = nightSortMinutes(timeParsed.hour24, timeParsed.minute);
  const dayOrder = dayParsed.day_start !== null ? DAY_ORDER[dayParsed.day_start] : null;
  const global_sort_key = dayOrder !== null && sortMinutes !== null ? dayOrder * 100000 + sortMinutes : null;

  const baseId = `${artist_id}__${slugify(dayParsed.raw)}__${slugify(p.set_time)}`;
  const n = (perfIdCounts.get(baseId) || 0) + 1;
  perfIdCounts.set(baseId, n);
  const performance_id = n > 1 ? `${baseId}__${n}` : baseId;

  const dupKey = [p.artist_normalized, p.day, p.set_time, p.camp].join("||");
  const dupTotal = dupTupleCounts.get(dupKey) || 1;
  const dupIndex = (dupTupleSeen.get(dupKey) || 0) + 1;
  dupTupleSeen.set(dupKey, dupIndex);

  return {
    performance_id,
    artist_id,
    artist_display_name: p.artist,

    day_raw: p.day,
    day_start: dayParsed.day_start,
    day_end: dayParsed.day_end,

    set_time_raw: p.set_time,
    set_time_valid: timeParsed.valid,
    set_time_hour24: timeParsed.hour24,
    set_time_minute: timeParsed.minute,
    global_sort_key,

    overall_event_time: p.overall_event_time || null,

    camp: p.camp,
    event: null,
    theme: p.event_theme || null,
    location: p.location || null,
    stage: null,

    performance_type: p.performance_type || "UNKNOWN",

    rsl_flags: p.rsl_flags ? p.rsl_flags.split(/[,;]\s*/).filter(Boolean) : [],

    source_page: p.source_page ?? null,
    source_text: null,

    is_possible_duplicate: dupTotal > 1,
    duplicate_group_size: dupTotal > 1 ? dupTotal : null,
  };
});

// ---------- Locations ----------
// No coordinates are invented. We only preserve distinct location strings
// seen in the source and classify their string shape.

// Clock and street appear in either order in the source data ("3:00 & E" and
// "Esplanade & 5:45" are both real, common formats — not a typo to special-
// case away), and street codes aren't always a single letter (e.g. "ESP").
const ADDR_RE_CLOCK_FIRST = /^(\d{1,2}:\d{2})\s*&\s*([A-Za-z]+)$/;
const ADDR_RE_STREET_FIRST = /^([A-Za-z]+)\s*&\s*(\d{1,2}:\d{2})$/;
function parseAddressComponents(raw) {
  const s = raw.trim();
  const clockFirst = s.match(ADDR_RE_CLOCK_FIRST);
  if (clockFirst) return { clock: clockFirst[1], street: clockFirst[2] };
  const streetFirst = s.match(ADDR_RE_STREET_FIRST);
  if (streetFirst) return { clock: streetFirst[2], street: streetFirst[1] };
  return null;
}
const locMap = new Map();
for (const p of performances) {
  const loc = p.location;
  if (!loc) continue;
  if (!locMap.has(loc)) {
    const components = parseAddressComponents(loc);
    locMap.set(loc, {
      location_string: loc,
      normalized_location: loc.trim().toUpperCase(),
      address_components: components,
      latitude: null,
      longitude: null,
      location_type: components ? "clock_address" : /deep playa/i.test(loc) ? "deep_playa" : "named_area",
      performance_count: 0,
    });
  }
  locMap.get(loc).performance_count += 1;
}
const locations = Array.from(locMap.values()).sort((a, b) => b.performance_count - a.performance_count);

// ---------- Taxonomy ----------

const taxonomy = {
  genre_tags: [
    "organic electronic", "global bass", "downtempo", "glitch-hop", "melodic house",
    "progressive house", "techno", "tech house", "bass house", "experimental electronic",
    "psychedelic", "live electronic", "world fusion", "dubstep", "drum and bass",
    "acid", "psytechno", "disco", "funk", "hip-hop", "ambient",
  ],
  performance_types: ["DJ", "LIVE", "HYBRID", "B2B", "LIVE_BAND", "VOCALIST", "PERFORMANCE_MULTIMEDIA", "UNKNOWN"],
  signal_tiers: ["ESTABLISHED", "EMERGING", "UNKNOWN"],
  discovery_roles: ["CORE_MATCH", "ADJACENT", "WILDCARD", "MAJOR_ACT", "LOCAL_GEM", "UNKNOWN"],
  gender_identities: ["Female", "Male", "Non-binary / gender diverse", "Group / mixed", "Unknown"],
  rsl_flags: ["wheelchair_friendly", "live_music_stage", "mutant_vehicle", "rsl_recommended", "bipoc_beats_artist", "bipoc_beats_friend"],
  electronic_bias_weights: {
    HIGH: ["electronic", "experimental", "global bass", "organic", "live electronic", "hybrid", "psychedelic"],
    MEDIUM_HIGH: ["house", "techno", "progressive"],
    MEDIUM: ["major EDM"],
    LOWER: ["non-electronic"],
  },
  discovery_mix_defaults: {
    strong_match_weight: 0.7,
    adjacent_weight: 0.2,
    wildcard_weight: 0.1,
  },
};

// ---------- Metadata ----------

const metadata = {
  dataset_version: "2026.1.0-seed",
  source: "RSL 2026 PDF (data/source/RSL2026spread(1).pdf) via extraction seed",
  generated_at: new Date().toISOString(),
  record_count: performances.length,
  artist_count: artists.length,
  camp_count: new Set(performances.map((p) => p.camp)).size,
  enrichment_status: "unenriched — all artist intelligence fields pending Phase 2 enrichment",
};

writeFileSync(path.join(OUT_DIR, "artists.json"), JSON.stringify(artists, null, 2));
writeFileSync(path.join(OUT_DIR, "performances.json"), JSON.stringify(performances, null, 2));
writeFileSync(path.join(OUT_DIR, "locations.json"), JSON.stringify(locations, null, 2));
writeFileSync(path.join(OUT_DIR, "taxonomy.json"), JSON.stringify(taxonomy, null, 2));
writeFileSync(path.join(OUT_DIR, "metadata.json"), JSON.stringify(metadata, null, 2));

console.log(`Wrote ${artists.length} artists, ${performances.length} performances, ${locations.length} locations to ${OUT_DIR}`);
