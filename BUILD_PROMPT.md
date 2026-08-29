# Claude Build Prompt — BMRI (Burning Man Rave Intelligence) 2026

This is the founding product/build spec for this repo. Preserved verbatim from the
project kickoff conversation (2026-08-27) so future work stays anchored to it.

## Project purpose

Build a cross-platform, installable, offline-first Progressive Web App (PWA) that
turns the 2026 Rock Star Librarian Music Guide into a personal music-discovery and
journey-planning tool for Burning Man.

This is NOT a generic Burning Man events app. The core product is **music
intelligence**: "Given what I like, where I am, what time it is, and how long I have,
what music should I go discover?"

Bias toward electronic music — especially left-field electronic, experimental,
organic, global, psychedelic, live and hybrid — while still surfacing major acts and
occasional wildcards.

**Do not** build a generic events browser first, a social network, a WhatsApp bot in
v1, or introduce AI agents, vector databases, embeddings, ML recommendation models, or
cloud infrastructure. v1 = structured data + transparent recommendation rules +
excellent mobile UX + offline operation.

## Source material (`data/source/`)

1. `RSL2026spread(1).pdf` — the complete 2026 RSL Music Guide. **Source of truth** for
   schedule information.
2. `rsl_2026_music_intelligence.csv` — initial extracted performance dataset.
3. `rsl_2026_artists_seed.csv` — initial unique-artist enrichment seed.
4. `rsl_2026_music_intelligence.json` — JSON version of the performance dataset.

The CSV/JSON are extraction seeds, not unquestionable truth. If inconsistencies are
found against the PDF, preserve the source information and flag the discrepancy
rather than silently inventing a correction.

## Architectural principle

```
RSL SOURCE DATA
      ↓
NORMALIZED DATA
      ↓
ARTIST INTELLIGENCE
      ↓
RECOMMENDATION ENGINE
      ↓
JOURNEY ENGINE
      ↓
MOBILE UI
```

Data and the recommendation engine must be independent of the interface. Future
interfaces may include native mobile, WhatsApp, Telegram, CLI, API — don't design the
core system around any one interface.

## Platform requirement

Installable PWA. Must work on iPhone, iPad, Android phones, Android tablets.
Touch-first, mobile-first. No native iOS/Android app in v1. Users open a URL and
install to their device.

## Offline requirement

Full RSL dataset available locally after install. Search, browse, filter,
recommendations, journeys, approximate distance calc, saved preferences, saved
journeys — all must work with **no internet access**. No dependency on an API call,
Google Maps, Mapbox, Spotify, or any other external service for the core experience.

## Data model

Separate **artists** (entities) from **performances** (scheduled appearances). One
artist may have many performances.

**Artist fields:** artist, artist_normalized, artist_type, gender_identity, country,
state_region, city, origin_type, current_base, home_scene, genre_tags, style_tags,
performance_type, instruments, languages, career_stage, labels, notable_releases,
notable_collaborations, signal_status, spotify_found, soundcloud_found,
bandcamp_found, apple_music_found, catalogue_signal, external_signal, website,
spotify_url, soundcloud_url, bandcamp_url, apple_music_url, rsl_recommended,
bipoc_beats_artist, bipoc_beats_friend, live_music_stage, mutant_vehicle,
wheelchair_friendly, camp_affiliations, burning_man_history, discovery_character,
discovery_note, research_confidence, sources, last_verified.

**Performance fields:** performance_id, artist_id, artist_display_name, day,
start_time, end_time, camp, event, theme, location, stage, performance_type,
rsl_flags, source_page, source_text.

Preserve B2B / group / alias / collective performances (e.g. "Binative (Groovercreator
& GeoXie)") without collapsing performance identity into artist identity.

## RSL-specific data

Preserve RSL icons/designations: wheelchair friendly, live music stage, mutant
vehicle, RSL recommended, BIPOC Beats artist, BIPOC Beats friend. Don't reduce RSL
data to just artist + time.

## Artist enrichment (lightweight signal gate)

Check: real music footprint (Spotify/SoundCloud/Bandcamp/Apple Music), catalogue/
audience signal, independent artist footprint (website/bio/label/booking), performance
signal (DJ/live/hybrid), genre/style.

Tiers: **ESTABLISHED** (clear independent career + meaningful footprint), **EMERGING**
(real artist/catalogue, smaller footprint), **UNKNOWN** (insufficient evidence).

Never fabricate numerical reputation scores. Unknown ≠ bad — unknown artists stay
eligible for wildcard discovery.

## Geographic & gender metadata

Collect country/state_region/city/origin_type/current_base/home_scene where reliably
available. Never infer nationality from names. Distinguish birthplace/origin from
current base.

Gender: Female / Male / Non-binary / gender diverse / Group / mixed / Unknown. Never
infer from name or photo — only record when supported by public self-identification
or reliable biographical info. Unknown is fine.

## Music tagging

Compact multi-value tags, not a single forced genre. Core taxonomy: organic
electronic, global bass, downtempo, glitch-hop, melodic house, progressive house,
techno, tech house, bass house, experimental electronic, psychedelic, live electronic,
world fusion, dubstep, drum and bass, acid, psytechno, disco, funk, hip-hop, ambient.
Keep the taxonomy compact and understandable.

## Performance type

DJ, LIVE, HYBRID, B2B, LIVE_BAND, VOCALIST, PERFORMANCE_MULTIMEDIA, UNKNOWN. Multiple
characteristics can coexist (e.g. a B2B can still be DJ).

