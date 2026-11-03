/* ---------- análisis completo (los pasos de la teoría) ----------
   analizar() prepara el problema y analizarDirecto() hace los pasos:
   1) un polo y un cero en el mismo punto se cancelan: se analiza la función reducida y el
      par queda aparte (sigue siendo raíz de D + K·N para todo K);
   2) si los polos y ceros están lejos de la escala 1 (constantes de tiempo de milisegundos,
      frecuencias de miles de rad/s), las tolerancias fijas dejan de servir. Se analiza en
      σ = s/α, con α la escala típica, y al final se vuelve a s. */
const TOL_CANCELA = 1e-6;
function separarCancelados(cerosL, polosL) {
  const ceros = [], polos = polosL.slice(), cancelados = [];
  for (const z of cerosL) {
    const i = polos.findIndex(p => cAbs(cSub(p, z)) < TOL_CANCELA * (1 + cAbs(p)));
    if (i >= 0) cancelados.push(polos.splice(i, 1)[0]); else ceros.push(z);
  }
  return { ceros, polos, cancelados };
}
/* escala típica: media geométrica de los módulos no nulos (1 si ya está cerca de 1) */
function escalaTipica(raices) {
  const ms = raices.map(cAbs).filter(x => x > 0);
  if (!ms.length) return 1;
  const a = Math.exp(ms.reduce((s, x) => s + Math.log(x), 0) / ms.length);
  return a > 0.1 && a < 10 ? 1 : a;
}
/* p(α·σ) llevado a mónico: el coeficiente i (potencias descendentes) acompaña a α^(g−i);
   dividido por el principal (c₀·α^g) queda cᵢ / (c₀·α^i) */
const pEscalar = (p, a) => p.map((c, i) => c / p[0] / Math.pow(a, i));
/* D(jω) y N(jω) separados en parte real e imaginaria (polinomios en ω), y el polinomio
   Q(ω) = Im D·Re N − Re D·Im N, que se anula donde las dos ecuaciones dan el mismo K */
function partesEnJw(N, D, tolQ) {
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
  const Q = pTrim(pAdd(pMul(Di, Nr), pScale(pMul(Dr, Ni), -1)), tolQ);
  return { Dr, Di, Nr, Ni, Q };
}
function analizar(e) {
  const sep = separarCancelados(e.cerosL, e.polosL);
  let base = e;
  if (sep.cancelados.length) {
    if (!sep.polos.length) throw new ErrorEntrada('Al cancelar los ceros con los polos no queda ningún polo: no hay lugar de raíces.', { campo: e.modo === 'ec' ? 'D' : 'P' });
    base = { ...e, cerosL: sep.ceros, polosL: sep.polos, N: pDesdeRaices(sep.ceros), D: pDesdeRaices(sep.polos) };
  }
  const a = escalaTipica(base.cerosL.concat(base.polosL));
  let R;
  if (a === 1) R = analizarDirecto(base);
  else {
    const div = z => complejo(z.re / a, z.im / a);
    const Rs = analizarDirecto({ ...base, N: pEscalar(base.N, a), D: pEscalar(base.D, a), cerosL: base.cerosL.map(div), polosL: base.polosL.map(div) });
    R = volverDeEscala(Rs, a, base);
    R.sigma = Rs;                                    // para trazar en la escala cómoda
  }
  R.alfa = a;
  R.cancelados = agrupar(sep.cancelados);
  R.Nsin = e.N; R.Dsin = e.D;                      // antes de cancelar (para mostrar)
  if (R.cancelados.length) {
    const tol = 1e-7 * Math.max(1, R.escala);
    const der = expandir(R.cancelados).filter(z => z.re > tol).length, eje = expandir(R.cancelados).filter(z => Math.abs(z.re) <= tol).length;
    R.tramos.forEach(t => { t.spd += der; t.eje += eje; t.conCancelados = der + eje > 0; });
  }
  return R;
}
/* Pasa a s un resultado calculado en σ = s/α: los puntos se multiplican por α y los K por
   α^(n−m) (D(s) + K·N(s) = α^n·[D(σ) + K·α^(m−n)·N(σ)]). Los polinomios que se muestran
   se vuelven a calcular en s, que es lo que escribió el estudiante. */
