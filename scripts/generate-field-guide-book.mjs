#!/usr/bin/env node
// BMRI 2026 Music Field Guide — a genuine chronological (day -> time ->
// artist) editorial book, not a copy of the website. Generated entirely
// from data/normalized/*.json via scripts/lib/field-guide-model.mjs; see
// that file for the data-modeling logic shared with the EPUB generator.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadModel, tier, aboutText, whyInteresting, geoLine, perfType, imageFlagFor, FLAGGED_IMAGES } from "./lib/field-guide-model.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const imagesDir = path.join(ROOT, "app", "public", "images", "artists");
const outPath = path.join(ROOT, "app", "public", "field-guide.html");

const model = loadModel(ROOT, imagesDir);
const { established, emerging, wildcards, days, genreIndex, anchorId, imageFor } = model;

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

const SIGNAL_ICON = { ESTABLISHED: "●", EMERGING: "●", UNKNOWN: "●" };
const SIGNAL_LABEL = { ESTABLISHED: "ESTABLISHED", EMERGING: "EMERGING", UNKNOWN: "UNKNOWN SIGNAL" };

function countryFlag(country) {
  // Best-effort, real-data-only: only render a flag glyph when we have a
  // country string and it's the US (most of the roster) — no guessing for
  // the rest, just print the country name as text.
  if (!country) return "";
  if (/united states/i.test(country)) return "🇺🇸 ";
  return "";
}

function linksBlock(a) {
  const LINKS = [
    ["spotify_url", "Spotify"],
    ["soundcloud_url", "SoundCloud"],
    ["bandcamp_url", "Bandcamp"],
    ["apple_music_url", "Apple Music"],
    ["website", "Website"],
  ];
  const found = LINKS.filter(([key]) => a[key]);
  if (!found.length) return "";
  return `<div class="listen">
    <div class="listen-label">LISTEN / EXPLORE</div>
    <div class="listen-links">${found.map(([key, label]) => `<a href="${esc(a[key])}" target="_blank" rel="noreferrer">${esc(label)}</a>`).join(" · ")}</div>
  </div>`;
}

function notableBlock(a) {
  const rows = [
    a.labels ? `<div><b>Labels</b> ${esc(a.labels)}</div>` : "",
    a.notable_releases ? `<div><b>Notable releases</b> ${esc(a.notable_releases)}</div>` : "",
    a.notable_collaborations ? `<div><b>Collaborations</b> ${esc(a.notable_collaborations)}</div>` : "",
    a.burning_man_history ? `<div><b>Burning Man history</b> ${esc(a.burning_man_history)}</div>` : "",
  ].filter(Boolean);
  if (!rows.length) return "";
  return `<div class="notable">${rows.join("\n")}</div>`;
}

function allPerformancesOf(artistId) {
  return model.perfs.filter((p) => p.artist_id === artistId).sort((a, b) => (a.global_sort_key ?? 0) - (b.global_sort_key ?? 0));
}

function performanceListBlock(artistId) {
  const perfs = allPerformancesOf(artistId);
  if (!perfs.length) return `<div class="perf-row perf-empty">No confirmed set time in the source data.</div>`;
  return perfs
    .map((p) => `<div class="perf-row"><span class="perf-day">${esc(p.day_raw)}</span><span class="perf-time">${esc(p.set_time_raw)}</span><span class="perf-place">${esc(p.camp)}${p.location ? ` · ${esc(p.location)}` : ""}</span></div>`)
    .join("\n");
}

