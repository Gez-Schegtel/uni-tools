/* El ruteo de flechas de un diagrama de bloques (comun/ruteo-bloques.js), sin navegador. Lo usan
   el editor de bloques y la vista previa del equivalente en bloques del diagrama de señales.
   Uso desde la raíz del repo: node --test "tests/unidades/*.test.js" */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { cargar } = require("./cargar");

const ruteo = () => cargar("src/comun/puertos.js", "src/comun/ortogonal.js", "src/comun/ruteo-bloques.js");
const bloque = (id, x, y) => ({ id, type: "block", x, y, w: 60, h: 40 });
const ortogonal = (pts) => pts.every((p, i) => i === 0 || p.x === pts[i - 1].x || p.y === pts[i - 1].y);

test("una flecha sale y llega por sus puertos, en ángulo recto", () => {
  const m = ruteo();
  const nodes = [bloque("a", 0, 0), bloque("b", 300, 120)];
  const edges = [{ id: "e", from: { id: "a", port: "r" }, to: { id: "b", port: "l" } }];
  m.rutearFlechas(nodes, edges);
  const pts = edges[0].pts;
  assert.deepEqual([pts[0].x, pts[0].y], [30, 0]);                       // borde derecho de a
  assert.deepEqual([pts.at(-1).x, pts.at(-1).y], [270, 120]);            // borde izquierdo de b
  assert.ok(ortogonal(pts));
});

test("una flecha esquiva el bloque que tiene en el medio", () => {
  const m = ruteo();
  const nodes = [bloque("a", 0, 0), bloque("x", 200, 0), bloque("b", 400, 0)];
  const edges = [{ id: "e", from: { id: "a", port: "r" }, to: { id: "b", port: "l" } }];
  m.rutearFlechas(nodes, edges);
  const R = { l: 171, r: 229, t: -19, b: 19 };                            // el interior de x
  assert.ok(!m.segsOf(edges[0].pts).some(s => m.segRect(s, R)), "la flecha atraviesa el bloque del medio");
  assert.ok(ortogonal(edges[0].pts));
});

test("rutearFlechas no lee S: rutea los elementos que recibe", () => {
  const m = ruteo();
  m.S = { nodes: [], edges: [] };                                          // otro diagrama en S
  const nodes = [bloque("a", 0, 0), bloque("b", 0, 200)];
  const edges = [{ id: "e", from: { id: "a", port: "b" }, to: { id: "b", port: "t" } }];
  m.rutearFlechas(nodes, edges);
  assert.ok(edges[0].pts.length >= 2);
  assert.equal(m.S.edges.length, 0);
});
