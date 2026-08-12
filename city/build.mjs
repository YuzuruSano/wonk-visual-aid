// WONK CITY — static site generator.
//
//   node city/build.mjs
//
// Reads content/<slug>/index.md (+ district.json if present, else procedural),
// computes the city layout, and emits a static site into ../docs:
//   docs/index.html          -> the interactive city map (article index)
//   docs/a/<slug>/index.html -> each article
//   docs/city.json           -> the map data the renderer reads
//   docs/assets/*            -> map.js / styles
//   docs/media/<slug>/*       -> copied article images

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listSlugs, readArticle, proceduralDistrict, CONTENT_DIR } from './generate.mjs';
import { layoutCity } from './lib/layout.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs');
const TPL = path.join(__dirname, 'templates');
const SITE = { name: 'WONK CITY', tagline: '記事を書くほど、都市になる。' };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function rmrf(p) { if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); }
function ensure(p) { fs.mkdirSync(p, { recursive: true }); }
function copyDir(src, dst) {
  ensure(dst);
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f), d = path.join(dst, f);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// ---- gather ----
const slugs = listSlugs();
if (!slugs.length) { console.error('No articles in city/content/. Nothing to build.'); process.exit(0); }
const articles = slugs.map(readArticle);

// ---- district descriptors (AI json if present, else procedural) ----
const districts = articles.map((a) => {
  const jsonPath = path.join(CONTENT_DIR, a.slug, 'district.json');
  let d;
  if (fs.existsSync(jsonPath)) {
    d = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    d.generatedBy = d.generatedBy || 'claude';
  } else {
    d = proceduralDistrict(a, articles);
  }
  // Attach article meta needed for layout + rendering.
  const founded = Date.parse(a.data.date || '2000-01-01') || 0;
  const w = Math.max(2, d.scale || 3);
  const h = Math.max(2, Math.round((d.scale || 3) * 0.8));
  return {
    ...d,
    title: a.data.title || a.slug,
    date: a.data.date || '',
    tags: a.data.tags || [],
    founded,
    size: { w, h },
    href: `a/${a.slug}/`,
    hasImage: a.images.length > 0,
  };
});

// ---- layout ----
const { placed, roads, bounds } = layoutCity(districts);

// ---- city-spanning connections (cross-district through-lines) ----
// The avenue is the timeline: it threads EVERY district in chronological order,
// so on the surface it reads as the main street and, when diving, the same line
// becomes the spiral shaft descending through all eras. The river meanders
// across the whole map through the gaps between neighbourhoods.
function cityConnections() {
  const avenueSlugs = [...placed].sort((a, b) => a.founded - b.founded || a.slug.localeCompare(b.slug)).map((d) => d.slug);
  // river: sweep left->right across the bounds, waving in y, nudged out of any
  // district footprint so it runs through the open ground between clusters.
  const cx = (d) => d.x + d.size.w / 2, cy = (d) => d.y + d.size.h / 2;
  const midY = placed.reduce((s, d) => s + cy(d), 0) / placed.length;
  const amp = Math.max(2, (bounds.maxY - bounds.minY) / 3);
  const river = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const gx = bounds.minX - 1 + t * (bounds.maxX - bounds.minX + 2);
    let gy = midY + Math.sin(t * Math.PI * 2.2) * amp;
    // push away from the nearest district centre so the river avoids buildings
    for (const d of placed) {
      const dx = gx - cx(d), dy = gy - cy(d), dist = Math.hypot(dx, dy);
      const clearance = Math.max(d.size.w, d.size.h) / 2 + 1.5;
      if (dist < clearance && dist > 0.01) gy += (dy / dist) * (clearance - dist);
    }
    river.push([+gx.toFixed(2), +gy.toFixed(2)]);
  }
  return [{ type: 'avenue', slugs: avenueSlugs }, { type: 'river', path: river }];
}

const cityData = {
  site: SITE,
  bounds,
  generatedAt: process.env.SOURCE_DATE || '',
  districts: placed.map((d) => ({
    slug: d.slug, title: d.title, date: d.date, tags: d.tags,
    archetype: d.archetype, palette: d.palette, landmarks: d.landmarks,
    height: d.height || 4, size: d.size, x: d.x, y: d.y,
    buildings: d.buildings || [], features: d.features || [],
    href: d.href, summary: d.aiSummary || '', generatedBy: d.generatedBy,
  })),
  roads,
  cityFeatures: cityConnections(),
};

