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

/* Crea un elemento SVG con sus atributos y, si se le pasa, lo cuelga del padre */
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
/* Texto para meter adentro de HTML (también en atributos entre comillas dobles) */
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function toast(m) {
  const t = $("#toast"); t.textContent = m; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 1900);
}
