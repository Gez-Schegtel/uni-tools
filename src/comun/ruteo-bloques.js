/* ======================= ruteo de las flechas de un diagrama de bloques =======================
   Lo usan el editor de bloques y la vista previa del equivalente en bloques del diagrama de
   señales, así que las flechas salen iguales en los dos. rutearFlechas() recibe los
   elementos y las flechas (no lee S); DIRS y portPoint() están en comun/puertos.js. */
function rectOf(n) {
  const w = n.type === "node" ? 12 : n.w, h = n.type === "node" ? 12 : n.h;
  return { l: n.x - w / 2, r: n.x + w / 2, t: n.y - h / 2, b: n.y + h / 2, w, h, cx: n.x, cy: n.y };
}
function puntoEnMarco(p, n) {
  const R = rectOf(n);
  return p.x >= R.l && p.x <= R.r && p.y >= R.t && p.y <= R.b;
}
const dirOf = (p) => DIRS[p];

/* ======================= flechas ======================= */
// Dos flechas que salen del mismo punto (o entran al mismo) comparten tronco: se premia
// que viajen juntas en vez de abrirse en canales paralelos.
function sonHermanas(a, b) { return a.from === b.from || a.to === b.to; }
function candidates(A, dA, B, dB, near, all) {
  const stub = 20;
  const a = { x: A.x + dA.x * stub, y: A.y + dA.y * stub };
  const b = { x: B.x + dB.x * stub, y: B.y + dB.y * stub };
  const out = [];
  const push = (mids) => out.push(cleanPts([A, a].concat(mids, [b, B])));
  const hA = dA.x !== 0, hB = dB.x !== 0;
  const offs = [0, 20, -20, 40, -40, 70, -70, 110, -110, 160, -160];

  if (hA && hB) {
    for (const o of offs) {
      const mx = (a.x + b.x) / 2 + o;
      if (Math.abs(a.y - b.y) < .5 && o === 0) push([]);
      else push([{ x: mx, y: a.y }, { x: mx, y: b.y }]);
    }
    const ys = [near.t - 34, near.b + 34, all.t - 34, all.b + 34, (a.y + b.y) / 2];
    for (const base of ys) for (const o of [0, 22, -22, 44, -44, 66, -66])
      push([{ x: a.x, y: base + o }, { x: b.x, y: base + o }]);
  } else if (!hA && !hB) {
    for (const o of offs) {
      const my = (a.y + b.y) / 2 + o;
      if (Math.abs(a.x - b.x) < .5 && o === 0) push([]);
      else push([{ x: a.x, y: my }, { x: b.x, y: my }]);
    }
    const xs = [near.l - 34, near.r + 34, all.l - 34, all.r + 34, (a.x + b.x) / 2];
    for (const base of xs) for (const o of [0, 22, -22, 44, -44])
      push([{ x: base + o, y: a.y }, { x: base + o, y: b.y }]);
  } else {
    push([{ x: b.x, y: a.y }]);
    push([{ x: a.x, y: b.y }]);
    for (const o of offs) {
      if (hA) { const mx = (a.x + b.x) / 2 + o; push([{ x: mx, y: a.y }, { x: mx, y: b.y }]); }
      else { const my = (a.y + b.y) / 2 + o; push([{ x: a.x, y: my }, { x: b.x, y: my }]); }
    }
    const ys = [near.t - 34, near.b + 34, all.b + 34, all.t - 34];
    const xs = [near.l - 34, near.r + 34, all.l - 34, all.r + 34];
    if (hA) for (const y of ys) push([{ x: a.x, y }, { x: b.x, y }]);
    else for (const x of xs) push([{ x, y: a.y }, { x, y: b.y }]);
  }
  return out;
}
/* ---- ruta manual ----
   Una ruta ortogonal es una sucesión de tramos que alternan horizontal y vertical. Cada tramo
   vive sobre una "línea": la y de uno horizontal, la x de uno vertical. La primera línea la fija
   el puerto de salida, la última el de llegada, y las del medio se pueden elegir a mano.
   Una flecha corrida a mano guarda sólo esas líneas del medio en e.manual.c (coordenadas
   absolutas, de afuera hacia adentro); el resto sale de dónde estén los puertos. Así la ruta
   sigue siendo válida aunque se muevan los bloques. */
