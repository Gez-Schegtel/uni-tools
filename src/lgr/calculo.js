/* =====================================================================
   MATEMÁTICA
   Los polinomios son arreglos de coeficientes reales en potencias
   descendentes (como en MatLab): [1, 6, 45] es s² + 6s + 45.
   Los complejos son objetos {re, im}.
   ===================================================================== */
const C = (re, im = 0) => ({ re, im });
const cAbs = z => Math.hypot(z.re, z.im);
const cSub = (a, b) => C(a.re - b.re, a.im - b.im);
const cMul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const cDiv = (a, b) => { const d = b.re * b.re + b.im * b.im; return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); };

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
  let r = C(0, 0);
  for (const c of p) { r = cMul(r, z); r.re += c; }
  return r;
}
function pDesdeRaices(rs) {
  let p = [C(1, 0)];
  for (const r of rs) {
    const q = new Array(p.length + 1).fill(0).map(() => C(0, 0));
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
  for (let i = 0; i < ceros; i++) out.push(C(0, 0));
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
  return out.concat(z.map(c => C(c.re, c.im)));
}
function limpiar(rs) {
  return rs.map(z => {
    const t = 1e-7 * Math.max(1, cAbs(z));
    return C(Math.abs(z.re) < t ? 0 : z.re, Math.abs(z.im) < t ? 0 : z.im);
  }).sort((a, b) => b.re - a.re || b.im - a.im);
}
/* Junta raíces repetidas: [{z, mult}] */
function agrupar(rs, tolRel = 5e-5) {
  const gs = [];
  for (const z of rs) {
    const g = gs.find(g => cAbs(cSub(g.z, z)) <= tolRel * (1 + cAbs(z)));
    if (g) { g.sum = C(g.sum.re + z.re, g.sum.im + z.im); g.mult++; g.z = C(g.sum.re / g.mult, g.sum.im / g.mult); }
    else gs.push({ z: C(z.re, z.im), mult: 1, sum: C(z.re, z.im) });
  }
  return gs.map(g => ({ z: limpiar([g.z])[0], mult: g.mult })).sort((a, b) => b.z.re - a.z.re || b.z.im - a.z.im);
}
const expandir = gs => gs.flatMap(g => Array.from({ length: g.mult }, () => g.z));

/* ---------- lectura de lo que escribe el usuario ---------- */
function parsearComplejo(t) {
  t = t.replace(/[−–]/g, '-').replace(/\s+/g, '');
  const m = t.match(/[+-]?[^+-]+/g);
  if (!m || m.join('') !== t) return null;
  let re = 0, im = 0;
  for (const x of m) {
    if (/[ji]$/i.test(x)) {
      const c = x.slice(0, -1);
      if (!/^[+-]?(\d+\.?\d*|\.\d+)?$/.test(c)) return null;
      im += c === '' || c === '+' ? 1 : c === '-' ? -1 : parseFloat(c);
    } else {
      if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(x)) return null;
      re += parseFloat(x);
    }
  }
  return C(re, im);
}
function parsearLista(txt) {
  let t = txt.replace(/[−–]/g, '-').replace(/[\[\]]/g, ' ');
  if (/^\s*(no\s+existen?|ninguno|ninguna|-|—)?\s*$/i.test(t)) return [];
  t = t.replace(/(\d),(\d)/g, '$1.$2');
  t = t.replace(/(\d|\.)\s*([+-])\s*((?:\d+\.?\d*|\.\d+)?[ji])(?![\w.])/gi, '$1$2$3');
  return t.split(/[;,\s]+/).filter(Boolean).map(x => {
    const z = parsearComplejo(x);
    if (!z) throw new Error('No entiendo «' + x + '». Usá, por ejemplo, 2; -3,5; -2+3j');
    return z;
  });
}
function parsearPoli(txt) {
  let t = txt.replace(/[−–]/g, '-').replace(/[·×]/g, '*').replace(/(\d),(\d)/g, '$1.$2')
    .replace(/[²³⁴⁵⁶⁷⁸⁹]/g, c => '^' + (2 + '²³⁴⁵⁶⁷⁸⁹'.indexOf(c))).trim();
  if (!t) throw new Error('Falta completar el polinomio');
  if (t[0] === '[') {
    const v = t.replace(/[\[\]]/g, ' ').split(/[\s;,]+/).filter(Boolean).map(Number);
    if (!v.length || v.some(isNaN)) throw new Error('El vector de coeficientes no es válido');
    return pTrim(v);
  }
  const tok = [], re = /((?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|[sSkK]|[()+\-*\/^])/y;
  let i = 0;
  while (i < t.length) {
    if (/\s/.test(t[i])) { i++; continue; }
    re.lastIndex = i;
    const m = re.exec(t);
    if (!m) throw new Error('Carácter no válido: «' + t[i] + '»');
    tok.push(m[1]); i = re.lastIndex;
  }
  let p = 0;
  const peek = () => tok[p];
  function atomo() {
    const x = tok[p++];
    if (x === undefined) throw new Error('La expresión está incompleta');
    if (x === '(') { const r = expr(); if (tok[p++] !== ')') throw new Error('Falta cerrar un paréntesis'); return r; }
    if (/^[sS]$/.test(x)) return [1, 0];
    if (/^[kK]$/.test(x)) return [1];
    if (/^[\d.]/.test(x)) return [parseFloat(x)];
    throw new Error('No se esperaba «' + x + '»');
  }
  function potencia() {
    let b = atomo();
    if (peek() === '^') {
      p++;
      const e = tok[p++];
      if (!e || !/^\d+$/.test(e)) throw new Error('El exponente debe ser un entero positivo');
      if (+e > GRADO_MAX) throw new Error('El exponente no puede pasar de ' + GRADO_MAX);
      let r = [1];
      for (let k = 0; k < +e; k++) r = pMul(r, b);
      b = r;
    }
    return b;
  }
  function unario() {
    if (peek() === '-') { p++; return pScale(unario(), -1); }
    if (peek() === '+') { p++; return unario(); }
    return potencia();
  }
  function term() {
    let r = unario();
    for (;;) {
      const x = peek();
      if (x === '*') { p++; r = pMul(r, unario()); }
      else if (x === '/') {
        p++;
        const q = pTrim(unario());
        if (q.length > 1) throw new Error('Sólo se puede dividir por un número: usá N(s) y D(s) por separado');
        r = pScale(r, 1 / q[0]);
      } else if (x !== undefined && /^[\d.sSkK(]/.test(x)) r = pMul(r, potencia());
      else break;
    }
    return r;
  }
  function expr() {
    let r = term();
    while (peek() === '+' || peek() === '-') {
      const o = tok[p++], q = term();
      r = pAdd(r, o === '+' ? q : pScale(q, -1));
    }
    return r;
  }
  const r = expr();
  if (p < tok.length) throw new Error('Sobra «' + tok[p] + '» en la expresión');
  return pTrim(r);
}

/* ---------- formato ---------- */
function fnum(x, d = 4) {
  if (!isFinite(x)) return x > 0 ? '∞' : x < 0 ? '−∞' : 'NaN';
  let s = (+x).toFixed(d);
  if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
  if (s === '-0') s = '0';
  return s.replace('-', '−').replace('.', ',');
}
function fcomp(z, d = 4) {
  const t = 1e-9 * Math.max(1, Math.abs(z.re), Math.abs(z.im));
  const re = Math.abs(z.re) < t ? 0 : z.re, im = Math.abs(z.im) < t ? 0 : z.im;
  if (im === 0) return fnum(re, d);
  const ims = (Math.abs(Math.abs(im) - 1) < 1e-12 ? '' : fnum(Math.abs(im), d)) + 'j';
  if (re === 0) return (im < 0 ? '−' : '') + ims;
  return fnum(re, d) + (im < 0 ? ' − ' : ' + ') + ims;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sup = e => e === 1 ? '' : '<sup>' + e + '</sup>';
function polyHTML(p, v = 's') {
  p = pTrim(p);
  const g = p.length - 1;
  let out = '';
  p.forEach((c, i) => {
    if (Math.abs(c) < 1e-12) return;
    const e = g - i, a = Math.abs(c);
    const coef = (Math.abs(a - 1) < 1e-12 && e > 0) ? '' : fnum(a);
    const parte = coef + (e === 0 ? '' : v + sup(e));
    if (!out) out = (c < 0 ? '−' : '') + parte;
    else out += (c < 0 ? ' − ' : ' + ') + parte;
  });
  return out || '0';
}
const fr = (a, b) => '<span class="fr"><span>' + a + '</span><span>' + b + '</span></span>';
function factorHTML(r, v = 's') {
  if (Math.abs(r.im) < 1e-12) {
    if (Math.abs(r.re) < 1e-12) return v;
    return '(' + v + (r.re < 0 ? ' + ' : ' − ') + fnum(Math.abs(r.re)) + ')';
  }
  return '(' + v + ' − (' + fcomp(r) + '))';
}
function factoresSimples(gs) {
  if (!gs.length) return '1';
  return gs.flatMap(g => Array.from({ length: g.mult }, () => factorHTML(g.z))).join('');
}
function factoresAgrupados(gs) {
  if (!gs.length) return '1';
  return gs.map(g => {
    if (Math.abs(g.z.im) < 1e-12) return Math.abs(g.z.re) < 1e-12 ? 's' + sup(g.mult) : factorHTML(g.z) + sup(g.mult);
    if (g.z.im < 0) return '';
    return '(' + polyHTML([1, -2 * g.z.re, g.z.re * g.z.re + g.z.im * g.z.im]) + ')' + sup(g.mult);
  }).join('');
}
const mod360 = a => { a = ((a % 360) + 360) % 360; return (360 - a < 1e-9) ? 0 : a; };
const angDe = z => Math.atan2(z.im, z.re) * 180 / Math.PI;
const fang = a => fnum(a, 2) + '°';

/* ---------- análisis completo (los pasos de la teoría) ---------- */
function analizar(e) {
  const { N, D } = e;
  const n = D.length - 1, m = N.length - 1;
  const polos = agrupar(e.polosL), ceros = agrupar(e.cerosL);
  const R = { ...e, n, m, polos, ceros };
  const sing = polos.concat(ceros);

  // 1) eje real
  const reales = sing.filter(g => Math.abs(g.z.im) < 1e-9).sort((a, b) => b.z.re - a.z.re);
  const filas = [];
  if (reales.length) {
    let acum = 0;
    filas.push({ a: reales[0].z.re, b: Infinity, cnt: 0, ok: false });
    reales.forEach((g, i) => {
      acum += g.mult;
      const sig = reales[i + 1];
      filas.push({ a: sig ? sig.z.re : -Infinity, b: g.z.re, cnt: acum, ok: acum % 2 === 1 });
    });
  }
  R.eje = filas;

  // 2) asíntotas
  const d = n - m, dd = Math.abs(d);
  R.asint = { d };
  if (d !== 0) {
    const sp = expandir(polos).reduce((s, z) => s + z.re, 0), sz = expandir(ceros).reduce((s, z) => s + z.re, 0);
    R.asint.sumP = sp; R.asint.sumZ = sz;
    R.asint.sigma = (sp - sz) / d;
    R.asint.angs = Array.from({ length: dd }, (_, k) => ({ k, crudo: 180 * (2 * k + 1) / dd, ang: mod360(180 * (2 * k + 1) / dd) }));
  }

  // 3) puntos de ruptura: dK/ds = 0  con  K = −D/N
  const Dp = pDer(D), Np = pDer(N);
  const t1 = pMul(Dp, N), t2 = pMul(D, Np);
  const P = pTrim(pAdd(t1, pScale(t2, -1)), 1e-11);
  const rup = { Dp, Np, t1, t2, P, filas: [] };
  if (P.length > 1) {
    agrupar(limpiar(raicesPoli(P))).forEach(g => {
      const s = g.z, Nv = pEval(N, s), Dv = pEval(D, s);
      let K = null, ok = false, nota = '';
      const real = Math.abs(s.im) < 1e-9;
      if (cAbs(Nv) < 1e-9) {
        // cero múltiple: K → ∞
        const r = real ? R.eje.some(f => f.ok && s.re <= f.b + 1e-9 && s.re >= f.a - 1e-9) : false;
        ok = r; nota = 'es un cero múltiple (K → ∞)';
      } else {
        K = cDiv(C(-Dv.re, -Dv.im), Nv);
        const kreal = Math.abs(K.im) <= 1e-6 * Math.max(1, Math.abs(K.re));
        if (kreal && K.re > 1e-9) ok = true;
        else if (kreal && Math.abs(K.re) <= 1e-9) { ok = true; nota = 'es un polo múltiple (K = 0)'; }
        else nota = kreal ? 'K < 0' : 'K no es real';
      }
      let tipo = '';
      if (ok && real && K && K.re > 1e-9) {
        const h = 1e-3 * (1 + Math.abs(s.re));
        const kf = x => { const c = cDiv(C(-pEval(D, C(x, 0)).re, 0), pEval(N, C(x, 0))); return c.re; };
        const k0 = K.re, k1 = kf(s.re - h), k2 = kf(s.re + h);
        tipo = (k0 > k1 && k0 > k2) ? 'salida del eje real' : (k0 < k1 && k0 < k2) ? 'ingreso al eje real' : '';
      }
      rup.filas.push({ z: s, mult: g.mult, K, ok, nota, tipo });
    });
  }
  R.rup = rup;

  // 4) cruce con el eje imaginario: s = jω
  const parte = (p, que) => {
    const g = p.length - 1, r = new Array(g + 1).fill(0);
    p.forEach((c, i) => {
      const k = g - i;
      if (que === 're' && k % 2 === 0) r[g - k] += c * (k % 4 === 0 ? 1 : -1);
      if (que === 'im' && k % 2 === 1) r[g - k] += c * (k % 4 === 1 ? 1 : -1);
    });
    return pTrim(r);
  };
  const Dr = parte(D, 're'), Di = parte(D, 'im'), Nr = parte(N, 're'), Ni = parte(N, 'im');
  const Q = pTrim(pAdd(pMul(Di, Nr), pScale(pMul(Dr, Ni), -1)), 1e-11);
  const cruce = { Dr, Di, Nr, Ni, Q, filas: [], identico: false };
  if (Q.length === 1 && Math.abs(Q[0]) < 1e-9) cruce.identico = true;
  else if (Q.length > 1 || Math.abs(Q[0]) > 0) {
    const ws = [];
    if (Q.length === 1) { /* constante no nula: sin raíces */ }
    else limpiar(raicesPoli(Q)).forEach(z => {
      if (Math.abs(z.im) > 1e-6 * Math.max(1, Math.abs(z.re))) return;
      const w = Math.abs(z.re);
      if (!ws.some(x => Math.abs(x - w) < 1e-6 * (1 + w))) ws.push(w);
    });
    ws.sort((a, b) => a - b).forEach(w => {
      const j = C(0, w);
      let Dk = D, Nk = N, Dv = pEval(D, j), Nv = pEval(N, j), cancelado = false;
      /* Si N y D se anulan los dos en jω, hay un polo y un cero cancelados sobre el eje:
         ese punto es polo de lazo cerrado para todo K, y otra rama lo cruza cuando la
         raíz se vuelve doble. Ese K sale de las derivadas (L'Hôpital: K = −D′/N′). */
      while (cAbs(Nv) < 1e-9 && cAbs(Dv) < 1e-9 * (1 + cAbs(pEval(D, C(0, 1 + w)))) && Nk.length > 1) {
        Dk = pDer(Dk); Nk = pDer(Nk); Dv = pEval(Dk, j); Nv = pEval(Nk, j); cancelado = true;
      }
      if (cAbs(Nv) < 1e-9) return;                 // un cero sobre el eje: se llega con K → ∞
      const K = Math.abs(Nv.re) >= Math.abs(Nv.im) ? -Dv.re / Nv.re : -Dv.im / Nv.im;
      const res = cAbs(C(Dv.re + K * Nv.re, Dv.im + K * Nv.im));
      if (res > 1e-6 * (1 + cAbs(Dv))) return;
      const valido = K > 1e-9;
      cruce.filas.push({ w, K, valido, cancelado, nota: valido ? (cancelado ? 'pasa por un polo y un cero cancelados' : '') : (Math.abs(K) <= 1e-9 ? 'K = 0: es un polo sobre el eje imaginario' : 'K < 0: no pertenece al LGR') });
    });
  }
  R.cruce = cruce;

  // 5) ángulos de salida y de llegada
  const angulos = [];
  const complejos = g => Math.abs(g.z.im) > 1e-9;
  polos.filter(complejos).forEach(g => {
    const terminos = [];
    polos.forEach(o => { if (o !== g) terminos.push({ de: o, tipo: 'polo', v: cSub(g.z, o.z), ang: mod360(angDe(cSub(g.z, o.z))) }); });
    ceros.forEach(o => terminos.push({ de: o, tipo: 'cero', v: cSub(g.z, o.z), ang: mod360(angDe(cSub(g.z, o.z))) }));
    const sP = terminos.filter(t => t.tipo === 'polo').reduce((s, t) => s + t.ang * t.de.mult, 0);
    const sC = terminos.filter(t => t.tipo === 'cero').reduce((s, t) => s + t.ang * t.de.mult, 0);
    const vals = Array.from({ length: g.mult }, (_, k) => mod360((180 * (2 * k + 1) - sP + sC) / g.mult));
    angulos.push({ tipo: 'salida', g, terminos, sP, sC, vals });
  });
  ceros.filter(complejos).forEach(g => {
    const terminos = [];
    polos.forEach(o => terminos.push({ de: o, tipo: 'polo', v: cSub(g.z, o.z), ang: mod360(angDe(cSub(g.z, o.z))) }));
    ceros.forEach(o => { if (o !== g) terminos.push({ de: o, tipo: 'cero', v: cSub(g.z, o.z), ang: mod360(angDe(cSub(g.z, o.z))) }); });
    const sP = terminos.filter(t => t.tipo === 'polo').reduce((s, t) => s + t.ang * t.de.mult, 0);
    const sC = terminos.filter(t => t.tipo === 'cero').reduce((s, t) => s + t.ang * t.de.mult, 0);
    const vals = Array.from({ length: g.mult }, (_, k) => mod360((180 * (2 * k + 1) + sP - sC) / g.mult));
    angulos.push({ tipo: 'llegada', g, terminos, sP, sC, vals });
  });
  R.angulos = angulos;

  // 6) conclusión sobre los polos de lazo cerrado
  const crit = cruce.filas.filter(f => f.valido).map(f => f.K).sort((a, b) => a - b).filter((k, i, a) => !i || k - a[i - 1] > 1e-9 * (1 + k));
  const lim = [0, ...crit, Infinity];
  R.tramos = [];
  for (let i = 0; i < lim.length - 1; i++) {
    const a = lim[i], b = lim[i + 1];
    const Kt = isFinite(b) ? (a + b) / 2 : (a > 0 ? a * 2 : 1);
    const rs = limpiar(raicesPoli(pAdd(D, pScale(N, Kt))));
    R.tramos.push({ a, b, spd: rs.filter(z => z.re > 1e-7).length, eje: rs.filter(z => Math.abs(z.re) <= 1e-7).length });
  }
  R.polosLA_spd = expandir(polos).filter(z => z.re > 1e-9).length;
  R.crit = crit;

  // puntos de interés y escala
  const clave = expandir(polos).concat(expandir(ceros));
  rup.filas.forEach(f => f.ok && clave.push(f.z));
  cruce.filas.forEach(f => { if (f.valido) { clave.push(C(0, f.w)); clave.push(C(0, -f.w)); } });
  if (R.asint.sigma !== undefined) clave.push(C(R.asint.sigma, 0));
  R.clave = clave;
  R.escala = Math.max(1e-3, ...clave.map(cAbs));
  return R;
}

/* ---------- trazado numérico de las ramas ---------- */
function trazarLGR(R) {
  const { N, D, n, m } = R;
  const esc = R.escala, Rmax = 15 * esc, tope = 0.02 * esc;
  const sing = expandir(R.polos).concat(expandir(R.ceros));
  const zerosL = expandir(R.ceros);
  const dist = z => Math.min(...sing.map(s => cAbs(cSub(z, s))));
  const P = K => pAdd(D, pScale(N, K));
  let K = 0, prev;
  if (n >= m) prev = expandir(R.polos).map(z => C(z.re, z.im));
  else { K = 1e-9; prev = limpiar(raicesPoli(P(K))); }
  const ramas = prev.map(z => ({ x: [z.re], y: [z.im], K: [K] }));
  const hecha = prev.map(() => false);
  let dK = n >= m ? 1e-9 : 1e-9;
  const t0 = performance.now();
  for (let it = 0; it < 30000; it++) {
    if (performance.now() - t0 > 1500) { ramas.incompleto = true; break; }
    // separar guesses repetidos para que Aberth no se trabe
    const ini = prev.map((z, i) => {
      for (let j = 0; j < i; j++) if (cAbs(cSub(z, prev[j])) < 1e-7 * (1 + cAbs(z))) {
        const a = 2 * Math.PI * i / prev.length + 0.3;
        return C(z.re + 1e-6 * esc * Math.cos(a), z.im + 1e-6 * esc * Math.sin(a));
      }
      return z;
    });
    let nuevo, asig, ratio, ok = false;
    for (let intento = 0; intento < 60 && !ok; intento++) {
      nuevo = raicesPoli(P(K + dK), ini);
      if (nuevo.length !== prev.length) { dK /= 2; continue; }
      // asignación voraz por distancia mínima
      const pares = [];
      for (let i = 0; i < prev.length; i++) for (let j = 0; j < nuevo.length; j++) pares.push([cAbs(cSub(prev[i], nuevo[j])), i, j]);
      pares.sort((a, b) => a[0] - b[0]);
      const ui = new Set(), uj = new Set();
      asig = new Array(prev.length);
      ratio = 0;
      for (const [dst, i, j] of pares) {
        if (ui.has(i) || uj.has(j)) continue;
        ui.add(i); uj.add(j); asig[i] = j;
        if (hecha[i]) continue;
        const perm = Math.min(tope, Math.max(0.05 * dist(prev[i]), 1e-6 * esc));
        ratio = Math.max(ratio, dst / perm);
      }
      if (ratio > 1 && dK > 1e-14 * Math.max(1, K)) dK /= 2; else ok = true;
    }
    K += dK;
    const nueva = [];
    for (let i = 0; i < prev.length; i++) {
      const z = nuevo[asig[i]];
      nueva.push(z);
      if (cAbs(z) < 2 * Rmax) { ramas[i].x.push(z.re); ramas[i].y.push(z.im); ramas[i].K.push(K); }
      if (cAbs(z) > Rmax || zerosL.some(c => cAbs(cSub(z, c)) < 1e-3 * esc)) hecha[i] = true;
    }
    prev = nueva;
    if (hecha.every(Boolean) || K > 1e15) break;
    if (ratio < 0.3) dK *= 2;
  }
  if (!hecha.every(Boolean) && K <= 1e15) ramas.incompleto = true;   // se cortó por tiempo o por iteraciones
  return ramas;
}

/* =====================================================================
   ENTRADA → MODELO
   ===================================================================== */
const EJEMPLOS = [
  { g: 'Ejemplo de la cátedra', t: 'Ceros 1±2j, −3 · Polos 4, −2±3j, −2', modo: 'zp', Z: '1+2j; 1-2j; -3', P: '4; -2+3j; -2-3j; -2' },
  { g: 'Tutorial MatLab/SciLab', t: '(s + 4,5) / (s(s² + 6s + 45))', modo: 'ec', N: 's+4,5', D: 's(s^2+6s+45)' },
  { g: 'Guía 3 · 2.1 (ecuación)', t: 'Ej. 1: K / (s³ + 5s² + 4s)', modo: 'ec', N: '1', D: 's^3+5s^2+4s' },
  { g: 'Guía 3 · 2.1 (ecuación)', t: 'Ej. 2: (s² + 4s + 53) / (s³ + 3s² − 18s)', modo: 'ec', N: 's^2+4s+53', D: 's^3+3s^2-18s' },
  { g: 'Guía 3 · 2.1 (ecuación)', t: 'Ej. 5: (s² − 2s + 10) / (s² + 4s − 5)', modo: 'ec', N: 's^2-2s+10', D: 's^2+4s-5' },
  { g: 'Guía 3 · 2.1 (ecuación)', t: 'Ej. 6: (s² + 4) / (s² + 6s)', modo: 'ec', N: 's^2+4', D: 's^2+6s' },
  { g: 'Guía 3 · 2.1 (ecuación)', t: 'Ej. 7: (s − 6) / (s³ + 12s² + 9s + 292)', modo: 'ec', N: 's-6', D: 's^3+12s^2+9s+292' },
  { g: 'Guía 3 · 2.1 (ecuación)', t: 'Ej. 8: 1 / (s(s² + 6s + 25))', modo: 'ec', N: '1', D: 's(s^2+6s+25)' },
  { g: 'Guía 3 · 2.2 (ceros y polos)', t: 'Ej. 1: polos 0; −3; −6', modo: 'zp', Z: '', P: '0; -3; -6' },
  { g: 'Guía 3 · 2.2 (ceros y polos)', t: 'Ej. 2: cero −3 · polos −4, −4±2j', modo: 'zp', Z: '-3', P: '-4; -4-2j; -4+2j' },
  { g: 'Guía 3 · 2.2 (ceros y polos)', t: 'Ej. 3: cero −1 · polos 0, −2, −3', modo: 'zp', Z: '-1', P: '0; -2; -3' },
  { g: 'Guía 3 · 2.2 (ceros y polos)', t: 'Ej. 4: polos −1, −2±2j', modo: 'zp', Z: '', P: '-1; -2-2j; -2+2j' },
  { g: 'Guía 3 · 2.2 (ceros y polos)', t: 'Ej. 5: ceros ±j · polos 0, −2', modo: 'zp', Z: 'j; -j', P: '0; -2' },
  { g: 'Guía 3 · 2.2 (ceros y polos)', t: 'Ej. 6: cero −1 · polos 0, −3±3j', modo: 'zp', Z: '-1', P: '0; -3-3j; -3+3j' },
  { g: 'Guía 3 · 2.2 (ceros y polos)', t: 'Ej. 7: ceros −3±8j · polos 0, −6, 3', modo: 'zp', Z: '-3+8j; -3-8j', P: '0; -6; 3' },
  { g: 'Guía 3 · 2.2 (ceros y polos)', t: 'Ej. 8: cero −2 · polos 0, −2±j', modo: 'zp', Z: '-2', P: '0; -2-j; -2+j' },
  { g: 'Guía 3 · 2.2 (ceros y polos)', t: 'Ej. 9: ceros −2, −3 · polos 0, −1', modo: 'zp', Z: '-2; -3', P: '0; -1' },
  { g: 'Guía 3 · 3.1 (software)', t: 'Ej. 1: grado 4 / grado 5', modo: 'ec', N: 's^4+10s^3+76s^2+344s-1088', D: 's^5+22s^4+184s^3+696s^2+263s-5166' },
  { g: 'Guía 3 · 3.1 (software)', t: 'Ej. 2: grado 4 / grado 5', modo: 'ec', N: 's^4-s^3-13s^2+41s+52', D: 's^5+20s^4+151s^3+500s^2+600s' },
  { g: 'Guía 3 · 3.1 (software)', t: 'Ej. 3: grado 4 / grado 5', modo: 'ec', N: 's^4-5s^3-63s^2+153s+810', D: 's^5+16s^4+105s^3+206s^2-976s' },
  { g: 'Guía 3 · 3.1 (software)', t: 'Ej. 4: grado 3 / grado 5', modo: 'ec', N: 's^3+11s^2+57s+203', D: 's^5+10s^4-100s^3-1000s^2-576s+5760' },
  { g: 'Guía 3 · 3.2 (software)', t: 'Ej. 1: 3 ceros · 5 polos', modo: 'zp', Z: '-1+3j; -1-3j; -6', P: '6; 2; -5; -7; -10' },
  { g: 'Guía 3 · 3.2 (software)', t: 'Ej. 2: 3 ceros · 5 polos', modo: 'zp', Z: '-1+6j; -1-6j; 3', P: '-2+3j; -2-3j; 2; -3,5; -7' },
  { g: 'Guía 3 · 3.2 (software)', t: 'Ej. 3: ceros 0, 2 · 3 polos', modo: 'zp', Z: '0; 2', P: '-1; -2,5+3j; -2,5-3j' },
  { g: 'Guía 3 · 3.2 (software)', t: 'Ej. 4: 3 ceros · 5 polos', modo: 'zp', Z: '-4-7j; -4+7j; -7', P: '1-2j; 1+2j; 0; -3; -6' },
  { g: 'Guía 3 · 3.2 (software)', t: 'Ej. 5: 4 ceros · 5 polos', modo: 'zp', Z: '-5+8j; -5-8j; 0; 6', P: '0; -2; 3; -5; 7' },
  { g: 'Guía 3 · 3.2 (software)', t: 'Ej. 6: 4 ceros · 5 polos', modo: 'zp', Z: '-5+7j; -5-7j; 6; -5', P: '-8-3j; -8+3j; 2; -2; -6' }
];

class ErrorEntrada extends Error { constructor(msg, extra) { super(msg); this.extra = extra; } }

function construirModelo(S) {
  const notas = [];
  if (S.modo === 'ec') {
    let N0, D0;
    try { N0 = parsearPoli(S.N); } catch (err) { throw new ErrorEntrada('Numerador: ' + err.message, { campo: 'N' }); }
    try { D0 = parsearPoli(S.D); } catch (err) { throw new ErrorEntrada('Denominador: ' + err.message, { campo: 'D' }); }
    if (D0.length < 2) throw new ErrorEntrada('El denominador tiene que ser de grado 1 o más.', { campo: 'D' });
    if (N0.length - 1 > GRADO_MAX) throw new ErrorEntrada('El numerador no puede pasar de grado ' + GRADO_MAX + '.', { campo: 'N' });
    if (D0.length - 1 > GRADO_MAX) throw new ErrorEntrada('El denominador no puede pasar de grado ' + GRADO_MAX + '.', { campo: 'D' });
    if (N0.length === 1 && Math.abs(N0[0]) < 1e-14) throw new ErrorEntrada('El numerador no puede ser 0.', { campo: 'N' });
    const c = N0[0], d = D0[0];
    const N = pScale(N0, 1 / c), D = pScale(D0, 1 / d);
    const ganancia = c / d;
    if (Math.abs(ganancia - 1) > 1e-12)
      notas.push('Se llevaron N(s) y D(s) a forma mónica: el parámetro del LGR pasa a ser K′ = K · ' + fnum(ganancia) + (ganancia < 0 ? ' (como es negativo, el LGR dibujado corresponde a K′ > 0, es decir, K < 0 en la ecuación original)' : '') + '.');
    const cerosL = limpiar(raicesPoli(N)), polosL = limpiar(raicesPoli(D));
    return { modo: 'ec', N, D, N0, D0, cerosL, polosL, notas };
  }
  let cerosL, polosL;
  try { cerosL = parsearLista(S.Z); } catch (err) { throw new ErrorEntrada('Ceros: ' + err.message, { campo: 'Z' }); }
  try { polosL = parsearLista(S.P); } catch (err) { throw new ErrorEntrada('Polos: ' + err.message, { campo: 'P' }); }
  if (!polosL.length) throw new ErrorEntrada('Hace falta al menos un polo.', { campo: 'P' });
  if (cerosL.length > GRADO_MAX) throw new ErrorEntrada('No puede haber más de ' + GRADO_MAX + ' ceros.', { campo: 'Z' });
  if (polosL.length > GRADO_MAX) throw new ErrorEntrada('No puede haber más de ' + GRADO_MAX + ' polos.', { campo: 'P' });
  // los complejos tienen que venir con su conjugado, si no los coeficientes no son reales
  const faltan = { Z: [], P: [] };
  [['Z', cerosL], ['P', polosL]].forEach(([k, lista]) => {
    const libres = lista.slice();
    lista.forEach(z => {
      if (Math.abs(z.im) < 1e-12) return;
      const i = libres.findIndex(w => Math.abs(w.re - z.re) < 1e-9 && Math.abs(w.im + z.im) < 1e-9);
      if (i >= 0) { libres.splice(i, 1); return; }
      const yaMarcado = libres.findIndex(w => w === z);
      if (yaMarcado >= 0) libres.splice(yaMarcado, 1);
      faltan[k].push(C(z.re, -z.im));
    });
  });
  if (faltan.Z.length || faltan.P.length) {
    const txt = [['ceros', faltan.Z], ['polos', faltan.P]].filter(x => x[1].length).map(x => x[0] + ': ' + x[1].map(fcomp).join('; ')).join(' · ');
    throw new ErrorEntrada('Falta el conjugado de algún número complejo (' + txt + '). Con coeficientes reales los complejos aparecen de a pares.', { faltan });
  }
  const N = pDesdeRaices(cerosL), D = pDesdeRaices(polosL);
  return { modo: 'zp', N, D, cerosL: limpiar(cerosL), polosL: limpiar(polosL), notas };
}
