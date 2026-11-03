/* ---------- trazado numérico de las ramas ---------- */
/* El trazado avanza por tandas: crearTrazado() devuelve { avanzar(ms), ramas, terminado }.
   avanzar(ms) sigue las ramas durante unos ms y devuelve true al terminar; así la página
   puede dibujar lo que va y seguir respondiendo (antes, un grado 20 la trababa 1,5 s con
   cada tecla). El seguimiento no depende del tiempo: por tandas da lo mismo que de un tirón.
   Hay un presupuesto total de cómputo; si se agota, las ramas quedan con incompleto = true. */
const PRESUPUESTO_TRAZADO = 1500;                 // ms de cálculo en total
function crearTrazado(R) {
  if (!R.sigma) return crearTrazadoDirecto(R);
  /* se traza en σ = s/α, donde las tolerancias del seguimiento tienen sentido, y se vuelve a s */
  const a = R.alfa, kf = Math.pow(a, R.n - R.m), t = crearTrazadoDirecto(R.sigma);
  return {
    avanzar: (ms) => t.avanzar(ms),
    get terminado() { return t.terminado; },
    get ramas() {
      const r = t.ramas.map(b => ({ x: b.x.map(v => v * a), y: b.y.map(v => v * a), K: b.K.map(k => k * kf) }));
      if (t.ramas.incompleto) r.incompleto = true;
      return r;
    },
  };
}
/* De un tirón (lo usan las pruebas y lo que necesita el resultado ya) */
function trazarLGR(R) {
  const t = crearTrazado(R);
  while (!t.avanzar(Infinity));
  return t.ramas;
}
function crearTrazadoDirecto(R) {
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
  let dK = 1e-9, it = 0, usado = 0, terminado = false;
  /* un paso del seguimiento: sube K un poco y empareja las raíces nuevas con las de antes.
     Devuelve true cuando ya no hay nada que seguir. */
  function paso() {
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
    if (hecha.every(Boolean) || K > 1e15) return true;
    if (ratio < 0.3) dK *= 2;
    return false;
  }
  function avanzar(ms) {
    if (terminado) return true;
    const t0 = performance.now();
    while (!terminado) {
      if (it++ >= 30000) { ramas.incompleto = true; terminado = true; break; }      // demasiados pasos
      if (paso()) { terminado = true; break; }
      const ahora = performance.now() - t0;
      if (usado + ahora > PRESUPUESTO_TRAZADO) { ramas.incompleto = true; terminado = true; break; }
      if (ahora >= ms) break;
    }
    usado += performance.now() - t0;
    return terminado;
  }
  return { avanzar, ramas, get terminado() { return terminado; } };
}
