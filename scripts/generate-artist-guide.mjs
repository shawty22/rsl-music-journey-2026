#!/usr/bin/env node
// Generates the BMRI Field Guide: a single self-contained, offline-readable
// HTML "book" built entirely from the same normalized dataset the app uses
// (data/normalized/*.json) -- no second database, nothing hand-maintained.
// It doubles as:
//   (a) a webpage (search box, jump links, readable in any browser),
//   (b) a print source (headless Chrome renders it to PDF -- see the
//       generate-field-guide-pdf.mjs sibling script), and
//   (c) the source content for the hand-built EPUB (see
//       generate-field-guide-epub.mjs).
//
// Hard rule carried over from the app itself: never invent a fact. Missing
// fields render as "Unknown" or are omitted, never guessed. Unknown/wildcard
// signal is never framed as "worse" -- same wording the app uses.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data", "normalized");
const outPath = path.join(__dirname, "..", "app", "public", "field-guide.html");

const artists = JSON.parse(readFileSync(path.join(dataDir, "artists.json"), "utf8"));
const performances = JSON.parse(readFileSync(path.join(dataDir, "performances.json"), "utf8"));
const metadata = JSON.parse(readFileSync(path.join(dataDir, "metadata.json"), "utf8"));
const geoModel = JSON.parse(readFileSync(path.join(dataDir, "brc_geo_model.json"), "utf8"));

// A handful of RSL rows are flagged as likely duplicate listings of the same
// set (same artist/day/time/camp, different performance_id) — collapse
// those so an artist's entry doesn't show the same set twice.
const seenPerfKeys = new Set();
const dedupedPerformances = performances.filter((p) => {
  const key = p.is_possible_duplicate ? `${p.artist_id}__${p.day_start}__${p.set_time_raw}__${p.camp}` : p.performance_id;
  if (seenPerfKeys.has(key)) return false;
  seenPerfKeys.add(key);
  return true;
});

const perfsByArtist = new Map();
for (const p of dedupedPerformances) {
  if (!perfsByArtist.has(p.artist_id)) perfsByArtist.set(p.artist_id, []);
  perfsByArtist.get(p.artist_id).push(p);
}
for (const list of perfsByArtist.values()) list.sort((a, b) => (a.global_sort_key ?? 0) - (b.global_sort_key ?? 0));