const TRAMO_MIN = 12;                           // lo que tiene que sobresalir el tramo pegado a un puerto
const TRAMO_PUNTA = 20;                         // lo que sale un tramo nuevo antes de doblar
const puertoHoriz = (port) => dirOf(port).x !== 0;     // ¿el tramo pegado a este puerto es horizontal?
// ¿el tramo i de la ruta es horizontal? Se deduce por la paridad y no de los puntos, que pueden coincidir
const tramoHoriz = (e, i) => puertoHoriz(e.from.port) === (i % 2 === 0);
// una flecha corrida a mano tiene que terminar con el tramo del puerto de llegada en la orientación que corresponde
function manualValida(e) {
  const c = e.manual && e.manual.c;
  if (!Array.isArray(c) || !c.length || c.some(v => typeof v !== "number" || !isFinite(v))) return false;
  return tramoHoriz(e, c.length + 1) === puertoHoriz(e.to.port);
}
// las líneas del medio no pueden hacer que el tramo pegado a un puerto salga para atrás
function acotarLinea(e, c, j, k, A, B) {
  const horiz = tramoHoriz(e, j + 1);             // la línea j+1 de la ruta (la 0 es la del puerto)
  const eje = horiz ? "y" : "x";
  const lado = (P, port) => {
    const d = dirOf(port)[eje];
    if (!d) return;
    const min = P[eje] + d * TRAMO_MIN;
    c = d > 0 ? Math.max(c, min) : Math.min(c, min);
  };
  if (j === 0) lado(A, e.from.port);
  if (j === k - 1) lado(B, e.to.port);
  return c;
}
function aplicarManual(e, A, B) {
  if (!manualValida(e)) return null;
  const k = e.manual.c.length;
  const lineas = e.manual.c.map((v, j) => acotarLinea(e, v, j, k, A, B));
  if (k === 1) {                                  // un solo tramo del medio: tiene que servir a los dos puertos
    const eje = tramoHoriz(e, 1) ? "y" : "x";
    const ok = (P, port) => (lineas[0] - P[eje]) * dirOf(port)[eje] >= TRAMO_MIN - .01;
    if (!ok(A, e.from.port) || !ok(B, e.to.port)) return null;
  }
  const todas = [puertoHoriz(e.from.port) ? A.y : A.x].concat(lineas,
    [tramoHoriz(e, k + 1) ? B.y : B.x]);
  const pts = [{ x: A.x, y: A.y }];
  for (let j = 1; j < todas.length; j++) {        // el punto j es donde se cruzan las líneas j-1 y j
    pts.push(tramoHoriz(e, j) ? { x: todas[j - 1], y: todas[j] }    // la j horizontal aporta la y
                              : { x: todas[j], y: todas[j - 1] });
  }
  pts.push({ x: B.x, y: B.y });
  return pts;
}
// vuelve a la ruta automática (también a la alternativa 0): lo que se hace cuando cambian los puertos o se reacomoda todo
function rutaAuto(e) { e.variant = 0; delete e.manual; }
/* soloEstas (un Set de ids, opcional): rutea sólo esas flechas y deja las demás como están,
   usándolas como ya puestas. Es lo que se hace mientras se arrastra (ver rutearAfectadas). */
