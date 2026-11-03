/* ======================= recuadros =======================
   Sirven para encuadrar un grupo y ponerle nombre: no se cablean, no desvían las
   conexiones y no simulan nada. Pueden ir adelante o atrás (capa gAtras). */
const esMarco = (n) => !!n && n.type === "marco";
const TRAZOS = { solid: "Continuo", dashed: "Rayado", dotted: "Punteado" };
const RELLENOS = { no: "Sin relleno", suave: "Suave (color del trazo)", solido: "Sólido (color de fondo)" };
/* Los valores por defecto de un recuadro nuevo */
function completarMarco(n) {
  if (!Object.prototype.hasOwnProperty.call(TRAZOS, n.trazo)) n.trazo = "dashed";
  n.grosor = n.grosor || 1.4;
  if (!Object.prototype.hasOwnProperty.call(RELLENOS, n.relleno)) n.relleno = "no";
  n.atras = !!n.atras;                 // arranca adelante: sin relleno no tapa nada
  n.radio = n.radio === undefined ? 6 : n.radio;
}
/* El rayado se escala con el grosor para que no se empaste en trazos gruesos */
function guiones(n) {
  const g = Math.max(0.6, n.grosor || 1.4);
  return n.trazo === "dashed" ? `${g * 5} ${g * 3.6}`
       : n.trazo === "dotted" ? `${g} ${g * 2.6}` : "";
}
/* Con agarrable, un borde ancho e invisible para tomarlo aunque no tenga relleno */
function dibujarMarco(g, n, agarrable) {
  if (agarrable) el("rect", { class: "m-hit", x: -n.w / 2, y: -n.h / 2, width: n.w, height: n.h, rx: n.radio }, g);
  el("rect", { class: "m-shape" + (n.relleno === "solido" ? " solido" : n.relleno === "suave" ? " suave" : ""),
    x: -n.w / 2, y: -n.h / 2, width: n.w, height: n.h, rx: n.radio,
    "stroke-width": n.grosor, "stroke-dasharray": guiones(n) }, g);
  if (n.label)
    el("text", { class: "m-label", x: -n.w / 2 + 9, y: -n.h / 2 + n.font, "font-size": n.font }, g)
      .textContent = n.label;
}
/* Tiradores de tamaño sobre la caja R de n (l, t, r, b, cx, cy), en la capa gOv. Las cuatro
   esquinas siempre; con conLados, también los cuatro lados y el asa de arriba a la izquierda
   para moverlo (es lo de los recuadros: bloques y sumadores tienen los lados ocupados por los
   puertos). sal corre los cuadritos hacia afuera para que no tapen la caja de selección. */
function dibujarTiradores(n, R, conLados, sal) {
  const tiradores = [
    { dir: "nw", x: R.l, y: R.t }, { dir: "ne", x: R.r, y: R.t },
    { dir: "se", x: R.r, y: R.b }, { dir: "sw", x: R.l, y: R.b }
  ];
  if (conLados) {
    tiradores.push({ dir: "n", x: R.cx, y: R.t }, { dir: "s", x: R.cx, y: R.b },
                   { dir: "w", x: R.l, y: R.cy }, { dir: "e", x: R.r, y: R.cy });
    const gx = R.l + 10, gy = R.t - 24;          // asa, por fuera del recuadro
    const g = el("g", { class: "m-grip-wrap", "data-nid": n.id }, gOv);
    el("rect", { class: "m-grip", x: gx, y: gy, width: 26, height: 18, rx: 4 }, g);
    el("path", { class: "m-grip-ico", d: `M ${gx + 13} ${gy + 4} V ${gy + 14} M ${gx + 8} ${gy + 9} H ${gx + 18}
      M ${gx + 13} ${gy + 4} l -2 2 M ${gx + 13} ${gy + 4} l 2 2 M ${gx + 13} ${gy + 14} l -2 -2 M ${gx + 13} ${gy + 14} l 2 -2
      M ${gx + 8} ${gy + 9} l 2 -2 M ${gx + 8} ${gy + 9} l 2 2 M ${gx + 18} ${gy + 9} l -2 -2 M ${gx + 18} ${gy + 9} l -2 2` }, g);
  }
  for (const c of tiradores) {
    const x = c.x + (c.dir.includes("e") ? sal : c.dir.includes("w") ? -sal : 0);
    const y = c.y + (c.dir.includes("s") ? sal : c.dir.includes("n") ? -sal : 0);
    const g = el("g", { class: "m-handle-wrap", "data-handle": c.dir, "data-nid": n.id }, gOv);
    el("rect", { x: x - 9, y: y - 9, width: 18, height: 18, fill: "transparent" }, g);
    el("rect", { class: "m-handle", x: x - 5, y: y - 5, width: 10, height: 10, rx: 2 }, g);
  }
}
/* Estira un recuadro desde su tamaño original o (x, y, w, h) con el tirador dir hasta el
   punto w de la hoja, sin dejarlo más chico que 20 × 20 y ajustado a la grilla. */
