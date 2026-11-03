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

test("rutear sólo algunas flechas deja las demás como estaban y las usa como ya puestas", () => {
  const m = ruteo();
  const nodes = [bloque("a", 0, 0), bloque("b", 300, 0), bloque("c", 0, 200), bloque("d", 300, 200)];
  const edges = [{ id: "e1", from: { id: "a", port: "r" }, to: { id: "b", port: "l" } },
                 { id: "e2", from: { id: "c", port: "r" }, to: { id: "d", port: "l" } }];
  m.rutearFlechas(nodes, edges);
  const antes = JSON.stringify(edges[0].pts);
  nodes[3].y = 260;                                          // se mueve d: sólo e2 cambia
  m.rutearFlechas(nodes, edges, new Set(["e2"]));
  assert.equal(JSON.stringify(edges[0].pts), antes);
  assert.equal(edges[1].pts.at(-1).y, 260);
});

test("cuando todos los candidatos fijos chocan, el rodeo esquiva: sale por la izquierda sin volver por encima del bloque", () => {
  // el destino queda arriba a la derecha y hay otro bloque arriba a la izquierda: el menú fijo
  // sólo ofrecía volver por encima del bloque de origen; el rodeo (A*) da la vuelta por afuera
  const m = ruteo();
  const nodes = [bloque("a", 240, 320), bloque("b", 400, 240), bloque("c", 160, 240)];
  const edges = [{ id: "e", from: { id: "a", port: "l" }, to: { id: "b", port: "t" } }];
  m.rutearFlechas(nodes, edges);
  const pts = edges[0].pts, segs = m.segsOf(pts);
  for (const n of nodes) {
    const R = m.rectOf(n);
    assert.ok(!segs.some(s => m.entraEn(s, n.id === "c" ? { l: R.l + 1, r: R.r - 1, t: R.t + 1, b: R.b - 1 } : R)), "la flecha pasa por encima de " + n.id);
  }
  assert.ok(ortogonal(pts));
  assert.deepEqual([pts[0].x, pts[0].y], [210, 320]);                    // sale por el puerto izquierdo
  assert.ok(pts[1].x < 210);                                             // hacia la izquierda, no hacia atrás
  assert.deepEqual([pts.at(-1).x, pts.at(-1).y], [400, 220]);            // llega al puerto de arriba
  assert.ok(pts.at(-2).x === 400 && pts.at(-2).y < 220);                 // y desde arriba
});
