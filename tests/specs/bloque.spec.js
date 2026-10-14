const { test, expect } = require("@playwright/test");
const { abrir, aPantalla, arrastrar, abrirTexto } = require("./ayudas");

test.beforeEach(async ({ page }, info) => { info.errores = await abrir(page, "diagrama-bloque.html"); });
test.afterEach(async ({}, info) => { expect(info.errores).toEqual([]); });

const estado = (page) => page.evaluate(() => ({
  modo: S.mode, herramienta: pendingAdd,
  botones: ["select", "multi", "connect"].filter((m) => document.getElementById("m-" + m).classList.contains("on")),
  paleta: [...document.querySelectorAll(".ptool.on")].map((b) => b.dataset.add),
}));

test.describe("herramientas y modos son excluyentes", () => {
  test("arranca en selección", async ({ page }) => {
    expect(await estado(page)).toMatchObject({ modo: "select", herramienta: null, botones: ["select"], paleta: [] });
  });
  test("elegir una herramienta saca del modo; elegir un modo suelta la herramienta", async ({ page }) => {
    await page.keyboard.press("c");
    expect(await estado(page)).toMatchObject({ modo: "connect", herramienta: null });
    await page.keyboard.press("b");
    expect(await estado(page)).toMatchObject({ modo: "select", herramienta: "block", botones: [] });
    await page.keyboard.press("x");
    expect(await estado(page)).toMatchObject({ modo: "multi", herramienta: null, paleta: [] });
    await page.keyboard.press("m");
    expect(await estado(page)).toMatchObject({ herramienta: "marco" });
    await page.keyboard.press("v");
    expect(await estado(page)).toMatchObject({ modo: "select", herramienta: null, botones: ["select"] });
  });
  test("Esc vuelve a selección", async ({ page }) => {
    await page.keyboard.press("s");
    await page.keyboard.press("Escape");
    expect(await estado(page)).toMatchObject({ modo: "select", herramienta: null });
  });
  test("la leyenda de atajos de la barra de estado existe", async ({ page }) => {
    const letras = await page.$$eval("#atajos kbd", (k) => k.map((e) => e.textContent.trim().toUpperCase()));
    for (const l of ["V", "X", "C", "B", "S", "N", "E", "T", "M"]) expect(letras).toContain(l);
  });
  test("colocar un bloque con la herramienta vuelve a selección", async ({ page }) => {
    await page.evaluate(() => { S.nodes = []; S.edges = []; render(); });   // lienzo libre
    const antes = 0;
    await page.keyboard.press("b");
    const p = await aPantalla(page, 600, 480);
    await page.mouse.click(p.x, p.y);
    expect(await page.evaluate(() => S.nodes.length)).toBe(antes + 1);
    expect(await estado(page)).toMatchObject({ herramienta: null, modo: "select" });
  });
});

test.describe("recuadros: seleccionar, mover y cambiar tamaño", () => {
  async function conMarco(page) {
    await page.evaluate(() => { S.nodes.push(makeNode("marco", 700, 700, { w: 300, h: 140, label: "Prueba" })); commit(); render(); });
    return page.evaluate(() => S.nodes.find((n) => n.type === "marco").id);
  }
  const geom = (page, id) => page.evaluate((id) => { const n = getNode(id); return { x: n.x, y: n.y, w: n.w, h: n.h }; }, id);

  test("un click lo selecciona y muestra los tiradores", async ({ page }) => {
    const id = await conMarco(page);
    const borde = await aPantalla(page, 550, 700);                 // borde izquierdo
    await page.mouse.click(borde.x, borde.y);
    expect(await page.evaluate(() => S.sel)).toEqual([id]);
    expect(await page.locator(".m-handle-wrap").count()).toBeGreaterThanOrEqual(4);
  });
  test("seleccionado, se mueve arrastrando el asa", async ({ page }) => {
    const id = await conMarco(page);
    await page.evaluate((id) => { S.sel = [id]; render(); }, id);
    const a = await geom(page, id);
    const r = await page.locator(".m-grip").boundingBox();
    await arrastrar(page, { x: r.x + r.width / 2, y: r.y + r.height / 2 }, [40, 20]);
    const b = await geom(page, id);
    expect(b.x).toBeGreaterThan(a.x); expect(b.y).toBeGreaterThan(a.y);
    expect([b.w, b.h]).toEqual([a.w, a.h]);
  });
  test("el tirador de una esquina cambia el tamaño", async ({ page }) => {
    const id = await conMarco(page);
    await page.evaluate((id) => { S.sel = [id]; render(); }, id);
    const a = await geom(page, id);
    const r = await page.locator('.m-handle-wrap[data-handle="se"], .m-handle-wrap[data-handle="br"]').first().boundingBox();
    await arrastrar(page, { x: r.x + r.width / 2, y: r.y + r.height / 2 }, [60, 40]);
    const b = await geom(page, id);
    expect(b.w).toBeGreaterThan(a.w); expect(b.h).toBeGreaterThan(a.h);
  });
  test("deshacer devuelve la geometría anterior", async ({ page }) => {
    const id = await conMarco(page);
    await page.evaluate((id) => { S.sel = [id]; render(); }, id);
    const a = await geom(page, id);
    const r = await page.locator(".m-grip").boundingBox();
    await arrastrar(page, { x: r.x + r.width / 2, y: r.y + r.height / 2 }, [40, 20]);
    await page.evaluate(() => undo());
    expect(await geom(page, id)).toEqual(a);
  });
});

