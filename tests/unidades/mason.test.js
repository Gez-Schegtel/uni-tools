/* Los cálculos puros de la regla de Mason, sin navegador (corren en segundos).
   Uso desde la raíz del repo: node --test "tests/unidades/*.test.js" */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { cargar, clonar } = require("./cargar");

const nodo = (id, nombre, tipo) => ({ id, nombre, tipo, x: 0, y: 0 });
const rama = (de, a, g) => ({ id: de + ">" + a, de, a, g });
function conGrafo(nodos, ramas) {
  const m = cargar("src/senales/modelo.js", "src/senales/mason.js");
  m.S = { nodos, ramas };
  return m;
}

test("un lazo: trayectoria, lazo, Δ y su valor", () => {
  const m = conGrafo(
    [nodo("e", "e", "entrada"), nodo("a", "a", "normal"), nodo("s", "s", "salida")],
    [rama("e", "a", "2"), rama("a", "s", "3"), rama("s", "a", "-4")]
  );
  const r = clonar(m.analizar());
  assert.deepEqual(r.P.map(p => [p.simbolo, p.gan, p.ruta]),
    [["P1", "2·3", "e → a → s"]]);
  assert.deepEqual(r.L.map(l => [l.simbolo, l.gan, l.ruta]),
    [["L1", "3·(-4)", "a → s → a"]]);
  // el lazo toca la trayectoria: el cofactor queda sin lazos libres
  assert.equal(r.cof[0].libres.length, 0);
  assert.equal(m.textoDelta(r.L, r.det), "1 − L1");
  m.conValores(r.P); m.conValores(r.L);
  assert.equal(r.P[0].valor, 6);
  assert.equal(r.L[0].valor, -12);
  assert.equal(m.valorDelta(r.L, r.det), 13);            // 1 − (−12)
  assert.equal(r.P[0].valor / m.valorDelta(r.L, r.det), 6 / 13);
});

test("dos lazos disjuntos: Δ lleva el producto L1L2", () => {
  const m = conGrafo(
    [nodo("e", "e", "entrada"), nodo("a", "a", "normal"), nodo("s", "s", "salida")],
    [rama("e", "a", "1"), rama("a", "s", "1"), rama("a", "a", "2"), rama("s", "s", "3")]
  );
  const r = clonar(m.analizar());
  assert.equal(r.P.length, 1);
  assert.deepEqual(r.L.map(l => l.gan), ["2", "3"]);
  assert.equal(m.textoDelta(r.L, r.det), "1 − L1 − L2 + L1L2");
  m.conValores(r.L);
  assert.equal(m.valorDelta(r.L, r.det), 1 - 2 - 3 + 2 * 3);
});

test("producto: saca los 1 y encierra entre paréntesis el factor que lo necesita", () => {
  const m = conGrafo([], []);
  assert.equal(m.producto([]), "1");
  assert.equal(m.producto(["1", "G", "1"]), "G");
  assert.equal(m.producto(["-H", "2"]), "(-H)·2");
  assert.equal(m.producto(["s+1", "G1"]), "(s+1)·G1");
});

test("las ecuaciones nodo a nodo se arman con las ramas", () => {
  const m = conGrafo(
    [nodo("e", "e", "entrada"), nodo("a", "a", "normal"), nodo("s", "s", "salida")],
    [rama("e", "a", "2"), rama("a", "s", "-3")]
  );
  assert.deepEqual(clonar(m.ecuaciones()).map(x => x.texto),
    ["e = entrada del sistema", "a = 2·e", "s = −3·a"]);
});

test("un grafo muy denso o con muchos lazos disjuntos termina en pocos milisegundos gracias a las cotas de seguridad", () => {
  const nodos = [], ramas = [];
  for (let i = 0; i < 18; i++) {                   // 2^18 − 1 combinaciones: más que el tope
    const id = "n" + i;
    nodos.push(nodo(id, "x" + i, i === 0 ? "entrada" : i === 17 ? "salida" : "normal"));
    ramas.push(rama(id, id, "L" + i));
    if (i > 0) ramas.push(rama("n" + (i - 1), id, "1"));
  }
  const m = conGrafo(nodos, ramas);
  const t0 = performance.now();
  const r = m.analizar();
  const dt = performance.now() - t0;
  assert.equal(r.truncado, true);
  assert.ok(dt < 500, dt + " ms");                     // con margen: corre en paralelo con las demás
});

