/* ===================================================================
   Algoritmo de Ruteo Ortogonal en Ángulo Recto y Geometría
   Preservado y tipado con TypeScript puro desacoplado del DOM.
   =================================================================== */

export interface Punto {
  x: number;
  y: number;
}

export interface Rectangulo {
  l: number;
  r: number;
  t: number;
  b: number;
  cx?: number;
  cy?: number;
  w?: number;
  h?: number;
}

export type Segmento = [Punto, Punto];

export function cleanPts(pts: Punto[]): Punto[] {
  const out: Punto[] = [];
  for (const p of pts) {
    const q: Punto = { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
    if (
      out.length &&
      Math.abs(out[out.length - 1].x - q.x) < 0.3 &&
      Math.abs(out[out.length - 1].y - q.y) < 0.3
    ) {
      continue;
    }
    out.push(q);
  }
  const res: Punto[] = [];
  for (let i = 0; i < out.length; i++) {
    if (i > 0 && i < out.length - 1) {
      const a = out[i - 1];
      const b = out[i];
      const c = out[i + 1];
      const col =
        (Math.abs(a.x - b.x) < 0.3 && Math.abs(b.x - c.x) < 0.3) ||
        (Math.abs(a.y - b.y) < 0.3 && Math.abs(b.y - c.y) < 0.3);
      if (col) continue;
    }
    res.push(out[i]);
  }
  return res;
}

export function segsOf(pts: Punto[]): Segmento[] {
  const s: Segmento[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    s.push([pts[i], pts[i + 1]]);
  }
  return s;
}

export function segRect(seg: Segmento, R: Rectangulo): boolean {
  const x1 = Math.min(seg[0].x, seg[1].x);
  const x2 = Math.max(seg[0].x, seg[1].x);
  const y1 = Math.min(seg[0].y, seg[1].y);
  const y2 = Math.max(seg[0].y, seg[1].y);
  return !(x2 < R.l || x1 > R.r || y2 < R.t || y1 > R.b);
}

export interface OverlapInfo {
  kind: "col" | "cross";
  ov?: number;
  exact?: boolean;
}

export function overlapInfo(seg: Segmento, other: Segmento): OverlapInfo | null {
  const horiz = Math.abs(seg[0].y - seg[1].y) < 0.5;
  const horiz2 = Math.abs(other[0].y - other[1].y) < 0.5;
  const vert = Math.abs(seg[0].x - seg[1].x) < 0.5;
  const vert2 = Math.abs(other[0].x - other[1].x) < 0.5;

  if (horiz && horiz2 && Math.abs(seg[0].y - other[0].y) < 7) {
    const a1 = Math.min(seg[0].x, seg[1].x);
    const a2 = Math.max(seg[0].x, seg[1].x);
    const b1 = Math.min(other[0].x, other[1].x);
    const b2 = Math.max(other[0].x, other[1].x);
    const ov = Math.min(a2, b2) - Math.max(a1, b1);
    if (ov > 6) {
      return { kind: "col", ov, exact: Math.abs(seg[0].y - other[0].y) < 0.6 };
    }
  }

  if (vert && vert2 && Math.abs(seg[0].x - other[0].x) < 7) {
    const a1 = Math.min(seg[0].y, seg[1].y);
    const a2 = Math.max(seg[0].y, seg[1].y);
    const b1 = Math.min(other[0].y, other[1].y);
    const b2 = Math.max(other[0].y, other[1].y);
    const ov = Math.min(a2, b2) - Math.max(a1, b1);
    if (ov > 6) {
      return { kind: "col", ov, exact: Math.abs(seg[0].x - other[0].x) < 0.6 };
    }
  }

  if ((horiz && vert2) || (vert && horiz2)) {
    return { kind: "cross" };
  }

  return null;
}

export function entraEn(seg: Segmento, R: Rectangulo): boolean {
  const x1 = Math.min(seg[0].x, seg[0].x);
  const x2 = Math.max(seg[0].x, seg[1].x);
  const y1 = Math.min(seg[0].y, seg[1].y);
  const y2 = Math.max(seg[0].y, seg[1].y);
  return x2 > R.l + 1 && x1 < R.r - 1 && y2 > R.t + 1 && y1 < R.b - 1;
}

export interface PlacedSegment {
  seg: Segmento;
  keys?: string;
}

export function scorePath(
  pts: Punto[],
  obstacles: Rectangulo[],
  placed: PlacedSegment[],
  keys?: string,
  propios: Rectangulo[] = [],
  sonHermanas?: (k1?: string, k2?: string) => boolean
): number {
  let s = 0;
  const segs = segsOf(pts);
  s += (segs.length - 1) * 16;

  for (const seg of segs) {
    s += (Math.abs(seg[0].x - seg[1].x) + Math.abs(seg[0].y - seg[1].y)) * 0.012;
    for (const R of obstacles) if (segRect(seg, R)) s += 500;
    for (const R of propios) if (entraEn(seg, R)) s += 500;
    for (const o of placed) {
      const r = overlapInfo(seg, o.seg);
      if (!r) continue;
      if (r.kind === "cross") {
        s += 3;
        continue;
      }
      if (sonHermanas && sonHermanas(keys, o.keys)) {
        s -= r.exact ? Math.min(r.ov || 0, 260) * 0.7 : 0;
      } else {
        s += 140 + (r.ov || 0) * 0.6;
      }
    }
  }
  return s;
}

/**
 * Genera el string SVG path (d) con esquinas redondeadas
 */
export function pathD(pts: Punto[], r: number = 6): string {
  if (!pts || pts.length < 2) return "";
  if (r <= 0) {
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  }
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    const a = pts[i - 1];
    const b = pts[i + 1];
    const d1 = Math.hypot(p.x - a.x, p.y - a.y);
    const d2 = Math.hypot(b.x - p.x, b.y - p.y);
    const k = Math.min(r, d1 / 2, d2 / 2);
    const u1 = { x: (a.x - p.x) / (d1 || 1), y: (a.y - p.y) / (d1 || 1) };
    const u2 = { x: (b.x - p.x) / (d2 || 1), y: (b.y - p.y) / (d2 || 1) };
    d += ` L ${p.x + u1.x * k} ${p.y + u1.y * k} Q ${p.x} ${p.y} ${p.x + u2.x * k} ${p.y + u2.y * k}`;
  }
  const e = pts[pts.length - 1];
  d += ` L ${e.x} ${e.y}`;
  return d;
}