test.describe("flechas", () => {
  test("seleccionada, una flecha ofrece tiradores de tramo y se puede correr a mano", async ({ page }) => {
    // R → bloque → C, con un tramo que se puede desplazar
    const doc = {
      nodes: [{ id: "a", type: "block", x: 200, y: 200, w: 72, h: 42, label: "G" },
              { id: "b", type: "block", x: 500, y: 320, w: 72, h: 42, label: "H" }],
      edges: [{ id: "e1", from: { id: "a", port: "r" }, to: { id: "b", port: "l" }, variant: 0 }],
    };
    await abrirTexto(page, JSON.stringify(doc));
    await page.evaluate(() => { S.selEdges = ["e1"]; S.sel = []; render(); });
    const tiradores = page.locator(".seg-handle-wrap");
    expect(await tiradores.count()).toBeGreaterThan(0);
    const antes = await page.evaluate(() => JSON.stringify(getEdge("e1").pts));
    const r = await tiradores.first().boundingBox();
    await arrastrar(page, { x: r.x + r.width / 2, y: r.y + r.height / 2 }, [30, 30]);
    const e = await page.evaluate(() => getEdge("e1"));
    expect(e.manual, "la ruta quedó fijada a mano").toBeTruthy();
    expect(JSON.stringify(e.pts)).not.toBe(antes);
  });
  test("las flechas quedan unidas a sus bloques al mover un bloque", async ({ page }) => {
    await page.evaluate(() => loadExample());
    const n = await page.evaluate(() => S.edges.length);
    expect(n).toBeGreaterThan(0);
    await page.evaluate(() => { const b = S.nodes.find((x) => x.type === "block"); b.x += 40; b.y += 40; render(); });
    expect(await page.evaluate(() => S.edges.every((e) => e.pts && e.pts.length >= 2))).toBe(true);
  });
});

test.describe("guardar y abrir", () => {
  test("el ejemplo sobrevive a ida y vuelta por JSON", async ({ page }) => {
    await page.evaluate(() => loadExample());
    const a = await page.evaluate(() => JSON.stringify([S.nodes.map((n) => [n.id, n.type, n.x, n.y, n.w, n.h, n.label]), S.edges.map((e) => [e.id, e.from, e.to])]));
    const json = await page.evaluate(() => JSON.stringify({ nombre: S.nombre, nodes: S.nodes, edges: S.edges, tema: S.tema, hoja: S.hoja }));
    await page.evaluate(() => { S.nodes = []; S.edges = []; render(); });
    await abrirTexto(page, json);
    const b = await page.evaluate(() => JSON.stringify([S.nodes.map((n) => [n.id, n.type, n.x, n.y, n.w, n.h, n.label]), S.edges.map((e) => [e.id, e.from, e.to])]));
    expect(b).toBe(a);
  });
  test("el SVG exportado trae los datos y se vuelve a abrir", async ({ page }) => {
    await page.evaluate(() => loadExample());
    const cuenta = await page.evaluate(() => [S.nodes.length, S.edges.length]);
    const svg = await page.evaluate(() => (typeof buildExportSVG === "function" ? new XMLSerializer().serializeToString(buildExportSVG().svg || buildExportSVG()) : ""));
    expect(svg).toContain("uni-tools-datos");
    await page.evaluate(() => { S.nodes = []; S.edges = []; render(); });
    await abrirTexto(page, svg);
    expect(await page.evaluate(() => [S.nodes.length, S.edges.length])).toEqual(cuenta);
  });
});
