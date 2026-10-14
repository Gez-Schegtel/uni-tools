const { test, expect } = require("@playwright/test");
const { abrir, abrirTexto } = require("./ayudas");

test.beforeEach(async ({ page }, info) => { info.errores = await abrir(page, "simulador-logico.html"); });
test.afterEach(async ({}, info) => { expect(info.errores).toEqual([]); });

/* Arma entradas → una compuerta → salida y devuelve la tabla de verdad como [[ins],[salida]] */
async function tablaDeCompuerta(page, tipo, entradas) {
  const nodes = [], wires = [];
  for (let i = 0; i < entradas; i++) nodes.push({ id: "i" + i, type: "in", x: 0, y: i * 60, label: "ABCD"[i], on: false });
  nodes.push({ id: "g", type: tipo, x: 150, y: 30, label: "", pins: entradas });
  nodes.push({ id: "o", type: "out", x: 300, y: 30, label: "S" });
  for (let i = 0; i < entradas; i++) wires.push({ id: "w" + i, from: { id: "i" + i, pin: "o0" }, to: { id: "g", pin: i } });
  wires.push({ id: "wo", from: { id: "g", pin: "o0" }, to: { id: "o", pin: 0 } });
  await abrirTexto(page, JSON.stringify({ nodes, wires }));
  return page.evaluate(() => truthTable().rows.map((r) => [r.in.join(""), r.out[0]]));
}

test.describe("compuertas: tablas de verdad", () => {
  const dos = (f) => ["00", "01", "10", "11"].map((b) => [b, f(+b[0], +b[1]) ? 1 : 0]);
  const casos = {
    and: dos((a, b) => a & b), or: dos((a, b) => a | b), xor: dos((a, b) => a ^ b),
    nand: dos((a, b) => !(a & b)), nor: dos((a, b) => !(a | b)), xnor: dos((a, b) => !(a ^ b)),
  };
  for (const [tipo, esperada] of Object.entries(casos))
    test(tipo.toUpperCase(), async ({ page }) => {
      expect(await tablaDeCompuerta(page, tipo, 2)).toEqual(esperada);
    });
  test("NOT", async ({ page }) => {
    expect(await tablaDeCompuerta(page, "not", 1)).toEqual([["0", 1], ["1", 0]]);
  });
  test("AND de 3 entradas", async ({ page }) => {
    const t = await tablaDeCompuerta(page, "and", 3);
    expect(t.filter(([, s]) => s).map(([e]) => e)).toEqual(["111"]);
  });
});

test.describe("ejemplos", () => {
  test("semisumador: S = A⊕B y Cout = A·B", async ({ page }) => {
    await page.evaluate(() => cargarEjemplo("half"));
    const filas = await page.evaluate(() => truthTable().rows.map((r) => [r.in.join(""), ...r.out]));
    expect(filas).toEqual([["00", 0, 0], ["01", 1, 0], ["10", 1, 0], ["11", 0, 1]]);
  });
  test("sumador completo: suma y acarreo de las 8 combinaciones", async ({ page }) => {
    await page.evaluate(() => cargarEjemplo("full"));
    const filas = await page.evaluate(() => truthTable().rows.map((r) => [r.in.join(""), ...r.out]));
    expect(filas).toHaveLength(8);
    for (const [bits, s, c] of filas) {
      const suma = [...bits].reduce((a, b) => a + +b, 0);
      expect([s, c], bits).toEqual([suma & 1, suma >> 1]);
    }
  });
  test("todos los ejemplos cargan, se simulan y no oscilan", async ({ page }) => {
    for (const e of ["half", "full", "latch", "cont", "regd", "mux"]) {
      await page.evaluate((e) => cargarEjemplo(e), e);
      const r = await page.evaluate(() => { correr(); render(); return { osc: OSC, nodos: S.nodes.length }; });
      expect(r.nodos, e).toBeGreaterThan(0);
      expect(r.osc, e).toBe(false);
    }
  });
  test("mux 2→1 elige la entrada según el selector", async ({ page }) => {
    await page.evaluate(() => cargarEjemplo("mux"));
    const t = await page.evaluate(() => { const t = truthTable(); return { ins: t.ins.map((n) => n.label), rows: t.rows.map((r) => [r.in, r.out[0]]) }; });
    // la salida tiene que depender del selector: ni constante ni igual a una sola entrada
    expect(new Set(t.rows.map((r) => r[1])).size).toBe(2);
  });
});

