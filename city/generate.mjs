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
export const ARCHETYPES = {
  電脳街:   { hints: ['code', 'ai', 'data', 'net', 'system', 'デジタル', 'プログラム', '開発', 'api', 'tech'], hue: 168 },
  歓楽街:   { hints: ['music', 'live', 'party', 'art', '音楽', '祭', 'game', 'アート', '映画', '遊'], hue: 316 },
  工業区:   { hints: ['build', 'work', 'machine', '製作', '工場', 'diy', 'make', 'hardware', '機械'], hue: 28 },
  居住区:   { hints: ['life', 'daily', 'diary', '日記', '暮らし', '日常', '食', 'travel', '旅'], hue: 210 },
  聖域:     { hints: ['think', 'idea', 'philosophy', '思考', '哲学', '祈', '静', 'poem', '詩'], hue: 268 },
  廃墟:     { hints: ['old', 'ruin', 'memory', '記憶', '廃', '過去', 'log', 'archive'], hue: 96 },
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

  return {
    slug,
    archetype,
    palette,
    scale,
    height,
    landmarks,
    roads: roads.slice(0, 3),
    aiSummary: data.summary || text.slice(0, 90),
    generatedBy: 'procedural',
  };
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
  "scale": 2-6 の整数(記事の重量感),
  "height": 2-9 の整数(タワーの高さ=情報密度),
  "landmarks": ["この区画の象徴となる建造物名を2-4個(日本語)"],
  "roads": [{ "to": "関連する既存記事のslug", "weight": 0.0-1.0 }],
  "aiSummary": "マップ上に表示する40字程度の詩的な一文",
  "generatedBy": "claude"
}

既存のslug一覧(roadsの接続先候補): ${listSlugs().filter((s) => s !== article.slug).join(', ') || '(まだ無い)'}
画像の色を尊重し、archetypeは本文の主題から選ぶこと。JSON以外は何も出力しないこと。`;
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
