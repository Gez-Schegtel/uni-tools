/* Los cálculos del lugar geométrico de las raíces (src/lgr/calculo.js), sin navegador.
   Se comparan contra referencias independientes: un resolvedor de raíces distinto del de
   la página (Durand–Kerner), la condición de ángulo y casos de libro resueltos a mano.
   Uso desde la raíz del repo: node --test "tests/unidades/*.test.js" */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { cargar, clonar } = require("./cargar");

function lgr() {
  // los módulos sin DOM del LGR, en el orden de src/lgr/pagina.html
  const m = cargar(...["polinomios", "entrada", "formato", "analisis", "trazado", "modelo"].map(x => `src/lgr/${x}.js`));
  m.performance = performance;                 // trazarLGR mide el tiempo
  return m;
}
const casi = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol * (1 + Math.abs(b)), `${a} ≠ ${b}`);

/* ---- referencia independiente: raíces por Durand–Kerner ---- */
const C = (re, im = 0) => ({ re, im });
const mul = (x, y) => C(x.re * y.re - x.im * y.im, x.re * y.im + x.im * y.re);
const div = (x, y) => { const d = y.re * y.re + y.im * y.im; return C((x.re * y.re + x.im * y.im) / d, (x.im * y.re - x.re * y.im) / d); };
function raices(p) {
  p = p.slice(); while (p.length && Math.abs(p[0]) < 1e-300) p.shift();
  const n = p.length - 1; if (n < 1) return [];
  const a = p.map(c => c / p[0]), r0 = 1 + Math.max(...a.slice(1).map(Math.abs));
  let z = Array.from({ length: n }, (_, k) => C(0.9 * r0 * Math.cos(2 * Math.PI * k / n + 0.7), 0.9 * r0 * Math.sin(2 * Math.PI * k / n + 0.7)));
  const ev = s => a.reduce((r, c) => { const t = mul(r, s); return C(t.re + c, t.im); }, C(0));
  for (let it = 0; it < 2000; it++) z = z.map((zi, i) => {
    let d = C(1); z.forEach((zj, j) => { if (j !== i) d = mul(d, C(zi.re - zj.re, zi.im - zj.im)); });
    const w = div(ev(zi), d); return C(zi.re - w.re, zi.im - w.im);
  });
  return z;
}
const DmasKN = (D, N, K) => { const n = Math.max(D.length, N.length), r = new Array(n).fill(0); D.forEach((c, i) => r[n - D.length + i] += c); N.forEach((c, i) => r[n - N.length + i] += K * c); return r; };
const enSemiplanoDerecho = (D, N, K) => raices(DmasKN(D, N, K)).filter(z => z.re > 1e-6 * (1 + Math.hypot(z.re, z.im))).length;

test("parsearPoli entiende la notación de las guías y rechaza lo que no es un polinomio", () => {
  const m = lgr();
  const p = (t) => Array.from(m.parsearPoli(t));
  assert.deepEqual(p("s^2 + 6s + 45"), [1, 6, 45]);
  assert.deepEqual(p("s(s^2+6s+25)"), [1, 6, 25, 0]);
  assert.deepEqual(p("(s+1)^3"), [1, 3, 3, 1]);
  assert.deepEqual(p("s+4,5"), [1, 4.5]);
  assert.deepEqual(p("s²+3s"), [1, 3, 0]);
  assert.deepEqual(p("[1 2 3]"), [1, 2, 3]);
  assert.deepEqual(p("s/2"), [0.5, 0]);
  for (const malo of ["", "s^", "s^1.5", "3/(s+1)", "()", "s+x", "[1 x]"]) assert.throws(() => m.parsearPoli(malo), malo);
  assert.throws(() => m.parsearPoli("s^100000"), /no puede pasar/);        // antes se colgaba
});