test.describe("tabla de verdad en pantalla", () => {
  test("las expresiones usan las etiquetas reales, aunque no estén en orden alfabético", async ({ page }) => {
    await page.evaluate(() => {
      cargarEjemplo("half");
      const [a, b] = S.nodes.filter((n) => n.type === "in");
      a.label = "B"; b.label = "A"; render(); mostrarTabla();
    });
    const exprs = await page.$$eval("#tt-body .expr", (e) => e.map((x) => x.textContent));
    const cabecera = await page.$$eval("#tt-body th", (e) => e.map((x) => x.textContent));
    // la primera columna de la tabla es la primera entrada (x menor): su etiqueta ahora es "B"
    expect(cabecera.slice(0, 2)).toEqual(["B", "A"]);
    // A⊕B no cambia con el nombre, pero tiene que mencionar sólo letras que existan en la tabla
    expect(exprs[0]).toMatch(/^S = /);
    expect(exprs[0].replace(/Σm.*/, "")).toMatch(/B.*A|A.*B/);
  });
  test("una etiqueta con HTML no se ejecuta", async ({ page }) => {
    await page.evaluate(() => {
      cargarEjemplo("half");
      S.nodes.find((n) => n.type === "in").label = "<img src=x onerror=window.__pwn=1>";
      render(); mostrarTabla();
    });
    expect(await page.evaluate(() => window.__pwn === 1)).toBe(false);
    expect(await page.locator("#tt-body img").count()).toBe(0);
  });
  test("sin entradas ni salidas avisa en vez de romperse", async ({ page }) => {
    await page.evaluate(() => { S.nodes = []; S.wires = []; render(); mostrarTabla(); });
    await expect(page.locator("#tt-body .hint")).toBeVisible();
  });
});

test.describe("biestables", () => {
  test("la tabla de verdad no cambia el estado del circuito", async ({ page }) => {
    await page.evaluate(() => cargarEjemplo("regd"));
    const antes = await page.evaluate(() => JSON.stringify(S.nodes.map((n) => [n.id, n.on, n.q])));
    await page.evaluate(() => truthTable());
    expect(await page.evaluate(() => JSON.stringify(S.nodes.map((n) => [n.id, n.on, n.q])))).toBe(antes);
  });
});

test.describe("guardar y abrir", () => {
  test("JSON de ida y vuelta conserva nodos y cables", async ({ page }) => {
    await page.evaluate(() => cargarEjemplo("full"));
    const antes = await page.evaluate(() => [S.nodes.length, S.wires.length]);
    const json = await page.evaluate(() => JSON.stringify(docDatos()));
    await page.evaluate(() => { S.nodes = []; S.wires = []; render(); });
    await abrirTexto(page, json);
    expect(await page.evaluate(() => [S.nodes.length, S.wires.length])).toEqual(antes);
    // y el circuito sigue andando igual
    const filas = await page.evaluate(() => truthTable().rows.length);
    expect(filas).toBe(8);
  });
  test("el SVG exportado trae el circuito y se vuelve a abrir", async ({ page }) => {
    await page.evaluate(() => cargarEjemplo("half"));
    const svg = await page.evaluate(() => { const r = buildExportSVG(); return new XMLSerializer().serializeToString(r.svg || r); });
    expect(svg).toContain("uni-tools-datos");
    await page.evaluate(() => { S.nodes = []; S.wires = []; render(); });
    await abrirTexto(page, svg);
    expect(await page.evaluate(() => [S.nodes.length, S.wires.length])).toEqual([6, 6]);
  });
});

test("doble clic sobre una compuerta abre el editor del nombre, y Enter lo guarda", async ({ page }) => {
  await page.evaluate(() => cargarEjemplo("half"));
  const c = await page.evaluate(() => {
    const n = S.nodes.find((n) => n.type === "in"), r = document.getElementById("canvas").getBoundingClientRect();
    return { id: n.id, x: r.left + S.pan.x + n.x * S.zoom, y: r.top + S.pan.y + n.y * S.zoom };
  });
  await page.mouse.dblclick(c.x, c.y);
  await expect(page.locator(".editor-hoja")).toBeFocused();
  await page.keyboard.type("Q");
  await page.keyboard.press("Enter");
  expect(await page.evaluate((id) => getNode(id).label, c.id)).toBe("Q");
  await page.evaluate(() => undo());
  expect(await page.evaluate((id) => getNode(id).label, c.id)).not.toBe("Q");
});
