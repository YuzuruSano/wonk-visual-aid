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

  // Bridges: wherever the avenue crosses the river, span it — the literal "またぐ".
  const avPts = avenueSlugs.map((s) => { const d = placed.find((p) => p.slug === s); return [cx(d), cy(d)]; });
  const bridges = [];
  for (let i = 0; i < avPts.length - 1; i++) {
    for (let j = 0; j < river.length - 1; j++) {
      const X = segInt(avPts[i], avPts[i + 1], river[j], river[j + 1]);
      if (X) {
        const ang = Math.atan2(avPts[i + 1][1] - avPts[i][1], avPts[i + 1][0] - avPts[i][0]);
        bridges.push({ type: 'bridge', at: [+X[0].toFixed(2), +X[1].toFixed(2)], angle: +ang.toFixed(3), h: 1.4 });
      }
    }
  }

  // Tributaries: the great river sends an offshoot into each district it runs
  // close to — wiring the city-spanning water into the neighbourhoods.
  const tributaries = [];
  for (const d of placed) {
    const c = [cx(d), cy(d)];
    let best = null, bd = Infinity;
    for (let j = 0; j < river.length - 1; j++) {
      const q = closestOnSeg(c, river[j], river[j + 1]);
      const dd = Math.hypot(c[0] - q[0], c[1] - q[1]);
      if (dd < bd) { bd = dd; best = q; }
    }
    const reach = Math.max(d.size.w, d.size.h) / 2 + 3.5;
    if (best && bd < reach && bd > 0.5) {
      const half = Math.max(d.size.w, d.size.h) / 2 * 0.85;
      const ux = (c[0] - best[0]) / bd, uy = (c[1] - best[1]) / bd;
      const edge = [c[0] - ux * half, c[1] - uy * half]; // stop at the district's edge
      tributaries.push({ type: 'tributary', path: [[+best[0].toFixed(2), +best[1].toFixed(2)], [+edge[0].toFixed(2), +edge[1].toFixed(2)]] });
    }
  }

  return [{ type: 'avenue', slugs: avenueSlugs }, { type: 'river', path: river }, ...bridges, ...tributaries];
}

// segment/segment intersection (grid coords) -> point or null
function segInt(p1, p2, p3, p4) {
  const d = (p4[1] - p3[1]) * (p2[0] - p1[0]) - (p4[0] - p3[0]) * (p2[1] - p1[1]);
  if (Math.abs(d) < 1e-9) return null;
  const ua = ((p4[0] - p3[0]) * (p1[1] - p3[1]) - (p4[1] - p3[1]) * (p1[0] - p3[0])) / d;
  const ub = ((p2[0] - p1[0]) * (p1[1] - p3[1]) - (p2[1] - p1[1]) * (p1[0] - p3[0])) / d;
  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) return null;
  return [p1[0] + ua * (p2[0] - p1[0]), p1[1] + ua * (p2[1] - p1[1])];
}
// closest point on segment ab to point p
function closestOnSeg(p, a, b) {
  const abx = b[0] - a[0], aby = b[1] - a[1];
  const t2 = Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / (abx * abx + aby * aby || 1)));
  return [a[0] + abx * t2, a[1] + aby * t2];
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