test("parsearLista lee ceros y polos complejos, con coma decimal", () => {
  const m = lgr();
  const l = (t) => clonar(m.parsearLista(t).map(z => [z.re, z.im]));
  assert.deepEqual(l("1+2j; 1-2j; -3"), [[1, 2], [1, -2], [-3, 0]]);
  assert.deepEqual(l("-2,5"), [[-2.5, 0]]);
  assert.deepEqual(l("j; -j"), [[0, 1], [0, -1]]);
  assert.deepEqual(l("ninguno"), []);
  assert.throws(() => m.parsearLista("1+j2"));
});

test("un grado desmesurado se rechaza en vez de trabar la página", () => {
  const m = lgr();
  assert.throws(() => m.construirModelo({ modo: "ec", N: "1", D: "s^21" }), /pasar de 20/);
  assert.throws(() => m.construirModelo({ modo: "ec", N: "1", D: "(s+1)^11(s+2)^11" }), /grado 20/);
  assert.throws(() => m.construirModelo({ modo: "zp", Z: "", P: Array.from({ length: 21 }, (_, i) => -i).join(";") }), /más de 20 polos/);
});

test("caso de libro: K / (s(s+1)(s+2))", () => {
  const m = lgr();
  const R = m.analizar(m.construirModelo({ modo: "ec", N: "1", D: "s(s+1)(s+2)" }));
  casi(R.asint.sigma, -1);
  assert.deepEqual(clonar(R.asint.angs.map(a => Math.round(a.ang))), [60, 180, 300]);
  const rup = R.rup.filas.filter(f => f.ok);
  assert.equal(rup.length, 1);
  casi(rup[0].z.re, -1 + 1 / Math.sqrt(3));                     // −0,4226
  casi(rup[0].K.re, 2 / (3 * Math.sqrt(3)));                    // 0,3849
  const cr = R.cruce.filas.filter(f => f.valido);
  assert.equal(cr.length, 1);
  casi(cr[0].w, Math.sqrt(2));
  casi(cr[0].K, 6);
  assert.deepEqual(clonar(R.tramos.map(t => t.spd)), [0, 2]);           // estable hasta K = 6
});

test("los ejercicios de la Guía 3: K crítico, estabilidad por tramos y ángulos contra referencias", () => {
  const m = lgr();
  const EJ = vm.runInContext("EJEMPLOS", m);
  for (const e of EJ) {
    const R = m.analizar(m.construirModelo(e));
    // la referencia es D + K·N sin simplificar: un polo cancelado sigue siendo polo de lazo cerrado
    const Dc = Array.from(R.Dsin), Nc = Array.from(R.Nsin);
    // cada K crítico separa una cantidad distinta de polos en el semiplano derecho
    for (const K of R.crit) assert.notEqual(enSemiplanoDerecho(Dc, Nc, K * 0.97), enSemiplanoDerecho(Dc, Nc, K * 1.03), `${e.t}: K = ${K}`);
    // la tabla de tramos coincide con contar raíces
    for (const t of R.tramos) {
      const Kt = isFinite(t.b) ? (t.a + t.b) / 2 : (t.a > 0 ? t.a * 2 : 1);
      assert.equal(t.spd, enSemiplanoDerecho(Dc, Nc, Kt), `${e.t}: tramo ${t.a}–${t.b}`);
    }
    // ángulo de salida: hacia dónde se mueve el polo al subir apenas K
    for (const a of R.angulos.filter(a => a.tipo === "salida" && a.g.mult === 1)) {
      const z = raices(DmasKN(R.D, R.N, 1e-7)).reduce((b, r) => Math.hypot(r.re - a.g.z.re, r.im - a.g.z.im) < Math.hypot(b.re - a.g.z.re, b.im - a.g.z.im) ? r : b);
      const ang = (Math.atan2(z.im - a.g.z.im, z.re - a.g.z.re) * 180 / Math.PI + 360) % 360;
      assert.ok(Math.abs((ang - a.vals[0] + 540) % 360 - 180) < 1, `${e.t}: salida ${a.vals[0]} vs ${ang}`);
    }
    // puntos de ruptura: con su K, la raíz es doble
    for (const f of R.rup.filas.filter(f => f.ok && f.K)) {
      const P = DmasKN(R.D, R.N, f.K.re);
      const v = m.pEval(P, f.z), dv = m.pEval(m.pDer(P), f.z);
      assert.ok(Math.hypot(v.re, v.im) < 1e-5 * (1 + Math.hypot(...Object.values(m.pEval(R.D, f.z)))), `${e.t}: ruptura`);
      assert.ok(Math.hypot(dv.re, dv.im) < 1e-4 * (1 + Math.hypot(...Object.values(m.pEval(m.pDer(R.D), f.z)))), `${e.t}: ruptura doble`);
    }
  }
});

