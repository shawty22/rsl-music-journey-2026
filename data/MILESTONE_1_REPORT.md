# Milestone 1 — Data Inspection & Vertical Slice

Per BUILD_PROMPT.md's "First milestone" requirement: inspect the datasets before
building UI, then build the smallest functioning vertical slice.

## Dataset inspection

Source: `data/source/rsl_2026_music_intelligence.json` (the JSON mirror of the two
seed CSVs — all three agree on record counts, no cross-format conflicts found).

- **Performance records:** 1,604
- **Unique artists:** 1,180
- **Unique camps:** 92
- **Days:** 7 overnight blocks (THU PM–FRI AM through WED PM–THU AM), i.e. a full
  burn week
- **Missing/ambiguous fields:**
  - 2 performances have no `location` string
  - 403 / 1,604 performances have no `event_theme` (expected — not every RSL entry
    lists one)
  - **0** artist-intelligence fields are populated for any of the 1,180 artists
    (country, genre_tags, signal_status, urls, etc. are all blank in the seed).
    `performance_type` is hardcoded `"UNKNOWN"` for all 1,604 performances and
    `rsl_flags` is blank for all — the RSL PDF encodes DJ/live/hybrid and the
    wheelchair/mutant-vehicle/RSL-recommended/BIPOC-Beats icons visually, and they
    were not text-extracted into this seed.
- **Normalization problems found:** none in artist naming (`artist_normalized` has
  zero duplicates). 8 performance rows share an identical
  (artist, day, set_time, camp) tuple — 4 genuine pairs, all at "Black Rock Travel
  Agency" (a recurring radio-show camp), consistent with the same slot being
  programmed twice in the guide rather than an extraction error. **Not dropped** —
  flagged via `is_possible_duplicate` on the normalized records.
- **PDF vs. CSV vs. JSON conflicts:** none found — the JSON already reconciles the
  two CSVs 1:1 (1,180 artists / 1,604 performances match exactly). No independent
  PDF text-layer cross-check was run in this pass; the PDF remains the source of
  truth if a specific record is ever disputed.

Full field-by-field validation output: `data/VALIDATION_REPORT.md` (regenerate with
`node scripts/validate.mjs`).

## Data layer built

`scripts/normalize.mjs` reshapes the raw seed into the interface-independent layer
called for in the architecture:

```
data/normalized/
  artists.json       (1,180 records, full artist schema, enrichment fields present but null)
  performances.json  (1,604 records, generated performance_id, parsed day/time, global_sort_key)
  locations.json     (88 distinct location strings, classified but NOT geocoded)
  taxonomy.json       (genre tags, performance types, discovery roles, electronic-bias weights)
  metadata.json       (dataset_version, generated_at, record/artist/camp counts, enrichment_status)
```

Mirrored into `app/public/data/` for the PWA to fetch and precache offline.

## Vertical slice built (app/)

React + Vite + TypeScript PWA scaffold, running end to end:

- **Data → Artist search** (`ArtistsView`): searches all 1,180 artists by name,
  drills into an artist's full performance list.
- **Performance display**: RSL facts (camp, theme, location, day/time) shown as-is;
  enrichment fields render honestly as "genre not yet tagged" / "Unknown signal"
  rather than hiding or faking them.
- **Simple recommendation** (`lib/recommend.ts`): transparent rule-based scoring —
  favorite-artist match, genre/style overlap, electronic-bias tiers, RSL flags,
  signal tier, preferred performance type — every point has an attached
  human-readable reason. Verified live: adding "Govinda" (present in the seed) as a
  favorite correctly surfaces them as a ⭐ CORE_MATCH with reason "Govinda is one of
  your favorite artists," while everything else with zero enrichment data correctly
  falls back to WILDCARD/UNKNOWN — this is expected behavior given 0% enrichment,
  not a bug.
- **Simple journey** (`lib/journey.ts`): given day/start-time/location/duration,
  greedily sequences acts respecting minimum gaps, approximate walk time between
  clock-addressable RSL locations (`lib/distance.ts` — qualitative walk buckets, no
  invented GPS coordinates), and a same-camp repeat penalty. Verified live: a
  4-hour THU-night journey from "7:00 & F" produced 7 chronologically ordered acts
  with explicit transition reasons per stop.
- **PWA/offline**: `vite-plugin-pwa` configured with `generateSW`, precaching the
  app shell + all 5 data JSON files (~2.9MB). Manifest, icons, and
  `apple-mobile-web-app-capable` meta tags are in place for iOS/Android install.
  Service-worker registration could not be verified inside this session's sandboxed
  browser tool (it blocks the ServiceWorker API entirely — confirmed via a raw
  `navigator.serviceWorker.register()` call, which failed with "unknown error
  fetching the script" even though `/sw.js` itself served fine over plain fetch).
  This needs to be re-verified in a real browser (Safari on the iPhone, or desktop
  Chrome/Safari) before trusting offline mode — **this is the first thing to check
  in the next session.**

## What this means for next steps

Recommendation/journey quality today is bounded almost entirely by enrichment
status, not by the engine logic — the engine is already wired to use genre tags,
style tags, signal tiers, and RSL flags the moment they're populated. Per the
"iteration loop" in BUILD_PROMPT.md, the right next steps are:

1. Verify real offline install + service-worker caching on an actual phone.
2. Start artist enrichment in parallel (genre/style tags, signal tier, RSL icon
   flags from the PDF) — even a partial pass will noticeably change what surfaces
   as CORE_MATCH/ADJACENT vs. WILDCARD/UNKNOWN.
3. Use the app for real (add real favorite artists, build a few journeys) to find
   out which metadata fields actually change decisions before over-investing in
   enrichment breadth.