/* Referencia independiente: x = Aᵀx + b·e resuelto por eliminación gaussiana */
function transferenciaLineal(nodos, ramas) {
  const n = nodos.length, idx = new Map(nodos.map((x, i) => [x.id, i]));
  const ent = nodos.findIndex(x => x.tipo === "entrada"), sal = nodos.findIndex(x => x.tipo === "salida");
  const M = Array.from({ length: n }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === j ? 1 : 0)));
  for (const r of ramas) { const a = idx.get(r.a), d = idx.get(r.de); if (a !== ent) M[a][d] -= Number(r.g); }
  M[ent][n] = 1;                                       // la entrada es la fuente: e = 1
  for (let c = 0; c < n; c++) {
    let p = c; for (let f = c + 1; f < n; f++) if (Math.abs(M[f][c]) > Math.abs(M[p][c])) p = f;
    [M[c], M[p]] = [M[p], M[c]];
    for (let f = 0; f < n; f++) if (f !== c) { const k = M[f][c] / M[c][c]; for (let j = c; j <= n; j++) M[f][j] -= k * M[c][j]; }
  }
  return M[sal][n] / M[sal][sal];
}
const completo = (N, gan) => {
  const nodos = [], ramas = [];
  for (let i = 0; i < N; i++) nodos.push(nodo("n" + i, "x" + i, i === 0 ? "entrada" : i === N - 1 ? "salida" : "normal"));
  let k = 0;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (i !== j && j !== 0) ramas.push(rama("n" + i, "n" + j, gan(k++)));
  return [nodos, ramas];
};

test("un grafo completo de 7 nodos (409 lazos) no se corta y su transferencia coincide con resolver el sistema", () => {
  // con el tope de 200 lazos se cortaba y daba un resultado parcial
  const [nodos, ramas] = completo(7, k => String(((k * 7) % 5 - 2) / 10));
  const m = conGrafo(nodos, ramas);
  const r = m.analizar();
  assert.equal(r.truncado, false);
  m.conValores(r.P); m.conValores(r.L);
  const num = r.P.reduce((s, p, i) => s + p.valor * m.valorDelta(r.cof[i].libres, r.cof[i].det), 0);
  const T = num / m.valorDelta(r.L, r.det);
  const ref = transferenciaLineal(nodos, ramas);
  assert.ok(Math.abs(T - ref) < 1e-9 * (1 + Math.abs(ref)), `${T} ≠ ${ref}`);
});

test("un grafo completo de 9 nodos avisa que supera el tope sin colgarse", () => {
  const [nodos, ramas] = completo(9, k => "g" + k);
  const m = conGrafo(nodos, ramas);
  const t0 = performance.now();
  assert.equal(m.analizar().truncado, true);
  assert.ok(performance.now() - t0 < 3000);
});

test("catorce autolazos disjuntos (16 369 combinaciones) no se cortan y Δ = Π(1 − Lᵢ)", () => {
  // con el tope de 2000 combinaciones de antes, esto se cortaba y quedaba sin transferencia
  const nodos = [], ramas = [], n = 14;
  for (let i = 0; i < n; i++) {
    const id = "n" + i;
    nodos.push(nodo(id, "x" + i, i === 0 ? "entrada" : i === n - 1 ? "salida" : "normal"));
    ramas.push(rama(id, id, String((i % 4 + 1) / 10)));
    if (i > 0) ramas.push(rama("n" + (i - 1), id, "1"));
  }
  const m = conGrafo(nodos, ramas);
  const r = m.analizar();
  assert.equal(r.truncado, false);
  m.conValores(r.L);
  const ref = Array.from({ length: n }, (_, i) => 1 - (i % 4 + 1) / 10).reduce((a, b) => a * b, 1);
  assert.ok(Math.abs(m.valorDelta(r.L, r.det) - ref) < 1e-12, `${m.valorDelta(r.L, r.det)} ≠ ${ref}`);
});
