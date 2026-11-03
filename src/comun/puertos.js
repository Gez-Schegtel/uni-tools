/* ======================= puertos de los bloques =======================
   Hacia dónde sale cada lado de un elemento y en qué punto está su puerto. Lo usan el
   editor de bloques (ruteo y dibujo) y el equivalente en bloques del diagrama de señales,
   que antes tenía su propia copia (DIRP y puntoPuerto). */
const DIRS = { l: { x: -1, y: 0 }, r: { x: 1, y: 0 }, t: { x: 0, y: -1 }, b: { x: 0, y: 1 } };
/* El punto del puerto: el medio de ese lado (una bifurcación es un punto, así que su centro) */
function portPoint(n, port) {
  if (n.type === "node") return { x: n.x, y: n.y };
  const d = DIRS[port] || DIRS.b;
  return { x: n.x + d.x * n.w / 2, y: n.y + d.y * n.h / 2 };
}
