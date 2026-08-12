// District generator.
//
// A "district descriptor" turns one article into a piece of city. There are
// two ways to produce it:
//
//   1. AI (Claude)  — reads the article body AND its attached images, then
//      writes a rich `district.json` (real palette from the images, an
//      archetype that fits the writing, thematic roads to related articles).
//      Run:  node city/generate.mjs prompt <slug>   -> prints the prompt to
//      hand to Claude Code; paste Claude's JSON into content/<slug>/district.json
//
//   2. Procedural — a deterministic fallback derived from the text alone, so
//      the city always builds even before any AI pass. Run:
//      node city/generate.mjs procedural <slug>
//
// Either way the schema is identical; build.mjs consumes district.json and
// falls back to procedural if the file is missing.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter, renderMarkdown } from './lib/markdown.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CONTENT_DIR = path.join(__dirname, 'content');

// Archetypes of the city. Keyword hints steer the procedural fallback; the AI
// is free to choose any of these based on a deeper read.
// `forms` = preferred building shapes for this archetype (see FORMS registry in
// templates/map.js). Grow the vocabulary by adding forms there + here + GENERATE.md.
export const ARCHETYPES = {
  電脳街:   { hints: ['code', 'ai', 'data', 'net', 'system', 'デジタル', 'プログラム', '開発', 'api', 'tech'], hue: 168, forms: ['tower', 'spire', 'block'] },
  歓楽街:   { hints: ['music', 'live', 'party', 'art', '音楽', '祭', 'game', 'アート', '映画', '遊', 'night', '夜'], hue: 316, forms: ['tower', 'dome', 'cluster'] },
  工業区:   { hints: ['build', 'work', 'machine', '製作', '工場', 'diy', 'make', 'hardware', '機械'], hue: 28, forms: ['slab', 'block', 'tower'] },
  居住区:   { hints: ['life', 'daily', 'diary', '日記', '暮らし', '日常', '食', 'travel', '旅'], hue: 210, forms: ['block', 'cluster', 'slab'] },
  聖域:     { hints: ['think', 'idea', 'philosophy', '思考', '哲学', '祈', '静', 'poem', '詩'], hue: 268, forms: ['spire', 'gate', 'terrace'] },
  廃墟:     { hints: ['old', 'ruin', 'memory', '記憶', '廃', '過去', 'log', 'archive'], hue: 96, forms: ['block', 'cluster', 'slab'] },
};

// Feature vocabulary (landscape / infrastructure). Keyword -> feature type.
// Mirrors the FEATURES registry in templates/map.js.
export const FEATURE_HINTS = {
  river:  ['川', '河', '水', 'river', '流', '水路'],
  stairs: ['階段', '段', '坂', 'stair', 'step', '昇', '降'],
  bridge: ['橋', 'bridge', '渡'],
  plaza:  ['広場', 'plaza', '広間', 'square', '集'],
  grove:  ['緑', '森', '木', '植', '芽', 'green', 'tree', '草'],
  wall:   ['壁', '塀', 'wall', '囲', '境'],
};

// Cheap deterministic hash -> used for stable pseudo-random choices.
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0);
}

function hsl(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

function pickArchetype(text) {
  const low = text.toLowerCase();
  let best = '電脳街', score = -1;
  for (const [name, def] of Object.entries(ARCHETYPES)) {
    const s = def.hints.reduce((acc, h) => acc + (low.includes(h) ? 1 : 0), 0);
    if (s > score) { score = s; best = name; }
  }
  return best;
}

/** Read one article folder -> { slug, data, body, html, images, text }. */
export function readArticle(slug) {
  const dir = path.join(CONTENT_DIR, slug);
  const raw = fs.readFileSync(path.join(dir, 'index.md'), 'utf8');
  const { data, body } = parseFrontmatter(raw);
  const { html, images, text } = renderMarkdown(body);
  return { slug, dir, data, body, html, images, text };
}

/** List all article slugs (folders under content/ that hold an index.md). */
export function listSlugs() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs.readdirSync(CONTENT_DIR)
    .filter((f) => fs.existsSync(path.join(CONTENT_DIR, f, 'index.md')))
    .sort();
}

