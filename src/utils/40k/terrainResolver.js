// src/utils/40k/terrainResolver.js
const _DEG = Math.PI / 180;
export const BOARD_INCHES = { width: 60, height: 44 };

export function footprintVertices(fp) {
  if (!fp) return [];
  if (fp.type === 'rectangle') {
    return [
      { x: 0, y: 0 },
      { x: fp.width, y: 0 },
      { x: fp.width, y: fp.height },
      { x: 0, y: fp.height }
    ];
  }
  if (fp.type === 'polygon') {
    return fp.points.map(p => ({ x: p.x, y: p.y }));
  }
  return [];
}

export function polygonCentroid(verts) {
  const n = verts.length;
  if (n === 0) return { x: 0, y: 0 };
  let twiceArea = 0.0, cx = 0.0, cy = 0.0;
  for (let i = 0; i < n; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % n];
    const cross = a.x * b.y - b.x * a.y;
    twiceArea += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  if (twiceArea === 0) {
    const mx = verts.reduce((s, v) => s + v.x, 0) / n;
    const my = verts.reduce((s, v) => s + v.y, 0) / n;
    return { x: mx, y: my };
  }
  return { x: cx / (3 * twiceArea), y: cy / (3 * twiceArea) };
}

export function applyMirror(v, m) {
  if (m === 'horizontal') return { x: -v.x, y: v.y };
  if (m === 'vertical') return { x: v.x, y: -v.y };
  return v;
}

export function rotateCw(v, deg) {
  if (!deg) return { x: v.x, y: v.y };
  const r = deg * _DEG;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: c * v.x - s * v.y, y: s * v.x + c * v.y };
}

export function orient(v, rotation, mirror) {
  return rotateCw(applyMirror(v, mirror), rotation);
}

export function placeFootprint(fp, position, rotation, mirror) {
  const verts = footprintVertices(fp);
  const c = polygonCentroid(verts);
  return verts.map(v => {
    const o = orient({ x: v.x - c.x, y: v.y - c.y }, rotation, mirror);
    return { x: o.x + position.x, y: o.y + position.y };
  });
}

// Löst beliebige Ketten auf: Piece -> Composite -> Base Template -> Footprint
function getFootprintOf(item, byId) {
  if (!item) return null;
  if (item.footprint) return item.footprint;
  if (item.template) {
    const t = byId[item.template];
    if (!t) return null;
    if (t.footprint) return t.footprint;
    if (t.template) {
      const base = byId[t.template];
      return base?.footprint || null;
    }
  }
  return null;
}

// 1:1 Portierung von resolve.py
export function resolveLayout(layout, templates) {
  if (!layout?.pieces) return [];
  const byId = {};
  templates.forEach(t => { byId[t.id] = t; });

  const out = [];

  for (const piece of layout.pieces) {
    const template = byId[piece.template || piece.id];
    const fp = getFootprintOf(piece, byId);
    if (!fp) continue;

    const rotation = piece.rotation_degrees || 0;
    const mirror = piece.mirror || 'none';

    // 1. Bodenplatte (Area Base)
    const areaVerts = placeFootprint(fp, piece.position, rotation, mirror);
    out.push({
      id: piece.id,
      piece_type: 'area',
      vertices: areaVerts
    });

    // 2. Ruinen-Wände & Features (L-Ruinen)
    const features = template?.features || [];
    for (const feat of features) {
      const ft = byId[feat.template];
      const featFp = ft?.footprint || getFootprintOf(feat, byId);
      if (featFp) {
        const areaLocal = placeFootprint(featFp, feat.position, feat.rotation_degrees || 0, feat.mirror || 'none');
        const featVerts = areaLocal.map(p => {
          const o = orient(p, rotation, mirror);
          return { x: o.x + piece.position.x, y: o.y + piece.position.y };
        });
        out.push({
          id: `${piece.id}-${feat.template}`,
          piece_type: 'feature',
          vertices: featVerts
        });
      }
    }
  }

  return out;
}

// 1:1 Portierung von keystones.py
export function computeKeystoneMeasurements(resolvedPieces, boardWidth = 60, boardHeight = 44) {
  const measurements = [];
  const areas = resolvedPieces.filter(p => p.piece_type === 'area');

  areas.forEach((area) => {
    const verts = area.vertices;
    if (!verts || verts.length === 0) return;

    let bestLeft = verts[0], bestRight = verts[0], bestTop = verts[0], bestBottom = verts[0];
    verts.forEach(v => {
      if (v.x < bestLeft.x) bestLeft = v;
      if (v.x > bestRight.x) bestRight = v;
      if (v.y < bestTop.y) bestTop = v;
      if (v.y > bestBottom.y) bestBottom = v;
    });

    if (bestLeft.x < 18) {
      const dist = Math.round(bestLeft.x);
      if (dist >= 3) {
        measurements.push({ axis: 'x', edge: 'left', target: bestLeft, from: { x: 0, y: bestLeft.y }, distance: `${dist}"` });
      }
    } else if (boardWidth - bestRight.x < 18) {
      const dist = Math.round(boardWidth - bestRight.x);
      if (dist >= 3) {
        measurements.push({ axis: 'x', edge: 'right', target: bestRight, from: { x: boardWidth, y: bestRight.y }, distance: `${dist}"` });
      }
    }

    if (bestTop.y < 15) {
      const dist = Math.round(bestTop.y);
      if (dist >= 3) {
        measurements.push({ axis: 'y', edge: 'top', target: bestTop, from: { x: bestTop.x, y: 0 }, distance: `${dist}"` });
      }
    } else if (boardHeight - bestBottom.y < 15) {
      const dist = Math.round(boardHeight - bestBottom.y);
      if (dist >= 3) {
        measurements.push({ axis: 'y', edge: 'bottom', target: bestBottom, from: { x: bestBottom.x, y: boardHeight }, distance: `${dist}"` });
      }
    }
  });

  return measurements;
}