// ---- emit ----
rmrf(OUT);
ensure(OUT);
ensure(path.join(OUT, 'assets'));
copyDir(TPL, path.join(OUT, 'assets'));
// remove page templates that shouldn't ship as-is
for (const junk of ['article.html', 'index.html']) {
  const p = path.join(OUT, 'assets', junk);
  if (fs.existsSync(p)) fs.rmSync(p);
}

fs.writeFileSync(path.join(OUT, 'city.json'), JSON.stringify(cityData, null, 2));

// copy media
for (const a of articles) {
  const mediaDst = path.join(OUT, 'media', a.slug);
  for (const f of fs.readdirSync(a.dir)) {
    if (/\.(png|jpe?g|gif|webp|svg|mp4|webm)$/i.test(f)) {
      ensure(mediaDst);
      fs.copyFileSync(path.join(a.dir, f), path.join(mediaDst, f));
    }
  }
}

// templates
const indexTpl = fs.readFileSync(path.join(TPL, 'index.html'), 'utf8');
const articleTpl = fs.readFileSync(path.join(TPL, 'article.html'), 'utf8');

// index (map) page
fs.writeFileSync(path.join(OUT, 'index.html'),
  indexTpl.replace(/{{SITE}}/g, esc(SITE.name))
          .replace(/{{TAGLINE}}/g, esc(SITE.tagline))
          .replace(/{{COUNT}}/g, String(placed.length)));

// article pages
for (const a of articles) {
  const d = cityData.districts.find((x) => x.slug === a.slug);
  const outDir = path.join(OUT, 'a', a.slug);
  ensure(outDir);
  // rewrite local image refs (./foo.png) to /media/<slug>/foo.png
  const bodyHtml = a.html.replace(/(src|href)="\.\/?([^"]+)"/g, (_m, attr, p) => `${attr}="../../media/${a.slug}/${p}"`);
  const neighbours = roads
    .filter((r) => r.from === a.slug || r.to === a.slug)
    .map((r) => (r.from === a.slug ? r.to : r.from))
    .map((s) => cityData.districts.find((x) => x.slug === s))
    .filter(Boolean);
  const nHtml = neighbours.length
    ? `<ul class="roads">${neighbours.map((n) => `<li><a href="../${n.slug}/">${esc(n.title)}</a> <span>${esc(n.archetype)}</span></li>`).join('')}</ul>`
    : '<p class="roads-empty">まだ接続された区画はない。</p>';

  const html = articleTpl
    .replace(/{{SITE}}/g, esc(SITE.name))
    .replace(/{{TITLE}}/g, esc(d.title))
    .replace(/{{DATE}}/g, esc(d.date))
    .replace(/{{ARCHETYPE}}/g, esc(d.archetype))
    .replace(/{{PRIMARY}}/g, esc(d.palette.primary))
    .replace(/{{SECONDARY}}/g, esc(d.palette.secondary))
    .replace(/{{GLOW}}/g, esc(d.palette.glow))
    .replace(/{{SUMMARY}}/g, esc(d.summary))
    .replace(/{{TAGS}}/g, (d.tags || []).map((t) => `<span class="tag">#${esc(t)}</span>`).join(' '))
    .replace(/{{LANDMARKS}}/g, (d.landmarks || []).map((l) => `<li>${esc(l)}</li>`).join(''))
    .replace(/{{GENBY}}/g, esc(d.generatedBy))
    .replace(/{{BODY}}/g, bodyHtml)
    .replace(/{{NEIGHBOURS}}/g, nHtml);
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
}

const aiCount = cityData.districts.filter((d) => d.generatedBy === 'claude').length;
console.log(`WONK CITY built -> docs/`);
console.log(`  districts : ${placed.length} (${aiCount} AI-generated, ${placed.length - aiCount} procedural)`);
console.log(`  roads     : ${roads.length}`);
console.log(`  bounds    : ${bounds.maxX - bounds.minX} x ${bounds.maxY - bounds.minY} cells`);
