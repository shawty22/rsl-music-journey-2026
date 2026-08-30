#!/usr/bin/env node
// BMRI 2026 Music Field Guide — EPUB3. Genuinely reflowable, day-based
// chapters built from the SAME shared model as the HTML/PDF generator
// (scripts/lib/field-guide-model.mjs), not a wrapped copy of the website.
// Hand-built as a structured zip — no epub library dependency.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { loadModel, tier, aboutText, whyInteresting, geoLine, perfType, imageFlagFor, FLAGGED_IMAGES } from "./lib/field-guide-model.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const imagesDir = path.join(ROOT, "app", "public", "images", "artists");
const outPath = path.join(ROOT, "app", "public", "BMRI-2026-Music-Field-Guide.epub");

const model = loadModel(ROOT, imagesDir);
const { established, emerging, wildcards, days, genreIndex, anchorId, imageFor } = model;

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function allPerformancesOf(artistId) {
  return model.perfs.filter((p) => p.artist_id === artistId).sort((a, b) => (a.global_sort_key ?? 0) - (b.global_sort_key ?? 0));
}

function notableBlock(a) {
  const rows = [
    a.labels ? `<p class="notable"><b>Labels</b> ${esc(a.labels)}</p>` : "",
    a.notable_releases ? `<p class="notable"><b>Notable releases</b> ${esc(a.notable_releases)}</p>` : "",
    a.notable_collaborations ? `<p class="notable"><b>Collaborations</b> ${esc(a.notable_collaborations)}</p>` : "",
    a.burning_man_history ? `<p class="notable"><b>Burning Man history</b> ${esc(a.burning_man_history)}</p>` : "",
  ].filter(Boolean);
  return rows.join("\n");
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
  return `<p class="listen"><b>Listen / explore</b> ${found.map(([key, label]) => `<a href="${esc(a[key])}">${esc(label)}</a>`).join(" &#183; ")}</p>`;
}

