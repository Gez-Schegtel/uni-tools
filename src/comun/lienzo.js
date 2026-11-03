"use strict";
/* ======================= lienzo =======================
   Lo primero de las tres herramientas: el <svg> de la hoja, la vista que se mueve
   y se agranda adentro, y las utilidades de dibujo que usa todo lo demás. */
const NS = "http://www.w3.org/2000/svg";
const $ = (s) => document.querySelector(s);
const svg = $("#canvas"), viewport = $("#viewport");

/* Firefox: arrastrar sobre el SVG le arma al navegador una selección de texto y, al volver
   a apretar sobre ella, empieza un "arrastrar y soltar" nativo que cancela los eventos del
   puntero: la hoja queda trabada (ni Ctrl+clic ni la banda andan) hasta hacer clic en otro
   elemento. Se evita de raíz: el lienzo no es seleccionable ni arrastrable por el navegador,
   y si ya quedó una selección, se limpia al apretar. (El campo del doble clic es un <input>
   fuera del SVG y sigue siendo seleccionable.) */
svg.addEventListener("dragstart", ev => ev.preventDefault());
svg.addEventListener("selectstart", ev => ev.preventDefault());
svg.addEventListener("pointerdown", () => {
  const s = getSelection();
  if (s && s.rangeCount && !s.isCollapsed) s.removeAllRanges();
}, true);

/* Capturar el puntero es una ayuda para no perder el gesto, no un requisito: puede
   fallar (un dedo que ya se levantó, eventos sintéticos) y el gesto tiene que seguir
   igual, así que el error se ignora. */
function capturarPuntero(ev) {
  try { svg.setPointerCapture(ev.pointerId); } catch (e) {}
}

/* Crea un elemento SVG con sus atributos y, si se le pasa, lo cuelga del padre */
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
/* Redibujar por capas: render() vacía las capas y las vuelve a llenar, pero un elemento cuya
   firma (lo que define cómo se ve) no cambió reusa el <g> que ya tenía. Así, arrastrar un
   bloque no rearma los otros cuarenta. La firma la arma cada herramienta. */
const _dibujados = new Map();                        // capa -> Map(id -> { firma, g })
function dibujarReusando(capa, id, firma, dibujar) {
  let c = _dibujados.get(capa);
  if (!c) _dibujados.set(capa, c = new Map());
  const v = c.get(id);
  if (v && v.firma === firma) { capa.appendChild(v.g); v.vivo = true; return v.g; }
  dibujar(capa);
  const g = capa.lastChild;
  c.set(id, { firma, g, vivo: true });
  return g;
}
/* Al terminar de dibujar una capa: olvida lo que ya no está (si no, la caché crece) */
function cerrarReusando(capa) {
  const c = _dibujados.get(capa);
  if (!c) return;
  for (const [id, v] of c) { if (v.vivo) v.vivo = false; else c.delete(id); }
}
/* Texto para meter adentro de HTML (también en atributos entre comillas dobles) */
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
/* El aviso se puede cerrar con su cruz y se va solo pasado un rato: más tiempo
   cuanto más haya que leer (y un tope), que un mensaje largo no da para dos segundos */
function ocultarToast() {
  clearTimeout(toast._t);
  const t = $("#toast");
  if (t) t.classList.remove("show");
}
function toast(m, ms) {
  const t = $("#toast");
  if (!t.firstChild) {                             // el texto y la cruz se arman una sola vez
    const s = document.createElement("span"); s.className = "txt"; t.appendChild(s);
    const x = document.createElement("button");
    x.type = "button"; x.className = "x"; x.title = "Cerrar";
    x.setAttribute("aria-label", "Cerrar aviso");
    x.onclick = ocultarToast;
    t.appendChild(x);
  }
  t.firstChild.textContent = m;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(ocultarToast, ms || Math.min(7000, 1700 + 55 * String(m).length));
}
