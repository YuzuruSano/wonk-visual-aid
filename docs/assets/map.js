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

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
  }

  // ---- projection ---------------------------------------------------------
  function iso(gx, gy, gz) {
    const s = cam.zoom;
    const sx = (gx - gy) * TILE * s + canvas.width / 2 + cam.x * dpr;
    const sy = (gx + gy) * (TILE / 2) * s - (gz || 0) * Z_UNIT * s + canvas.height / 2 + cam.y * dpr;
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

  // ---- ground grid --------------------------------------------------------
  function drawGrid() {
    const b = city.bounds;
    const pad = 3;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(60,120,130,0.16)';
    for (let gx = b.minX - pad; gx <= b.maxX + pad; gx++) {
      const a = iso(gx, b.minY - pad, 0), c = iso(gx, b.maxY + pad, 0);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
    }
    for (let gy = b.minY - pad; gy <= b.maxY + pad; gy++) {
      const a = iso(b.minX - pad, gy, 0), c = iso(b.maxX + pad, gy, 0);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
    }
  }

  // ---- roads (glowing links) ---------------------------------------------
  function center(d) { return [d.x + d.size.w / 2, d.y + d.size.h / 2]; }
  function drawRoads(pulse) {
    for (const r of city.roads) {
      const A = city.byslug[r.from], B = city.byslug[r.to];
      if (!A || !B) continue;
      const ca = center(A), cb = center(B);
      const p1 = iso(ca[0], ca[1], 0.2), p2 = iso(cb[0], cb[1], 0.2);
      const active = hovered && (hovered.slug === r.from || hovered.slug === r.to);
      ctx.lineWidth = (active ? 3 : 1.8) * cam.zoom;
      ctx.strokeStyle = active ? withA(A.palette.glow, 0.95) : `rgba(130,235,240,${0.32 + r.weight * 0.35})`;
      ctx.shadowBlur = active ? 18 : 10;
      ctx.shadowColor = active ? A.palette.glow : 'rgba(120,220,230,0.4)';
      ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
      ctx.shadowBlur = 0;
      // travelling data pulse
      const tt = (pulse + Math.abs((r.from.length * 7 + r.to.length * 13)) * 0.11) % 1;
      const px = p1[0] + (p2[0] - p1[0]) * tt, py = p1[1] + (p2[1] - p1[1]) * tt;
      ctx.fillStyle = active ? A.palette.glow : 'rgba(160,240,250,0.8)';
      ctx.beginPath(); ctx.arc(px, py, (active ? 3 : 2) * cam.zoom, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---- a single tower -----------------------------------------------------
  function drawTower(d, pulse) {
    const { x, y } = d, w = d.size.w, h = d.size.h, H = d.height || 4;
    const isHover = hovered === d;
    const glow = 0.5 + 0.5 * Math.sin(pulse * 6.28 + (x + y));
    const pal = d.palette;

    // footprint corners (ground)
    const g00 = iso(x, y, 0), g10 = iso(x + w, y, 0), g11 = iso(x + w, y + h, 0), g01 = iso(x, y + h, 0);
    // top corners
    const t00 = iso(x, y, H), t10 = iso(x + w, y, H), t11 = iso(x + w, y + h, H), t01 = iso(x, y + h, H);

    // ground glow pad
    ctx.fillStyle = withA(pal.glow, 0.06 + (isHover ? 0.12 : 0));
    ctx.beginPath();
    ctx.moveTo(g00[0], g00[1]); ctx.lineTo(g10[0], g10[1]); ctx.lineTo(g11[0], g11[1]); ctx.lineTo(g01[0], g01[1]); ctx.closePath(); ctx.fill();

    // left face (x side)
    ctx.fillStyle = shade(pal.primary, 0.30);
    ctx.beginPath();
    ctx.moveTo(g01[0], g01[1]); ctx.lineTo(g11[0], g11[1]); ctx.lineTo(t11[0], t11[1]); ctx.lineTo(t01[0], t01[1]); ctx.closePath(); ctx.fill();
    // right face (y side)
    ctx.fillStyle = shade(pal.primary, 0.48);
    ctx.beginPath();
    ctx.moveTo(g11[0], g11[1]); ctx.lineTo(g10[0], g10[1]); ctx.lineTo(t10[0], t10[1]); ctx.lineTo(t11[0], t11[1]); ctx.closePath(); ctx.fill();
    // top face
    ctx.fillStyle = shade(pal.primary, isHover ? 1.0 : 0.72);
    ctx.beginPath();
    ctx.moveTo(t00[0], t00[1]); ctx.lineTo(t10[0], t10[1]); ctx.lineTo(t11[0], t11[1]); ctx.lineTo(t01[0], t01[1]); ctx.closePath(); ctx.fill();

    // neon vertical edges
    ctx.strokeStyle = withA(pal.glow, 0.55 + glow * 0.45);
    ctx.lineWidth = (isHover ? 2 : 1.1) * cam.zoom;
    ctx.shadowBlur = (isHover ? 18 : 8) * cam.zoom;
    ctx.shadowColor = pal.glow;
    for (const [a, b] of [[g00, t00], [g10, t10], [g11, t11], [g01, t01]]) {
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    // top outline
    ctx.beginPath();
    ctx.moveTo(t00[0], t00[1]); ctx.lineTo(t10[0], t10[1]); ctx.lineTo(t11[0], t11[1]); ctx.lineTo(t01[0], t01[1]); ctx.closePath(); ctx.stroke();
    ctx.shadowBlur = 0;

    // window rows on the tall (right) face
    ctx.fillStyle = withA(pal.glow, 0.5 + glow * 0.3);
    const rows = Math.max(1, Math.round(H));
    for (let r = 1; r < rows; r++) {
      const f = r / rows;
      const a = [g11[0] + (t11[0] - g11[0]) * f, g11[1] + (t11[1] - g11[1]) * f];
      const b = [g10[0] + (t10[0] - g10[0]) * f, g10[1] + (t10[1] - g10[1]) * f];
      if ((r + x + y) % 2 === 0) {
        ctx.globalAlpha = 0.25 + 0.4 * ((r + x) % 3 === 0 ? glow : 0.3);
        ctx.lineWidth = 1 * cam.zoom; ctx.strokeStyle = ctx.fillStyle;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // label
    if (cam.zoom > 0.48) {
      const top = iso(x + w / 2, y + h / 2, H + 0.6);
      ctx.font = `${Math.round(12 * cam.zoom)}px 'Courier New', monospace`;
      ctx.textAlign = 'center';
      const label = d.title.length > 14 ? d.title.slice(0, 13) + '…' : d.title;
      ctx.fillStyle = withA(pal.glow, isHover ? 1 : 0.85);
      ctx.shadowBlur = 8; ctx.shadowColor = '#000';
      ctx.fillText(label, top[0], top[1]);
      ctx.font = `${Math.round(9 * cam.zoom)}px 'Courier New', monospace`;
      ctx.fillStyle = withA(pal.primary, 0.7);
      ctx.fillText(d.archetype, top[0], top[1] + 12 * cam.zoom);
      ctx.shadowBlur = 0;
    }
  }

  // ---- hit test (approx via screen-space bounding of top face) ------------
  function pickAt(mx, my) {
    // iterate front-to-back (higher x+y first) so top towers win
    const sorted = [...city.districts].sort((a, b) => (b.x + b.y) - (a.x + a.y));
    for (const d of sorted) {
      const H = d.height || 4;
      const pts = [iso(d.x, d.y, H), iso(d.x + d.size.w, d.y, H), iso(d.x + d.size.w, d.y + d.size.h, H),
        iso(d.x, d.y + d.size.h, H), iso(d.x, d.y, 0), iso(d.x + d.size.w, d.y + d.size.h, 0)];
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      if (mx >= Math.min(...xs) && mx <= Math.max(...xs) && my >= Math.min(...ys) && my <= Math.max(...ys)) return d;
    }
    return null;
  }

  // ---- frame --------------------------------------------------------------
  function frame(now) {
    const pulse = ((now - t0) / 4000) % 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // vignette background
    const g = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width * 0.7);
    g.addColorStop(0, '#05131a'); g.addColorStop(1, '#01060a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid();
    drawRoads(pulse);
    // towers back-to-front
    const sorted = [...city.districts].sort((a, b) => (a.x + a.y) - (b.x + b.y));
    for (const d of sorted) drawTower(d, pulse);

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

  fetch('city.json').then((r) => r.json()).then((data) => {
    city = data;
    city.byslug = {};
    for (const d of city.districts) city.byslug[d.slug] = d;
    compass.textContent = `${city.districts.length} DISTRICTS`;
    resize();
    fitView();
    requestAnimationFrame(frame);
  }).catch((err) => {
    document.getElementById('hud-count').textContent = 'LOAD ERROR';
    console.error(err);
  });

  window.addEventListener('resize', () => { resize(); });
})();
