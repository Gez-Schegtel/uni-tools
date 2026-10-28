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

test.describe("copiar y pegar (Ctrl+C / Ctrl+V)", () => {
  test("el circuito pegado funciona igual: los cables conservan sus patas", async ({ page }) => {
    await page.evaluate(() => cargarEjemplo("half"));
    const [n0, w0] = await page.evaluate(() => [S.nodes.length, S.wires.length]);
    await page.evaluate(() => { S.sel = S.nodes.map((n) => n.id); render(); });
    await page.keyboard.press("Control+c");
    await page.keyboard.press("Control+v");
    expect(await page.evaluate(() => [S.nodes.length, S.wires.length])).toEqual([n0 * 2, w0 * 2]);
    // todas las patas existen (antes Ctrl+D perdía la pata de salida de cada cable)
    expect(await page.evaluate(() => S.wires.every((w) => w.from.pin !== undefined && w.to.pin !== undefined))).toBe(true);
    // las entradas copiadas reciben letras distintas
    const etiquetas = await page.evaluate(() => S.nodes.filter((n) => n.type === "in").map((n) => n.label));
    expect(new Set(etiquetas).size).toBe(etiquetas.length);
    // la copia calcula lo mismo que el original: 2 entradas más → 4 entradas, 16 filas
    expect(await page.evaluate(() => truthTable().rows.length)).toBe(16);
    // y sobrevive a guardar y abrir (no se descarta ningún cable)
    const json = await page.evaluate(() => JSON.stringify(docDatos()));
    await abrirTexto(page, json);
    expect(await page.evaluate(() => S.wires.length)).toBe(w0 * 2);
  });
  test("Ctrl+D también conserva las patas de los cables", async ({ page }) => {
    await page.evaluate(() => { cargarEjemplo("half"); S.sel = S.nodes.map((n) => n.id); render(); });
    await page.keyboard.press("Control+d");
    expect(await page.evaluate(() => S.wires.every((w) => w.from.pin !== undefined))).toBe(true);
    expect(await page.evaluate(() => S.nodes.length)).toBe(12);
  });
});

test("los cables no pasan por encima de la compuerta de la que salen o a la que llegan", async ({ page }) => {
  // en el latch SR los cables se cruzan de una NOR a la otra: tienen que rodearlas
  const cruces = await page.evaluate(() => {
    const malos = [];
    for (const ej of ["half", "full", "latch", "mux", "cont", "regd"]) {
      cargarEjemplo(ej); render();
      for (const w of S.wires) for (const id of [w.from.id, w.to.id]) {
        const R = rectOf(getNode(id));
        for (let i = 0; i + 1 < w.pts.length; i++) {
          const p = w.pts[i], q = w.pts[i + 1];
          if (Math.max(p.x, q.x) > R.l + 1 && Math.min(p.x, q.x) < R.r - 1 && Math.max(p.y, q.y) > R.t + 1 && Math.min(p.y, q.y) < R.b - 1)
            malos.push(ej + ": " + w.id);
        }
      }
    }
    return malos;
  });
  expect(cruces).toEqual([]);
});

test("elegir una compuerta en la paleta y luego tocar un elemento existente suelta la herramienta pendiente", async ({ page }) => {
  await page.evaluate(() => cargarEjemplo("half"));
  const n0 = await page.evaluate(() => S.nodes.length);
  await page.keyboard.press("1");
  expect(await page.evaluate(() => pendiente)).toBe("and");
  await expect(page.locator('.ptool[data-add="and"]')).toHaveClass(/\bon\b/);

  const pos = await page.evaluate(() => {
    const n = S.nodes.find((n) => n.type === "in");
    const r = document.getElementById("canvas").getBoundingClientRect();
    return {
      nx: r.left + S.pan.x + n.x * S.zoom,
      ny: r.top + S.pan.y + n.y * S.zoom,
      ex: r.left + r.width - 40,
      ey: r.top + r.height - 40,
    };
  });
  await page.mouse.click(pos.nx, pos.ny);
  expect(await page.evaluate(() => pendiente)).toBeNull();
  await expect(page.locator(".ptool.on")).toHaveCount(0);

  await page.mouse.click(pos.ex, pos.ey);
  expect(await page.evaluate(() => S.nodes.length)).toBe(n0);
});

test("dos clics rápidos en un reloj de pulso avanzan dos veces el contador y dejan el reloj en 0", async ({ page }) => {
  await page.evaluate(() => cargarEjemplo("cont"));
  const leerCuenta = () => page.evaluate(() => {
    const outs = S.nodes.filter((n) => n.type === "out").sort((a, b) => a.label.localeCompare(b.label));
    return outs.map((o) => valorDe(o.id, 0) ? 1 : 0);
  });
  expect(await leerCuenta()).toEqual([0, 0]);

  await page.evaluate(async () => {
    const clk = S.nodes.find((n) => n.type === "clk");
    pulso(clk);
    await new Promise((r) => setTimeout(r, 30));
    pulso(clk);
  });
  await expect.poll(async () => page.evaluate(() => S.nodes.find((n) => n.type === "clk").on)).toBe(false);
  // Q0 = bit menos significativo, Q1 = bit más significativo -> 2 en binario: Q0=0, Q1=1
  expect(await leerCuenta()).toEqual([0, 1]);

  await page.evaluate(() => undo());
  expect(await leerCuenta()).toEqual([1, 0]);
  expect(await page.evaluate(() => S.nodes.find((n) => n.type === "clk").on)).toBe(false);
});
