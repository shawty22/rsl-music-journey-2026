#!/usr/bin/env node
// Validates data/normalized/*.json and writes data/VALIDATION_REPORT.md.
// Never silently discards questionable records — only reports them.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIR = path.join(ROOT, "data", "normalized");

const artists = JSON.parse(readFileSync(path.join(DIR, "artists.json"), "utf-8"));
const performances = JSON.parse(readFileSync(path.join(DIR, "performances.json"), "utf-8"));
const taxonomy = JSON.parse(readFileSync(path.join(DIR, "taxonomy.json"), "utf-8"));

const lines = [];
const p = (s = "") => lines.push(s);

p(`# RSL 2026 Data Validation Report`);
p();
p(`Generated: ${new Date().toISOString()}`);
p();

// duplicate artist_normalized
const normCounts = new Map();
for (const a of artists) normCounts.set(a.artist_normalized, (normCounts.get(a.artist_normalized) || 0) + 1);
const dupArtists = [...normCounts.entries()].filter(([, c]) => c > 1);
p(`## Duplicate artist_normalized`);
p(dupArtists.length ? dupArtists.map(([k, c]) => `- ${k} (${c}x)`).join("\n") : "None found.");
p();

// duplicate performance records
const possibleDups = performances.filter((x) => x.is_possible_duplicate);
p(`## Possible duplicate performance records (same artist/day/set_time/camp)`);
p(`${possibleDups.length} rows flagged (not removed):`);
for (const d of possibleDups) {
  p(`- ${d.performance_id}: ${d.artist_display_name} — ${d.day_raw} @ ${d.set_time_raw}, ${d.camp}`);
}
p();

// missing / malformed times
const badTimes = performances.filter((x) => !x.set_time_valid);
p(`## Malformed set_time values`);
p(badTimes.length ? badTimes.map((x) => `- ${x.performance_id}: "${x.set_time_raw}"`).join("\n") : "None found.");
p();

// missing day
const badDay = performances.filter((x) => !x.day_start);
p(`## Missing/unparseable day`);
p(badDay.length ? badDay.map((x) => `- ${x.performance_id}: "${x.day_raw}"`).join("\n") : "None found.");
p();

// missing artist ids / orphaned performances
const artistIds = new Set(artists.map((a) => a.artist_id));
const orphans = performances.filter((x) => !artistIds.has(x.artist_id));
p(`## Orphaned performances (no matching artist_id)`);
p(orphans.length ? orphans.map((x) => `- ${x.performance_id} -> missing artist_id "${x.artist_id}"`).join("\n") : "None found.");
p();

// missing location
const noLoc = performances.filter((x) => !x.location);
p(`## Missing location`);
p(noLoc.length ? noLoc.map((x) => `- ${x.performance_id}: ${x.artist_display_name} @ ${x.camp}`).join("\n") : "None found.");
p();

// missing theme
const noTheme = performances.filter((x) => !x.theme);
p(`## Missing event_theme`);
p(`${noTheme.length} / ${performances.length} performances have no theme recorded (expected — not every RSL entry lists one).`);
p();

// invalid performance types
const validTypes = new Set(taxonomy.performance_types);
const badTypes = performances.filter((x) => !validTypes.has(x.performance_type));
p(`## Invalid performance_type values`);
p(badTypes.length ? badTypes.map((x) => `- ${x.performance_id}: "${x.performance_type}"`).join("\n") : "None found.");
p();
p(`Note: ${performances.filter((x) => x.performance_type === "UNKNOWN").length} / ${performances.length} performances are currently classified UNKNOWN — the RSL PDF encodes DJ/live/hybrid via icons that were not text-extracted in this seed. Classification is pending enrichment, not an error.`);
p();

// artist enrichment coverage
const enrichedFields = ["country", "genre_tags", "signal_status"];
const anyEnriched = artists.filter((a) => a.country || (a.genre_tags && a.genre_tags.length) || a.signal_status !== "unknown");
p(`## Artist enrichment coverage`);
p(`${anyEnriched.length} / ${artists.length} artists have any enrichment field populated beyond the raw RSL extraction.`);
p();

p(`## Summary`);
p(`- Performances: ${performances.length}`);
p(`- Artists: ${artists.length}`);
p(`- Possible duplicate performances flagged: ${possibleDups.length}`);
p(`- Malformed times: ${badTimes.length}`);
p(`- Orphaned performances: ${orphans.length}`);

writeFileSync(path.join(ROOT, "data", "VALIDATION_REPORT.md"), lines.join("\n") + "\n");
console.log("Wrote data/VALIDATION_REPORT.md");
