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

for (const [archivo, clave] of HERRAMIENTAS) {
  test.describe(archivo, () => {
    for (const txt of MALOS) {
      test(`sobrevive a ${JSON.stringify(txt.slice(0, 50))}`, async ({ page }) => {
        const errores = await abrir(page, archivo);
        expect(await abrirTexto(page, txt)).toBeNull();
        expect(errores).toEqual([]);
        // y sigue funcionando: se puede volver a dibujar y deshacer
        await page.evaluate(() => { render(); undo(); render(); });
        expect(errores).toEqual([]);
        expect(await page.evaluate((k) => Array.isArray(S[k]), clave)).toBe(true);
      });
    }
  });
}

test("diagrama-bloque: descarta flechas colgadas y conserva lo válido", async ({ page }) => {
  await abrir(page, "diagrama-bloque.html");
  const doc = {
    nodes: [{ id: "a", type: "block", x: 100, y: 100, w: 72, h: 42, label: "G" }, null,
            { id: "b", type: "block", x: 300, y: 100, w: 72, h: 42, label: "H" }, { type: "inventado" }],
    edges: [{ id: "e1", from: { id: "a", port: "r" }, to: { id: "b", port: "l" }, variant: 0 },
            { id: "e2", from: { id: "a", port: "r" }, to: { id: "fantasma", port: "l" }, variant: 0 }],
  };
  await abrirTexto(page, JSON.stringify(doc));
  expect(await page.evaluate(() => [S.nodes.length, S.edges.length])).toEqual([2, 1]);
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
