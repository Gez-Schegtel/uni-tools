/* =====================================================================
   ESTADO: lo que ingresó el usuario (S), el resultado del análisis, la
   vista del gráfico y el cálculo que arma todo lo demás
   ===================================================================== */
const $ = id => document.getElementById(id);
const svg = $('canvas'), stage = $('stage');
let S = { modo: 'ec', N: 's+4,5', D: 's(s^2+6s+45)', Z: '', P: '', ver: { asint: true, vals: true, flechas: true, grid: true } };
let resultado = null;           // resultado del análisis
let ramas = [];          // ramas del LGR
let vista = { cx: -2, cy: 0, k: 40 };
const COLORES = ['#0d5bd6', '#e07a10', '#1a9a4b', '#8e44ad', '#c0392b', '#12a3a3', '#8d6e3f', '#d6459c', '#5c6bc0', '#7f8c8d'];

function guardar() { try { localStorage.setItem('uni-tools-lgr', JSON.stringify(S)); } catch (e) {} }
function cargar() {
  try {
    const g = JSON.parse(localStorage.getItem('uni-tools-lgr') || 'null');
    if (!g || typeof g !== 'object' || Array.isArray(g)) return;
    /* lo guardado puede venir de otra versión o tocado a mano: sólo se toma lo que tiene la forma esperada */
    if (g.modo === 'ec' || g.modo === 'zp') S.modo = g.modo;
    ['N', 'D', 'Z', 'P'].forEach(k => { if (typeof g[k] === 'string') S[k] = g[k]; });
    if (g.ver && typeof g.ver === 'object') Object.keys(S.ver).forEach(k => { if (typeof g.ver[k] === 'boolean') S.ver[k] = g.ver[k]; });
  } catch (e) {}
}

/* El trazado de las ramas corre por tandas de ~12 ms y se dibuja lo que va cada 150 ms (dibujar
   y pintar miles de puntos en cada cuadro cuesta más que seguir las ramas). Si mientras tanto
   cambia la entrada, el trazado viejo se abandona. */
let trazadoEnCurso = null;
function empezarTrazado() {
  const t = crearTrazado(resultado), propio = trazadoEnCurso = { t };
  let ultimoDibujo = performance.now();
  const dibujarLuego = () => {
    if (performance.now() - ultimoDibujo < 150) return;
    ultimoDibujo = performance.now();
    requestAnimationFrame(() => { if (trazadoEnCurso === propio) dibujar(); });
  };
  const tanda = () => {
    if (trazadoEnCurso !== propio) return;         // lo reemplazó un cálculo nuevo
    const listo = t.avanzar(12);
    ramas = t.ramas;
    if (!listo) { dibujarLuego(); setTimeout(tanda, 0); return; }
    trazadoEnCurso = null;
    dibujar();
    if (ramas.incompleto) {
      const msj = $('msj');
      msj.className = 'on'; msj.style.color = 'var(--warn)';
      msj.innerHTML = (msj.innerHTML ? msj.innerHTML + '<br>' : '') + 'El trazado de las ramas quedó incompleto (tardaba demasiado): los cálculos del panel siguen siendo exactos.';
    }
  };
  tanda();
}
function calcular() {
  const msj = $('msj');
  ['N', 'D', 'Z', 'P'].forEach(c => $('i-' + c).classList.remove('mal'));
  msj.className = ''; msj.innerHTML = '';
  guardar();
  try {
    const modelo = construirModelo(S);
    resultado = analizar(modelo);
    ramas = [];
    empezarTrazado();                              // las ramas se dibujan de a poco, sin trabar la página
    const info = resultado.notas.length ? '<span class="nota-info">' + resultado.notas.map(esc).join(' ') + '</span>' : '';
    if (info) { msj.className = 'on'; msj.style.color = 'var(--ink-2)'; msj.innerHTML = info; }
    cancelaciones(modelo);
  } catch (err) {
    resultado = null; ramas = []; trazadoEnCurso = null;
    if (err instanceof ErrorEntrada || err.extra !== undefined) {
      if (err.extra && err.extra.campo) $('i-' + err.extra.campo).classList.add('mal');
      msj.className = 'on'; msj.style.color = '';
      msj.innerHTML = esc(err.message);
      if (err.extra && err.extra.faltan) {
        const b = document.createElement('button'); b.className = 'btn'; b.textContent = 'Agregar conjugados';
        b.onclick = () => {
          const f = err.extra.faltan;
          if (f.Z.length) S.Z = (S.Z.trim() ? S.Z.trim() + '; ' : '') + f.Z.map(fcomp).join('; ');
          if (f.P.length) S.P = (S.P.trim() ? S.P.trim() + '; ' : '') + f.P.map(fcomp).join('; ');
          pasarAInputs(); calcular();
        };
        msj.appendChild(b);
      }
    } else { console.error(err); msj.className = 'on'; msj.style.color = ''; msj.textContent = 'No se pudo calcular: ' + err.message; }
  }
  dibujarResumen(); dibujarDetalles(); ajustarVista(); dibujar();
}
function cancelaciones(modelo) {
  const msj = $('msj'), c = resultado.cancelados.map(g => fcomp(g.z) + (g.mult > 1 ? ' (×' + g.mult + ')' : ''));
  if (c.length) {
    msj.className = 'on'; msj.style.color = 'var(--warn)';
    msj.innerHTML = (msj.innerHTML ? msj.innerHTML + '<br>' : '') + 'Hay un polo y un cero en el mismo punto (' + c.map(esc).join('; ') +
      '): se cancelan en la función de transferencia. El LGR se calcula con la función simplificada; el par queda marcado aparte.';
  }
}

function dibujarResumen() {
  const el = $('resumen');
  if (!resultado) { el.innerHTML = ''; return; }
  const lista = gs => gs.length ? gs.map(g => '<b>' + fcomp(g.z) + '</b>' + (g.mult > 1 ? ' (×' + g.mult + ')' : '')).join(' ; ') : '<i>no hay</i>';
  if (resultado.modo === 'ec')
    el.innerHTML = 'Ceros (<b>m = ' + resultado.m + '</b>): ' + lista(resultado.ceros) + '<br>Polos (<b>n = ' + resultado.n + '</b>): ' + lista(resultado.polos);
  else
    el.innerHTML = 'Ecuación característica: <b>1 + K · ' + fraccion(polyHTML(resultado.Nsin), polyHTML(resultado.Dsin)) + ' = 0</b>';
}
