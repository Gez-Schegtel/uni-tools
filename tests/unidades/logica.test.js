/* Compuertas, simplificación y tablas de verdad del simulador, sin navegador.
   Uso desde la raíz del repo: node --test "tests/unidades/*.test.js" */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { cargar, clonar } = require("./cargar");

/* evalGate y simplify no dependen de nada; las tablas cargan además el modelo,
   los tipos y el esMarco de los recuadros, como la página armada. */
const l = cargar("src/simulador/logica.js");
const s = cargar("src/comun/recuadros.js", "src/simulador/tipos.js",
  "src/simulador/modelo.js", "src/simulador/logica.js");

const nodo = (id, type, x, y, extra) =>
  Object.assign({ id, type, x, y, label: "", on: false }, extra);
function conCircuito(nodes, wires) { s.S = { nodes, wires }; return s; }
const tabla = (t) => t.rows.map(r => r.in.join("") + "→" + r.out.join(""));

test("evalGate: el valor de cada compuerta", () => {
  assert.equal(l.evalGate("and", [1, 1]), 1);
  assert.equal(l.evalGate("and", [1, 0]), 0);
  assert.equal(l.evalGate("or", [0, 0]), 0);
  assert.equal(l.evalGate("or", [0, 1]), 1);
  assert.equal(l.evalGate("xor", [1, 1]), 0);
  assert.equal(l.evalGate("xor", [1, 0, 1]), 0);        // dos unos: par
  assert.equal(l.evalGate("xnor", [0, 0]), 1);
  assert.equal(l.evalGate("nand", [1, 1]), 0);
  assert.equal(l.evalGate("nor", [1, 0]), 0);
  assert.equal(l.evalGate("not", [0]), 1);
  assert.equal(l.evalGate("buf", [1]), 1);
  assert.equal(l.evalGate("out", [0]), 0);
});

test("simplify: la suma de productos mínima, con nombres propios", () => {
  assert.equal(l.simplify([], 3), "0");
  assert.equal(l.simplify([0, 1, 2, 3], 2), "1");
  assert.equal(l.simplify([1, 2], 2), "A'B + AB'");     // XOR
  assert.equal(l.simplify([1, 3], 2), "B");
  assert.equal(l.simplify([5, 7, 6, 4], 3), "A");
  assert.equal(l.simplify([0, 4], 3), "B'C'");
  assert.equal(l.simplify([1], 2, ["X", "Y"]), "X'Y");
  // Σm(0,1,3,4,7,9,11,13,15): la elección golosa da 10 literales; la mínima tiene 9
  assert.deepEqual(
    l.simplify([0, 1, 3, 4, 7, 9, 11, 13, 15], 4).split(" + ").sort(),
    ["A'C'D'", "AD", "B'D", "CD"].sort()
  );
});