function volverDeEscala(Rs, a, base) {
  const mul = z => complejo(z.re * a, z.im * a), kf = Math.pow(a, Rs.n - Rs.m);
  const grupos = new Map();
  const g = x => { if (!grupos.has(x)) grupos.set(x, { z: mul(x.z), mult: x.mult }); return grupos.get(x); };
  const { N, D } = base;
  const R = { ...Rs, N, D, N0: base.N0, D0: base.D0, cerosL: base.cerosL, polosL: base.polosL };
  R.polos = Rs.polos.map(g); R.ceros = Rs.ceros.map(g);
  R.eje = Rs.eje.map(f => ({ ...f, a: f.a * a, b: f.b * a }));
  R.asint = { ...Rs.asint };
  if (Rs.asint.d !== 0) { R.asint.sumP = Rs.asint.sumP * a; R.asint.sumZ = Rs.asint.sumZ * a; R.asint.sigma = Rs.asint.sigma * a; }
  const Dp = pDer(D), Np = pDer(N), t1 = pMul(Dp, N), t2 = pMul(D, Np);
  R.rup = { Dp, Np, t1, t2, P: pTrim(pAdd(t1, pScale(t2, -1))), filas: Rs.rup.filas.map(f => ({ ...f, z: mul(f.z), K: f.K && complejo(f.K.re * kf, f.K.im * kf) })) };
  const pz = partesEnJw(N, D);
  R.cruce = { ...pz, identico: Rs.cruce.identico, filas: Rs.cruce.filas.map(f => ({ ...f, w: f.w * a, K: f.K * kf })) };
  R.angulos = Rs.angulos.map(x => ({ ...x, g: g(x.g), terminos: x.terminos.map(t => ({ ...t, de: g(t.de), v: mul(t.v) })) }));
  R.tramos = Rs.tramos.map(t => ({ ...t, a: t.a * kf, b: t.b * kf }));
  R.crit = Rs.crit.map(k => k * kf);
  R.clave = Rs.clave.map(mul);
  R.escala = Rs.escala * a;
  return R;
}
function analizarDirecto(e) {
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
        K = cDiv(complejo(-Dv.re, -Dv.im), Nv);
        const kreal = Math.abs(K.im) <= 1e-6 * Math.max(1, Math.abs(K.re));
        if (kreal && K.re > 1e-9) ok = true;
        else if (kreal && Math.abs(K.re) <= 1e-9) { ok = true; nota = 'es un polo múltiple (K = 0)'; }
        else nota = kreal ? 'K < 0' : 'K no es real';
      }
      let tipo = '';
      if (ok && real && K && K.re > 1e-9) {
        const h = 1e-3 * (1 + Math.abs(s.re));
        const kf = x => { const c = cDiv(complejo(-pEval(D, complejo(x, 0)).re, 0), pEval(N, complejo(x, 0))); return c.re; };
        const k0 = K.re, k1 = kf(s.re - h), k2 = kf(s.re + h);
        tipo = (k0 > k1 && k0 > k2) ? 'salida del eje real' : (k0 < k1 && k0 < k2) ? 'ingreso al eje real' : '';
      }
      rup.filas.push({ z: s, mult: g.mult, K, ok, nota, tipo });
    });
  }
  R.rup = rup;

  // 4) cruce con el eje imaginario: s = jω
  const { Dr, Di, Nr, Ni, Q } = partesEnJw(N, D, 1e-11);
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
      const j = complejo(0, w);
      let Dk = D, Nk = N, Dv = pEval(D, j), Nv = pEval(N, j), cancelado = false;
      /* Si N y D se anulan los dos en jω, hay un polo y un cero cancelados sobre el eje:
         ese punto es polo de lazo cerrado para todo K, y otra rama lo cruza cuando la
         raíz se vuelve doble. Ese K sale de las derivadas (L'Hôpital: K = −D′/N′). */
      while (cAbs(Nv) < 1e-9 && cAbs(Dv) < 1e-9 * (1 + cAbs(pEval(D, complejo(0, 1 + w)))) && Nk.length > 1) {
        Dk = pDer(Dk); Nk = pDer(Nk); Dv = pEval(Dk, j); Nv = pEval(Nk, j); cancelado = true;
      }
      if (cAbs(Nv) < 1e-9) return;                 // un cero sobre el eje: se llega con K → ∞
      const K = Math.abs(Nv.re) >= Math.abs(Nv.im) ? -Dv.re / Nv.re : -Dv.im / Nv.im;
      const res = cAbs(complejo(Dv.re + K * Nv.re, Dv.im + K * Nv.im));
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
  cruce.filas.forEach(f => { if (f.valido) { clave.push(complejo(0, f.w)); clave.push(complejo(0, -f.w)); } });
  if (R.asint.sigma !== undefined) clave.push(complejo(R.asint.sigma, 0));
  R.clave = clave;
  R.escala = Math.max(1e-3, ...clave.map(cAbs));
  return R;
}