test("un polo y un cero cancelados en el origen no esconden el cruce que pasa por ahí", () => {
  // Guía 3 · 3.2 ej. 5: con K = 210/534 otra rama pasa por s = 0 y cambia la estabilidad
  const m = lgr();
  const R = m.analizar(m.construirModelo({ modo: "zp", Z: "-5+8j; -5-8j; 0; 6", P: "0; -2; 3; -5; 7" }));
  assert.equal(R.crit.length, 2);
  casi(R.crit[0], 210 / 534);
  assert.deepEqual(clonar(R.tramos.map(t => t.spd)), [2, 3, 1]);
  assert.equal(R.cancelados.length, 1);                         // el par en s = 0 queda aparte
  assert.ok(R.tramos.every(t => t.eje === 1));                  // y es polo de lazo cerrado sobre el eje
});

test("las ramas trazadas cumplen la condición de ángulo (K real y positivo)", () => {
  const m = lgr();
  for (const e of [{ modo: "ec", N: "s+4,5", D: "s(s^2+6s+45)" }, { modo: "zp", Z: "1+2j; 1-2j; -3", P: "4; -2+3j; -2-3j; -2" }]) {
    const R = m.analizar(m.construirModelo(e));
    const ramas = m.trazarLGR(R);
    assert.equal(ramas.length, Math.max(R.n, R.m));
    assert.ok(!ramas.incompleto);
    for (const b of ramas) for (let i = 0; i < b.x.length; i += 5) {
      const s = C(b.x[i], b.y[i]), Nv = m.pEval(R.N, s), Dv = m.pEval(R.D, s);
      if (Math.hypot(Nv.re, Nv.im) < 1e-9) continue;
      const K = div(C(-Dv.re, -Dv.im), Nv);
      assert.ok(K.re > -1e-6 && Math.abs(K.im) <= 1e-3 * (1e-9 + Math.abs(K.re)), "punto fuera del LGR");
    }
  }
});

test("coeficientes de escalas muy distintas no pierden un polo, y se acepta notación científica", () => {
  // con la tolerancia de 1e-12, el 0,001s³ se tomaba como cero y quedaba grado 2
  const m = lgr();
  for (const D of ["0.001s^3+s^2+1000000000", "0.001s^3+s^2+1e9"]) {
    const r = m.construirModelo({ modo: "ec", N: "1", D });
    assert.equal(r.D.length - 1, 3, D);
    assert.equal(r.polosL.length, 3, D);
    const prod = r.polosL.reduce((p, z) => mul(p, z), C(1));
    casi(prod.re, -1e12, 1e-9);                                 // −D(0)/a₃ con D mónico
  }
  assert.deepEqual(Array.from(m.parsearPoli("2e-3s+1")), [0.002, 1]);
  assert.throws(() => m.construirModelo({ modo: "ec", N: "1", D: "(s+0.1)^2-s^2-0.2s+1" }), /grado 1/);   // lo que se cancela sí se saca
});