## Recommendation philosophy

Not "50 artists similar to what you already listen to" — instead "take me somewhere
interesting." Consider personal taste, genre/style, artist signal, performance type,
time, location, distance, discovery preference, wildcard preference, RSL
recommendations, major-act status.

Default electronic bias:
- HIGH: electronic, experimental, global bass, organic, live electronic, hybrid,
  psychedelic
- MEDIUM-HIGH: house, techno, progressive
- MEDIUM: major EDM
- LOWER: non-electronic unless particularly interesting or specifically requested

Popularity alone must not overwhelm musical fit.

## Transparent recommendation engine

Explicit rules, not opaque ML. Every recommendation must have a human-readable
reason (e.g. "Strong electronic preference match.", "Close to your current
location.", "Wildcard selected because external signal is limited but genre fit is
interesting."). No meaningless single numerical score shown to users. Internal
scoring components are fine if understandable.

## Discovery roles

CORE_MATCH, ADJACENT, WILDCARD, MAJOR_ACT, LOCAL_GEM, UNKNOWN — recommendation roles,
not objective quality judgments. Discovery weights are configurable
(strong_match_weight, adjacent_weight, wildcard_weight, major_act_weight), defaulting
roughly to ~70% strong matches / ~20% adjacent / ~10% wildcards — defaults, not fixed
rules.

## User taste & preferences

Spotify is optional, never required. Manual taste profile first: favorite artists,
favorite genres/styles, preferred performance types, discovery level, wildcard level,
max walking/travel distance, major-act preference, live/hybrid preference, avoid
genres. Don't overbuild preference management.

## Journey mode (central feature)

User enters day, start time, starting location, duration. App generates a
chronological musical journey (multiple acts across the time window). Each stop
considers musical fit, discovery, artist signal, performance type, time, geographic
distance, travel time, journey duration. Should feel intentional, not just
highest-scoring events strung together.

Constraints: respect available time; avoid impossible travel; avoid overlapping
performances; include reasonable transition time; avoid repeatedly sending the user to
the same camp unless justified; encourage exploration; favor musical continuity
without becoming predictable; include occasional surprises. Explain transitions (e.g.
"Strong taste match, 9-minute walk, starts 15 minutes after previous set." /
"Wildcard: deliberately breaks from the previous genre while remaining electronic.").

## Location

No live maps in v1. Local representation of known playa locations: location_string,
normalized_location, address_components (where possible), latitude/longitude (if
available), location_type. Approximate distance calculated locally. If exact
coordinates are unavailable, preserve the original RSL location string rather than
inventing coordinates — location is approximate, not GPS-level.

## UI

Extremely simple. Primary screens: HOME, DISCOVER, JOURNEY, ARTISTS, SAVED. Home
answers "what do you want to do?" (What's good now? / Build a journey / Explore /
Wildcard me). Usable while walking around Burning Man: large touch targets, minimal
typing, high contrast, readable in daylight/night.

Recommendation card shows artist, genre/style, performance type, signal tier, camp,
time, and a plain-language "why". Unknown/limited-signal must never read as "bad" —
wildcards are framed positively.

## Offline status

Always show OFFLINE READY ✓ or ONLINE so the user knows local dataset availability.

## Data update model

Static 2026 dataset for v1, no update backend. Data layer designed so a future
version can swap the local dataset:

```
data/
  artists.json
  performances.json
  locations.json
  taxonomy.json
  metadata.json
```

`metadata.json`: dataset_version, source, generated_at, record_count, artist_count.

## Data quality

Validation scripts checking: duplicate artist normalization, duplicate performance
records, missing/malformed times, impossible durations, missing artist IDs, orphaned
performances, invalid genre tags, invalid performance types, invalid RSL flags.
Produce a validation report. Never silently discard questionable records.

## Provenance

Every external enrichment claim keeps source, source_type, retrieved/verified date,
notes. Distinguish RSL fact / external fact / inference / recommendation judgment.
Never present inferred information as fact.

## Tech stack

React + Vite + TypeScript. Standard PWA support. No backend, no database server, no
vector database, no LangChain, no embeddings, no AI agent framework for v1. Local
JSON / lightweight local store.

## Development phases

1. Load and validate data.
2. Artist/performance browsing.
3. Filters and taste profile.
4. Recommendation engine.
5. Journey engine.
6. PWA/offline support.
7. Polish mobile UX.

Do not jump ahead to social sharing, WhatsApp, Telegram, Spotify auth, accounts,
analytics, or cloud services.

## First milestone

Before building the UI: inspect the supplied datasets and report record counts,
unique artists, camps, days, missing/ambiguous fields, normalization problems, and any
PDF/CSV/JSON conflicts. Then build the smallest functioning vertical slice: data →
artist search → performance display → simple recommendation → simple 1–2 hour
journey. Runs on a phone-sized viewport. Only then expand the UI.

## Product principle

Not "find the most popular Burning Man DJs." It's: "Given what I like, where I am,
how much time I have, and how adventurous I feel, take me somewhere interesting."
Optimize for discovery and real-world usefulness. Keep the recommendation rules simple
enough for the creator to read and modify himself. Do not over-engineer.

## Iteration loop

Don't enrich all ~1,180 artists before starting the app — build against the current
seed dataset while enrichment happens in parallel, so real usage tells us which
metadata actually matters.

PDF → dataset → simple app → test on iPhone → improve the intelligence → enrich data
→ repeat. The creator is the first beta tester: if an hour of real use on his phone
surfaces something he wouldn't have found himself, it's working.
