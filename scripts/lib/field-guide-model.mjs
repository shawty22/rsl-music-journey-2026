// Shared data model for the BMRI 2026 Music Field Guide — built once here so
// the HTML/PDF generator and the EPUB generator produce IDENTICAL content
// and pagination logic from the same source data. Nothing here invents a
// fact: every field comes straight from data/normalized/*.json.

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const DAY_ORDER = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_LABEL = { SUN: "Sunday", MON: "Monday", TUE: "Tuesday", WED: "Wednesday", THU: "Thursday", FRI: "Friday", SAT: "Saturday" };
// Real, verified Burning Man 2026 dates (burningman.org: Aug 30 - Sep 7).
const DAY_DATE = { SUN: "Aug 30", MON: "Aug 31", TUE: "Sep 1", WED: "Sep 2", THU: "Sep 3", FRI: "Sep 4", SAT: "Sep 5" };

const PERF_TYPE_LABEL = { DJ: "DJ", LIVE: "Live", HYBRID: "Hybrid", B2B: "B2B", LIVE_BAND: "Live Band", VOCALIST: "Vocalist", PERFORMANCE_MULTIMEDIA: "Multimedia", UNKNOWN: "Unknown" };

// Photos were sourced automatically from public profiles (SoundCloud/Bandcamp/
// website avatars), not hand-verified against a confirmed identity photo for
// every artist. These were flagged as lower-confidence by the sourcing pass
// itself, or reported wrong by a human — surfaced honestly rather than
// presented as certain. Add to this list any time a mismatch is found.
const FLAGGED_IMAGES = {
  "black-panda": "Reported by a human reviewer as a possible photo mismatch — please verify before relying on it.",
  "major-trouble": "Source photo shows the artist from behind in one image; face match to the SoundCloud avatar used here is reasonably but not certainly confirmed.",
  philou: "No direct profile link in the source data — matched by city (Amsterdam) to a same-named DJ; identity not independently confirmed.",
  "lost-desert": "Artist's own promotional image, but a stylized shot with the face obscured — not a clean identity photo.",
  "natascha-polke": "Original avatar was album-cover art rather than a portrait; swapped for a profile photo, not independently cross-verified.",
  "dj-zip-disk": "Source account username doesn't match the stage name; matched via page title and regional event history only.",
  "niall-augustine": "Only a very low-resolution (100x100) avatar was found; likely correct but image quality is poor.",
  vozhd: "Image is stylized cover art with a text overlay, not a clean portrait.",
};

export function imageFlagFor(artistId) {
  return FLAGGED_IMAGES[artistId] || null;
}

function nightMinutesFromHour24(hour24, minute) {
  const base = hour24 * 60 + minute;
  return hour24 < 12 ? base + 24 * 60 : base;
}

export function tier(a) {
  return (a.signal_status || "").toUpperCase() === "UNKNOWN" ? "UNKNOWN" : (a.signal_status || "").toUpperCase();
}
export function aboutText(a) {
  return a.bio || null;
}
export function discoveryText(a) {
  return [a.discovery_note, a.catalogue_signal, a.external_signal].filter(Boolean).join(" ") || null;
}
export function geoLine(a) {
  const parts = [a.city, a.state_region, a.country].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}
export function perfType(a) {
  return PERF_TYPE_LABEL[a.performance_type] || "Unknown";
}

// A short, honest "why look" line built ONLY from real fields — genre,
// geography, signal status, career stage, RSL flags. Not a rewrite of the
// bio; a distinct, template-composed discovery blurb, matching the editorial
// examples in the brief without inventing anything new.
function sentence(s) {
  if (!s) return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  const capitalized = trimmed[0].toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : capitalized + ".";
}

export function whyInteresting(a) {
  const bits = [];
  const geo = geoLine(a);
  const t = tier(a);
  const genrePhrase = a.genre_tags?.length ? a.genre_tags.slice(0, 2).join(" and ") : null;

  if (t === "ESTABLISHED") {
    bits.push(`${geo ? geo + "-based" : "An"} established artist${genrePhrase ? ` working in ${genrePhrase}` : ""}, with a documented independent catalogue.`);
  } else if (t === "EMERGING") {
    bits.push(`${geo ? geo + "-based" : "An"} emerging ${genrePhrase ? genrePhrase + " " : ""}artist with a real, smaller catalogue — worth catching before the room fills up.`);
  } else {
    bits.push(`No external signal found yet for this artist${genrePhrase ? ` beyond a ${genrePhrase} lean` : ""} — undocumented, not unremarkable.`);
  }
  if (a.rsl_recommended) bits.push("RSL-recommended in the 2026 guide.");
  if (a.career_stage) bits.push(sentence(a.career_stage));
  if (a.discovery_character) bits.push(sentence(a.discovery_character));
  const disc = discoveryText(a);
  if (disc && !a.bio) bits.push(sentence(disc));
  return bits.filter(Boolean).join(" ");
}

