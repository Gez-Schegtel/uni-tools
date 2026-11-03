/* ======================= modo oscuro =======================
   El botón de la luna (en claro) o el sol (en oscuro) cambia el tema; la elección se
   recuerda en este navegador (uni-tools-tema, la misma para todas las páginas, también la
   portada) y se pasa a las otras pestañas abiertas. Sin elección guardada, claro.
   Sólo cambia la interfaz: el dibujo se ve invertido por CSS (comun/tema.css), así que el
   documento y lo que se exporta son iguales en los dos temas. Es el primer módulo del script
   para que el tema se ponga antes de que se dibuje nada. */
const CLAVE_TEMA = "uni-tools-tema";
function temaGuardado() {
  try { return localStorage.getItem(CLAVE_TEMA) === "oscuro" ? "oscuro" : "claro"; } catch (e) { return "claro"; }
}
function ponerTema(t) {
  document.documentElement.dataset.tema = t;
  const b = document.getElementById("b-tema");
  if (!b) return;
  b.title = t === "oscuro" ? "Pasar a modo claro" : "Pasar a modo oscuro";
  b.setAttribute("aria-label", b.title);
  b.setAttribute("aria-pressed", String(t === "oscuro"));
}
ponerTema(temaGuardado());
document.getElementById("b-tema").addEventListener("click", () => {
  const t = document.documentElement.dataset.tema === "oscuro" ? "claro" : "oscuro";
  try { localStorage.setItem(CLAVE_TEMA, t); } catch (e) {}
  ponerTema(t);
});
window.addEventListener("storage", ev => { if (ev.key === CLAVE_TEMA) ponerTema(temaGuardado()); });
