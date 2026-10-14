const { test, expect } = require("@playwright/test");
const { abrir, abrirTexto } = require("./ayudas");

test.beforeEach(async ({ page }, info) => { info.errores = await abrir(page, "diagrama-señales.html"); });
test.afterEach(async ({}, info) => { expect(info.errores).toEqual([]); });

const mason = (page, ejemplo) => page.evaluate((e) => {
  cargarEjemplo(e);
  const A = analizar();
  return { P: A.P.map((p) => p.gan), L: A.L.map((l) => l.gan), delta: textoDelta(A.L, A.det),
           cof: A.cof.map((c) => textoDelta(c.libres, c.det)) };
}, ejemplo);

test.describe("regla de Mason", () => {
  test("un lazo simple: Δ = 1 − L1", async ({ page }) => {
    expect(await mason(page, "simple")).toEqual({ P: ["G_1·G_2"], L: ["G_1·(-H)"], delta: "1 − L1", cof: ["1"] });
  });
  test("dos lazos que se tocan: no hay término L1L2", async ({ page }) => {
    const m = await mason(page, "dos");
    expect(m.L).toHaveLength(2);
    expect(m.delta).toBe("1 − L1 − L2");
  });
  test("dos lazos que no se tocan: aparece +L1L2", async ({ page }) => {
    expect((await mason(page, "disjuntos")).delta).toBe("1 − L1 − L2 + L1L2");
  });
  test("dos trayectorias directas", async ({ page }) => {
    const m = await mason(page, "dostray");
    expect(m.P).toEqual(["G_1", "G_2"]);
    expect(m.cof).toEqual(["1", "1"]);
  });
  test("sin entrada ni salida marcadas no se rompe", async ({ page }) => {
    await page.evaluate(() => { cargarEjemplo("simple"); S.nodos.forEach((n) => (n.tipo = "normal")); });
    const A = await page.evaluate(() => { const a = analizar(); return { P: a.P.length, L: a.L.length }; });
    expect(A.P).toBe(0);
    await page.evaluate(() => mostrarMason());
    await expect(page.locator("#mason-sub")).toContainText("Falta marcar");
  });
  test("con valores numéricos calcula la transferencia", async ({ page }) => {
    // R →(1) x1 →(2) C, con realimentación −3 de C a x1... T = 2 / (1 + 2·3) = 2/7
    const doc = {
      nodos: [{ id: "R", nombre: "R", x: 0, y: 0, tipo: "entrada" }, { id: "x", nombre: "x", x: 150, y: 0, tipo: "normal" },
              { id: "C", nombre: "C", x: 300, y: 0, tipo: "salida" }],
      ramas: [{ id: "r1", de: "R", a: "x", g: "1", curva: 0 }, { id: "r2", de: "x", a: "C", g: "2", curva: 0 },
              { id: "r3", de: "C", a: "x", g: "-3", curva: -60 }],
    };
    await abrirTexto(page, JSON.stringify(doc));
    const r = await page.evaluate(() => {
      const A = analizar(); conValores(A.P); conValores(A.L);
      return { P: A.P.map((p) => p.valor), L: A.L.map((l) => l.valor), d: valorDelta(A.L, A.det) };
    });
    expect(r.P).toEqual([2]);
    expect(r.L).toEqual([-6]);
    expect(r.d).toBe(7);
  });
});

test.describe("equivalente en bloques", () => {
  test("el JSON generado se abre en Diagramas de bloques sin romper nada", async ({ page, browser }) => {
    const datos = await page.evaluate(() => { cargarEjemplo("dos"); return JSON.stringify(equivalenteEnBloques()); });
    const p2 = await browser.newPage();
    const errores = await abrir(p2, "diagrama-bloque.html");
    expect(await abrirTexto(p2, datos)).toBeNull();
    const r = await p2.evaluate(() => ({ n: S.nodes.length, e: S.edges.length,
      huerfanas: S.edges.filter((e) => !getNode(e.from.id) || !getNode(e.to.id)).length }));
    expect(r.n).toBeGreaterThan(0);
    expect(r.huerfanas).toBe(0);
    expect(errores).toEqual([]);
    await p2.close();
  });
});

test.describe("edición", () => {
  test("guardar y abrir conserva nodos y ramas", async ({ page }) => {
    await page.evaluate(() => cargarEjemplo("disjuntos"));
    const antes = await page.evaluate(() => [S.nodos.length, S.ramas.length]);
    const json = await page.evaluate(() => JSON.stringify({ nombre: S.nombre, nodos: S.nodos, ramas: S.ramas }));
    await page.evaluate(() => { S.nodos = []; S.ramas = []; render(); });
    await abrirTexto(page, json);
    expect(await page.evaluate(() => [S.nodos.length, S.ramas.length])).toEqual(antes);
  });
  test("deshacer y rehacer", async ({ page }) => {
    await page.evaluate(() => cargarEjemplo("simple"));
    const n = await page.evaluate(() => S.nodos.length);
    await page.evaluate(() => { S.nodos.push(nuevoNodo(500, 300)); commit(); render(); });
    expect(await page.evaluate(() => S.nodos.length)).toBe(n + 1);
    await page.evaluate(() => undo());
    expect(await page.evaluate(() => S.nodos.length)).toBe(n);
    await page.evaluate(() => redo());
    expect(await page.evaluate(() => S.nodos.length)).toBe(n + 1);
  });
});