/** Deterministic fallback descriptor from text alone (no image analysis). */
export function proceduralDistrict(article, allArticles) {
  const { slug, data, text } = article;
  const seed = hash(slug + (data.title || ''));
  const archetype = data.archetype || pickArchetype(`${data.title || ''} ${(data.tags || []).join(' ')} ${text}`);
  const hue = ARCHETYPES[archetype]?.hue ?? (seed % 360);

  const palette = {
    primary: hsl(hue, 85, 60),
    secondary: hsl((hue + 200) % 360, 40, 12),
    glow: hsl(hue, 95, 72),
  };

  const words = text.split(/\s+/).filter(Boolean).length;
  const scale = Math.max(2, Math.min(6, Math.round(Math.sqrt(words) / 6) + 2));
  const height = Math.max(2, Math.min(9, Math.round(words / 90) + 2));

  // Landmarks from headings in the body, else a generic one.
  const headings = (article.body.match(/^#{1,6}\s+(.*)$/gm) || [])
    .map((h) => h.replace(/^#{1,6}\s+/, '').trim()).slice(0, 4);
  const landmarks = data.landmarks || (headings.length ? headings : ['名もなき塔']);

  // Roads: link to articles that share tags (thematic proximity).
  const myTags = new Set((data.tags || []).map((t) => String(t).toLowerCase()));
  const roads = [];
  if (myTags.size && allArticles) {
    for (const other of allArticles) {
      if (other.slug === slug) continue;
      const theirs = (other.data.tags || []).map((t) => String(t).toLowerCase());
      const shared = theirs.filter((t) => myTags.has(t)).length;
      if (shared > 0) roads.push({ to: other.slug, weight: Math.min(1, shared / myTags.size) });
    }
    roads.sort((a, b) => b.weight - a.weight);
  }

  // Buildings: 2-4 forms drawn from the archetype's preferred vocabulary,
  // laid out on a small grid inside the footprint. Variety scales with length.
  const forms = ARCHETYPES[archetype]?.forms || ['tower', 'block'];
  const n = Math.max(2, Math.min(4, Math.round(words / 120) + 2));
  const buildings = [];
  const cols = Math.ceil(Math.sqrt(n));
  for (let i = 0; i < n; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    const u = (col + 0.5) / cols, v = (row + 0.5) / Math.ceil(n / cols);
    const form = forms[(seed + i) % forms.length];
    const bh = Math.max(2, Math.round((height * (0.5 + ((seed >> (i + 1)) & 3) / 3))));
    buildings.push({
      form, u: +u.toFixed(2), v: +v.toFixed(2),
      w: form === 'gate' || form === 'terrace' ? 1.8 : 1.3,
      d: 1.3, h: bh,
      label: landmarks[i] || undefined,
    });
  }

  // Features: whatever the text hints at, plus one archetype-default flourish.
  const features = [];
  const low = `${data.title || ''} ${text}`.toLowerCase();
  for (const [type, hints] of Object.entries(FEATURE_HINTS)) {
    if (hints.some((h) => low.includes(h.toLowerCase()))) features.push(makeFeature(type, seed));
  }
  const dflt = { 廃墟: 'grove', 聖域: 'stairs', 歓楽街: 'plaza', 工業区: 'wall', 居住区: 'grove', 電脳街: 'canal' }[archetype];
  if (dflt && !features.find((f) => f.type === dflt)) features.push(makeFeature(dflt, seed + 7));

  return {
    slug,
    archetype,
    palette,
    scale,
    height,
    landmarks,
    buildings,
    features: features.slice(0, 3),
    roads: roads.slice(0, 3),
    aiSummary: data.summary || text.slice(0, 90),
    generatedBy: 'procedural',
  };
}

// Build a plausible geometry for a feature type (edge-hugging paths etc.).
function makeFeature(type, seed) {
  const j = (n) => +(0.15 + ((seed >> n) & 7) / 10).toFixed(2);
  switch (type) {
    case 'river':
    case 'canal':
      return { type, path: [[0, j(0)], [0.4, 0.5], [0.7, j(3)], [1, 0.6]] };
    case 'stairs':
      return { type, path: [[0.2, 0.8], [0.8, 0.3]], steps: 6, rise: 3 };
    case 'bridge':
      return { type, path: [[0.1, 0.5], [0.9, 0.5]], h: 1.6 };
    case 'plaza':
      return { type, path: [[0.3, 0.3], [0.7, 0.3], [0.7, 0.7], [0.3, 0.7]] };
    case 'wall':
      return { type, path: [[0.05, 0.1], [0.95, 0.1]], h: 1 };
    case 'grove':
    default:
      return { type: 'grove', u: j(1), v: j(4), count: 5 };
  }
}

/** Build the prompt a human hands to Claude to generate a rich descriptor. */
export function generationPrompt(article) {
  const imgs = article.images.length ? article.images.join(', ') : '(なし)';
  return `あなたは「WONK CITY」という生成都市の都市計画AIです。
以下のブログ記事を一つの「区画(district)」に変換し、JSONだけを出力してください。
記事に添付された画像がある場合は、その画像も視覚的に解析し、支配的な色を palette に反映してください。

# 記事
title: ${article.data.title || article.slug}
tags: ${(article.data.tags || []).join(', ') || '(なし)'}
添付画像: ${imgs}
---
${article.text.slice(0, 1800)}
---

# 出力スキーマ (このJSONのみを出力)
{
  "slug": "${article.slug}",
  "archetype": "電脳街|歓楽街|工業区|居住区|聖域|廃墟 のいずれか",
  "palette": { "primary": "#RRGGBB", "secondary": "#RRGGBB(暗い地の色)", "glow": "#RRGGBB(発光色)" },
  "scale": 2-6 の整数(区画の広さ),
  "height": 2-9 の整数(主要な高さ=情報密度),
  "landmarks": ["この区画の象徴となる建造物名を2-4個(日本語)"],
  "buildings": [
    // 区画内に建てる建物。本文の内容から2-5棟、形状に変化を付ける。
    // form: tower(塔) slab(横長棟) block(塊) spire(尖塔) terrace(段丘) dome(円蓋) gate(門) cluster(群)
    // u,v: 区画内の位置(0-1)。w,d: 大きさ(cell,省略可)。h: 高さ(2-9)。label: landmarksと対応(任意)
    { "form": "tower", "u": 0.3, "v": 0.4, "w": 1.4, "d": 1.4, "h": 6, "label": "宣言の塔" }
  ],
  "features": [
    // 地形/インフラ。本文の情景から選ぶ(無理に全部入れない)。path/u,vは区画内の相対座標(0-1)。
    // river(川)/canal(水路): {"type":"river","path":[[u,v],...]}
    // stairs(階段): {"type":"stairs","path":[[u,v],[u,v]],"steps":6,"rise":3}
    // bridge(橋): {"type":"bridge","path":[[u,v],[u,v]],"h":1.6}
    // plaza(広場): {"type":"plaza","path":[[u,v],[u,v],[u,v],[u,v]]}  ← 多角形
    // wall(壁): {"type":"wall","path":[[u,v],...],"h":1}
    // grove(緑/木立): {"type":"grove","u":0.7,"v":0.6,"count":5}
  ],
  "roads": [{ "to": "関連する既存記事のslug", "weight": 0.0-1.0 }],
  "aiSummary": "マップ上に表示する40字程度の詩的な一文",
  "generatedBy": "claude"
}

既存のslug一覧(roadsの接続先候補): ${listSlugs().filter((s) => s !== article.slug).join(', ') || '(まだ無い)'}

指針:
- 画像の色を尊重し、archetypeは本文の主題から選ぶ。
- buildings は本文の要素を建物に翻訳する（例: 複数の話題→複数棟、対比→塔と段丘）。形状に必ず変化を付ける。
- features は本文に出てくる情景だけを選ぶ（川・階段・橋・広場・緑・壁）。景色に無ければ空配列でよい。
- JSON以外は何も出力しないこと。`;
}

// ---- CLI ----
if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, slug] = process.argv.slice(2);
  if (!cmd || !slug) {
    console.log('usage: node city/generate.mjs <prompt|procedural> <slug>');
    process.exit(1);
  }
  const article = readArticle(slug);
  if (cmd === 'prompt') {
    console.log(generationPrompt(article));
  } else if (cmd === 'procedural') {
    const all = listSlugs().map(readArticle);
    const d = proceduralDistrict(article, all);
    const out = path.join(CONTENT_DIR, slug, 'district.json');
    fs.writeFileSync(out, JSON.stringify(d, null, 2));
    console.log(`wrote ${out}`);
  } else {
    console.log('unknown command:', cmd);
    process.exit(1);
  }
}
