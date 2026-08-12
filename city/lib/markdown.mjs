// Zero-dependency Markdown + frontmatter parser.
// Small on purpose: enough to render blog articles. No external installs,
// so `node city/build.mjs` runs fully offline.

/** Split frontmatter (--- ... ---) from body. Returns { data, body }. */
export function parseFrontmatter(raw) {
  const text = raw.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { data: {}, body: text };
  const data = parseYamlish(m[1]);
  return { data, body: text.slice(m[0].length) };
}

/** Tiny YAML subset: key: value, inline [a, b] arrays, and `- item` blocks. */
function parseYamlish(src) {
  const out = {};
  const lines = src.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) { i++; continue; }
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) { i++; continue; }
    const key = kv[1];
    let val = kv[2].trim();
    if (val === '') {
      // Possibly a `- item` list on following indented lines.
      const items = [];
      let j = i + 1;
      while (j < lines.length && /^\s*-\s+/.test(lines[j])) {
        items.push(coerce(lines[j].replace(/^\s*-\s+/, '').trim()));
        j++;
      }
      out[key] = items.length ? items : '';
      i = items.length ? j : i + 1;
      continue;
    }
    out[key] = coerce(val);
    i++;
  }
  return out;
}

function coerce(v) {
  if (v.startsWith('[') && v.endsWith(']')) {
    return v.slice(1, -1).split(',').map((s) => coerce(s.trim())).filter((s) => s !== '');
  }
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Inline formatting: images, links, bold, italic, code. */
function inline(text) {
  let s = esc(text);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_m, alt, src, title) => `<img src="${src}" alt="${esc(alt)}"${title ? ` title="${esc(title)}"` : ''} loading="lazy">`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  return s;
}

/** Block-level Markdown -> HTML. Returns { html, images:[src...], text:plain }. */
export function renderMarkdown(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  const images = [];
  const plain = [];
  let i = 0;

  const collectImages = (str) => {
    const re = /!\[[^\]]*\]\(([^)\s]+)/g;
    let m;
    while ((m = re.exec(str))) images.push(m[1]);
  };

  while (i < lines.length) {
    let line = lines[i];

    if (!line.trim()) { i++; continue; }

    // Code fence
    if (/^```/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      html.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }
    // Heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length;
      plain.push(h[2]);
      html.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      i++;
      continue;
    }
    // HR
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) { html.push('<hr>'); i++; continue; }
    // Blockquote
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
      plain.push(buf.join(' '));
      html.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`);
      continue;
    }
    // Lists
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const buf = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''));
        i++;
      }
      const items = buf.map((t) => { plain.push(t); return `<li>${inline(t)}</li>`; }).join('');
      html.push(ordered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`);
      continue;
    }
    // Standalone image paragraph
    if (/^!\[[^\]]*\]\([^)]+\)\s*$/.test(line.trim())) {
      collectImages(line);
      html.push(`<p class="fig">${inline(line.trim())}</p>`);
      i++;
      continue;
    }
    // Paragraph
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|>|```|\s*([-*]|\d+\.)\s)/.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    const para = buf.join(' ');
    collectImages(para);
    plain.push(para);
    html.push(`<p>${inline(para)}</p>`);
  }

  return { html: html.join('\n'), images, text: plain.join(' ') };
}