function fullEntryHtml(a) {
  const img = imageFor(a.artist_id);
  const about = aboutText(a);
  const genres = a.genre_tags?.length ? a.genre_tags.join(" · ") : "Genre not yet tagged";
  const geo = geoLine(a);
  const t = tier(a);

  const flag = img ? imageFlagFor(a.artist_id) : null;
  return `
  <article class="artist-entry" id="${esc(anchorId(a.artist_id))}">
    <div class="artist-photo-wrap">
      ${img ? `<img class="artist-photo" src="${esc(img)}" alt="${esc(a.artist)}" />` : `<div class="artist-photo artist-photo-missing"><span>IMAGE NOT FOUND</span></div>`}
    </div>
    ${flag ? `<div class="photo-flag">⚠ PHOTO UNVERIFIED — ${esc(flag)}</div>` : ""}
    <div class="artist-head">
      <h3>${esc(a.artist)}</h3>
      <div class="artist-tags">
        <span class="signal-pill signal-${t.toLowerCase()}">${SIGNAL_ICON[t]} ${SIGNAL_LABEL[t]}</span>
        <span class="type-pill">${esc(perfType(a))}</span>
      </div>
      <div class="genres-line">${esc(genres)}</div>
      ${geo ? `<div class="geo-line">${countryFlag(a.country)}${esc(geo)}</div>` : ""}
    </div>

    ${about ? `<div class="section-block"><div class="block-label">ABOUT</div><p class="prose">${esc(about)}</p></div>` : `<div class="section-block"><p class="prose prose-empty">No biography collected yet — genuinely unknown, not omitted.</p></div>`}

    <div class="section-block"><div class="block-label">WHY BMRI THINKS THEY'RE INTERESTING</div><p class="prose why">${esc(whyInteresting(a))}</p></div>

    ${notableBlock(a)}

    <div class="section-block">
      <div class="block-label">BURNING MAN 2026</div>
      <div class="perfs">${performanceListBlock(a.artist_id)}</div>
    </div>

    ${linksBlock(a)}

    <div class="sources-line">${a.sources?.length ? `Sources: ${a.sources.length} linked${a.last_verified ? ` · verified ${esc(a.last_verified)}` : ""}` : "Sources: none linked yet"}</div>
  </article>`;
}

function backReferenceHtml(a, p) {
  return `<div class="backref"><span class="backref-time">${esc(p.set_time_raw)}</span> <a href="#${esc(anchorId(a.artist_id))}"><b>${esc(a.artist)}</b></a> · ${esc(p.camp)}${p.location ? ` · ${esc(p.location)}` : ""} <span class="backref-note">— see full profile ↑</span></div>`;
}

function daySectionHtml(d) {
  const quickRef = `<div class="table-scroll"><table class="quickref-table"><thead><tr><th>Time</th><th>Artist</th><th>Style</th><th>Signal</th><th>Type</th><th>Camp</th><th>Location</th></tr></thead><tbody>
    ${d.quickRef.map((r) => `<tr><td>${esc(r.time)}</td><td><a href="#${esc(r.anchor)}">${esc(r.artist)}</a></td><td>${esc(r.style)}</td><td>${esc(r.signal)}</td><td>${esc(r.type)}</td><td>${esc(r.camp)}</td><td>${esc(r.location)}</td></tr>`).join("\n")}
  </tbody></table></div>`;

  const glance = `
  <div class="day-glance">
    ${d.dominantGenres.length ? `<p>A ${esc(d.label)} leaning toward: <b>${d.dominantGenres.map(esc).join(", ")}</b>.</p>` : ""}
    ${d.establishedHighlights.length ? `<p><b>Established highlights:</b> ${d.establishedHighlights.map(esc).join(", ")}</p>` : ""}
    ${d.emergingDiscoveries.length ? `<p><b>Emerging discoveries:</b> ${d.emergingDiscoveries.map(esc).join(", ")}</p>` : ""}
    ${d.wildcardsToday.length ? `<p><b>Wildcards:</b> ${d.wildcardsToday.map(esc).join(", ")}</p>` : ""}
  </div>`;

  const timeline = d.slots
    .map((slot) => {
      const primaries = slot.performances.filter((x) => x.isPrimary);
      const backrefs = slot.performances.filter((x) => !x.isPrimary);
      return `
      <div class="time-slot">
        <div class="time-heading">${esc(slot.timeLabel)}</div>
        ${primaries.map((x) => fullEntryHtml(x.artist)).join("\n")}
        ${backrefs.map((x) => backReferenceHtml(x.artist, x.performance)).join("\n")}
      </div>`;
    })
    .join("\n");

  return `
  <section class="day-section" id="day-${esc(d.day)}">
    <div class="day-header">
      <div class="day-eyebrow">${esc(d.date)}</div>
      <h2 class="day-title">${esc(d.label.toUpperCase())}</h2>
    </div>
    ${glance}
    ${quickRef}
    ${timeline}
  </section>`;
}