function rutearFlechas(nodes, edges, soloEstas) {
  const placed = [];
  if (soloEstas) for (const e of edges)
    if (!soloEstas.has(e.id) && e.pts) for (const sg of segsOf(e.pts)) placed.push({ seg: sg, keys: { from: e.from.id + ":" + e.from.port, to: e.to.id + ":" + e.to.port } });
  const porId = new Map(nodes.map(n => [n.id, n]));
  let all = { l: 0, t: 0, r: 400, b: 300 };
  if (nodes.length) {
    all = { l: 1e9, t: 1e9, r: -1e9, b: -1e9 };
    for (const n of nodes) { const R = rectOf(n); all.l = Math.min(all.l, R.l); all.t = Math.min(all.t, R.t); all.r = Math.max(all.r, R.r); all.b = Math.max(all.b, R.b); }
  }
  for (const e of edges) {
    if (soloEstas && !soloEstas.has(e.id)) continue;
    const from = porId.get(e.from.id), to = porId.get(e.to.id);
    if (!from || !to) { e.pts = null; continue; }
    const A = portPoint(from, e.from.port), B = portPoint(to, e.to.port);
    const dA = dirOf(e.from.port), dB = dirOf(e.to.port);
    const Rf = rectOf(from), Rt = rectOf(to);
    const near = { l: Math.min(Rf.l, Rt.l), r: Math.max(Rf.r, Rt.r), t: Math.min(Rf.t, Rt.t), b: Math.max(Rf.b, Rt.b) };
    const keys = { from: e.from.id + ":" + e.from.port, to: e.to.id + ":" + e.to.port };
    const cands = candidates(A, dA, B, dB, near, all);
    /* Un obstáculo que no toca la caja de todos los candidatos no puede tocar ningún tramo
       (segRect es una prueba de cajas), así que se descarta antes: mismo resultado, y con
       muchos bloques cada flecha mira sólo los de su zona. */
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const c of cands) for (const q of c) { if (q.x < x1) x1 = q.x; if (q.x > x2) x2 = q.x; if (q.y < y1) y1 = q.y; if (q.y > y2) y2 = q.y; }
    const obstacles = nodes.filter(n => n.id !== from.id && n.id !== to.id &&
                                     n.type !== "node" && n.type !== "text" && n.type !== "marco")
                             .map(n => agrandar(rectOf(n), 9))
                             .filter(R => !(x2 < R.l || x1 > R.r || y2 < R.t || y1 > R.b));
    const propios = [from, to].filter(n => n.type !== "node").map(rectOf);
    e.pts = aplicarManual(e, A, B) || variante(rutasPorPuntaje(cands, obstacles, placed, keys, 12, propios), e.variant);
    for (const sg of segsOf(e.pts)) placed.push({ seg: sg, keys });
  }
}
/* routeAll() no vuelve a rutear si no cambió nada de lo que define las rutas: dónde está y
   cuánto mide cada elemento, y de qué puerto a qué puerto va cada flecha (con su variante y
   su ruta a mano). Seleccionar, escribir en el panel o abrir un menú ya no rehace todas las
   rutas. Si alguna flecha perdió sus puntos (deshacer, pegar, abrir), se rutea igual. */
let _firmaRuteo = null;
function firmaDeRuteo() {
  let f = "";
  for (const n of S.nodes) f += n.id + "," + n.type + "," + n.x + "," + n.y + "," + n.w + "," + n.h + ";";
  f += "|";
  for (const e of S.edges) f += e.id + "," + e.from.id + "," + e.from.port + "," + e.to.id + "," + e.to.port + "," + (e.variant || 0) + "," + (e.manual ? JSON.stringify(e.manual) : "") + ";";
  return f;
}
function routeAll() {
  const f = firmaDeRuteo();
  if (f === _firmaRuteo && S.edges.every(e => e.pts !== undefined)) return;
  rutearFlechas(S.nodes, S.edges);
  _firmaRuteo = f;
}
/* Mientras se arrastra: sólo las flechas de lo que se mueve y las que pasan cerca (por donde
   estaba o por donde está ahora). Las demás quedan como estaban. Al soltar, el render()
   completo rutea todo como siempre, así que el resultado final es el mismo. */
function rutearAfectadas(idsMovidos, cajasAntes) {
  const movidos = S.nodes.filter(n => idsMovidos.has(n.id));
  const cajas = (cajasAntes || []).concat(movidos.map(n => agrandar(rectOf(n), 12)));
  const afectadas = new Set(S.edges.filter(e => idsMovidos.has(e.from.id) || idsMovidos.has(e.to.id) ||
    !e.pts || segsOf(e.pts).some(sg => cajas.some(R => segRect(sg, R)))).map(e => e.id));
  rutearFlechas(S.nodes, S.edges, afectadas);
  _firmaRuteo = null;                               // la próxima vez completo
}
// Donde una flecha se desprende del tronco que comparte con su hermana va un punto de unión.
const junctionDots = () => puntosDeUnion(S.edges,
  (a, b) => a.from.id === b.from.id || a.to.id === b.to.id,   // sólo hermanas
  (a, p) => p);