test("un polo y un cero cancelados: ni ángulos ni ramas sobre el par, y el par queda aparte", () => {
  const m = lgr();
  const R = m.analizar(m.construirModelo({ modo: "zp", Z: "1+7.5j; 1-7.5j; -5+8j; -5-8j", P: "-8+3.5j; -8-3.5j; 1+7.5j; 1-7.5j; -7" }));
  assert.equal(R.cancelados.length, 2);
  assert.ok(!R.angulos.some(a => Math.abs(a.g.z.re - 1) < 1e-6 && Math.abs(Math.abs(a.g.z.im) - 7.5) < 1e-6), "ángulo sobre el par cancelado");
  assert.equal(R.n, 3); assert.equal(R.m, 2);
  // el par cancelado está en el semiplano derecho: es polo de lazo cerrado para todo K
  assert.ok(R.tramos.every(t => t.spd >= 2));
  const ramas = m.trazarLGR(R);
  assert.equal(ramas.length, 3);
  for (const b of ramas) for (let i = 0; i < b.x.length; i += 5) {
    const s = C(b.x[i], b.y[i]), Nv = m.pEval(R.N, s), Dv = m.pEval(R.D, s);
    if (Math.hypot(Nv.re, Nv.im) < 1e-9) continue;
    const K = div(C(-Dv.re, -Dv.im), Nv);
    assert.ok(K.re > -1e-6 && Math.abs(K.im) <= 1e-3 * (1e-9 + Math.abs(K.re)), "punto fuera del LGR");
  }
  assert.throws(() => m.analizar(m.construirModelo({ modo: "zp", Z: "-1", P: "-1" })), /no queda ningún polo/);
});

test("la coma de una lista sin «;» deja una nota, y la K sólo se acepta adelante en el numerador", () => {
  const m = lgr();
  assert.match(m.construirModelo({ modo: "zp", Z: "", P: "1,2" }).notas.join(" "), /coma decimal/);
  assert.equal(m.construirModelo({ modo: "zp", Z: "", P: "1,2; -3" }).notas.length, 0);
  assert.deepEqual(Array.from(m.parsearPoli("K(s+1)", true)), [1, 1]);
  assert.deepEqual(Array.from(m.parsearPoli("K", true)), [1]);
  assert.throws(() => m.parsearPoli("s+K", true), /adelante/);
  assert.throws(() => m.construirModelo({ modo: "ec", N: "1", D: "s^2+Ks+1" }), /denominador/);
});

test("el mismo problema escalado por 10^±4 y 10^±6 da los mismos resultados, escalados", () => {
  // K/(s(s+α)(s+2α)): σa = −α, ruptura en α(−1 + 1/√3), ωc = √2·α y Kc = 6α³
  const m = lgr();
  for (const a of [1e-6, 1e-4, 1, 1e4, 1e6]) {
    const R = m.analizar(m.construirModelo({ modo: "zp", Z: "", P: `0; ${-a}; ${-2 * a}` }));
    casi(R.asint.sigma, -a);
    const rup = R.rup.filas.filter(f => f.ok), cr = R.cruce.filas.filter(f => f.valido);
    assert.equal(rup.length, 1, `α = ${a}`);
    casi(rup[0].z.re, a * (-1 + 1 / Math.sqrt(3)), 1e-6);
    casi(rup[0].K.re, 2 / (3 * Math.sqrt(3)) * a ** 3, 1e-6);
    assert.equal(cr.length, 1, `α = ${a}`);
    casi(cr[0].w, Math.SQRT2 * a, 1e-6);
    casi(cr[0].K, 6 * a ** 3, 1e-6);
    assert.deepEqual(clonar(R.tramos.map(t => t.spd)), [0, 2]);
    const ramas = m.trazarLGR(R);
    assert.equal(ramas.length, 3);
    assert.ok(!ramas.incompleto);
  }
});

test("el trazado por tandas da las mismas ramas que de un tirón", () => {
  const m = lgr();
  for (const e of [{ modo: "ec", N: "s+4,5", D: "s(s^2+6s+45)" }, { modo: "zp", Z: "", P: "0; -1e-4; -2e-4" }]) {
    const R = m.analizar(m.construirModelo(e));
    const entero = clonar(m.trazarLGR(R));
    const t = m.crearTrazado(R);
    let tandas = 0;
    while (!t.avanzar(1)) tandas++;
    assert.ok(tandas > 0, "tendría que haber hecho falta más de una tanda");
    assert.deepEqual(clonar(t.ramas), entero);
  }
});
