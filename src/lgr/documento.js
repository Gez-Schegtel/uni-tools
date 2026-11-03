/* =====================================================================
   DOCUMENTO: lo que se guarda (en el navegador y en archivos), Abrir,
   Guardar, Inicio, la ayuda y los atajos de teclado
   El formato es el de las otras herramientas: el JSON lleva version y
   herramienta, el autoguardado va en uni-tools-autoguardado-lgr como
   { guardado, doc } y el SVG exportado trae el documento en
   <metadata id="uni-tools-datos">, así que se puede volver a abrir.
   ===================================================================== */
const VERSION_DOC_LGR = 1;
const CLAVE_AUTO_LGR = 'uni-tools-autoguardado-lgr', CLAVE_VIEJA_LGR = 'uni-tools-lgr';
const NOMBRE_ARCHIVO = 'lugar-de-raices';

const docDatos = () => ({ version: VERSION_DOC_LGR, herramienta: 'lgr',
  modo: S.modo, N: S.N, D: S.D, Z: S.Z, P: S.P, ver: Object.assign({}, S.ver) });

/* Lo que llega (del autoguardado o de un archivo) puede venir de otra versión o tocado a mano:
   sólo se toma lo que tiene la forma esperada. Devuelve false si no es un documento del LGR. */
function aplicarDoc(g) {
  if (!g || typeof g !== 'object' || Array.isArray(g)) return false;
  if (typeof g.herramienta === 'string' && g.herramienta !== 'lgr') return false;
  if (g.modo === 'ec' || g.modo === 'zp') S.modo = g.modo;
  ['N', 'D', 'Z', 'P'].forEach(k => { if (typeof g[k] === 'string') S[k] = g[k]; });
  if (g.ver && typeof g.ver === 'object') Object.keys(S.ver).forEach(k => { if (typeof g.ver[k] === 'boolean') S.ver[k] = g.ver[k]; });
  return true;
}

/* ---------- autoguardado: sólo después de que el usuario cambia algo ---------- */
let autoActivo = false;
function autoguardar() {
  if (!autoActivo) return;
  try { localStorage.setItem(CLAVE_AUTO_LGR, JSON.stringify({ guardado: Date.now(), doc: docDatos() })); } catch (e) {}
}
function recuperarAutoguardado() {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE_AUTO_LGR) || 'null');
    if (g && aplicarDoc(g.doc)) return true;
    // la clave de antes (el LGR guardaba S entero en uni-tools-lgr): se migra una vez
    const viejo = JSON.parse(localStorage.getItem(CLAVE_VIEJA_LGR) || 'null');
    if (viejo && aplicarDoc(viejo)) {
      localStorage.setItem(CLAVE_AUTO_LGR, JSON.stringify({ guardado: Date.now(), doc: docDatos() }));
      localStorage.removeItem(CLAVE_VIEJA_LGR);
      return true;
    }
  } catch (e) {}
  return false;
}
window.addEventListener('pagehide', autoguardar);

/* ---------- guardar y abrir archivos ---------- */
function descargar(nombre, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function guardarArchivo() {
  descargar(NOMBRE_ARCHIVO + '.json', new Blob([JSON.stringify(docDatos(), null, 1)], { type: 'application/json' }));
  toast('Guardado: ' + NOMBRE_ARCHIVO + '.json');
}
function abrirTextoLGR(txt) {
  const t = String(txt || '').trim();
  let d;
  try {
    if (t[0] === '{') d = JSON.parse(t);
    else if (t[0] === '<') {
      const x = new DOMParser().parseFromString(t, 'image/svg+xml');
      const m = x.querySelector('metadata#uni-tools-datos');
      if (!m) return toast('Ese SVG no trae los datos adentro: se exportó con una versión anterior');
      d = JSON.parse(m.textContent);
    } else throw new Error();
  } catch (e) { return toast('Ese archivo no se pudo leer'); }
  if (!d || d.herramienta !== 'lgr' && !(typeof d.modo === 'string' && ('N' in d || 'P' in d)))
    return toast('Ese archivo no es de Lugar de las raíces');
  aplicarDoc(d); pasarAInputs(); calcular(); autoguardar();
  toast('Abierto');
}
$('#a-abrir').onclick = () => $('#a-archivo').click();
$('#a-archivo').onchange = (ev) => {
  const f = ev.target.files[0];
  if (!f) return;
  f.text().then(abrirTextoLGR);
  ev.target.value = '';                           // para poder abrir el mismo archivo otra vez
};
$('#a-guardar').onclick = guardarArchivo;

/* ---------- Inicio: lo hecho queda en el autoguardado ---------- */
$('#b-inicio').addEventListener('click', ev => { ev.preventDefault(); autoguardar(); location.href = 'index.html'; });

/* ---------- ayuda y atajos ---------- */
const ayuda = (abrir) => $('#ov-help').classList.toggle('show', abrir);
$('#b-ayuda').onclick = () => ayuda(true);
$('#ov-help').addEventListener('click', ev => { if (ev.target.id === 'ov-help') ayuda(false); });
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') { ayuda(false); return; }
  const t = ev.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;   // se está escribiendo
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') { ev.preventDefault(); guardarArchivo(); return; }
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'o') { ev.preventDefault(); $('#a-archivo').click(); return; }
  if (ev.ctrlKey || ev.metaKey || ev.altKey || $('#ov-help').classList.contains('show') && ev.key !== '?') return;
  if (ev.key === '?') { ayuda(!$('#ov-help').classList.contains('show')); ev.preventDefault(); }
  else if (ev.key === 'f' || ev.key === 'F') { ajustarVista(); dibujar(); }
  else if (ev.key === '+' || ev.key === '=') zoomEn(1.3, stage.clientWidth / 2, stage.clientHeight / 2);
  else if (ev.key === '-') zoomEn(1 / 1.3, stage.clientWidth / 2, stage.clientHeight / 2);
  else if (ev.key === 'd' || ev.key === 'D') $('#b-det').click();
});