export function loadModel(rootDir, imagesDir) {
  const dataDir = path.join(rootDir, "data", "normalized");
  const artists = JSON.parse(readFileSync(path.join(dataDir, "artists.json"), "utf8"));
  const performances = JSON.parse(readFileSync(path.join(dataDir, "performances.json"), "utf8"));

  const artistById = new Map(artists.map((a) => [a.artist_id, a]));

  // Dedupe RSL rows flagged as likely duplicate listings of the same set.
  const seenKeys = new Set();
  const perfs = performances.filter((p) => {
    const key = p.is_possible_duplicate ? `${p.artist_id}__${p.day_start}__${p.set_time_raw}__${p.camp}` : p.performance_id;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });

  const established = artists.filter((a) => tier(a) === "ESTABLISHED").sort((a, b) => a.artist.localeCompare(b.artist));
  const emerging = artists.filter((a) => tier(a) === "EMERGING").sort((a, b) => a.artist.localeCompare(b.artist));
  const primaryIds = new Set([...established, ...emerging].map((a) => a.artist_id));
  const wildcards = artists
    .filter((a) => tier(a) === "UNKNOWN" && (a.bio || a.discovery_note || a.catalogue_signal))
    .sort((a, b) => a.artist.localeCompare(b.artist));

  // Every Established/Emerging performance, in real chronological (day,
  // then time) order.
  const relevantPerfs = perfs.filter((p) => primaryIds.has(p.artist_id) && p.set_time_valid && p.set_time_hour24 !== null);
  relevantPerfs.sort((a, b) => {
    const da = DAY_ORDER.indexOf(a.day_start);
    const db = DAY_ORDER.indexOf(b.day_start);
    if (da !== db) return (da === -1 ? 99 : da) - (db === -1 ? 99 : db);
    return (a.global_sort_key ?? 0) - (b.global_sort_key ?? 0);
  });

  // First chronological appearance per artist gets the full entry; every
  // later one is a compact back-reference. One flat, book-wide anchor id
  // per artist so every reference (day timeline, indexes) points the same place.
  const anchorId = (artistId) => `artist-${artistId}`;
  const primaryPerfIdByArtist = new Map();
  for (const p of relevantPerfs) {
    if (!primaryPerfIdByArtist.has(p.artist_id)) primaryPerfIdByArtist.set(p.artist_id, p.performance_id);
  }

  function imageFor(artistId) {
    const rel = `images/artists/${artistId}.jpg`;
    const abs = path.join(imagesDir, `${artistId}.jpg`);
    return existsSync(abs) ? rel : null;
  }

  // Build per-day structure.
  const daysPresent = [...new Set(relevantPerfs.map((p) => p.day_start))].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));

  const days = daysPresent.map((day) => {
    const dayPerfs = relevantPerfs.filter((p) => p.day_start === day);

    // Group into time slots (exact same night-minute value).
    const slotMap = new Map();
    for (const p of dayPerfs) {
      const nm = nightMinutesFromHour24(p.set_time_hour24, p.set_time_minute ?? 0);
      if (!slotMap.has(nm)) slotMap.set(nm, []);
      slotMap.get(nm).push(p);
    }
    const slots = [...slotMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([nm, list]) => ({
        nightMinutes: nm,
        timeLabel: list[0].set_time_raw,
        performances: list.map((p) => {
          const a = artistById.get(p.artist_id);
          const isPrimary = primaryPerfIdByArtist.get(p.artist_id) === p.performance_id;
          return { performance: p, artist: a, isPrimary, anchor: anchorId(p.artist_id) };
        }),
      }));

    // Day-at-a-glance: dominant genres, established highlights, emerging
    // discoveries, wildcards playing that day — all real, counted from data.
    const genreCounts = new Map();
    for (const p of dayPerfs) {
      const a = artistById.get(p.artist_id);
      for (const g of a?.genre_tags ?? []) genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
    }
    const dominantGenres = [...genreCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([g]) => g);
    const establishedHighlights = [...new Set(dayPerfs.filter((p) => tier(artistById.get(p.artist_id)) === "ESTABLISHED").map((p) => artistById.get(p.artist_id).artist))];
    const emergingDiscoveries = [...new Set(dayPerfs.filter((p) => tier(artistById.get(p.artist_id)) === "EMERGING").map((p) => artistById.get(p.artist_id).artist))];
    const wildcardIds = new Set(wildcards.map((w) => w.artist_id));
    const wildcardsToday = [...new Set(perfs.filter((p) => p.day_start === day && wildcardIds.has(p.artist_id)).map((p) => p.artist_id))].map((id) => artistById.get(id).artist);

    const quickRef = dayPerfs
      .slice()
      .sort((a, b) => (a.global_sort_key ?? 0) - (b.global_sort_key ?? 0))
      .map((p) => {
        const a = artistById.get(p.artist_id);
        return {
          time: p.set_time_raw,
          artist: a.artist,
          anchor: anchorId(a.artist_id),
          style: a.genre_tags?.[0] || "—",
          signal: tier(a),
          type: perfType(a),
          camp: p.camp,
          location: p.location || "—",
        };
      });

    return { day, label: DAY_LABEL[day], date: DAY_DATE[day], dominantGenres, establishedHighlights, emergingDiscoveries, wildcardsToday, quickRef, slots };
  });

  // Genre index across established+emerging.
  const genreIndex = new Map();
  for (const a of [...established, ...emerging]) {
    for (const g of a.genre_tags?.length ? a.genre_tags : ["Genre not yet tagged"]) {
      if (!genreIndex.has(g)) genreIndex.set(g, []);
      genreIndex.get(g).push(a);
    }
  }

  return { artists, artistById, perfs, established, emerging, wildcards, days, genreIndex, anchorId, imageFor };
}

export { DAY_ORDER, DAY_LABEL, DAY_DATE, PERF_TYPE_LABEL, FLAGGED_IMAGES };
