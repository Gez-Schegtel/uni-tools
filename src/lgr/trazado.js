/* ---------- trazado numérico de las ramas ---------- */
function trazarLGR(R) {
  if (!R.sigma) return trazarDirecto(R);
  /* se traza en σ = s/α, donde las tolerancias del seguimiento tienen sentido, y se vuelve a s */
  const a = R.alfa, kf = Math.pow(a, R.n - R.m), rs = trazarDirecto(R.sigma);
  const ramas = rs.map(b => ({ x: b.x.map(v => v * a), y: b.y.map(v => v * a), K: b.K.map(k => k * kf) }));
  if (rs.incompleto) ramas.incompleto = true;
  return ramas;
}
function trazarDirecto(R) {
  const { N, D, n, m } = R;
  const esc = R.escala, Rmax = 15 * esc, tope = 0.02 * esc;
  const sing = expandir(R.polos).concat(expandir(R.ceros));
  const zerosL = expandir(R.ceros);
  const dist = z => Math.min(...sing.map(s => cAbs(cSub(z, s))));
  const P = K => pAdd(D, pScale(N, K));
  let K = 0, prev;
  if (n >= m) prev = expandir(R.polos).map(z => complejo(z.re, z.im));
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
        return complejo(z.re + 1e-6 * esc * Math.cos(a), z.im + 1e-6 * esc * Math.sin(a));
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
