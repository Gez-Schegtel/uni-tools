/* Un archivo mal armado (a mano, truncado, de otra herramienta) puede avisar que no
   sirve, pero nunca dejar la herramienta rota: después de abrirlo tiene que seguir
   dibujando y editando. */
const { test, expect } = require("@playwright/test");
const { abrir, abrirTexto } = require("./ayudas");

const MALOS = [
  "{", "hola", "{}", '{"nodes":5}', '{"nodes":[null]}', '{"nodes":[{}],"edges":[{}]}',
  '{"nodos":[null],"ramas":[{}]}', '{"nodos":[{"id":"a","x":1,"y":2}],"ramas":[{"de":"a","a":"nope"}]}',
  '{"nodes":[{"id":"a","type":"zzz","x":"q","y":null}],"edges":[{"id":"e","from":{"id":"a","port":"l"},"to":{"id":"zz","port":"r"}}]}',
  '{"nodes":[{"id":"n1","type":"and","x":1,"y":1}],"wires":[{"from":{"id":"n1","pin":"o0"},"to":{"id":"zz","pin":0}}]}',
  '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
  '{"nodes":[{"id":"__proto__","type":"constructor"}]}',
];

const HERRAMIENTAS = [
  ["diagrama-bloque.html", "nodes"],
  ["simulador-logico.html", "nodes"],
  ["diagrama-señales.html", "nodos"],
];
/* Los de MALOS que sí son un documento válido (mínimo) de esa herramienta: esos se abren */
const VALIDOS = {
  "simulador-logico.html": [MALOS[9]],
  "diagrama-señales.html": [MALOS[7]],
};

for (const [archivo, clave] of HERRAMIENTAS) {
  test.describe(archivo, () => {
    for (const txt of MALOS) {
      test(`sobrevive a ${JSON.stringify(txt.slice(0, 50))}`, async ({ page }) => {
        const errores = await abrir(page, archivo);
        const nAntes = await page.evaluate((k) => S[k].length, clave);
        expect(await abrirTexto(page, txt)).toBeNull();
        expect(errores).toEqual([]);
        // lo que no sirve no borra el diagrama que estaba en pantalla
        if (!(VALIDOS[archivo] || []).includes(txt))
          expect(await page.evaluate((k) => S[k].length, clave)).toBe(nAntes);
        // y sigue funcionando: se puede volver a dibujar y deshacer
        await page.evaluate(() => { render(); undo(); render(); });
        expect(errores).toEqual([]);
        expect(await page.evaluate((k) => Array.isArray(S[k]), clave)).toBe(true);
      });
    }
  });
}

test("diagrama-bloque: descarta flechas colgadas y conserva lo válido", async ({ page }) => {
  const errores = await abrir(page, "diagrama-bloque.html");
  const doc = {
    nodes: [{ id: "a", type: "block", x: 100, y: 100, w: 72, h: 42, label: "G" }, null,
            { id: "b", type: "block", x: 300, y: 100, w: 72, h: 42, label: "H" },
            { id: "m", type: "marco", x: 50, y: 50, w: 200, h: 120, label: "M" },
            { type: "inventado" }],
    edges: [{ id: "e1", from: { id: "a", port: "r" }, to: { id: "b", port: "l" }, variant: 0 },
            { id: "e2", from: { id: "a", port: "r" }, to: { id: "fantasma", port: "l" }, variant: 0 },
            { id: "e3", from: { id: "a", port: "zzz" }, to: { id: "b", port: "l" } },
            { id: "e4", from: { id: "a" }, to: { id: "b", port: "l" } },
            { id: "e5", from: { id: "m", port: "r" }, to: { id: "b", port: "l" } }],
  };
  await abrirTexto(page, JSON.stringify(doc));
  expect(errores).toEqual([]);
  expect(await page.evaluate(() => [S.nodes.length, S.edges.map((e) => e.id)])).toEqual([3, ["e1"]]);
});

test("simulador: descarta cables a patas que no existen y conserva lo válido", async ({ page }) => {
  await abrir(page, "simulador-logico.html");
  const doc = {
    nodes: [{ id: "i", type: "in", x: 0, y: 0, label: "A", on: true }, { id: "g", type: "not", x: 100, y: 0 },
            { id: "o", type: "out", x: 200, y: 0, label: "S" }],
    wires: [{ id: "w1", from: { id: "i", pin: "o0" }, to: { id: "g", pin: 0 } },
            { id: "w2", from: { id: "g", pin: "o0" }, to: { id: "o", pin: 0 } },
            { id: "w3", from: { id: "g", pin: "o0" }, to: { id: "o", pin: 7 } },     // pata inexistente
            { id: "w4", from: { id: "g", pin: "o5" }, to: { id: "o", pin: 0 } }],    // salida inexistente
  };
  await abrirTexto(page, JSON.stringify(doc));
  expect(await page.evaluate(() => S.wires.map((w) => w.id))).toEqual(["w1", "w2"]);
});

