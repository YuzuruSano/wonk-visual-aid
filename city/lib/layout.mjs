// City layout: place districts on a grid so the map GROWS over time.
// Each new district is anchored next to the already-placed district it is
// most strongly linked to (by "roads"), so thematically-related articles
// cluster into neighbourhoods. Deterministic -> reproducible builds.

/**
 * @param {Array} districts  each: { slug, size:{w,h}, roads:[{to,weight}], founded:number }
 * @returns {{ placed:Array, roads:Array, bounds:{minX,minY,maxX,maxY} }}
 */
export function layoutCity(districts) {
  const order = [...districts].sort((a, b) => a.founded - b.founded || a.slug.localeCompare(b.slug));
  const placed = [];
  const byslug = new Map();
  const occupied = new Set(); // "x,y" cells taken (with margin)
  const MARGIN = 1;

  const key = (x, y) => `${x},${y}`;

  const footprintCells = (x, y, w, h) => {
    const cells = [];
    for (let dx = -MARGIN; dx < w + MARGIN; dx++)
      for (let dy = -MARGIN; dy < h + MARGIN; dy++)
        cells.push(key(x + dx, y + dy));
    return cells;
  };

  const fits = (x, y, w, h) => footprintCells(x, y, w, h).every((c) => !occupied.has(c));

  const commit = (d, x, y) => {
    d.x = x; d.y = y;
    footprintCells(x, y, d.size.w, d.size.h).forEach((c) => occupied.add(c));
    placed.push(d);
    byslug.set(d.slug, d);
  };

  // Ring/spiral search for the nearest free slot around an anchor point.
  const findSlot = (cx, cy, w, h) => {
    if (fits(cx, cy, w, h)) return [cx, cy];
    for (let r = 1; r < 200; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; // ring edge only
          const x = cx + dx * (w + MARGIN);
          const y = cy + dy * (h + MARGIN);
          if (fits(x, y, w, h)) return [x, y];
        }
      }
    }
    return [cx, cy];
  };

  order.forEach((d, idx) => {
    if (idx === 0) { commit(d, 0, 0); return; }

    // Strongest link to an already-placed district.
    let anchor = null, best = -Infinity;
    for (const r of d.roads || []) {
      const target = byslug.get(r.to);
      if (target && r.weight > best) { best = r.weight; anchor = target; }
    }

    let ax, ay;
    if (anchor) {
      // Aim just outside the anchor's footprint, biased outward from city core.
      const cx = anchor.x + Math.round(anchor.size.w / 2);
      const cy = anchor.y + Math.round(anchor.size.h / 2);
      const ang = (idx * 137.508) * (Math.PI / 180); // golden-angle spread
      ax = cx + Math.round(Math.cos(ang) * (anchor.size.w + d.size.w));
      ay = cy + Math.round(Math.sin(ang) * (anchor.size.h + d.size.h));
    } else {
      // No links yet: spiral out from origin.
      const ang = (idx * 137.508) * (Math.PI / 180);
      const rad = 3 + idx;
      ax = Math.round(Math.cos(ang) * rad);
      ay = Math.round(Math.sin(ang) * rad);
    }

    const [x, y] = findSlot(ax, ay, d.size.w, d.size.h);
    commit(d, x, y);
  });

  // Resolve roads to concrete endpoints (only where both ends exist).
  const roads = [];
  const seen = new Set();
  for (const d of placed) {
    for (const r of d.roads || []) {
      const t = byslug.get(r.to);
      if (!t) continue;
      const id = [d.slug, r.to].sort().join('~');
      if (seen.has(id)) continue;
      seen.add(id);
      roads.push({ from: d.slug, to: r.to, weight: r.weight });
    }
  }

  const bounds = placed.reduce((b, d) => ({
    minX: Math.min(b.minX, d.x),
    minY: Math.min(b.minY, d.y),
    maxX: Math.max(b.maxX, d.x + d.size.w),
    maxY: Math.max(b.maxY, d.y + d.size.h),
  }), { minX: 0, minY: 0, maxX: 1, maxY: 1 });

  return { placed, roads, bounds };
}