test("simplify: equivalente a la tabla y mínima en 1..7 variables y rápida en 10", () => {
  function implicantesPrimos(mt, n) {
    const on = new Set(mt), cubos = [];
    const total = 3 ** n;
    for (let c = 0; c < total; c++) {
      const d = []; let x = c; for (let i = 0; i < n; i++) { d.push(x % 3); x = Math.floor(x / 3); }
      let ok = true, cubre = [];
      for (let m = 0; m < (1 << n) && ok; m++) {
        let dentro = true;
        for (let i = 0; i < n; i++) { const b = (m >> (n - 1 - i)) & 1; if (d[i] !== 2 && d[i] !== b) { dentro = false; break; } }
        if (dentro) { if (!on.has(m)) ok = false; else cubre.push(m); }
      }
      if (ok && cubre.length) cubos.push({ d, cubre, lit: d.filter(v => v !== 2).length });
    }
    return cubos.filter(a => !cubos.some(b => b !== a && b.cubre.length > a.cubre.length && a.cubre.every(m => b.cubre.includes(m))));
  }
  function minimo(mt, n) {
    if (!mt.length) return { t: 0, l: 0 };
    if (mt.length === 1 << n) return { t: 1, l: 0 };
    const P = implicantesPrimos(mt, n);
    const porM = new Map(mt.map(m => [m, P.filter(p => p.cubre.includes(m))]));
    let mejor = { t: Infinity, l: Infinity };
    const rec = (faltan, t, l) => {
      if (!faltan.size) { if (t < mejor.t || (t === mejor.t && l < mejor.l)) mejor = { t, l }; return; }
      if (t + 1 > mejor.t) return;
      let cands = null;
      for (const m of faltan) { const c = porM.get(m); if (!cands || c.length < cands.length) cands = c; }
      for (const p of cands) {
        if (t + 1 === mejor.t && l + p.lit >= mejor.l) continue;
        const q = new Set(faltan); p.cubre.forEach(m => q.delete(m));
        rec(q, t + 1, l + p.lit);
      }
    };
    rec(new Set(mt), 0, 0);
    return mejor;
  }
  function evaluar(expr, nombres, m, n) {
    if (expr === "0") return 0; if (expr === "1") return 1;
    return expr.split(" + ").some(t => {
      let s = t, ok = true;
      if (s === "1") return true;
      while (s.length) {
        const nom = nombres.filter(x => s.startsWith(x)).sort((a, b) => b.length - a.length)[0];
        if (!nom) throw new Error("no entiendo el término " + t + " de " + expr);
        s = s.slice(nom.length);
        let neg = false; if (s[0] === "'") { neg = true; s = s.slice(1); }
        const i = nombres.indexOf(nom), b = (m >> (n - 1 - i)) & 1;
        if ((neg ? 1 - b : b) !== 1) ok = false;
      }
      return ok;
    }) ? 1 : 0;
  }
  const contar = (expr) => expr === "0" ? { t: 0, l: 0 } : expr === "1" ? { t: 1, l: 0 } :
    { t: expr.split(" + ").length, l: (expr.match(/[A-Z][a-z0-9]*/g) || []).length };
  const fallas = [];
  let semilla = 12345; const rnd = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648;
  const probar = (mt, n, exacta, nombres) => {
    const noms = nombres || Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
    const e = l.simplify(mt.slice(), n, nombres);
    const on = new Set(mt);
    for (let m = 0; m < 1 << n; m++) if (evaluar(e, noms, m, n) !== (on.has(m) ? 1 : 0)) { fallas.push(`n=${n} Σm(${mt}) → ${e}: mal en m=${m}`); return; }
    if (exacta) {
      const a = nombres ? { t: e === "0" ? 0 : e.split(" + ").length, l: e === "0" || e === "1" ? 0 : e.split(" + ").reduce((acc, t) => acc + (t.match(new RegExp(noms.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort((u, v) => v.length - u.length).join("|"), "g")) || []).length, 0) } : contar(e);
      const b = minimo(mt, n);
      if (a.t !== b.t || a.l !== b.l) fallas.push(`n=${n} Σm(${mt}) → ${e}: ${a.t} términos/${a.l} literales, el mínimo es ${b.t}/${b.l}`);
    }
  };
  for (const n of [1, 2, 3]) for (let f = 0; f < 2 ** (1 << n); f++) {
    const mt = []; for (let m = 0; m < 1 << n; m++) if ((f >> m) & 1) mt.push(m);
    probar(mt, n, true);
  }
  for (const [n, cuantas, exacta] of [[4, 300, true], [5, 80, true], [6, 25, true], [7, 10, false]])
    for (let k = 0; k < cuantas; k++) {
      const dens = rnd(); const mt = []; for (let m = 0; m < 1 << n; m++) if (rnd() < dens) mt.push(m);
      probar(mt, n, exacta);
    }
  for (let k = 0; k < 40; k++) {
    const mt = []; for (let m = 0; m < 16; m++) if (rnd() < 0.5) mt.push(m);
    probar(mt, 4, true, ["A", "A1", "Cin", "B"]);
  }
  assert.deepEqual(fallas, []);

  // Benchmark con 10 entradas
  let sem = 11; const azar = () => (sem = (sem * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const mt10 = [...Array(1024).keys()].filter(() => azar() < .5);
  const t0 = performance.now();
  l.simplify(mt10, 10);
  assert.equal(performance.now() - t0 < 2000, true);
});

test("tabla de verdad: una AND de dos entradas", () => {
  conCircuito(
    [nodo("i1", "in", 0, 0, { label: "A" }), nodo("i2", "in", 0, 40, { label: "B" }),
     nodo("g1", "and", 100, 20), nodo("o1", "out", 200, 20, { label: "S" })],
    [{ from: { id: "i1", pin: "o0" }, to: { id: "g1", pin: 0 } },
     { from: { id: "i2", pin: "o0" }, to: { id: "g1", pin: 1 } },
     { from: { id: "g1", pin: "o0" }, to: { id: "o1", pin: 0 } }]
  );
  assert.deepEqual(tabla(clonar(s.truthTable())), ["00→0", "01→0", "10→0", "11→1"]);
});

test("tabla de verdad: semisumador (S = A ⊕ B, R = A · B)", () => {
  conCircuito(
    [nodo("i1", "in", 0, 0, { label: "A" }), nodo("i2", "in", 0, 40, { label: "B" }),
     nodo("h1", "hadd", 120, 20),
     nodo("o1", "out", 240, 0, { label: "S" }), nodo("o2", "out", 240, 40, { label: "R" })],
    [{ from: { id: "i1", pin: "o0" }, to: { id: "h1", pin: 0 } },
     { from: { id: "i2", pin: "o0" }, to: { id: "h1", pin: 1 } },
     { from: { id: "h1", pin: "o0" }, to: { id: "o1", pin: 0 } },
     { from: { id: "h1", pin: "o1" }, to: { id: "o2", pin: 0 } }]
  );
  assert.deepEqual(tabla(clonar(s.truthTable())), ["00→00", "01→10", "10→10", "11→01"]);
});