function artistIndexHtml() {
  const all = [...established, ...emerging].sort((a, b) => a.artist.localeCompare(b.artist));
  let lastLetter = null;
  const rows = all
    .map((a) => {
      const letter = a.artist[0].toUpperCase();
      const heading = letter !== lastLetter ? `<div class="index-letter">${letter}</div>` : "";
      lastLetter = letter;
      return heading + `<a class="index-row" href="#${esc(anchorId(a.artist_id))}">${esc(a.artist)} <span class="index-tag">${tier(a)}</span></a>`;
    })
    .join("\n");
  return `<section class="top-section" id="artist-index"><h2 class="plain">Artist Index</h2>${rows}</section>`;
}

function genreIndexHtml() {
  const genres = [...genreIndex.keys()].sort();
  const rows = genres
    .map((g) => {
      const names = genreIndex
        .get(g)
        .sort((a, b) => a.artist.localeCompare(b.artist))
        .map((a) => `<a href="#${esc(anchorId(a.artist_id))}">${esc(a.artist)}</a>`)
        .join(" ");
      return `<div class="group-row"><span class="group-label">${esc(g)}</span><span class="group-items">${names}</span></div>`;
    })
    .join("\n");
  return `<section class="top-section" id="genre-index"><h2 class="plain">Genre Index</h2>${rows}</section>`;
}

function wildcardSectionHtml() {
  const rows = wildcards
    .map((a) => {
      const perfs = allPerformancesOf(a.artist_id);
      const first = perfs[0];
      const disc = a.bio || [a.discovery_note, a.catalogue_signal, a.external_signal].filter(Boolean).join(" ");
      return `<div class="wildcard-row">
        <b>${esc(a.artist)}</b> ${first ? `<span class="wildcard-when">${esc(first.day_raw)} @ ${esc(first.set_time_raw)} · ${esc(first.camp)}</span>` : ""}
        <p class="prose">${esc(disc)}</p>
      </div>`;
    })
    .join("\n");
  return `<section class="top-section" id="wildcards"><h2 class="plain">Wildcard / Discovery <span class="count">(${wildcards.length} of ${model.artists.filter((a) => tier(a) === "UNKNOWN").length} unknown-signal artists with a research note)</span></h2>
    <p class="prose">Unknown does not mean bad — it means BMRI hasn't found external signal yet. These have at least a preliminary note; the rest of the unknown-signal roster is browsable in the app.</p>
    ${rows}
  </section>`;
}

