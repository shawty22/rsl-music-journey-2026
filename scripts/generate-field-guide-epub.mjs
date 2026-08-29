#!/usr/bin/env node
// Hand-built EPUB3 (no external epub library — it's just a structured zip of
// XHTML). Same source data, same content decisions as generate-artist-guide.mjs
// (kept as a light duplication rather than a shared import, to keep each
// generator simple and independently readable). Built with Node's built-in
// zlib, no new dependency.

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data", "normalized");
const outPath = path.join(__dirname, "..", "app", "public", "BMRI-Field-Guide-2026.epub");

const artists = JSON.parse(readFileSync(path.join(dataDir, "artists.json"), "utf8"));
const performances = JSON.parse(readFileSync(path.join(dataDir, "performances.json"), "utf8"));

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
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function aboutText(a) {
  return a.bio || [a.discovery_note, a.catalogue_signal, a.external_signal].filter(Boolean).join(" ") || null;
}
function geoLine(a) {
  const parts = [a.city, a.state_region, a.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "Unknown";
}
const PERF_TYPE_LABEL = { DJ: "DJ", LIVE: "Live", HYBRID: "Hybrid", B2B: "B2B", LIVE_BAND: "Live Band", VOCALIST: "Vocalist", PERFORMANCE_MULTIMEDIA: "Multimedia", UNKNOWN: "Unknown" };
function perfType(a) {
  return PERF_TYPE_LABEL[a.performance_type] || "Unknown";
}

const established = artists.filter((a) => tier(a) === "ESTABLISHED").sort((a, b) => a.artist.localeCompare(b.artist));
const emerging = artists.filter((a) => tier(a) === "EMERGING").sort((a, b) => a.artist.localeCompare(b.artist));
const wildcards = artists.filter((a) => tier(a) === "UNKNOWN" && aboutText(a)).sort((a, b) => a.artist.localeCompare(b.artist));
const unknownTotal = artists.filter((a) => tier(a) === "UNKNOWN").length;

function entryXhtml(a) {
  const about = aboutText(a);
  const genres = a.genre_tags?.length ? a.genre_tags.join(" / ") : "genre not yet tagged";
  const perfs = perfsByArtist.get(a.artist_id) || [];
  const perfRows = perfs.length
    ? perfs.map((p) => `<p class="perf"><b>${esc(p.day_raw)} @ ${esc(p.set_time_raw)}</b> — ${esc(p.camp)}${p.location ? ` · ${esc(p.location)}` : ""}</p>`).join("\n")
    : `<p class="perf-empty">No confirmed set time in the source data.</p>`;
  const notable = [
    a.labels ? `<p class="notable"><b>Labels:</b> ${esc(a.labels)}</p>` : "",
    a.notable_releases ? `<p class="notable"><b>Releases:</b> ${esc(a.notable_releases)}</p>` : "",
    a.notable_collaborations ? `<p class="notable"><b>Collaborations:</b> ${esc(a.notable_collaborations)}</p>` : "",
  ].join("\n");
  return `
  <div class="entry">
    <h3>${esc(a.artist)}</h3>
    <p class="genres">${esc(genres)} · ${esc(perfType(a))}</p>
    <p class="geo">${esc(geoLine(a))}</p>
    <p class="about">${about ? esc(about) : "No biography collected yet."}</p>
    ${notable}
    ${perfRows}
  </div>`;
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

const generatedAt = new Date().toISOString().slice(0, 10);

const coverBody = `
<h1>BMRI</h1>
<h2 class="subtitle">Burning Man Rave Intelligence</h2>
<h2 class="subtitle">2026 Field Guide</h2>
<p>Every Established and Emerging artist's real bio/discovery intel and confirmed set times, camps, and locations, plus a curated set of Wildcards — from the same dataset the BMRI app uses.</p>
<p class="meta">Generated ${generatedAt}. Nothing here is invented — a blank field means the data isn't known yet, not that it's bad.</p>`;

const howToBody = `
<h2>How to use BMRI</h2>
<p><b>Signal status</b> is a fact about the artist: <b>Established</b> — a documented, independent music career. <b>Emerging</b> — a real, smaller catalogue. <b>Unknown</b> — no external signal found yet. Unknown does not mean bad.</p>
<p><b>Discovery role</b> (used in the app) is a judgment, not a fact: Strong Match, Discovery, or Wildcard.</p>
<p>Locations are the original RSL address strings where given. Camp placement is reassigned every year — treat any address as approximate.</p>`;

function tierChapterBody(title, list) {
  return `<h2>${esc(title)} (${list.length})</h2>` + list.map(entryXhtml).join("\n");
}

const wildcardsBody =
  `<h2>Wildcards (${wildcards.length} of ${unknownTotal} unknown-signal artists)</h2>` +
  `<p>Unknown does not mean bad — these ${wildcards.length} have at least a preliminary research note; the other ${unknownTotal - wildcards.length} have nothing beyond a name and a set time. Browse the full roster in the app.</p>` +
  wildcards.map(entryXhtml).join("\n");

const css = `
body { font-family: Georgia, "Times New Roman", serif; color: #1a1a1a; line-height: 1.5; padding: 0 4%; }
h1 { font-size: 2.2em; margin-bottom: 0.1em; }
h2 { font-size: 1.3em; color: #7a5b00; margin-top: 1.4em; }
h2.subtitle { font-size: 1em; color: #444; margin: 0; font-weight: normal; }
h3 { font-size: 1.15em; margin-bottom: 0.1em; }
.genres { text-transform: uppercase; font-size: 0.8em; color: #555; letter-spacing: 0.02em; margin: 0.1em 0; }
.geo { font-size: 0.85em; color: #777; margin: 0 0 0.4em; }
.about { margin: 0.4em 0; }
.notable, .perf { font-size: 0.9em; margin: 0.15em 0; }
.perf-empty { font-size: 0.9em; color: #777; font-style: italic; }
.entry { margin-bottom: 1.4em; padding-bottom: 1em; border-bottom: 1px solid #ddd; }
.meta { font-size: 0.85em; color: #666; }
`;

// ---- assemble the zip by hand (mimetype must be first & stored, not deflated) ----
const tmp = mkdtempSync(path.join(os.tmpdir(), "bmri-epub-"));
const oebps = path.join(tmp, "OEBPS");
const metaInf = path.join(tmp, "META-INF");
execFileSync("mkdir", ["-p", oebps, metaInf]);

writeFileSync(path.join(tmp, "mimetype"), "application/epub+zip");
writeFileSync(
  path.join(metaInf, "container.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`,
);
writeFileSync(path.join(oebps, "styles.css"), css);
writeFileSync(path.join(oebps, "cover.xhtml"), chapterXhtml("BMRI Field Guide", coverBody));
writeFileSync(path.join(oebps, "how-to.xhtml"), chapterXhtml("How to use BMRI", howToBody));
writeFileSync(path.join(oebps, "established.xhtml"), chapterXhtml("Established Artists", tierChapterBody("Established Artists", established)));
writeFileSync(path.join(oebps, "emerging.xhtml"), chapterXhtml("Emerging Artists", tierChapterBody("Emerging Artists", emerging)));
writeFileSync(path.join(oebps, "wildcards.xhtml"), chapterXhtml("Wildcards", wildcardsBody));

const chapters = [
  { id: "cover", file: "cover.xhtml", title: "BMRI Field Guide" },
  { id: "howto", file: "how-to.xhtml", title: "How to use BMRI" },
  { id: "established", file: "established.xhtml", title: `Established Artists (${established.length})` },
  { id: "emerging", file: "emerging.xhtml", title: `Emerging Artists (${emerging.length})` },
  { id: "wildcards", file: "wildcards.xhtml", title: `Wildcards (${wildcards.length})` },
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
  <head><meta name="dtb:uid" content="urn:uuid:bmri-field-guide-2026"/></head>
  <docTitle><text>BMRI Field Guide 2026</text></docTitle>
  <navMap>
${chapters.map((c, i) => `    <navPoint id="np-${c.id}" playOrder="${i + 1}"><navLabel><text>${esc(c.title)}</text></navLabel><content src="${c.file}"/></navPoint>`).join("\n")}
  </navMap>
</ncx>`,
);

writeFileSync(
  path.join(oebps, "content.opf"),
  `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:bmri-field-guide-2026</dc:identifier>
    <dc:title>BMRI Field Guide 2026</dc:title>
    <dc:language>en</dc:language>
    <dc:creator>BMRI — Burning Man Rave Intelligence</dc:creator>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="styles.css" media-type="text/css"/>
${chapters.map((c) => `    <item id="${c.id}" href="${c.file}" media-type="application/xhtml+xml"/>`).join("\n")}
  </manifest>
  <spine toc="ncx">
${chapters.map((c) => `    <itemref idref="${c.id}"/>`).join("\n")}
  </spine>
</package>`,
);

// zip: mimetype first & stored (uncompressed), everything else deflated
execFileSync("rm", ["-f", outPath]);
execFileSync("zip", ["-X", "-0", outPath, "mimetype"], { cwd: tmp });
execFileSync("zip", ["-X", "-r", "-9", outPath, "META-INF", "OEBPS"], { cwd: tmp });
rmSync(tmp, { recursive: true, force: true });

console.log(`Wrote ${outPath}`);