function estirarMarco(n, o, dir, w) {
  const MIN = 20;
  let l = o.x - o.w / 2, r = o.x + o.w / 2, t = o.y - o.h / 2, b = o.y + o.h / 2;
  if (dir.includes("w")) l = Math.min(snapV(w.x), r - MIN);
  if (dir.includes("e")) r = Math.max(snapV(w.x), l + MIN);
  if (dir.includes("n")) t = Math.min(snapV(w.y), b - MIN);
  if (dir.includes("s")) b = Math.max(snapV(w.y), t + MIN);
  n.w = r - l; n.h = b - t; n.x = l + n.w / 2; n.y = t + n.h / 2;
}
/* La vista previa del recuadro mientras se lo dibuja arrastrando en diagonal */
function dibujarRecuadroNuevo(d) {
  const l = Math.min(d.start.x, d.cur.x), t = Math.min(d.start.y, d.cur.y);
  el("rect", { class: "m-shape",
    style: "stroke:var(--accent);stroke-dasharray:4 3;stroke-width:1.5;fill:rgba(13,91,214,.06)",
    x: l, y: t, width: Math.abs(d.cur.x - d.start.x), height: Math.abs(d.cur.y - d.start.y), rx: 6 }, gOv);
}
/* Mientras se lo dibuja: true si cambió (hay que redibujar) */
function moverRecuadroNuevo(d, w) {
  const cx = snapV(w.x), cy = snapV(w.y);
  if (cx === d.cur.x && cy === d.cur.y) return false;
  d.cur = { x: cx, y: cy };
  if (Math.abs(cx - d.start.x) > 3 || Math.abs(cy - d.start.y) > 3) d.moved = true;
  return true;
}
/* Al soltar: el recuadro con el tamaño arrastrado, o null si fue un clic (va el de siempre) */
function recuadroArrastrado(d) {
  const dw = Math.abs(d.cur.x - d.start.x), dh = Math.abs(d.cur.y - d.start.y);
  if (!d.moved || (dw < 10 && dh < 10)) return null;
  const w = Math.max(20, dw), h = Math.max(20, dh);
  return { x: Math.min(d.start.x, d.cur.x) + w / 2, y: Math.min(d.start.y, d.cur.y) + h / 2, w, h };
}
/* Las filas del panel que comparten todos los recuadros; "los elementos" o "las compuertas" */
function filasRecuadro(n, cuales) {
  return `
        <div class="row"><label>Línea</label><div class="fill"><select id="m-trazo">${opciones(TRAZOS, n.trazo)}</select></div></div>
        <div class="row"><label>Grosor</label><div class="fill"><input type="number" id="m-grosor" step="0.2" min="0.4" max="8" value="${n.grosor}"></div></div>
        <div class="row"><label>Relleno</label><div class="fill"><select id="m-relleno">${opciones(RELLENOS, n.relleno)}</select></div></div>
        <div class="row"><label>Orden</label><div class="fill"><select id="m-orden">
          <option value="0"${n.atras ? "" : " selected"}>Adelante de ${cuales}</option>
          <option value="1"${n.atras ? " selected" : ""}>Atrás de ${cuales}</option></select></div></div>
        <div class="row"><label>Esquinas</label><div class="fill"><input type="number" id="m-radio" step="1" min="0" max="40" value="${n.radio}"></div></div>`;
}
function wireRecuadro(nsel) {
  const elegir = (id, fn) => {
    const e = document.getElementById(id);
    if (e) e.onchange = () => { nsel.forEach(n => fn(n, e.value)); commit(); render(); };
  };
  elegir("m-trazo", (n, v) => n.trazo = v);
  elegir("m-relleno", (n, v) => n.relleno = v);
  elegir("m-orden", (n, v) => n.atras = v === "1");
  enVivo("m-grosor", v => nsel.forEach(n => n.grosor = Math.min(8, Math.max(0.4, +v || 1.4))));
  enVivo("m-radio", v => nsel.forEach(n => n.radio = Math.min(40, Math.max(0, +v || 0))));
}
