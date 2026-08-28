#!/usr/bin/env node
// Merges data/enrichment/pilot/batch-*.json enrichment results into
// data/normalized/artists.json (matched by artist_id), then re-copies the
// updated file into app/public/data/ for the app to pick up.

import { readFileSync, writeFileSync, readdirSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PILOT_DIR = path.join(ROOT, "data", "enrichment", "pilot");
const ARTISTS_PATH = path.join(ROOT, "data", "normalized", "artists.json");

const artists = JSON.parse(readFileSync(ARTISTS_PATH, "utf-8"));
const artistsById = new Map(artists.map((a) => [a.artist_id, a]));

const batchFiles = readdirSync(PILOT_DIR).filter((f) => /^batch-\d+\.json$/.test(f)).sort();
console.log("Found batches:", batchFiles);

let merged = 0;
let missing = [];
const tierCounts = { ESTABLISHED: 0, EMERGING: 0, UNKNOWN: 0 };

for (const file of batchFiles) {
  const records = JSON.parse(readFileSync(path.join(PILOT_DIR, file), "utf-8"));
  for (const r of records) {
    const existing = artistsById.get(r.artist_id);
    if (!existing) {
      missing.push(r.artist_id);
      continue;
    }
    existing.genre_tags = r.genre_tags ?? [];
    existing.style_tags = r.style_tags ?? [];
    existing.performance_type = r.performance_type ?? "UNKNOWN";
    existing.artist_type = r.artist_type ?? existing.artist_type;
    existing.country = r.country ?? null;
    existing.state_region = r.state_region ?? null;
    existing.city = r.city ?? null;
    existing.gender_identity = r.gender_identity ?? "Unknown";
    existing.career_stage = r.career_stage ?? null;
    existing.signal_status = r.signal_status ?? "unknown";
    existing.spotify_found = r.spotify_found ? "yes" : "no";
    existing.soundcloud_found = r.soundcloud_found ? "yes" : "no";
    existing.bandcamp_found = r.bandcamp_found ? "yes" : "no";
    existing.apple_music_found = r.apple_music_found ? "yes" : "no";
    existing.spotify_url = r.spotify_url ?? null;
    existing.soundcloud_url = r.soundcloud_url ?? null;
    existing.bandcamp_url = r.bandcamp_url ?? null;
    existing.apple_music_url = r.apple_music_url ?? null;
    existing.website = r.website ?? null;
    existing.catalogue_signal = r.catalogue_signal ?? null;
    existing.external_signal = r.external_signal ?? null;
    existing.discovery_character = r.discovery_character ?? null;
    existing.discovery_note = r.discovery_note ?? null;
    existing.research_confidence = "pilot-pass";
    existing.sources = r.sources ?? [];
    existing.last_verified = r.last_verified ?? null;

    if (tierCounts[r.signal_status] !== undefined) tierCounts[r.signal_status]++;
    merged++;
  }
}

writeFileSync(ARTISTS_PATH, JSON.stringify(artists, null, 2));
copyFileSync(ARTISTS_PATH, path.join(ROOT, "app", "public", "data", "artists.json"));

console.log(`Merged ${merged} artist records.`);
console.log("Tier distribution:", tierCounts);
if (missing.length) console.log("WARNING - artist_id not found in artists.json:", missing);
