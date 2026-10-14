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

test.describe("doble clic para editar el contenido directamente", () => {
  const centro = (page, id) => page.evaluate((id) => {
    const n = getNode(id), r = document.getElementById("canvas").getBoundingClientRect();
    return { x: r.left + S.pan.x + n.x * S.zoom, y: r.top + S.pan.y + n.y * S.zoom };
  }, id);
  const idBloque = (page) => page.evaluate(() => S.nodes.find((n) => n.type === "block").id);
  const hayEditor = (page) => page.evaluate(() => !!document.querySelector(".editor-hoja"));

  test("doble clic sobre un bloque abre el editor con el contenido, y Enter lo guarda", async ({ page }) => {
    const id = await idBloque(page), c = await centro(page, id);
    const antes = await page.evaluate((id) => getNode(id).label, id);
    await page.mouse.dblclick(c.x, c.y);
    await expect(page.locator(".editor-hoja")).toBeFocused();
    expect(await page.inputValue(".editor-hoja")).toBe(antes);
    await page.keyboard.type("K(s)");
    await page.keyboard.press("Enter");
    expect(await hayEditor(page)).toBe(false);
    expect(await page.evaluate((id) => getNode(id).label, id)).toBe("K(s)");
    await page.evaluate(() => undo());                        // y se puede deshacer
    expect(await page.evaluate((id) => getNode(id).label, id)).toBe(antes);
  });
  test("Escape cancela sin cambiar nada", async ({ page }) => {
    const id = await idBloque(page), c = await centro(page, id);
    const antes = await page.evaluate((id) => getNode(id).label, id);
    await page.mouse.dblclick(c.x, c.y);
    await page.keyboard.type("zzz");
    await page.keyboard.press("Escape");
    expect(await hayEditor(page)).toBe(false);
    expect(await page.evaluate((id) => getNode(id).label, id)).toBe(antes);
  });
  test("dos clics lentos, o sobre bloques distintos, no abren el editor", async ({ page }) => {
    const ids = await page.evaluate(() => S.nodes.filter((n) => n.type === "block").map((n) => n.id));
    const a = await centro(page, ids[0]), b = await centro(page, ids[1]);
    await page.mouse.click(a.x, a.y);
    await page.waitForTimeout(600);
    await page.mouse.click(a.x, a.y);
    expect(await hayEditor(page)).toBe(false);
    await page.mouse.click(a.x, a.y);
    await page.mouse.click(b.x, b.y);
    expect(await hayEditor(page)).toBe(false);
  });
  test("arrastrar un bloque y soltarlo no abre el editor", async ({ page }) => {
    const id = await idBloque(page), c = await centro(page, id);
    await arrastrar(page, c, [40, 40]);
    expect(await hayEditor(page)).toBe(false);
  });
  test("funciona también en sumadores y en la etiqueta de una flecha", async ({ page }) => {
    const suma = await page.evaluate(() => S.nodes.find((n) => n.type === "sum").id);
    const c = await centro(page, suma);
    await page.mouse.dblclick(c.x, c.y);
    expect(await hayEditor(page)).toBe(true);
    await page.keyboard.press("Escape");
    const p = await page.evaluate(() => {
      // un cuarto del tramo más largo: el medio lo ocupa el tirador de la flecha seleccionada
      const e = S.edges.find((e) => e.pts && e.pts.length > 1), L = segsOf(e.pts)
        .reduce((m, s) => Math.hypot(s[1].x - s[0].x, s[1].y - s[0].y) > Math.hypot(m[1].x - m[0].x, m[1].y - m[0].y) ? s : m);
      const m = { x: L[0].x * .75 + L[1].x * .25, y: L[0].y * .75 + L[1].y * .25 };
      const r = document.getElementById("canvas").getBoundingClientRect();
      return { id: e.id, x: r.left + S.pan.x + m.x * S.zoom, y: r.top + S.pan.y + m.y * S.zoom };
    });
    await page.mouse.dblclick(p.x, p.y);
    expect(await hayEditor(page)).toBe(true);
    await page.keyboard.type("x1");
    await page.keyboard.press("Enter");
    expect(await page.evaluate((id) => getEdge(id).label, p.id)).toBe("x1");
  });
});
