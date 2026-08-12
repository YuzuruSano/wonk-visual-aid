/* WONK CITY — the map is the article index.
 * A Soul Hackers-inspired neon grid city rendered on a 2.5D isometric canvas.
 * Each article is an extruded tower; roads are glowing links between related
 * districts. Drag to pan, wheel to zoom, click a tower to enter the article. */
(function () {
  'use strict';

  const TILE = 30;          // half-width of an iso tile (px, before zoom)
  const Z_UNIT = 16;        // px of vertical rise per height unit
  const canvas = document.getElementById('city');
  const ctx = canvas.getContext('2d');
  const hud = document.getElementById('hud-district');
  const compass = document.getElementById('hud-count');

  let city = null;
  let cam = { x: 0, y: 0, zoom: 1 };       // pan offset (screen px) + zoom
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let hovered = null;
  let t0 = performance.now();

  // ARCHIVE DIVE (潜行) — time becomes depth. Newest article = surface (z 0),
  // older eras sink into strata below; diving descends through them like an
  // SMT dungeon. `diveT` blends surface<->dive; `focusEra` is the depth cursor.
  const LAYER_GAP = 5.5;    // world-z between consecutive eras when diving
  let mode = 'map';         // 'map' | 'dive'
  let diveT = 0;            // animated 0 (surface) .. 1 (fully dived)
  let focusEra = 0, focusTarget = 0;
  let zOff = 0;             // per-district z offset injected into iso()
  let autoPanX = 0, autoPanY = 0; // camera follow while diving (CSS px)

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
  }

  // ---- projection ---------------------------------------------------------
  function iso(gx, gy, gz) {
    const s = cam.zoom;
    const sx = (gx - gy) * TILE * s + canvas.width / 2 + (cam.x + autoPanX) * dpr;
    const sy = (gx + gy) * (TILE / 2) * s - ((gz || 0) + zOff) * Z_UNIT * s + canvas.height / 2 + (cam.y + autoPanY) * dpr;
    return [sx, sy];
  }

  // ---- colour helpers -----------------------------------------------------
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, Math.round(r * k)));
    g = Math.max(0, Math.min(255, Math.round(g * k)));
    b = Math.max(0, Math.min(255, Math.round(b * k)));
    return `rgb(${r},${g},${b})`;
  }
  function withA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // ---- dive helpers -------------------------------------------------------
  function baseZ(d) { return -(d._era || 0) * LAYER_GAP * diveT; }
  function layerAlpha(d) {
    if (diveT < 0.01) return 1;
    const dist = Math.abs((d._era || 0) - focusEra);
    const faded = Math.max(0.1, 1 - dist * 0.34);   // strata far from focus dim out
    return 1 - diveT * (1 - faded);
  }

  // ---- sketch strokes -----------------------------------------------------
  // Ported from the old VJ framework's p5.scribble (Janneck Wullschleger,
  // after Jo Wood's Handy for Processing). Hand-drawn double-stroke lines give
  // the map an inked, Soul Hackers-map feel. Toggle with the S key.
  let sketch = true;
  let jitterTick = 0; // quantised so the jitter "redraws" ~8x/sec, not every frame
  function rnd(seed) {
    const s = Math.sin(seed * 127.1 + jitterTick * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  function off(seed, mag) { return (rnd(seed) - 0.5) * 2 * mag; }

  // smooth curve through points (Catmull-Rom -> bezier), approximating p5 curveVertex
  function smooth(pts) {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2[0], p2[1]);
    }
  }

  function scribbleLine(x1, y1, x2, y2, seed) {
    if (!sketch) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); return; }
    const lenSq = (x1 - x2) ** 2 + (y1 - y2) ** 2;
    let o = 2.4 * cam.zoom;
    if (o * o * 100 > lenSq) o = Math.sqrt(lenSq) / 10;
    const diverge = 0.2 + rnd(seed + 9) * 0.2;
    const mdx = off(seed + 1, o * 1.4), mdy = off(seed + 2, o * 1.4);
    for (const m of [o, o / 2]) {          // two passes = inked look
      const P = (k, base) => [base[0] + off(seed + k, m), base[1] + off(seed + k + 50, m)];
      const p1 = [x1, y1], p2 = [x2, y2];
      const a = P(0, p1);
      const b = [mdx + x1 + (x2 - x1) * diverge + off(seed + 3, m), mdy + y1 + (y2 - y1) * diverge + off(seed + 4, m)];
      const c = [mdx + x1 + 2 * (x2 - x1) * diverge + off(seed + 5, m), mdy + y1 + 2 * (y2 - y1) * diverge + off(seed + 6, m)];
      const d = P(7, p2);
      ctx.beginPath();
      smooth([a, b, c, d]);
      ctx.stroke();
    }
  }

  // ---- ground grid --------------------------------------------------------
  function gridPlane(alpha) {
    const b = city.bounds, pad = 3;
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(60,120,130,${alpha})`;
    for (let gx = b.minX - pad; gx <= b.maxX + pad; gx++) {
      const a = iso(gx, b.minY - pad, 0), c = iso(gx, b.maxY + pad, 0);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
    }
    for (let gy = b.minY - pad; gy <= b.maxY + pad; gy++) {
      const a = iso(b.minX - pad, gy, 0), c = iso(b.maxX + pad, gy, 0);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
    }
  }
  function drawGrid() {
    if (diveT < 0.01) { gridPlane(0.16); return; }
    // surface grid fades out; one translucent floor per era fades in
    gridPlane(0.16 * (1 - diveT));
    for (const era of city.eras || []) {
      zOff = -era.index * LAYER_GAP * diveT;
      const dist = Math.abs(era.index - focusEra);
      gridPlane(Math.max(0.03, 0.2 - dist * 0.05) * diveT);
      zOff = 0;
    }
  }

  // ---- roads (glowing links) ---------------------------------------------
  function center(d) { return [d.x + d.size.w / 2, d.y + d.size.h / 2]; }
  function drawRoads(pulse) {
    for (const r of city.roads) {
      const A = city.byslug[r.from], B = city.byslug[r.to];
      if (!A || !B) continue;
      const ca = center(A), cb = center(B);
      // each endpoint sits at its era depth -> cross-era roads become the
      // vertical shafts you descend when diving the archive.
      zOff = baseZ(A); const p1 = iso(ca[0], ca[1], 0.2); zOff = baseZ(B); const p2 = iso(cb[0], cb[1], 0.2); zOff = 0;
      const active = hovered && (hovered.slug === r.from || hovered.slug === r.to);
      const ra = Math.min(layerAlpha(A), layerAlpha(B));
      ctx.globalAlpha = ra;
      ctx.lineWidth = (active ? 3 : 1.8) * cam.zoom;
      ctx.strokeStyle = active ? withA(A.palette.glow, 0.95) : `rgba(130,235,240,${0.32 + r.weight * 0.35})`;
      ctx.shadowBlur = active ? 18 : 10;
      ctx.shadowColor = active ? A.palette.glow : 'rgba(120,220,230,0.4)';
      scribbleLine(p1[0], p1[1], p2[0], p2[1], (r.from.length * 7 + r.to.length * 13) * 3.1);
      ctx.shadowBlur = 0;
      // travelling data pulse
      const tt = (pulse + Math.abs((r.from.length * 7 + r.to.length * 13)) * 0.11) % 1;
      const px = p1[0] + (p2[0] - p1[0]) * tt, py = p1[1] + (p2[1] - p1[1]) * tt;
      ctx.fillStyle = active ? A.palette.glow : 'rgba(160,240,250,0.8)';
      ctx.beginPath(); ctx.arc(px, py, (active ? 3 : 2) * cam.zoom, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // ---- city-spanning connections (avenue = timeline spine, great river) ---
  const cityAvenue = () => (city.cityFeatures || []).find((f) => f.type === 'avenue') || {};
  const cityRiver = () => (city.cityFeatures || []).find((f) => f.type === 'river') || {};
  function stroke(pts, style, width, dash, dashOff) {
    ctx.strokeStyle = style; ctx.lineWidth = width;
    if (dash) { ctx.setLineDash(dash); ctx.lineDashOffset = dashOff || 0; }
    ctx.beginPath(); smooth(pts); ctx.stroke();
    if (dash) ctx.setLineDash([]);
  }
  function drawAvenue(f, pulse) {
    const ds = (f.slugs || []).map((s) => city.byslug[s]).filter(Boolean);
    if (ds.length < 2) return;
    // each vertex sits at its district's era depth -> a street on the surface,
    // a spiral shaft through every era while diving. This is the "またぎ接続".
    const pts = ds.map((d) => { zOff = baseZ(d); const c = center(d); const p = iso(c[0], c[1], 0.25); return p; });
    zOff = 0;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowBlur = 14; ctx.shadowColor = '#ffce6b';
    stroke(pts, 'rgba(255,206,107,0.16)', 10 * cam.zoom);          // wide bed
    stroke(pts, 'rgba(255,230,168,0.5)', 2.4 * cam.zoom);          // core line
    stroke(pts, 'rgba(255,242,207,0.7)', 1.2 * cam.zoom, [5 * cam.zoom, 10 * cam.zoom], -pulse * 60); // flowing history
    ctx.shadowBlur = 0;
  }
  function drawGreatRiver(f, pulse) {
    const a = 1 - diveT * 0.85;                                    // a surface waterway; recedes when diving
    if (a <= 0.03 || !f.path) return;
    const pts = f.path.map(([gx, gy]) => iso(gx, gy, 0.02));
    ctx.globalAlpha = a; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowBlur = 12; ctx.shadowColor = '#8fd0ff';
    stroke(pts, 'rgba(46,127,208,0.5)', 7 * cam.zoom);
    stroke(pts, `rgba(143,208,255,${0.45 + 0.25 * Math.sin(pulse * 6.28)})`, 1.6 * cam.zoom, [7 * cam.zoom, 9 * cam.zoom], -pulse * 46);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  function drawTributaries(pulse) {
    const a = 1 - diveT * 0.85;
    if (a <= 0.03) return;
    ctx.globalAlpha = a; ctx.lineCap = 'round';
    ctx.shadowBlur = 8; ctx.shadowColor = '#8fd0ff';
    for (const f of city.cityFeatures || []) {
      if (f.type !== 'tributary') continue;
      const p = f.path.map(([gx, gy]) => iso(gx, gy, 0.02));
      ctx.strokeStyle = 'rgba(46,127,208,0.4)'; ctx.lineWidth = 3.4 * cam.zoom;
      ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); ctx.lineTo(p[1][0], p[1][1]); ctx.stroke();
      ctx.strokeStyle = `rgba(143,208,255,${0.4 + 0.25 * Math.sin(pulse * 6.28 + p[0][0])})`; ctx.lineWidth = 1 * cam.zoom;
      ctx.setLineDash([4 * cam.zoom, 6 * cam.zoom]); ctx.lineDashOffset = -pulse * 34;
      ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); ctx.lineTo(p[1][0], p[1][1]); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  function drawBridges() {
    const a = 1 - diveT * 0.8;                                     // bridges belong to the surface
    if (a <= 0.03) return;
    ctx.globalAlpha = a; ctx.lineCap = 'round';
    for (const f of city.cityFeatures || []) {
      if (f.type !== 'bridge') continue;
      const [gx, gy] = f.at, ang = f.angle || 0, h = f.h || 1.4, L = 1.3;
      const ax = gx - Math.cos(ang) * L, ay = gy - Math.sin(ang) * L;
      const bx = gx + Math.cos(ang) * L, by = gy + Math.sin(ang) * L;
      const A = iso(ax, ay, h), B = iso(bx, by, h);
      ctx.shadowBlur = 10; ctx.shadowColor = '#ffce6b';
      ctx.strokeStyle = 'rgba(255,214,120,0.9)'; ctx.lineWidth = 2.6 * cam.zoom;
      scribbleLine(A[0], A[1], B[0], B[1], (gx * 13 + gy * 7) * 2.3);        // deck
      ctx.lineWidth = 1.4 * cam.zoom;
      for (const [px, py] of [[ax, ay], [bx, by]]) {                          // piers into the water
        const g = iso(px, py, 0), t = iso(px, py, h);
        ctx.beginPath(); ctx.moveTo(g[0], g[1]); ctx.lineTo(t[0], t[1]); ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }

  // ---- geometry primitives ------------------------------------------------
  function fillFace(a, b, c, d, style) {
    ctx.fillStyle = style;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
    ctx.closePath(); ctx.fill();
  }
  function isoBox(x0, y0, w, dd, z0, z1) {
    return {
      g00: iso(x0, y0, z0), g10: iso(x0 + w, y0, z0), g11: iso(x0 + w, y0 + dd, z0), g01: iso(x0, y0 + dd, z0),
      t00: iso(x0, y0, z1), t10: iso(x0 + w, y0, z1), t11: iso(x0 + w, y0 + dd, z1), t01: iso(x0, y0 + dd, z1),
    };
  }
  // an extruded box with hand-drawn neon edges; returns its iso corners
  function drawBox(x0, y0, w, dd, z0, z1, pal, seed, hover, glow, windows) {
    const B = isoBox(x0, y0, w, dd, z0, z1);
    fillFace(B.g01, B.g11, B.t11, B.t01, shade(pal.primary, 0.30)); // left
    fillFace(B.g11, B.g10, B.t10, B.t11, shade(pal.primary, 0.48)); // right
    fillFace(B.t00, B.t10, B.t11, B.t01, shade(pal.primary, hover ? 1.0 : 0.72)); // top
    ctx.strokeStyle = withA(pal.glow, 0.55 + glow * 0.45);
    ctx.lineWidth = (hover ? 1.8 : 1.0) * cam.zoom;
    ctx.shadowBlur = (hover ? 15 : 6) * cam.zoom; ctx.shadowColor = pal.glow;
    [[B.g00, B.t00], [B.g10, B.t10], [B.g11, B.t11], [B.g01, B.t01]]
      .forEach(([a, b], k) => scribbleLine(a[0], a[1], b[0], b[1], seed + k * 13));
    const top = [B.t00, B.t10, B.t11, B.t01, B.t00];
    for (let k = 0; k < 4; k++) scribbleLine(top[k][0], top[k][1], top[k + 1][0], top[k + 1][1], seed + 100 + k * 13);
    ctx.shadowBlur = 0;
    if (windows) {
      ctx.fillStyle = withA(pal.glow, 0.5 + glow * 0.3);
      const rows = Math.max(1, Math.round(z1 - z0));
      for (let r = 1; r < rows; r++) {
        const f = r / rows;
        const a = [B.g11[0] + (B.t11[0] - B.g11[0]) * f, B.g11[1] + (B.t11[1] - B.g11[1]) * f];
        const b = [B.g10[0] + (B.t10[0] - B.g10[0]) * f, B.g10[1] + (B.t10[1] - B.g10[1]) * f];
        if ((r + Math.round(x0 + y0)) % 2 === 0) {
          ctx.globalAlpha = 0.25 + 0.35 * glow; ctx.lineWidth = 1 * cam.zoom; ctx.strokeStyle = ctx.fillStyle;
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.globalAlpha = 1;
        }
      }
    }
    return B;
  }
  function capTriangles(B, apex, pal, seed, glow) {
    const edges = [[B.t00, B.t10], [B.t10, B.t11], [B.t11, B.t01], [B.t01, B.t00]];
    edges.forEach(([a, b], k) => {
      fillFace(a, b, apex, a, shade(pal.primary, k % 2 ? 0.55 : 0.4));
    });
    ctx.strokeStyle = withA(pal.glow, 0.6 + glow * 0.4); ctx.lineWidth = 1.1 * cam.zoom;
    ctx.shadowBlur = 8 * cam.zoom; ctx.shadowColor = pal.glow;
    [B.t00, B.t10, B.t11, B.t01].forEach((p, k) => scribbleLine(p[0], p[1], apex[0], apex[1], seed + 200 + k * 9));
    ctx.shadowBlur = 0;
  }

  // ---- building forms (composed from boxes) -------------------------------
  // Registry: add a form here + list it in city/GENERATE.md to grow the vocabulary.
  const FORMS = {
    tower: (cx, cy, w, dd, h, pal, s, hv, gl) => drawBox(cx - w / 2, cy - dd / 2, w, dd, 0, h, pal, s, hv, gl, true),
    slab: (cx, cy, w, dd, h, pal, s, hv, gl) => drawBox(cx - w / 2, cy - dd / 2, w, dd, 0, Math.max(1.5, h * 0.5), pal, s, hv, gl, true),
    block: (cx, cy, w, dd, h, pal, s, hv, gl) => drawBox(cx - w / 2, cy - dd / 2, w, dd, 0, Math.max(1.5, h * 0.7), pal, s, hv, gl, true),
    spire: (cx, cy, w, dd, h, pal, s, hv, gl) => {
      const B = drawBox(cx - w / 2.6, cy - dd / 2.6, w / 1.3, dd / 1.3, 0, h, pal, s, hv, gl, false);
      capTriangles(B, iso(cx, cy, h + Math.max(1.6, h * 0.55)), pal, s, gl);
    },
    terrace: (cx, cy, w, dd, h, pal, s, hv, gl) => {
      let z = 0, cw = w, cd = dd; const L = 3, step = h / L;
      for (let i = 0; i < L; i++) { drawBox(cx - cw / 2, cy - cd / 2, cw, cd, z, z + step, pal, s + i * 7, hv, gl, false); z += step; cw *= 0.62; cd *= 0.62; }
    },
    dome: (cx, cy, w, dd, h, pal, s, hv, gl) => {
      const zb = Math.max(1.2, h * 0.55);
      drawBox(cx - w / 2, cy - dd / 2, w, dd, 0, zb, pal, s, hv, gl, true);
      const c = iso(cx, cy, zb), apex = iso(cx, cy, zb + h * 0.5);
      const rx = Math.abs(iso(cx + w / 2, cy, zb)[0] - c[0]);
      ctx.fillStyle = shade(pal.primary, hv ? 0.95 : 0.7);
      ctx.beginPath(); ctx.ellipse(c[0], (c[1] + apex[1]) / 2, rx, Math.abs(apex[1] - c[1]) / 1.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = withA(pal.glow, 0.7); ctx.lineWidth = 1.1 * cam.zoom; ctx.shadowBlur = 8; ctx.shadowColor = pal.glow;
      ctx.beginPath(); ctx.ellipse(c[0], (c[1] + apex[1]) / 2, rx, Math.abs(apex[1] - c[1]) / 1.3, 0, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;
    },
    gate: (cx, cy, w, dd, h, pal, s, hv, gl) => {
      const pw = Math.max(0.4, w * 0.22);
      drawBox(cx - w / 2, cy - dd / 2, pw, dd, 0, h, pal, s, hv, gl, false);
      drawBox(cx + w / 2 - pw, cy - dd / 2, pw, dd, 0, h, pal, s + 5, hv, gl, false);
      drawBox(cx - w / 2, cy - dd / 2, w, dd, h * 0.82, h, pal, s + 11, hv, gl, false); // lintel
    },
    cluster: (cx, cy, w, dd, h, pal, s, hv, gl) => {
      for (let i = 0; i < 4; i++) {
        const ox = (rnd(s + i * 3) - 0.5) * w * 0.6, oy = (rnd(s + i * 3 + 40) - 0.5) * dd * 0.6;
        const bw = w * (0.28 + rnd(s + i) * 0.18), bh = h * (0.4 + rnd(s + i + 7) * 0.6);
        drawBox(cx + ox - bw / 2, cy + oy - bw / 2, bw, bw, 0, Math.max(1, bh), pal, s + i * 17, hv, gl, true);
      }
    },
  };

  // ---- landscape / infrastructure features --------------------------------
  const WATER = { primary: '#2e7fd0', glow: '#8fd0ff' };
  function localPath(d, path, z) { return path.map(([u, v]) => iso(d.x + u * d.size.w, d.y + v * d.size.h, z || 0)); }
  const FEATURES = {
    river: (d, f, pulse) => drawWater(d, f, pulse, 0.7),
    canal: (d, f, pulse) => drawWater(d, f, pulse, 0.45),
    stairs: (d, f) => drawStairs(d, f),
    bridge: (d, f) => drawBridge(d, f),
    plaza: (d, f) => drawPlaza(d, f),
    wall: (d, f) => drawWall(d, f),
    grove: (d, f) => drawGrove(d, f),
  };
  function drawWater(d, f, pulse, width) {
    const pts = localPath(d, f.path, 0.03);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = withA(WATER.primary, 0.5); ctx.lineWidth = (6 * width) * cam.zoom;
    ctx.shadowBlur = 10; ctx.shadowColor = WATER.glow;
    ctx.beginPath(); smooth(pts); ctx.stroke();
    // shimmering centre line
    ctx.strokeStyle = withA(WATER.glow, 0.4 + 0.3 * Math.sin(pulse * 6.28)); ctx.lineWidth = 1.4 * cam.zoom;
    ctx.setLineDash([6 * cam.zoom, 8 * cam.zoom]); ctx.lineDashOffset = -pulse * 40;
    ctx.beginPath(); smooth(pts); ctx.stroke(); ctx.setLineDash([]);
    ctx.shadowBlur = 0;
  }
  function drawStairs(d, f) {
    const a = [d.x + f.path[0][0] * d.size.w, d.y + f.path[0][1] * d.size.h];
    const b = [d.x + f.path[1][0] * d.size.w, d.y + f.path[1][1] * d.size.h];
    const steps = f.steps || 6, rise = f.rise || 3;
    ctx.strokeStyle = withA(d.palette.glow, 0.8); ctx.lineWidth = 1.2 * cam.zoom;
    ctx.shadowBlur = 6; ctx.shadowColor = d.palette.glow;
    const perp = [-(b[1] - a[1]), b[0] - a[0]];
    const pl = Math.hypot(perp[0], perp[1]) || 1; const tw = 0.5;
    for (let i = 0; i <= steps; i++) {
      const f0 = i / steps, z = rise * f0;
      const px = a[0] + (b[0] - a[0]) * f0, py = a[1] + (b[1] - a[1]) * f0;
      const e1 = iso(px - perp[0] / pl * tw, py - perp[1] / pl * tw, z);
      const e2 = iso(px + perp[0] / pl * tw, py + perp[1] / pl * tw, z);
      scribbleLine(e1[0], e1[1], e2[0], e2[1], (d.x + d.y) * 5 + i * 9); // tread
      if (i < steps) { const nz = rise * ((i + 1) / steps); const up = iso(px, py, nz); const cur = iso(px, py, z);
        ctx.beginPath(); ctx.moveTo(cur[0], cur[1]); ctx.lineTo(up[0], up[1]); ctx.stroke(); }
    }
    ctx.shadowBlur = 0;
  }
  function drawBridge(d, f) {
    const h = f.h || 1.6;
    const a = [d.x + f.path[0][0] * d.size.w, d.y + f.path[0][1] * d.size.h];
    const b = [d.x + f.path[1][0] * d.size.w, d.y + f.path[1][1] * d.size.h];
    const A = iso(a[0], a[1], h), B = iso(b[0], b[1], h);
    ctx.strokeStyle = withA(d.palette.glow, 0.85); ctx.lineWidth = 2 * cam.zoom;
    ctx.shadowBlur = 8; ctx.shadowColor = d.palette.glow;
    scribbleLine(A[0], A[1], B[0], B[1], (d.x + d.y) * 9);
    for (const p of [a, b]) { const gp = iso(p[0], p[1], 0), tp = iso(p[0], p[1], h); ctx.beginPath(); ctx.moveTo(gp[0], gp[1]); ctx.lineTo(tp[0], tp[1]); ctx.stroke(); }
    ctx.shadowBlur = 0;
  }
  function drawPlaza(d, f) {
    const pts = localPath(d, f.path, 0.02);
    ctx.fillStyle = withA(d.palette.glow, 0.07);
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = withA(d.palette.glow, 0.4); ctx.lineWidth = 1 * cam.zoom;
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; scribbleLine(a[0], a[1], b[0], b[1], (d.x + d.y) * 3 + i * 7); }
  }
  function drawWall(d, f) {
    const h = f.h || 1; const pts = f.path;
    for (let i = 0; i < pts.length - 1; i++) {
      const x0 = d.x + pts[i][0] * d.size.w, y0 = d.y + pts[i][1] * d.size.h;
      const x1 = d.x + pts[i + 1][0] * d.size.w, y1 = d.y + pts[i + 1][1] * d.size.h;
      drawBox(Math.min(x0, x1), Math.min(y0, y1), Math.max(0.2, Math.abs(x1 - x0)), Math.max(0.2, Math.abs(y1 - y0)), 0, h, d.palette, (d.x + d.y) * 4 + i * 11, false, 0.4, false);
    }
  }
  function drawGrove(d, f) {
    const cx = d.x + (f.u ?? 0.5) * d.size.w, cy = d.y + (f.v ?? 0.5) * d.size.h;
    const n = f.count || 5; const green = '#7fd06a';
    for (let i = 0; i < n; i++) {
      const ox = (rnd((d.x + d.y) * 7 + i * 3) - 0.5) * d.size.w * 0.7;
      const oy = (rnd((d.x + d.y) * 7 + i * 3 + 20) - 0.5) * d.size.h * 0.7;
      const base = iso(cx + ox, cy + oy, 0), top = iso(cx + ox, cy + oy, 0.6 + rnd(i) * 0.5);
      ctx.strokeStyle = withA(green, 0.7); ctx.lineWidth = 1.2 * cam.zoom; ctx.shadowBlur = 6; ctx.shadowColor = green;
      ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.lineTo(top[0], top[1]); ctx.stroke();
      ctx.fillStyle = withA(green, 0.55); ctx.beginPath(); ctx.arc(top[0], top[1], 3 * cam.zoom, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // ---- a full district (features + buildings + label) ---------------------
  function districtBuildings(d) {
    if (d.buildings && d.buildings.length) return d.buildings;
    return [{ form: 'tower', u: 0.5, v: 0.5, w: d.size.w, d: d.size.h, h: d.height || 4, label: d.title }];
  }
  function drawDistrict(d, pulse) {
    const { x, y } = d, w = d.size.w, h = d.size.h;
    const isHover = hovered === d;
    const glow = 0.5 + 0.5 * Math.sin(pulse * 6.28 + (x + y));
    const pal = d.palette;

    zOff = baseZ(d);                       // sink this district to its era depth
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = prevAlpha * layerAlpha(d);

    // ground glow pad
    const g00 = iso(x, y, 0), g10 = iso(x + w, y, 0), g11 = iso(x + w, y + h, 0), g01 = iso(x, y + h, 0);
    ctx.fillStyle = withA(pal.glow, 0.05 + (isHover ? 0.1 : 0));
    ctx.beginPath(); ctx.moveTo(g00[0], g00[1]); ctx.lineTo(g10[0], g10[1]); ctx.lineTo(g11[0], g11[1]); ctx.lineTo(g01[0], g01[1]); ctx.closePath(); ctx.fill();

    // features first (ground layer, so buildings occlude them)
    for (const f of d.features || []) (FEATURES[f.type] || (() => {}))(d, f, pulse);

    // buildings, back-to-front within the footprint
    const bs = districtBuildings(d).slice().sort((a, b) => ((a.u ?? .5) + (a.v ?? .5)) - ((b.u ?? .5) + (b.v ?? .5)));
    bs.forEach((b, i) => {
      const cx = x + Math.min(Math.max(b.u ?? 0.5, 0.15), 0.85) * w;
      const cy = y + Math.min(Math.max(b.v ?? 0.5, 0.15), 0.85) * h;
      const bw = b.w || Math.max(1, Math.min(w * 0.5, 2));
      const bd = b.d || Math.max(1, Math.min(h * 0.5, 2));
      const bh = Math.max(1.2, b.h || d.height || 4);
      (FORMS[b.form] || FORMS.tower)(cx, cy, bw, bd, bh, pal, (x * 31 + y * 17) * 2.7 + i * 61, isHover, glow);
    });

    // label above the tallest building
    if (cam.zoom > 0.48) {
      const H = d._maxH || d.height || 4;
      const p = iso(x + w / 2, y + h / 2, H + 0.9);
      ctx.font = `${Math.round(12 * cam.zoom)}px 'Courier New', monospace`;
      ctx.textAlign = 'center';
      const label = d.title.length > 14 ? d.title.slice(0, 13) + '…' : d.title;
      ctx.fillStyle = withA(pal.glow, isHover ? 1 : 0.85);
      ctx.shadowBlur = 8; ctx.shadowColor = '#000';
      ctx.fillText(label, p[0], p[1]);
      ctx.font = `${Math.round(9 * cam.zoom)}px 'Courier New', monospace`;
      ctx.fillStyle = withA(pal.primary, 0.7);
      ctx.fillText(d.archetype, p[0], p[1] + 12 * cam.zoom);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = prevAlpha;
    zOff = 0;
  }

  // ---- hit test (approx via screen-space bounding of top face) ------------
  function pickAt(mx, my) {
    // iterate front-to-back (higher x+y first) so top towers win
    const sorted = [...city.districts].sort((a, b) => (b.x + b.y) - (a.x + a.y));
    for (const d of sorted) {
      if (diveT > 0.5 && Math.abs((d._era || 0) - focusEra) > 0.6) continue; // only the focused stratum is interactive while diving
      zOff = baseZ(d);
      const H = d._maxH || d.height || 4;
      const pts = [iso(d.x, d.y, H), iso(d.x + d.size.w, d.y, H), iso(d.x + d.size.w, d.y + d.size.h, H),
        iso(d.x, d.y + d.size.h, H), iso(d.x, d.y, 0), iso(d.x + d.size.w, d.y + d.size.h, 0)];
      zOff = 0;
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      if (mx >= Math.min(...xs) && mx <= Math.max(...xs) && my >= Math.min(...ys) && my <= Math.max(...ys)) return d;
    }
    return null;
  }

  // ---- frame --------------------------------------------------------------
  function frame(now) {
    const pulse = ((now - t0) / 4000) % 1;
    jitterTick = Math.floor(now / 110); // ~9 redraws/sec -> living hand-drawn line

    // animate dive state
    diveT += ((mode === 'dive' ? 1 : 0) - diveT) * 0.12;
    focusEra += (focusTarget - focusEra) * 0.16;
    if (Math.abs(diveT - (mode === 'dive' ? 1 : 0)) < 0.002) diveT = mode === 'dive' ? 1 : 0;
    // camera follows the focused stratum to screen centre (blended by diveT)
    if (diveT > 0.001) {
      const e = Math.round(focusEra);
      const ds = city.districts.filter((x) => x._era === e);
      const cx = ds.reduce((s, d) => s + d.x + d.size.w / 2, 0) / (ds.length || 1);
      const cy = ds.reduce((s, d) => s + d.y + d.size.h / 2, 0) / (ds.length || 1);
      const zL = -focusEra * LAYER_GAP * diveT;
      autoPanX = diveT * (-(cx - cy) * TILE * cam.zoom / dpr - cam.x);
      autoPanY = diveT * (-((cx + cy) * (TILE / 2) * cam.zoom - zL * Z_UNIT * cam.zoom) / dpr - cam.y);
    } else { autoPanX = 0; autoPanY = 0; }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // vignette background (darker + cooler the deeper you dive)
    const g = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width * 0.7);
    g.addColorStop(0, diveT > 0.5 ? '#07101c' : '#05131a'); g.addColorStop(1, '#010407');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
    updateDepthHud();

    drawGrid();
    drawGreatRiver(cityRiver(), pulse);   // water sits on the ground, under everything
    drawTributaries(pulse);               // offshoots wiring the river into districts
    drawRoads(pulse);
    drawAvenue(cityAvenue(), pulse);      // the timeline spine, over the ground
    drawBridges();                        // the avenue vaults over the river — the "またぐ"
    // districts back-to-front
    const sorted = [...city.districts].sort((a, b) => (a.x + a.y) - (b.x + b.y));
    for (const d of sorted) drawDistrict(d, pulse);

    requestAnimationFrame(frame);
  }

  // ---- interaction --------------------------------------------------------
  let dragging = false, moved = false, last = null;
  canvas.addEventListener('mousedown', (e) => { dragging = true; moved = false; last = [e.clientX, e.clientY]; });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * dpr, my = (e.clientY - rect.top) * dpr;
    if (dragging) {
      cam.x += (e.clientX - last[0]); cam.y += (e.clientY - last[1]);
      last = [e.clientX, e.clientY]; moved = true;
      hovered = null;
    } else {
      hovered = pickAt(mx, my);
      updateHud();
    }
    canvas.style.cursor = hovered ? 'pointer' : (dragging ? 'grabbing' : 'grab');
  });
  canvas.addEventListener('click', (e) => {
    if (moved) return;
    const rect = canvas.getBoundingClientRect();
    const d = pickAt((e.clientX - rect.left) * dpr, (e.clientY - rect.top) * dpr);
    if (d) location.href = d.href;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    cam.zoom = Math.max(0.35, Math.min(3, cam.zoom * f));
  }, { passive: false });
  window.addEventListener('keydown', (e) => {
    if (e.key === 's' || e.key === 'S') { sketch = !sketch; return; }   // hand-drawn toggle
    if (e.key === 'd' || e.key === 'D') { toggleDive(); return; }       // enter/leave the dive
    if (mode === 'dive') {
      if (e.key === 'ArrowDown') { diveStep(1); e.preventDefault(); }   // deeper / older
      else if (e.key === 'ArrowUp') { diveStep(-1); e.preventDefault(); } // shallower / newer
      else if (e.key === 'Enter' || e.key === ' ') { enterFocused(); e.preventDefault(); }
      else if (e.key === 'Escape') toggleDive();
    }
  });

  // ---- dive control -------------------------------------------------------
  function toggleDive() {
    mode = mode === 'dive' ? 'map' : 'dive';
    if (mode === 'dive') { focusTarget = 0; focusEra = 0; }
    document.body.classList.toggle('diving', mode === 'dive');
    const btn = document.getElementById('dive-btn');
    if (btn) btn.textContent = mode === 'dive' ? '▲ 浮上 SURFACE' : '▼ 潜行 DIVE';
  }
  function diveStep(dir) {
    const max = (city.eras || []).length - 1;
    focusTarget = Math.max(0, Math.min(max, Math.round(focusTarget) + dir));
  }
  function enterFocused() {
    const e = Math.round(focusEra);
    const d = city.districts.find((x) => x._era === e);
    if (d) location.href = d.href;
  }

  // ---- depth gauge (SMT-style descent meter) ------------------------------
  function buildDepthGauge() {
    const g = document.getElementById('depth-gauge');
    if (!g || !city.eras) return;
    g.innerHTML = city.eras.map((e) =>
      `<div class="tick" data-era="${e.index}"><span class="d">B${e.index}</span>` +
      `<span class="ym">${e.label}</span><span class="ct">${e.count}区</span></div>`).join('');
    g.querySelectorAll('.tick').forEach((el) => el.addEventListener('click', () => {
      if (mode !== 'dive') toggleDive();
      focusTarget = +el.dataset.era;
    }));
  }
  function updateDepthHud() {
    const g = document.getElementById('depth-gauge');
    if (!g) return;
    g.style.opacity = diveT > 0.05 ? 1 : 0;
    const cur = Math.round(focusEra);
    g.querySelectorAll('.tick').forEach((el) => el.classList.toggle('on', +el.dataset.era === cur));
    const era = (city.eras || [])[cur];
    const rd = document.getElementById('depth-read');
    if (rd) {
      rd.style.opacity = diveT > 0.05 ? 1 : 0;
      if (era) rd.innerHTML = `<b>DEPTH B${cur}</b> / ${era.label} <span>${era.count} 区画</span>`;
    }
  }

  function updateHud() {
    if (!hovered) { hud.classList.remove('on'); return; }
    hud.classList.add('on');
    hud.style.setProperty('--c', hovered.palette.glow);
    hud.innerHTML =
      `<div class="hud-arch">${hovered.archetype}</div>` +
      `<div class="hud-title">${hovered.title}</div>` +
      `<div class="hud-sum">${hovered.summary || ''}</div>` +
      `<div class="hud-meta">${hovered.date || ''} · ${(hovered.tags || []).map((t) => '#' + t).join(' ')}</div>` +
      `<div class="hud-enter">▶ ENTER DISTRICT</div>`;
  }

  // ---- boot ---------------------------------------------------------------
  function fitView() {
    const b = city.bounds;
    const spanX = (b.maxX - b.minX) + 4, spanY = (b.maxY - b.minY) + 4;
    const maxH = city.districts.reduce((m, d) => Math.max(m, d.height || 4), 4);
    // isometric extent (device px at zoom 1)
    const isoW = (spanX + spanY) * TILE;
    const isoH = (spanX + spanY) * (TILE / 2) + maxH * Z_UNIT;
    cam.zoom = Math.max(0.5, Math.min(2.4,
      Math.min((canvas.width * 0.66) / isoW, (canvas.height * 0.66) / isoH)));
    // recenter on the city centroid
    cam.x = 0; cam.y = 0;
    const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
    const c = iso(cx, cy, maxH / 3);
    cam.x -= (c[0] - canvas.width / 2) / dpr;
    cam.y -= (c[1] - canvas.height / 2) / dpr;
  }

  // Bucket districts into eras by year-month; newest era = index 0 (surface).
  function computeEras() {
    const ym = (d) => (d.date || '2000-01').slice(0, 7);
    const keys = [...new Set(city.districts.map(ym))].sort().reverse(); // newest first
    city.eras = keys.map((k, i) => ({ index: i, ym: k, label: k.replace('-', '.'), count: 0 }));
    const idxOf = Object.fromEntries(keys.map((k, i) => [k, i]));
    for (const d of city.districts) { d._era = idxOf[ym(d)]; city.eras[d._era].count++; }
  }

  fetch('city.json').then((r) => r.json()).then((data) => {
    city = data;
    city.byslug = {};
    for (const d of city.districts) {
      city.byslug[d.slug] = d;
      const heights = (d.buildings && d.buildings.length) ? d.buildings.map((b) => b.h || d.height || 4) : [d.height || 4];
      d._maxH = Math.max(...heights);
    }
    computeEras();
    compass.textContent = `${city.districts.length} DISTRICTS`;
    buildDepthGauge();
    const bt = document.getElementById('dive-btn');
    if (bt) bt.addEventListener('click', toggleDive);
    resize();
    fitView();
    requestAnimationFrame(frame);
  }).catch((err) => {
    document.getElementById('hud-count').textContent = 'LOAD ERROR';
    console.error(err);
  });

  window.addEventListener('resize', () => { resize(); });
})();