function tier(a) {
  return (a.signal_status || "").toUpperCase() === "UNKNOWN" ? "UNKNOWN" : (a.signal_status || "").toUpperCase();
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
function aboutText(a) {
  return a.bio || [a.discovery_note, a.catalogue_signal, a.external_signal].filter(Boolean).join(" ") || null;
}
function geoLine(a) {
  const parts = [a.city, a.state_region, a.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "Unknown";
}
const PERF_TYPE_LABEL = {
  DJ: "DJ",
  LIVE: "Live",
  HYBRID: "Hybrid",
  B2B: "B2B",
  LIVE_BAND: "Live Band",
  VOCALIST: "Vocalist",
  PERFORMANCE_MULTIMEDIA: "Multimedia",
  UNKNOWN: "Unknown",
};
function perfType(a) {
  return PERF_TYPE_LABEL[a.performance_type] || "Unknown";
}

const established = artists.filter((a) => tier(a) === "ESTABLISHED").sort((a, b) => a.artist.localeCompare(b.artist));
const emerging = artists.filter((a) => tier(a) === "EMERGING").sort((a, b) => a.artist.localeCompare(b.artist));
const wildcardsWithNotes = artists
  .filter((a) => tier(a) === "UNKNOWN" && aboutText(a))
  .sort((a, b) => a.artist.localeCompare(b.artist));
const unknownTotal = artists.filter((a) => tier(a) === "UNKNOWN").length;

const LINKS = [
  ["spotify_url", "Spotify"],
  ["soundcloud_url", "SoundCloud"],
  ["bandcamp_url", "Bandcamp"],
  ["apple_music_url", "Apple Music"],
  ["website", "Website"],
];

function linksLine(a) {
  const found = LINKS.filter(([key]) => a[key]);
  if (!found.length) return "";
  return `<div class="links">${found.map(([, label]) => `<span class="link-chip">${esc(label)}</span>`).join(" ")}</div>`;
}

function perfRows(a) {
  const perfs = perfsByArtist.get(a.artist_id) || [];
  if (!perfs.length) return `<div class="perf-row perf-row-empty">No confirmed set time in the source data.</div>`;
  return perfs
    .map(
      (p) =>
        `<div class="perf-row"><span class="perf-when">${esc(p.day_raw)} @ ${esc(p.set_time_raw)}</span><span class="perf-where">${esc(p.camp)}${p.location ? ` · ${esc(p.location)}` : ""}</span></div>`,
    )
    .join("\n");
}

function renderFullEntry(a, opts = {}) {
  const about = aboutText(a);
  const notable = [
    a.labels ? `<div class="notable-row"><span class="notable-label">Labels</span> ${esc(a.labels)}</div>` : "",
    a.notable_releases ? `<div class="notable-row"><span class="notable-label">Releases</span> ${esc(a.notable_releases)}</div>` : "",
    a.notable_collaborations ? `<div class="notable-row"><span class="notable-label">Collaborations</span> ${esc(a.notable_collaborations)}</div>` : "",
    a.burning_man_history ? `<div class="notable-row"><span class="notable-label">Burning Man history</span> ${esc(a.burning_man_history)}</div>` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const sourceLine = a.sources?.length
    ? `<div class="sources">Sources: ${a.sources.length} linked${a.last_verified ? ` · verified ${esc(a.last_verified)}` : ""}</div>`
    : `<div class="sources">Sources: none linked yet</div>`;
  const genres = a.genre_tags?.length ? a.genre_tags.join(" / ") : "genre not yet tagged";

  return `
  <article class="entry" id="artist-${esc(a.artist_id)}" data-search="${esc((a.artist + " " + genres).toLowerCase())}">
    <h3>${esc(a.artist)} ${opts.tierTag ? `<span class="tier-tag tier-${tier(a).toLowerCase()}">${tier(a)}</span>` : ""}</h3>
    <div class="genres">${esc(genres)} · ${esc(perfType(a))}</div>
    <div class="geo-line">${esc(geoLine(a))}</div>
    ${about ? `<p class="about">${esc(about)}</p>` : `<p class="about about-empty">No biography collected yet.</p>`}
    ${notable ? `<div class="notable">${notable}</div>` : ""}
    ${linksLine(a)}
    <div class="perfs">${perfRows(a)}</div>
    ${sourceLine}
  </article>`;
}

function letterSections(list, tierKey) {
  let lastLetter = null;
  return list
    .map((a) => {
      const letter = a.artist[0].toUpperCase();
      const anchor = letter !== lastLetter ? `<div class="letter-anchor" id="toc-${tierKey}-${letter}">${letter}</div>` : "";
      lastLetter = letter;
      return anchor + renderFullEntry(a);
    })
    .join("\n");
}

function quickIndexTable(list) {
  const rows = list
    .map((a) => {
      const perfs = perfsByArtist.get(a.artist_id) || [];
      const first = perfs[0];
      const when = first ? `${esc(first.day_raw)} @ ${esc(first.set_time_raw)}` : "—";
      const where = first ? esc(first.camp) : "—";
      return `<tr><td><a href="#artist-${esc(a.artist_id)}">${esc(a.artist)}</a></td><td>${esc(tier(a))}</td><td>${esc(a.genre_tags?.[0] || "—")}</td><td>${esc(perfType(a))}</td><td>${when}</td><td>${where}</td></tr>`;
    })
    .join("\n");
  return `<div class="table-scroll"><table class="index-table"><thead><tr><th>Artist</th><th>Signal</th><th>Genre</th><th>Type</th><th>First set</th><th>Camp</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function byGenreSection(list) {
  const byGenre = new Map();
  for (const a of list) {
    const g = a.genre_tags?.[0] || "Genre not yet tagged";
    if (!byGenre.has(g)) byGenre.set(g, []);
    byGenre.get(g).push(a);
  }
  const genres = [...byGenre.keys()].sort();
  return genres
    .map((g) => {
      const names = byGenre
        .get(g)
        .sort((a, b) => a.artist.localeCompare(b.artist))
        .map((a) => `<a href="#artist-${esc(a.artist_id)}">${esc(a.artist)}</a>`)
        .join(" ");
      return `<div class="group-row"><span class="group-label">${esc(g)}</span><span class="group-items">${names}</span></div>`;
    })
    .join("\n");
}

const DAY_ORDER = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
function byDaySection(list) {
  const idSet = new Set(list.map((a) => a.artist_id));
  const relevant = dedupedPerformances.filter((p) => idSet.has(p.artist_id));
  const byDay = new Map();
  for (const p of relevant) {
    const d = p.day_start || "Unscheduled";
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d).push(p);
  }
  const days = [...byDay.keys()].sort((a, b) => {
    const ia = DAY_ORDER.indexOf(a);
    const ib = DAY_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  const artistById = new Map(artists.map((a) => [a.artist_id, a]));
  return days
    .map((d) => {
      const rows = byDay
        .get(d)
        .sort((a, b) => (a.global_sort_key ?? 0) - (b.global_sort_key ?? 0))
        .map((p) => {
          const a = artistById.get(p.artist_id);
          return `<div class="perf-row"><span class="perf-when">${esc(p.set_time_raw)}</span><span class="perf-where"><a href="#artist-${esc(p.artist_id)}">${esc(a?.artist || p.artist_display_name)}</a> · ${esc(p.camp)}</span></div>`;
        })
        .join("\n");
      return `<h3 class="day-heading">${esc(d)}</h3>${rows}`;
    })
    .join("\n");
}

function byGeographySection(list) {
  const byCountry = new Map();
  for (const a of list) {
    const c = a.country || "Unknown";
    if (!byCountry.has(c)) byCountry.set(c, []);
    byCountry.get(c).push(a);
  }
  const countries = [...byCountry.keys()].sort((a, b) => (a === "Unknown" ? 1 : b === "Unknown" ? -1 : a.localeCompare(b)));
  return countries
    .map((c) => {
      const names = byCountry
        .get(c)
        .sort((a, b) => a.artist.localeCompare(b.artist))
        .map((a) => `<a href="#artist-${esc(a.artist_id)}">${esc(a.artist)}</a>`)
        .join(" ");
      return `<div class="group-row"><span class="group-label">${esc(c)}</span><span class="group-items">${names}</span></div>`;
    })
    .join("\n");
}

function addressLegendSvg() {
  const size = 320;
  const c = size / 2;
  const maxR = size / 2 - 40;
  const rings = Object.entries(geoModel.rings).sort((a, b) => a[1] - b[1]);
  const maxRadius = Math.max(...rings.map(([, r]) => r));
  // Ring letters are labeled in a separate list below (12 labels crammed
  // onto the drawing itself just overlapped into an unreadable stack) — the
  // drawing shows the shape, the list gives the names.
  const ringCircles = rings
    .map(([, r]) => {
      const frac = r / maxRadius;
      return `<circle cx="${c}" cy="${c}" r="${frac * maxR}" fill="none" stroke="#f3c85b" stroke-opacity="0.35" stroke-width="1" />`;
    })
    .join("\n");
  const hourLabels = [12, 2, 3, 4, 6, 8, 9, 10]
    .map((h) => {
      const angle = (h / 12) * 2 * Math.PI - Math.PI / 2;
      const x = c + Math.cos(angle) * (maxR + 14);
      const y = c + Math.sin(angle) * (maxR + 14);
      return `<text x="${x}" y="${y}" font-size="11" fill="#f4f1ec" text-anchor="middle" font-weight="700">${h}:00</text>`;
    })
    .join("\n");
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="legend-svg">
    <rect width="${size}" height="${size}" fill="#101015" />
    <line x1="${c}" y1="${c - maxR - 20}" x2="${c}" y2="${c + maxR + 20}" stroke="#333" stroke-width="1"/>
    <line x1="${c - maxR - 20}" y1="${c}" x2="${c + maxR + 20}" y2="${c}" stroke="#333" stroke-width="1"/>
    ${ringCircles}
    ${hourLabels}
    <text x="${c}" y="${c}" font-size="10" fill="#686671" text-anchor="middle">Golden Spike / The Man</text>
  </svg>`;
  const ringList = rings
    .slice()
    .reverse()
    .map(([letter]) => `<span class="ring-chip">${esc(letter)} · ${esc(geoModel.ring_full_names[letter] || "")}</span>`)
    .join(" ");
  return `${svg}<div class="ring-legend">${ringList}</div><div class="wildcard-note">Rings run outward from the Esplanade (closest to the Man) to Kundalini (farthest). City streets span roughly ${esc(geoModel.city_span_clock.start)} to ${esc(geoModel.city_span_clock.end)} — 12:00 and 6:00 are shown only for orientation, not addressable street.</div>`;
}

const generatedAt = new Date().toISOString().slice(0, 10);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>BMRI Field Guide 2026</title>
<style>
  :root {
    --bg: #08080b; --surface: #101015; --line: rgba(255,255,255,0.1);
    --text: #f4f1ec; --text-dim: #a5a2ac; --text-faint: #686671;
    --gold: #f3c85b; --accent-2: #76f7d5; --wildcard: #b993ff; --established: #d8ff38;
  }
  * { box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0 20px 100px; max-width: 760px; margin-inline: auto; -webkit-font-smoothing: antialiased; }
  header.cover { padding: 48px 0 28px; border-bottom: 1px solid var(--line); }
  .wordmark { font-size: 13px; font-weight: 800; letter-spacing: 2px; color: var(--text-dim); }
  h1 { font-size: 32px; font-weight: 800; letter-spacing: -0.3px; margin: 10px 0 6px; }
  .subtitle { color: var(--text-dim); font-size: 14px; line-height: 1.6; max-width: 520px; }
  .meta-line { color: var(--text-faint); font-size: 12px; margin-top: 16px; }
  #search-box { width: 100%; margin-top: 20px; padding: 12px 14px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; color: var(--text); font-size: 15px; }
  section.top-section { padding: 28px 0; border-bottom: 1px solid var(--line); }
  section.top-section h2.plain { font-size: 20px; font-weight: 800; margin: 0 0 12px; color: var(--text); text-transform: none; border: none; padding: 0; }
  .legend-item { margin-bottom: 10px; font-size: 13.5px; line-height: 1.6; }
  .legend-item b { color: var(--gold); }
  nav.master-toc { display: flex; flex-direction: column; gap: 6px; font-size: 14px; }
  nav.master-toc a { color: var(--gold); text-decoration: none; font-weight: 700; }
  h2 { font-size: 12px; font-weight: 800; letter-spacing: 1.2px; color: var(--gold); text-transform: uppercase; margin: 44px 0 4px; padding-top: 24px; border-top: 1px solid var(--line); }
  h2 .count { color: var(--text-faint); font-weight: 600; letter-spacing: 0; text-transform: none; }
  h3.day-heading { font-size: 14px; font-weight: 800; color: var(--accent-2); margin: 22px 0 6px; }
  nav.toc { display: flex; flex-wrap: wrap; gap: 6px; margin: 14px 0 20px; }
  nav.toc a { font-size: 11px; font-weight: 700; color: var(--text-dim); text-decoration: none; border: 1px solid var(--line); border-radius: 999px; padding: 3px 9px; }
  .letter-anchor { font-size: 11px; font-weight: 800; letter-spacing: 1px; color: var(--text-faint); margin: 22px 0 4px; }
  .entry { padding: 14px 0; border-bottom: 1px solid var(--line); }
  .entry h3 { font-size: 18px; font-weight: 800; margin: 0 0 3px; display: flex; align-items: center; gap: 8px; }
  .tier-tag { font-size: 10px; font-weight: 800; letter-spacing: 0.5px; padding: 2px 7px; border-radius: 999px; border: 1px solid currentColor; }
  .tier-established { color: var(--established); }
  .tier-emerging { color: var(--gold); }
  .tier-unknown { color: var(--wildcard); }
  .genres { font-size: 12px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.3px; }
  .geo-line { font-size: 12px; color: var(--text-faint); margin-top: 2px; }
  .about { font-size: 13.5px; color: var(--text); line-height: 1.55; margin: 8px 0; }
  .about-empty { color: var(--text-faint); font-style: italic; }
  .notable { font-size: 12.5px; color: var(--text-dim); line-height: 1.6; margin: 6px 0; }
  .notable-label { font-size: 10.5px; font-weight: 800; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.3px; margin-right: 6px; }
  .links { margin: 6px 0; }
  .link-chip { font-size: 11px; border: 1px solid var(--line); border-radius: 999px; padding: 3px 9px; color: var(--text-dim); margin-right: 4px; }
  .perfs { margin-top: 8px; }
  .perf-row { display: flex; justify-content: space-between; gap: 10px; font-size: 12.5px; padding: 3px 0; flex-wrap: wrap; }
  .perf-when { color: var(--gold); font-weight: 700; white-space: nowrap; }
  .perf-where { color: var(--text-dim); text-align: right; }
  .perf-row-empty { color: var(--text-faint); font-style: italic; }
  .sources { font-size: 10.5px; color: var(--text-faint); margin-top: 6px; }
  .table-scroll { overflow-x: auto; margin-top: 12px; }
  .index-table { width: 100%; min-width: 560px; border-collapse: collapse; font-size: 12px; }
  .index-table th { text-align: left; color: var(--text-faint); font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.3px; padding: 6px 8px; border-bottom: 1px solid var(--line); }
  .index-table td { padding: 6px 8px; border-bottom: 1px solid var(--line-subtle, rgba(255,255,255,0.06)); color: var(--text-dim); }
  .index-table td:first-child a { color: var(--text); font-weight: 700; text-decoration: none; }
  .group-row { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--line); font-size: 13px; }
  .group-label { flex: 0 0 160px; font-weight: 800; color: var(--gold); font-size: 11px; text-transform: uppercase; }
  .group-items a { color: var(--text-dim); text-decoration: none; margin-right: 4px; }
  .group-items a:not(:last-child)::after { content: ","; color: var(--text-faint); }
  .legend-svg { display: block; margin: 16px auto; max-width: 100%; height: auto; }
  .ring-legend { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin: 4px 0 16px; }
  .ring-chip { font-size: 11px; color: var(--text-dim); border: 1px solid var(--line); border-radius: 999px; padding: 3px 10px; }
  a { color: var(--gold); }
  .wildcard-note { font-size: 12px; color: var(--text-faint); margin: 8px 0 20px; line-height: 1.6; }
  @media print {
    body { color: #000; background: #fff; max-width: none; padding: 0 24px; }
    :root { --text: #000; --text-dim: #333; --text-faint: #666; --gold: #7a5b00; --wildcard: #6a3fa0; --established: #3a6b00; --line: #ccc; }
    #search-box { display: none; }
    h2 { break-before: page; }
    .entry { break-inside: avoid; }
    a { color: #000; text-decoration: underline; }
  }
</style>
</head>
<body>
  <header class="cover">
    <div class="wordmark">BMRI — BURNING MAN RAVE INTELLIGENCE</div>
    <h1>2026 Field Guide</h1>
    <div class="subtitle">Every Established and Emerging artist's real bio/discovery intel and confirmed set times, camps, and locations — plus a curated set of Wildcards worth a look — from the ${esc(metadata.dataset_version || "2026")} RSL dataset. One offline reference, no app required.</div>
    <div class="meta-line">Generated ${generatedAt} from the same normalized dataset the BMRI app uses. Nothing here is invented — a blank field means the data isn't known yet, not that it's bad.</div>
    <input id="search-box" type="text" placeholder="Search artist or genre… (Cmd/Ctrl-F also works)" oninput="filterEntries(this.value)" />
  </header>

  <section class="top-section">
    <h2 class="plain">How to use BMRI</h2>
    <div class="legend-item"><b>Signal status</b> is a fact about the artist, independent of any recommendation: <b>Established</b> — a documented, independent music career. <b>Emerging</b> — a real, smaller catalogue. <b>Unknown</b> — no external signal found yet. Unknown does not mean bad — it means undocumented.</div>
    <div class="legend-item"><b>Discovery role</b> (used in the app, not printed per-entry here) is a judgment, not a fact: <b>Strong Match</b> fits your stated taste closely. <b>Discovery</b> is adjacent to it. <b>Wildcard</b> is a deliberate stretch — limited signal, but musically or schedule-wise interesting.</div>
    <div class="legend-item">Locations are the original RSL address strings (e.g. "3:00 & E") where given. Camp placement is reassigned every year — treat any address as approximate.</div>
  </section>

  <section class="top-section">
    <h2 class="plain">Contents</h2>
    <nav class="master-toc">
      <a href="#quick-index">Quick Music Index</a>
      <a href="#guide-established">Artist Guide — Established (${established.length})</a>
      <a href="#guide-emerging">Artist Guide — Emerging (${emerging.length})</a>
      <a href="#by-genre">By Genre</a>
      <a href="#by-day">By Day</a>
      <a href="#by-geography">By Geography</a>
      <a href="#address-legend">Playa Address Legend</a>
      <a href="#wildcards">Wildcards</a>
    </nav>
  </section>

  <section id="quick-index" class="top-section">
    <h2 class="plain">Quick Music Index</h2>
    ${quickIndexTable([...established, ...emerging])}
  </section>

  <section id="guide-established">
    <h2>Artist Guide — Established <span class="count">(${established.length})</span></h2>
    <nav class="toc">${[...new Set(established.map((a) => a.artist[0].toUpperCase()))].map((l) => `<a href="#toc-est-${l}">${l}</a>`).join(" ")}</nav>
    ${letterSections(established, "est")}
  </section>

  <section id="guide-emerging">
    <h2>Artist Guide — Emerging <span class="count">(${emerging.length})</span></h2>
    <nav class="toc">${[...new Set(emerging.map((a) => a.artist[0].toUpperCase()))].map((l) => `<a href="#toc-emg-${l}">${l}</a>`).join(" ")}</nav>
    ${letterSections(emerging, "emg")}
  </section>

  <section id="by-genre" class="top-section">
    <h2 class="plain">By Genre <span class="count">(Established + Emerging)</span></h2>
    ${byGenreSection([...established, ...emerging])}
  </section>

  <section id="by-day" class="top-section">
    <h2 class="plain">By Day <span class="count">(Established + Emerging)</span></h2>
    ${byDaySection([...established, ...emerging])}
  </section>

  <section id="by-geography" class="top-section">
    <h2 class="plain">By Geography <span class="count">(Established + Emerging, where known)</span></h2>
    ${byGeographySection([...established, ...emerging])}
  </section>

  <section id="address-legend" class="top-section">
    <h2 class="plain">Playa Address Legend</h2>
    <p class="wildcard-note">Black Rock City is addressed like a clock face: hour = direction from the Man, ring letter = distance out. This is the real 2026 street layout (ring names and radii from Burning Man's own GIS data) — not a personalized map. It won't show you where any specific act is; it shows you how to read an address like "3:00 &amp; E" once you have one.</p>
    ${addressLegendSvg()}
  </section>

  <section id="wildcards" class="top-section">
    <h2 class="plain">Wildcards <span class="count">(${wildcardsWithNotes.length} of ${unknownTotal} unknown-signal artists)</span></h2>
    <p class="wildcard-note">Unknown does not mean bad — it means BMRI hasn't found external signal for them yet. These ${wildcardsWithNotes.length} have at least a preliminary research note; the other ${unknownTotal - wildcardsWithNotes.length} unknown-signal artists have nothing beyond a name and a set time — browse the full roster in the app's Browse Artists screen.</p>
    ${letterSections(wildcardsWithNotes, "wc")}
  </section>

  <script>
    function filterEntries(q) {
      q = q.trim().toLowerCase();
      document.querySelectorAll('.entry[data-search]').forEach(function (el) {
        el.style.display = !q || el.dataset.search.indexOf(q) !== -1 ? '' : 'none';
      });
    }
  </script>
</body>
</html>
`;

writeFileSync(outPath, html, "utf8");
console.log(`Wrote ${outPath} (${(html.length / 1024).toFixed(0)} KB)`);
console.log(`Established: ${established.length}, Emerging: ${emerging.length}, Wildcards w/ notes: ${wildcardsWithNotes.length} of ${unknownTotal} unknown-signal`);