const generatedAt = new Date().toISOString().slice(0, 10);
const totalPerfPeople = established.length + emerging.length;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>BMRI 2026 — The Burning Man Music Field Guide</title>
<style>
  :root {
    --bg: #08080b; --surface: #101015; --line: rgba(255,255,255,0.1);
    --text: #f4f1ec; --text-dim: #a5a2ac; --text-faint: #686671;
    --gold: #f3c85b; --signal: #76f7d5; --ultraviolet: #b993ff; --established: #d8ff38;
  }
  * { box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0 5% 100px; max-width: 780px; margin-inline: auto; -webkit-font-smoothing: antialiased; line-height: 1.5; }
  a { color: var(--gold); }

  /* ---- cover ---- */
  header.cover {
    position: relative; width: 100vw; margin-left: calc(-50vw + 50%);
    min-height: 100vh; min-height: 100dvh;
    display: flex; flex-direction: column; justify-content: flex-end;
    background: url("images/cover/cover-bg.jpg") center 30% / cover no-repeat;
    padding: 0;
  }
  .cover-scrim { background: linear-gradient(180deg, rgba(8,8,11,0) 0%, rgba(8,8,11,0.55) 45%, rgba(8,8,11,0.96) 100%); padding: 30vh 8% 40px; text-align: center; }
  /* Cover text always sits on a dark photo scrim, in both screen and print
     modes — colors are hardcoded here rather than themed, so the print
     stylesheet's light-mode text-color flip below can't make them illegible. */
  .cover-mark { font-size: 15px; font-weight: 800; letter-spacing: 4px; color: #f3c85b; }
  .cover-title { font-size: 44px; font-weight: 900; letter-spacing: -1px; margin: 14px 0 4px; color: #f4f1ec; text-shadow: 0 2px 20px rgba(0,0,0,0.6); }
  .cover-subtitle { font-size: 14px; font-weight: 700; letter-spacing: 3px; color: #cfcbd6; text-transform: uppercase; }
  .cover-year { font-size: 13px; color: #a5a2ac; margin-top: 26px; }
  .cover-credit { font-size: 9.5px; color: #a5a2ac; text-align: center; padding: 6px 8% 10px; background: #08080b; }

  section.top-section { padding: 30px 0; border-bottom: 1px solid var(--line); }
  h2.plain { font-size: 22px; font-weight: 800; margin: 0 0 12px; }
  h2.plain .count { font-weight: 500; color: var(--text-faint); font-size: 14px; }
  .prose { font-size: 15px; line-height: 1.65; color: var(--text); margin: 8px 0; }
  .prose-empty { color: var(--text-faint); font-style: italic; }
  nav.master-toc { display: flex; flex-direction: column; gap: 7px; font-size: 15px; }
  nav.master-toc a { color: var(--gold); font-weight: 700; text-decoration: none; }
  nav.master-toc .toc-sub { padding-left: 16px; font-weight: 500; color: var(--text-dim); font-size: 13px; }

  /* ---- day sections ---- */
  .day-section { padding-top: 50px; }
  .day-header { text-align: center; padding-bottom: 14px; }
  .day-eyebrow { font-size: 12px; letter-spacing: 2px; color: var(--text-faint); }
  .day-title { font-size: 40px; font-weight: 900; margin: 4px 0 0; letter-spacing: 1px; }
  .day-glance { background: var(--surface); border-radius: 14px; padding: 16px 18px; margin: 18px 0; font-size: 13.5px; color: var(--text-dim); }
  .day-glance p { margin: 4px 0; }
  .day-glance b { color: var(--text); }
  .table-scroll { overflow-x: auto; margin: 18px 0 30px; }
  .quickref-table { width: 100%; min-width: 620px; border-collapse: collapse; font-size: 12px; }
  .quickref-table th { text-align: left; color: var(--text-faint); font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; padding: 6px 8px; border-bottom: 1px solid var(--line); }
  .quickref-table td { padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,0.06); color: var(--text-dim); }
  .quickref-table td a { color: var(--text); font-weight: 700; text-decoration: none; }

  .time-slot { margin-top: 36px; }
  .time-heading { font-size: 13px; font-weight: 800; letter-spacing: 1.5px; color: var(--gold); text-transform: uppercase; border-bottom: 1px solid var(--line); padding-bottom: 8px; margin-bottom: 18px; }

  /* ---- artist entry ---- */
  .artist-entry { margin-bottom: 34px; page-break-inside: avoid; break-inside: avoid; }
  .artist-photo-wrap { width: 100%; aspect-ratio: 4 / 3; border-radius: 14px; overflow: hidden; background: var(--surface); margin-bottom: 14px; }
  .artist-photo { width: 100%; height: 100%; object-fit: cover; display: block; }
  .artist-photo-missing { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-faint); font-size: 11px; font-weight: 800; letter-spacing: 1px; border: 1px dashed var(--line); }
  .photo-flag { font-size: 11px; font-weight: 700; color: #ffb14e; background: rgba(255,177,78,0.1); border: 1px solid rgba(255,177,78,0.35); border-radius: 8px; padding: 6px 10px; margin-bottom: 10px; }
  .artist-head h3 { font-size: 26px; font-weight: 900; margin: 0 0 6px; letter-spacing: -0.3px; }
  .artist-tags { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; flex-wrap: wrap; }
  .signal-pill { font-size: 11px; font-weight: 800; letter-spacing: 0.4px; padding: 3px 10px; border-radius: 999px; border: 1px solid currentColor; }
  .signal-established { color: var(--established); }
  .signal-emerging { color: var(--gold); }
  .signal-unknown { color: var(--ultraviolet); }
  .type-pill { font-size: 11px; font-weight: 700; color: var(--text-dim); border: 1px solid var(--line); border-radius: 999px; padding: 3px 10px; }
  .genres-line { font-size: 13px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.3px; }
  .geo-line { font-size: 13px; color: var(--text-faint); margin-top: 2px; }
  .section-block { margin-top: 16px; }
  .block-label { font-size: 10.5px; font-weight: 800; letter-spacing: 1px; color: var(--text-faint); text-transform: uppercase; margin-bottom: 4px; }
  .prose.why { color: var(--text-dim); font-style: italic; }
  .notable { font-size: 13px; color: var(--text-dim); line-height: 1.6; margin-top: 14px; }
  .notable b { color: var(--text-faint); font-weight: 800; font-size: 11px; text-transform: uppercase; margin-right: 6px; }
  .perfs { margin-top: 4px; }
  .perf-row { display: flex; gap: 10px; font-size: 13px; padding: 4px 0; flex-wrap: wrap; align-items: baseline; }
  .perf-day { color: var(--gold); font-weight: 800; white-space: nowrap; flex-shrink: 0; }
  .perf-time { color: var(--text); font-weight: 700; white-space: nowrap; flex-shrink: 0; }
  .perf-place { color: var(--text-dim); }
  .perf-empty { color: var(--text-faint); font-style: italic; }
  .listen { margin-top: 14px; }
  .listen-label { font-size: 10.5px; font-weight: 800; letter-spacing: 1px; color: var(--text-faint); text-transform: uppercase; margin-bottom: 4px; }
  .listen-links a { margin-right: 4px; font-size: 13px; }
  .sources-line { font-size: 10.5px; color: var(--text-faint); margin-top: 10px; }

  .backref { font-size: 13px; color: var(--text-dim); padding: 8px 0; border-bottom: 1px solid var(--line); }
  .backref-time { color: var(--gold); font-weight: 700; margin-right: 6px; }
  .backref-note { color: var(--text-faint); font-style: italic; }

  /* ---- indexes ---- */
  .index-letter { font-size: 11px; font-weight: 800; color: var(--text-faint); letter-spacing: 1px; margin: 18px 0 4px; }
  .index-row { display: block; padding: 6px 0; text-decoration: none; color: var(--text); font-size: 14px; border-bottom: 1px solid var(--line); }
  .index-tag { color: var(--text-faint); font-size: 10px; margin-left: 6px; }
  .group-row { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--line); font-size: 13px; }
  .group-label { flex: 0 0 170px; font-weight: 800; color: var(--gold); font-size: 11px; text-transform: uppercase; }
  .group-items a { color: var(--text-dim); text-decoration: none; margin-right: 4px; }
  .group-items a:not(:last-child)::after { content: ","; color: var(--text-faint); }
  .wildcard-row { padding: 14px 0; border-bottom: 1px solid var(--line); }
  .wildcard-when { color: var(--text-faint); font-size: 12px; margin-left: 8px; }

  #search-box { width: 100%; margin-top: 20px; padding: 12px 14px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; color: var(--text); font-size: 15px; }

  @media print {
    body { color: #111; background: #fff; max-width: none; padding: 0 6%; }
    :root { --text: #111; --text-dim: #333; --text-faint: #666; --gold: #7a5b00; --line: #ccc; --established: #2d6b00; --ultraviolet: #5a2fa0; }
    #search-box { display: none; }
    header.cover { break-after: page; }
    #contents { break-after: page; }
    .day-section { break-before: page; }
    .artist-entry { break-inside: avoid; }
    a { color: #111; text-decoration: underline; }
  }
</style>
</head>
<body>

  <header class="cover">
    <div class="cover-scrim">
      <div class="cover-mark">BMRI</div>
      <div class="cover-title">Burning Man<br/>Rave Intelligence</div>
      <div class="cover-subtitle">The Burning Man Music Field Guide</div>
      <div class="cover-year">2026 Edition · Generated ${esc(generatedAt)}</div>
    </div>
    <div class="cover-credit">Photo: "Burning Man – Festival – Night – DJ Michel von Tell" by Tituous, CC BY 4.0, via Wikimedia Commons</div>
  </header>
  <input id="search-box" type="text" placeholder="Search artist or genre… (Cmd/Ctrl-F also works)" oninput="filterEntries(this.value)" />

  <section class="top-section" id="introduction">
    <h2 class="plain">Introduction</h2>
    <p class="prose">This is your personal Mixmag for Burning Man 2026 — every Established and Emerging artist BMRI has real intelligence on, walked through chronologically, day by day, exactly as you'll encounter them on playa. ${totalPerfPeople} artists, in the order you'd actually hear them.</p>
    <p class="prose">If the interactive BMRI app fails you out there, this book doesn't need it. Everything here comes from the same dataset, generated fresh, not maintained twice.</p>
  </section>

  <section class="top-section" id="how-to-read">
    <h2 class="plain">How to Read BMRI</h2>
    <p class="prose"><b style="color:var(--established)">Established</b> — a documented, independent music career. <b style="color:var(--gold)">Emerging</b> — a real, smaller catalogue. <b style="color:var(--ultraviolet)">Unknown</b> — no external signal found yet. Unknown does not mean bad; it means undocumented.</p>
    <p class="prose">Each day opens with a quick-reference table for scanning, then the full lineup in order. The first time you meet an artist in the book, you get their full profile — photo, biography, why they're worth seeing, every set they're playing. If they play again later, you'll see a one-line pointer back up to that profile instead of reading the same bio twice.</p>
    <p class="prose">Locations are the original RSL address strings where given. Camp placement is reassigned every year — treat any address as approximate.</p>
    <p class="prose"><b>A note on photos:</b> artist images were sourced automatically from public profiles (SoundCloud, Bandcamp, official websites) and were not hand-verified against a confirmed identity photo for every one of the 147 entries. Most are high-confidence official avatars, but ${Object.keys(FLAGGED_IMAGES).length} are flagged below their photo as unverified — including one reported directly by a human reviewer. If you spot a wrong photo anywhere in this book, treat it as a sourcing error, not an intentional misrepresentation, and let BMRI know.</p>
  </section>

  <section class="top-section" id="contents">
    <h2 class="plain">Contents</h2>
    <nav class="master-toc">
      <a href="#introduction">Introduction</a>
      <a href="#how-to-read">How to Read BMRI</a>
      ${days.map((d) => `<a href="#day-${esc(d.day)}">${esc(d.label)}</a>`).join("\n")}
      <a href="#artist-index">Artist Index</a>
      <a href="#genre-index">Genre Index</a>
      <a href="#wildcards">Wildcard / Discovery</a>
      <a href="#sources">Sources</a>
    </nav>
  </section>

  ${days.map(daySectionHtml).join("\n")}

  ${artistIndexHtml()}
  ${genreIndexHtml()}
  ${wildcardSectionHtml()}

  <section class="top-section" id="sources">
    <h2 class="plain">Sources</h2>
    <p class="prose">Built from the RSL 2026 Burning Man music guide and independent research linked per artist above. Nothing in this book is fabricated — a missing field means the information isn't known yet, not that it was skipped.</p>
  </section>

  <script>
    function filterEntries(q) {
      q = q.trim().toLowerCase();
      document.querySelectorAll('.artist-entry').forEach(function (el) {
        var text = el.textContent.toLowerCase();
        el.style.display = !q || text.indexOf(q) !== -1 ? '' : 'none';
      });
    }
  </script>
</body>
</html>
`;

writeFileSync(outPath, html, "utf8");
console.log(`Wrote ${outPath} (${(html.length / 1024).toFixed(0)} KB)`);
console.log(`Days: ${days.length}, Established: ${established.length}, Emerging: ${emerging.length}, Wildcards: ${wildcards.length}`);
const imagesFound = [...established, ...emerging].filter((a) => imageFor(a.artist_id)).length;
console.log(`Images found on disk: ${imagesFound} / ${established.length + emerging.length}`);