function performanceListXhtml(artistId) {
  const perfs = allPerformancesOf(artistId);
  if (!perfs.length) return `<p class="perf-empty">No confirmed set time in the source data.</p>`;
  return perfs.map((p) => `<p class="perf"><b>${esc(p.day_raw)} @ ${esc(p.set_time_raw)}</b> &#8212; ${esc(p.camp)}${p.location ? ` &#183; ${esc(p.location)}` : ""}</p>`).join("\n");
}

// image files actually referenced this build, copied into OEBPS/images/artists/
const usedImages = new Set();

function fullEntryXhtml(a) {
  const img = imageFor(a.artist_id);
  if (img) usedImages.add(a.artist_id);
  const about = aboutText(a);
  const genres = a.genre_tags?.length ? a.genre_tags.join(" &#183; ") : "Genre not yet tagged";
  const geo = geoLine(a);
  const t = tier(a);

  const flag = img ? imageFlagFor(a.artist_id) : null;
  return `
  <div class="entry" id="${esc(anchorId(a.artist_id))}">
    ${img ? `<img class="photo" src="images/artists/${esc(a.artist_id)}.jpg" alt="${esc(a.artist)}"/>` : `<div class="photo-missing">IMAGE NOT FOUND</div>`}
    ${flag ? `<p class="photo-flag">&#9888; PHOTO UNVERIFIED &#8212; ${esc(flag)}</p>` : ""}
    <h3>${esc(a.artist)}</h3>
    <p class="pills"><span class="pill pill-${t.toLowerCase()}">${t}</span> <span class="pill">${esc(perfType(a))}</span></p>
    <p class="genres">${esc(genres)}</p>
    ${geo ? `<p class="geo">${esc(geo)}</p>` : ""}
    <h4>About</h4>
    <p class="about">${about ? esc(about) : "No biography collected yet &#8212; genuinely unknown, not omitted."}</p>
    <h4>Why BMRI thinks they're interesting</h4>
    <p class="why">${esc(whyInteresting(a))}</p>
    ${notableBlock(a)}
    <h4>Burning Man 2026</h4>
    ${performanceListXhtml(a.artist_id)}
    ${linksBlock(a)}
    <p class="sources">${a.sources?.length ? `Sources: ${a.sources.length} linked${a.last_verified ? ` &#183; verified ${esc(a.last_verified)}` : ""}` : "Sources: none linked yet"}</p>
  </div>`;
}

function backRefXhtml(a, p) {
  return `<p class="backref"><b>${esc(p.set_time_raw)}</b> &#8212; <a href="#${esc(anchorId(a.artist_id))}">${esc(a.artist)}</a> &#183; ${esc(p.camp)}${p.location ? ` &#183; ${esc(p.location)}` : ""} <i>(see full profile above)</i></p>`;
}

function chapterXhtml(title, bodyHtml) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>${esc(title)}</title><link rel="stylesheet" type="text/css" href="styles.css"/></head>
<body>
${bodyHtml}
</body>
</html>`;
}

function dayChapterBody(d) {
  const glance = `
  <div class="glance">
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
      <div class="slot">
        <h2 class="time">${esc(slot.timeLabel)}</h2>
        ${primaries.map((x) => fullEntryXhtml(x.artist)).join("\n")}
        ${backrefs.map((x) => backRefXhtml(x.artist, x.performance)).join("\n")}
      </div>`;
    })
    .join("\n");

  return `<h1>${esc(d.label)} <span class="date">${esc(d.date)}</span></h1>${glance}${timeline}`;
}

function artistIndexBody() {
  const all = [...established, ...emerging].sort((a, b) => a.artist.localeCompare(b.artist));
  const rows = all.map((a) => `<p class="index-row"><a href="#${esc(anchorId(a.artist_id))}">${esc(a.artist)}</a> <span class="tag">${tier(a)}</span></p>`).join("\n");
  return `<h1>Artist Index</h1>${rows}`;
}

function genreIndexBody() {
  const genres = [...genreIndex.keys()].sort();
  const rows = genres
    .map((g) => {
      const names = genreIndex
        .get(g)
        .sort((a, b) => a.artist.localeCompare(b.artist))
        .map((a) => `<a href="#${esc(anchorId(a.artist_id))}">${esc(a.artist)}</a>`)
        .join(", ");
      return `<p class="group"><b>${esc(g)}</b><br/>${names}</p>`;
    })
    .join("\n");
  return `<h1>Genre Index</h1>${rows}`;
}

function wildcardsBody() {
  const total = model.artists.filter((a) => tier(a) === "UNKNOWN").length;
  const rows = wildcards
    .map((a) => {
      const perfs = allPerformancesOf(a.artist_id);
      const first = perfs[0];
      const disc = a.bio || [a.discovery_note, a.catalogue_signal, a.external_signal].filter(Boolean).join(" ");
      return `<div class="wildcard"><p><b>${esc(a.artist)}</b>${first ? ` <span class="wc-when">${esc(first.day_raw)} @ ${esc(first.set_time_raw)} &#183; ${esc(first.camp)}</span>` : ""}</p><p>${esc(disc)}</p></div>`;
    })
    .join("\n");
  return `<h1>Wildcard / Discovery</h1>
  <p>Unknown does not mean bad &#8212; it means BMRI hasn't found external signal yet. These ${wildcards.length} of ${total} unknown-signal artists have at least a preliminary research note; the rest of the unknown-signal roster is browsable in the app.</p>
  ${rows}`;
}

const generatedAt = new Date().toISOString().slice(0, 10);
const totalPrimary = established.length + emerging.length;

const coverImageBody = `
<div class="cover-image-page">
<img class="cover-photo" src="images/cover-bg.jpg" alt="A crowd dancing at Burning Man at night, fire in the background"/>
<p class="cover-photo-credit">Photo: "Burning Man &#8211; Festival &#8211; Night &#8211; DJ Michel von Tell" by Tituous, CC BY 4.0, via Wikimedia Commons</p>
</div>`;

const titlePageBody = `
<div class="cover">
<p class="mark">BMRI</p>
<h1>Burning Man<br/>Rave Intelligence</h1>
<p class="subtitle">THE BURNING MAN MUSIC FIELD GUIDE</p>
<p class="meta">2026 Edition &#183; Generated ${esc(generatedAt)}</p>
<p>This is your day-by-day guide to Burning Man 2026 &#8212; every Established and Emerging artist BMRI has real intelligence on, walked through chronologically, exactly as you'll encounter them on playa. ${totalPrimary} artists, in the order you'd actually hear them.</p>
<p>If the interactive BMRI app fails you out there, this book doesn't need it. Everything here comes from the same dataset, generated fresh, not maintained twice.</p>
</div>`;

const howToBody = `<h1>How to Read BMRI</h1>
<p><b>Established</b> &#8212; a documented, independent music career. <b>Emerging</b> &#8212; a real, smaller catalogue. <b>Unknown</b> &#8212; no external signal found yet. Unknown does not mean bad; it means undocumented.</p>
<p>Each day opens with the full lineup in chronological order. The first time you meet an artist in this book, you get their full profile &#8212; photo, biography, why they're worth seeing, every set they're playing. If they play again later, you'll see a one-line pointer back to that profile instead of reading the same bio twice.</p>
<p>Set locations shown throughout this book are current for 2026.</p>
<p><b>A note on photos:</b> artist images were sourced automatically from public profiles (SoundCloud, Bandcamp, official websites) and were not hand-verified against a confirmed identity photo for every one of the 147 entries. Most are high-confidence official avatars, but ${Object.keys(FLAGGED_IMAGES).length} are flagged below their photo as unverified &#8212; including one reported directly by a human reviewer. If you spot a wrong photo anywhere in this book, treat it as a sourcing error, not an intentional misrepresentation, and let BMRI know.</p>`;

const sourcesBody = `<h1>Sources</h1>
<p>Built from the RSL 2026 Burning Man music guide and independent research linked per artist throughout this book. Nothing in this book is fabricated &#8212; a missing field means the information isn't known yet, not that it was skipped.</p>`;

const css = `
body { font-family: Georgia, "Times New Roman", serif; color: #17171a; line-height: 1.5; margin: 0; padding: 0 5%; }
h1 { font-size: 1.8em; margin: 0.6em 0 0.3em; }
h1 .date { font-size: 0.5em; color: #777; font-weight: normal; display: block; }
h2.time { font-size: 1.05em; text-transform: uppercase; letter-spacing: 0.08em; color: #9c7300; border-bottom: 1px solid #ddd; padding-bottom: 0.2em; margin-top: 1.6em; }
h3 { font-size: 1.25em; margin: 0.6em 0 0.15em; }
h4 { font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.05em; color: #777; margin: 0.9em 0 0.15em; }
.cover { text-align: center; margin-top: 15%; }
.cover .mark { color: #9c7300; font-weight: bold; letter-spacing: 0.2em; }
.cover .subtitle { text-transform: uppercase; letter-spacing: 0.12em; color: #444; font-size: 0.9em; }
.cover .meta { color: #777; font-size: 0.85em; margin-bottom: 2em; }
.cover p { text-align: left; }
.cover-image-page { text-align: center; padding: 0; margin: 0; }
.cover-photo { width: 100%; height: auto; margin: 0; }
.cover-photo-credit { font-size: 0.7em; color: #999; padding: 0.5em 5%; text-align: center; }
.glance { background: #f4f2ec; padding: 0.8em 1em; margin: 0.8em 0; font-size: 0.9em; }
.glance p { margin: 0.25em 0; }
.photo { width: 100%; max-height: 60vh; object-fit: cover; }
.photo-missing { width: 100%; padding: 2em 0; text-align: center; border: 1px dashed #999; color: #777; font-size: 0.8em; letter-spacing: 0.05em; }
.pills { margin: 0.3em 0; }
.pill { display: inline-block; border: 1px solid #999; border-radius: 999px; padding: 0.05em 0.6em; font-size: 0.72em; letter-spacing: 0.03em; margin-right: 0.3em; }
.pill-established { border-color: #4c7a00; color: #4c7a00; }
.pill-emerging { border-color: #9c7300; color: #9c7300; }
.pill-unknown { border-color: #6a3fa0; color: #6a3fa0; }
.genres { text-transform: uppercase; font-size: 0.8em; color: #555; letter-spacing: 0.02em; margin: 0.1em 0; }
.geo { font-size: 0.85em; color: #777; margin: 0 0 0.4em; }
.about, .why { margin: 0.3em 0; }
.why { font-style: italic; color: #333; }
.notable, .perf, .listen { font-size: 0.88em; margin: 0.15em 0; }
.perf-empty { font-size: 0.88em; color: #777; font-style: italic; }
.entry { margin-bottom: 1.6em; padding-bottom: 1.1em; border-bottom: 1px solid #ddd; }
.photo-flag { font-size: 0.8em; font-weight: bold; color: #7a4a00; background: #fdf0dc; border: 1px solid #e0b877; border-radius: 6px; padding: 0.3em 0.6em; margin: 0.4em 0; }
.backref { font-size: 0.9em; color: #444; border-bottom: 1px solid #eee; padding: 0.3em 0; }
.sources { font-size: 0.75em; color: #999; margin-top: 0.5em; }
.index-row { margin: 0.2em 0; }
.index-row .tag { color: #999; font-size: 0.75em; }
.group { margin: 0.6em 0; font-size: 0.9em; }
.wildcard { margin: 0.8em 0; padding-bottom: 0.6em; border-bottom: 1px solid #eee; font-size: 0.92em; }
.wc-when { color: #777; font-size: 0.85em; }
`;

// ---- assemble ----
const tmp = mkdtempSync(path.join(os.tmpdir(), "bmri-epub-"));
const oebps = path.join(tmp, "OEBPS");
const metaInf = path.join(tmp, "META-INF");
const imgOut = path.join(oebps, "images", "artists");
mkdirSync(oebps, { recursive: true });
mkdirSync(metaInf, { recursive: true });
mkdirSync(imgOut, { recursive: true });

writeFileSync(path.join(tmp, "mimetype"), "application/epub+zip");
writeFileSync(
  path.join(metaInf, "container.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`,
);
writeFileSync(path.join(oebps, "styles.css"), css);
writeFileSync(path.join(oebps, "cover.xhtml"), chapterXhtml("BMRI 2026", coverImageBody));
writeFileSync(path.join(oebps, "title-page.xhtml"), chapterXhtml("BMRI 2026", titlePageBody));
writeFileSync(path.join(oebps, "how-to.xhtml"), chapterXhtml("How to Read BMRI", howToBody));

const coverImageSrc = path.join(ROOT, "app", "public", "images", "cover", "cover-bg.jpg");
if (existsSync(coverImageSrc)) copyFileSync(coverImageSrc, path.join(oebps, "images", "cover-bg.jpg"));

const dayChapters = days.map((d, i) => ({
  id: `day-${d.day}`,
  file: `day-${i + 1}-${d.day.toLowerCase()}.xhtml`,
  title: `${d.label} (${d.date})`,
  body: dayChapterBody(d),
}));
for (const c of dayChapters) writeFileSync(path.join(oebps, c.file), chapterXhtml(c.title, c.body));

writeFileSync(path.join(oebps, "artist-index.xhtml"), chapterXhtml("Artist Index", artistIndexBody()));
writeFileSync(path.join(oebps, "genre-index.xhtml"), chapterXhtml("Genre Index", genreIndexBody()));
writeFileSync(path.join(oebps, "wildcards.xhtml"), chapterXhtml("Wildcard / Discovery", wildcardsBody()));
writeFileSync(path.join(oebps, "sources.xhtml"), chapterXhtml("Sources", sourcesBody));

// copy only the images actually referenced by a full entry in this build
for (const id of usedImages) {
  const src = path.join(imagesDir, `${id}.jpg`);
  if (existsSync(src)) copyFileSync(src, path.join(imgOut, `${id}.jpg`));
}

const chapters = [
  { id: "cover", file: "cover.xhtml", title: "Cover" },
  { id: "titlepage", file: "title-page.xhtml", title: "BMRI 2026" },
  { id: "howto", file: "how-to.xhtml", title: "How to Read BMRI" },
  ...dayChapters,
  { id: "artist-index", file: "artist-index.xhtml", title: "Artist Index" },
  { id: "genre-index", file: "genre-index.xhtml", title: "Genre Index" },
  { id: "wildcards", file: "wildcards.xhtml", title: "Wildcard / Discovery" },
  { id: "sources", file: "sources.xhtml", title: "Sources" },
];

writeFileSync(
  path.join(oebps, "nav.xhtml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Contents</title><link rel="stylesheet" type="text/css" href="styles.css"/></head>
<body>
<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>
${chapters.map((c) => `<li><a href="${c.file}">${esc(c.title)}</a></li>`).join("\n")}
</ol></nav>
</body>
</html>`,
);

writeFileSync(
  path.join(oebps, "toc.ncx"),
  `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="urn:uuid:bmri-2026-field-guide"/></head>
  <docTitle><text>BMRI 2026 — The Burning Man Music Field Guide</text></docTitle>
  <navMap>
${chapters.map((c, i) => `    <navPoint id="np-${c.id}" playOrder="${i + 1}"><navLabel><text>${esc(c.title)}</text></navLabel><content src="${c.file}"/></navPoint>`).join("\n")}
  </navMap>
</ncx>`,
);

const imageManifestItems = [...usedImages].map((id) => `    <item id="img-${id}" href="images/artists/${id}.jpg" media-type="image/jpeg"/>`).join("\n");

writeFileSync(
  path.join(oebps, "content.opf"),
  `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:bmri-2026-field-guide</dc:identifier>
    <dc:title>BMRI 2026 — The Burning Man Music Field Guide</dc:title>
    <dc:language>en</dc:language>
    <dc:creator>BMRI — Burning Man Rave Intelligence</dc:creator>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</meta>
    <meta name="cover" content="img-cover-bg"/>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="styles.css" media-type="text/css"/>
    <item id="img-cover-bg" href="images/cover-bg.jpg" media-type="image/jpeg" properties="cover-image"/>
${chapters.map((c) => `    <item id="${c.id}" href="${c.file}" media-type="application/xhtml+xml"/>`).join("\n")}
${imageManifestItems}
  </manifest>
  <spine toc="ncx">
${chapters.map((c) => `    <itemref idref="${c.id}"/>`).join("\n")}
  </spine>
</package>`,
);

execFileSync("rm", ["-f", outPath]);
execFileSync("zip", ["-X", "-0", outPath, "mimetype"], { cwd: tmp });
execFileSync("zip", ["-X", "-r", "-9", outPath, "META-INF", "OEBPS"], { cwd: tmp });
rmSync(tmp, { recursive: true, force: true });

console.log(`Wrote ${outPath}`);
console.log(`Chapters: ${chapters.length} (${dayChapters.length} day chapters), images embedded: ${usedImages.size}`);