/* Un archivo armado a propósito (colores, números o ids con HTML adentro) no puede ejecutar código
   al abrirlo, ni al seleccionar sus elementos, ni al mirar el panel. */
const TRAMPA = '"><img src=x onerror="window.__ejecutado=true">';
const DOCS = {
  "diagrama-bloque.html": {
    nodes: [{ id: TRAMPA, type: "block", x: 100, y: 100, w: 72, h: 42, label: "G", font: 15, color: { relleno: TRAMPA } },
            { id: "a", type: "block", x: 100, y: 100, w: 72, h: 42, label: "G", font: TRAMPA, color: { relleno: TRAMPA, borde: TRAMPA, texto: TRAMPA } },
            { id: "m", type: "marco", x: 300, y: 300, w: 200, h: 120, label: "M", font: 12, grosor: TRAMPA, radio: TRAMPA, trazo: "dashed", relleno: "no" },
            { id: "b", type: "block", x: 300, y: 100, w: 72, h: 42, label: "H", font: 15 }],
    edges: [{ id: "e", from: { id: "a", port: "r" }, to: { id: "b", port: "l" }, variant: 0, width: TRAMPA, color: { flecha: TRAMPA } }],
    tema: { borde: TRAMPA, relleno: "#abcdef" },
  },
  "simulador-logico.html": {
    nodes: [{ id: TRAMPA, type: "in", x: 100, y: 100, label: "A", on: false },
            { id: "m", type: "marco", x: 300, y: 300, w: 200, h: 120, label: "M", font: TRAMPA, grosor: TRAMPA, radio: TRAMPA, trazo: "dashed", relleno: "no" },
            { id: "g", type: "not", x: 200, y: 100, color: { borde: TRAMPA } }],
    wires: [{ id: "w", from: { id: "g", pin: "o0" }, to: { id: "g", pin: 0 }, color: { cable: TRAMPA } }],
    tema: { cable: TRAMPA, activo: "#00aa00" },
  },
  "diagrama-señales.html": {
    nodos: [{ id: TRAMPA, nombre: "x", x: 0, y: 0, tipo: "entrada" }, { id: "b", nombre: "y", x: 200, y: 0, tipo: "salida" }],
    ramas: [{ id: "r", de: "b", a: "b", g: "G", curva: 46 }],
  },
};
for (const [archivo, doc] of Object.entries(DOCS)) {
  test(`${archivo}: un archivo con HTML escondido en colores, números o ids no ejecuta nada`, async ({ page }) => {
    const errores = await abrir(page, archivo);
    expect(await abrirTexto(page, JSON.stringify(doc))).toBeNull();
    await page.evaluate(() => {
      const k = S.nodes ? "nodes" : "nodos";
      for (const n of S[k]) { S.sel = [n.id]; render(); }
      const u = S.edges ? "edges" : S.wires ? "wires" : "ramas";
      const selU = S.selEdges ? "selEdges" : S.selW ? "selW" : "selR";
      for (const c of S[u]) { S.sel = []; S[selU] = [c.id]; render(); }
      S.sel = []; S[selU] = []; render();
      if (typeof mostrarTabla === "function") mostrarTabla();
      if (typeof mostrarMason === "function") mostrarMason();
    });
    expect(await page.evaluate(() => window.__ejecutado === true)).toBe(false);
    // y lo válido se conserva
    if (doc.tema) expect(await page.evaluate(() => Object.values(S.tema).every((c) => /^#[0-9a-f]{3,8}$/i.test(c)))).toBe(true);
    expect(await page.evaluate(() => (S.nodes || S.nodos).every((n) => /^[A-Za-z0-9_-]+$/.test(n.id)))).toBe(true);
    expect(errores).toEqual([]);
  });
}

/* Un color corto (#123) es válido en CSS pero el selector de color sólo acepta #rrggbb: el panel lo
   muestra expandido. Uno de 5 cifras no es un color: se descarta y queda el de siempre. */
for (const archivo of ["diagrama-bloque.html", "simulador-logico.html"]) {
  test(`${archivo}: colores cortos se muestran bien y los inválidos se descartan`, async ({ page }) => {
    const errores = await abrir(page, archivo);
    await page.evaluate(() => {
      const d = JSON.parse(JSON.stringify(docDatos()));
      d.tema = { borde: "#123", relleno: "#12345", texto: "#ff000080" };
      abrirTexto(JSON.stringify(d), "colores.json"); S.sel = []; render();
    });
    const t = await page.evaluate(() => [S.tema.borde, S.tema.relleno, S.tema.texto,
      document.getElementById("t-borde").value, document.getElementById("t-texto").value]);
    expect(t).toEqual(["#123", "#ffffff", "#ff000080", "#112233", "#ff0000"]);
    expect(errores).toEqual([]);
  });
}

/* Un documento de otra herramienta (nuevo, con su campo herramienta, o viejo, sin él) se rechaza
   sin tocar el diagrama, el historial ni el autoguardado. */
test.describe("abrir un documento de otra herramienta", () => {
  const exportar = async (page, archivo) => {
    await abrir(page, archivo);
    return page.evaluate(() => ({
      json: JSON.stringify(docDatos()),
      viejo: JSON.stringify(Object.assign(docDatos(), { herramienta: undefined })),
      svg: new XMLSerializer().serializeToString(buildExportSVG().svg),
    }));
  };
  const PARES = [["diagrama-bloque.html", "simulador-logico.html"], ["simulador-logico.html", "diagrama-bloque.html"],
                 ["diagrama-señales.html", "diagrama-bloque.html"], ["diagrama-bloque.html", "diagrama-señales.html"]];
  for (const [origen, destino] of PARES) {
    test(`${origen} en ${destino}: avisa que no sirve y no toca el diagrama actual`, async ({ page }) => {
      const docs = await exportar(page, origen);
      const errores = await abrir(page, destino);
      await page.evaluate(() => commit());
      const antes = await page.evaluate(() => ({ doc: JSON.stringify(docDatos()), pila: undoStack.length,
        guardado: localStorage.getItem("uni-tools-autoguardado-" + HERRAMIENTA.clave) }));
      for (const txt of [docs.json, docs.viejo, docs.svg]) {
        await page.evaluate(() => { const t = document.querySelector("#toast .txt"); if (t) t.textContent = ""; });
        expect(await abrirTexto(page, txt)).toBeNull();
        await expect(page.locator("#toast")).toContainText(await page.evaluate(() => HERRAMIENTA.textos.noEsDoc));
        expect(await page.evaluate(() => ({ doc: JSON.stringify(docDatos()), pila: undoStack.length,
          guardado: localStorage.getItem("uni-tools-autoguardado-" + HERRAMIENTA.clave) }))).toEqual(antes);
      }
      expect(errores).toEqual([]);
    });
  }
  test("el equivalente en bloques de diagrama-señales sí se abre en diagrama-bloque", async ({ page }) => {
    await abrir(page, "diagrama-señales.html");
    const json = await page.evaluate(() => JSON.stringify(equivalenteEnBloques()));
    const errores = await abrir(page, "diagrama-bloque.html");
    await page.evaluate(() => { S.nodes = []; S.edges = []; render(); });
    expect(await abrirTexto(page, json)).toBeNull();
    expect(await page.evaluate(() => S.nodes.length)).toBeGreaterThan(0);
    expect(errores).toEqual([]);
  });
});

test("diagrama-señales: normaliza tipos de nodo ausentes, inválidos o duplicados al abrir", async ({ page }) => {
  const errores = await abrir(page, "diagrama-señales.html");
  const doc = {
    nodos: [
      { id: "n1", nombre: "x1", x: 100, y: 100 },
      { id: "n2", nombre: "x2", x: 200, y: 100, tipo: "cualquiera" },
      { id: "n3", nombre: "x3", x: 300, y: 100, tipo: "entrada" },
      { id: "n4", nombre: "x4", x: 400, y: 100, tipo: "entrada" },
      { id: "n5", nombre: "x5", x: 500, y: 100, tipo: "salida" },
      { id: "n6", nombre: "x6", x: 600, y: 100, tipo: "salida" },
    ],
    ramas: [],
  };
  await abrirTexto(page, JSON.stringify(doc));
  expect(errores).toEqual([]);
  expect(await page.evaluate(() => S.nodos.map((n) => n.tipo))).toEqual([
    "normal", "normal", "entrada", "normal", "salida", "normal",
  ]);
  await expect(page.locator(".n-rol")).toHaveCount(2);
});
