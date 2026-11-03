/* =====================================================================
   MATEMÁTICA
   Los polinomios son arreglos de coeficientes reales en potencias
   descendentes (como en MatLab): [1, 6, 45] es s² + 6s + 45.
   Los complejos son objetos {re, im}.
   ===================================================================== */
const complejo = (re, im = 0) => ({ re, im });
const cAbs = z => Math.hypot(z.re, z.im);
const cSub = (a, b) => complejo(a.re - b.re, a.im - b.im);
const cMul = (a, b) => complejo(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const cDiv = (a, b) => { const d = b.re * b.re + b.im * b.im; return complejo((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); };

/* Más allá de esto el trazado no termina a tiempo y la página se traba con cada tecla
   (s^300 tardaba 7 s). Las guías no pasan de grado 5. */
const GRADO_MAX = 20;

/* Saca los coeficientes principales nulos. La tolerancia es la del redondeo de la máquina:
   con 1e-12, en 0,001s³ + s² + 1e9 el s³ se tomaba como cero y se perdía un polo. */
function pTrim(p, tol = 1e-15) {
  const mx = Math.max(...p.map(Math.abs));
  if (!(mx > 0)) return [0];
  let i = 0;
  while (i < p.length - 1 && Math.abs(p[i]) <= tol * mx) i++;
  return p.slice(i);
}
function pAdd(a, b) {
  const n = Math.max(a.length, b.length), r = new Array(n).fill(0);
  a.forEach((c, i) => r[n - a.length + i] += c);
  b.forEach((c, i) => r[n - b.length + i] += c);
  return r;
}
const pScale = (p, k) => p.map(c => c * k);
function pMul(a, b) {
  const r = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) r[i + j] += a[i] * b[j];
  return r;
}
function pDer(p) {
  const g = p.length - 1;
  return g < 1 ? [0] : p.slice(0, g).map((c, i) => c * (g - i));
}
function pEval(p, z) {
  let r = complejo(0, 0);
  for (const c of p) { r = cMul(r, z); r.re += c; }
  return r;
}
function pDesdeRaices(rs) {
  let p = [complejo(1, 0)];
  for (const r of rs) {
    const q = new Array(p.length + 1).fill(0).map(() => complejo(0, 0));
    p.forEach((c, i) => {
      q[i].re += c.re; q[i].im += c.im;
      const t = cMul(c, r);
      q[i + 1].re -= t.re; q[i + 1].im -= t.im;
    });
    p = q;
  }
  return p.map(c => c.re);
}

/* Raíces por el método de Aberth. `ini` permite arrancar de una estimación previa. */
function raicesPoli(p, ini) {
  p = pTrim(p);
  const d = p.length - 1;
  if (d < 1) return [];
  const mx = Math.max(...p.map(Math.abs));
  let ceros = 0;
  while (ceros < d && Math.abs(p[d - ceros]) <= 1e-14 * mx) ceros++;
  const out = [];
  for (let i = 0; i < ceros; i++) out.push(complejo(0, 0));
  const q = p.slice(0, d + 1 - ceros), g = q.length - 1;
  if (g < 1) return out;
  const a = q.map(c => c / q[0]);
  let z;
  if (ini && ini.length === g) {
    // un arranque exactamente real nunca saldría del eje: se lo corre un poco en imaginario
    z = ini.map((c, i) => ({ re: c.re, im: Math.abs(c.im) < 1e-12 ? (i % 2 ? 1 : -1) * 1e-6 * (1 + Math.abs(c.re)) : c.im }));
  }
  else {
    const r0 = Math.max(1e-6, Math.pow(Math.abs(a[g]), 1 / g));
    z = [];
    for (let k = 0; k < g; k++) z.push({ re: r0 * Math.cos(2 * Math.PI * k / g + 0.4), im: r0 * Math.sin(2 * Math.PI * k / g + 0.4) });
  }
  const maxIt = ini ? 80 : 500;
  for (let it = 0; it < maxIt; it++) {
    let maxd = 0;
    for (let i = 0; i < g; i++) {
      const zr = z[i].re, zi = z[i].im;
      let pr = a[0], pi = 0, dr = 0, di = 0;
      for (let k = 1; k <= g; k++) {
        const ndr = dr * zr - di * zi + pr, ndi = dr * zi + di * zr + pi;
        const npr = pr * zr - pi * zi + a[k], npi = pr * zi + pi * zr;
        dr = ndr; di = ndi; pr = npr; pi = npi;
      }
      if (pr === 0 && pi === 0) continue;
      const den = dr * dr + di * di;
      let wr, wi;
      if (den === 0) { wr = 1e-8; wi = 1e-8; }
      else { wr = (pr * dr + pi * di) / den; wi = (pi * dr - pr * di) / den; }
      let sr = 0, si = 0;
      for (let j = 0; j < g; j++) {
        if (j === i) continue;
        const xr = zr - z[j].re, xi = zi - z[j].im, dd = xr * xr + xi * xi || 1e-300;
        sr += xr / dd; si -= xi / dd;
      }
      const br = 1 - (wr * sr - wi * si), bi = -(wr * si + wi * sr), bb = br * br + bi * bi || 1e-300;
      const er = (wr * br + wi * bi) / bb, ei = (wi * br - wr * bi) / bb;
      z[i].re -= er; z[i].im -= ei;
      maxd = Math.max(maxd, Math.hypot(er, ei) / (1 + Math.hypot(z[i].re, z[i].im)));
    }
    if (maxd < 1e-13) break;
  }
  return out.concat(z.map(c => complejo(c.re, c.im)));
}
function limpiar(rs) {
  return rs.map(z => {
    const t = 1e-7 * Math.max(1, cAbs(z));
    return complejo(Math.abs(z.re) < t ? 0 : z.re, Math.abs(z.im) < t ? 0 : z.im);
  }).sort((a, b) => b.re - a.re || b.im - a.im);
}
/* Junta raíces repetidas: [{z, mult}] */
function agrupar(rs, tolRel = 5e-5) {
  const gs = [];
  for (const z of rs) {
    const g = gs.find(g => cAbs(cSub(g.z, z)) <= tolRel * (1 + cAbs(z)));
    if (g) { g.sum = complejo(g.sum.re + z.re, g.sum.im + z.im); g.mult++; g.z = complejo(g.sum.re / g.mult, g.sum.im / g.mult); }
    else gs.push({ z: complejo(z.re, z.im), mult: 1, sum: complejo(z.re, z.im) });
  }
  return gs.map(g => ({ z: limpiar([g.z])[0], mult: g.mult })).sort((a, b) => b.z.re - a.z.re || b.z.im - a.z.im);
}
const expandir = gs => gs.flatMap(g => Array.from({ length: g.mult }, () => g.z));
