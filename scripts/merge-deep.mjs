#!/usr/bin/env node
// Merges data/enrichment/deep/output/batch-*.json into data/normalized/artists.json.
// This is an ADDITIVE deepening pass over artists already classified
// ESTABLISHED/EMERGING — it fills in bio/notable/geography/link fields
// without touching signal_status, genre_tags, or anything the shallow pass
// already set (unless this pass found something the shallow pass missed).

import { readFileSync, writeFileSync, readdirSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "data", "enrichment", "deep", "output");
const ARTISTS_PATH = path.join(ROOT, "data", "normalized", "artists.json");

const artists = JSON.parse(readFileSync(ARTISTS_PATH, "utf-8"));
const artistsById = new Map(artists.map((a) => [a.artist_id, a]));

const batchFiles = readdirSync(OUT_DIR)
  .filter((f) => /^batch-\d+\.json$/.test(f))
  .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));
console.log("Found batches:", batchFiles.length);

let merged = 0;
let missing = [];

for (const file of batchFiles) {
  const records = JSON.parse(readFileSync(path.join(OUT_DIR, file), "utf-8"));
  for (const r of records) {
    const existing = artistsById.get(r.artist_id);
    if (!existing) {
      missing.push(r.artist_id);
      continue;
    }
    if (r.bio) existing.bio = r.bio;
    if (r.notable_releases) existing.notable_releases = r.notable_releases;
    if (r.labels) existing.labels = r.labels;
    if (r.notable_collaborations) existing.notable_collaborations = r.notable_collaborations;
    if (r.burning_man_history) existing.burning_man_history = r.burning_man_history;
    if (r.camp_affiliations && r.camp_affiliations.length) existing.camp_affiliations = r.camp_affiliations;
    if (r.country && !existing.country) existing.country = r.country;
    if (r.state_region && !existing.state_region) existing.state_region = r.state_region;
    if (r.city && !existing.city) existing.city = r.city;
    if (r.website && !existing.website) existing.website = r.website;
    if (r.spotify_url && !existing.spotify_url) existing.spotify_url = r.spotify_url;
    if (r.soundcloud_url && !existing.soundcloud_url) existing.soundcloud_url = r.soundcloud_url;
    if (r.bandcamp_url && !existing.bandcamp_url) existing.bandcamp_url = r.bandcamp_url;
    if (r.apple_music_url && !existing.apple_music_url) existing.apple_music_url = r.apple_music_url;
    if (r.additional_sources && r.additional_sources.length) {
      existing.sources = Array.from(new Set([...(existing.sources || []), ...r.additional_sources]));
    }
    existing.research_confidence = "deep-pass";
    existing.last_verified = r.last_verified ?? existing.last_verified;
    merged++;
  }
}

writeFileSync(ARTISTS_PATH, JSON.stringify(artists, null, 2));
copyFileSync(ARTISTS_PATH, path.join(ROOT, "app", "public", "data", "artists.json"));

console.log(`Merged ${merged} artist deep-enrichment records.`);
if (missing.length) console.log("WARNING - artist_id not found:", missing);
