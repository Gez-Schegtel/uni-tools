/* =====================================================================
   ESTADO Y DIBUJO
   ===================================================================== */
const $ = id => document.getElementById(id);
const svg = $('canvas'), stage = $('stage');
let S = { modo: 'ec', N: 's+4,5', D: 's(s^2+6s+45)', Z: '', P: '', ver: { asint: true, vals: true, flechas: true, grid: true } };
let Rg = null;           // resultado del análisis
let ramas = [];          // ramas del LGR
let V = { cx: -2, cy: 0, k: 40 };
let aviso = null;
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

function calcular() {
  const msj = $('msj');
  ['N', 'D', 'Z', 'P'].forEach(c => $('i-' + c).classList.remove('mal'));
  msj.className = ''; msj.innerHTML = '';
  guardar();
  try {
    const modelo = construirModelo(S);
    Rg = analizar(modelo);
    ramas = trazarLGR(Rg);
    aviso = null;
    const info = Rg.notas.length ? '<span class="nota-info">' + Rg.notas.map(esc).join(' ') + '</span>' : '';
    if (info) { msj.className = 'on'; msj.style.color = 'var(--ink-2)'; msj.innerHTML = info; }
    cancelaciones(modelo);
    if (ramas.incompleto) {
      msj.className = 'on'; msj.style.color = 'var(--warn)';
      msj.innerHTML = (msj.innerHTML ? msj.innerHTML + '<br>' : '') + 'El trazado de las ramas quedó incompleto (tardaba demasiado): los cálculos del panel siguen siendo exactos.';
    }
  } catch (err) {
    Rg = null; ramas = [];
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
  const msj = $('msj'), c = Rg.cancelados.map(g => fcomp(g.z) + (g.mult > 1 ? ' (×' + g.mult + ')' : ''));
  if (c.length) {
    msj.className = 'on'; msj.style.color = 'var(--warn)';
    msj.innerHTML = (msj.innerHTML ? msj.innerHTML + '<br>' : '') + 'Hay un polo y un cero en el mismo punto (' + c.map(esc).join('; ') +
      '): se cancelan en la función de transferencia. El LGR se calcula con la función simplificada; el par queda marcado aparte.';
  }
}

function dibujarResumen() {
  const el = $('resumen');
  if (!Rg) { el.innerHTML = ''; return; }
  const lista = gs => gs.length ? gs.map(g => '<b>' + fcomp(g.z) + '</b>' + (g.mult > 1 ? ' (×' + g.mult + ')' : '')).join(' ; ') : '<i>no hay</i>';
  if (Rg.modo === 'ec')
    el.innerHTML = 'Ceros (<b>m = ' + Rg.m + '</b>): ' + lista(Rg.ceros) + '<br>Polos (<b>n = ' + Rg.n + '</b>): ' + lista(Rg.polos);
  else
    el.innerHTML = 'Ecuación característica: <b>1 + K · ' + fr(polyHTML(Rg.Nsin), polyHTML(Rg.Dsin)) + ' = 0</b>';
}

/* ---------- vista ---------- */
function ajustarVista() {
  const W = stage.clientWidth || 800, H = stage.clientHeight || 500;
  const pts = Rg ? Rg.clave : [C(-1, 0), C(1, 0)];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  pts.forEach(z => { x0 = Math.min(x0, z.re); x1 = Math.max(x1, z.re); y0 = Math.min(y0, z.im); y1 = Math.max(y1, z.im); });
  let bw = x1 - x0, bh = y1 - y0;
  const ref = Math.max(bw, bh);
  if (!(ref > 1e-9)) { bw = bh = 4; } else { bw = Math.max(bw, ref * 0.25); bh = Math.max(bh, ref * 0.25); }
  V.cx = (x0 + x1) / 2; V.cy = (y0 + y1) / 2;
  V.k = Math.min(W / (bw * 1.5), H / (bh * 1.5));
  if (Rg && Rg.asint.d > 0 && Rg.asint.sigma !== undefined) { /* las asíntotas salen de la vista: ya se ve su dirección */ }
}
const nice = r => {
  const p = Math.pow(10, Math.floor(Math.log10(r))), f = r / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
};

function dibujar() {
  const W = stage.clientWidth, H = stage.clientHeight;
  if (!W || !H) return;
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  const X = x => W / 2 + (x - V.cx) * V.k, Y = y => H / 2 - (y - V.cy) * V.k;
  const f1 = v => Math.round(v * 10) / 10;
  let o = '';
  const xmin = V.cx - W / 2 / V.k, xmax = V.cx + W / 2 / V.k, ymin = V.cy - H / 2 / V.k, ymax = V.cy + H / 2 / V.k;
  const paso = nice(70 / V.k);
  const dec = Math.max(0, -Math.floor(Math.log10(paso)));
  // cuadrícula y ejes
  if (S.ver.grid) {
    for (let x = Math.ceil(xmin / paso) * paso; x <= xmax; x += paso) o += '<line x1="' + f1(X(x)) + '" y1="0" x2="' + f1(X(x)) + '" y2="' + H + '" stroke="#eef2f6"/>';
    for (let y = Math.ceil(ymin / paso) * paso; y <= ymax; y += paso) o += '<line x1="0" y1="' + f1(Y(y)) + '" x2="' + W + '" y2="' + f1(Y(y)) + '" stroke="#eef2f6"/>';
  }
  const ex = Math.min(Math.max(Y(0), 14), H - 6), ey = Math.min(Math.max(X(0), 8), W - 30);
  o += '<line x1="0" y1="' + f1(Y(0)) + '" x2="' + W + '" y2="' + f1(Y(0)) + '" stroke="#8a97a5" stroke-width="1.2"/>';
  o += '<line x1="' + f1(X(0)) + '" y1="0" x2="' + f1(X(0)) + '" y2="' + H + '" stroke="#8a97a5" stroke-width="1.2"/>';
  const etq = 'font-family="Arial" font-size="10" fill="#7b8896"';
  for (let x = Math.ceil(xmin / paso) * paso; x <= xmax; x += paso) {
    if (Math.abs(x) < paso / 2) continue;
    o += '<text x="' + f1(X(x)) + '" y="' + f1(ex + (ex > Y(0) - 1 ? 12 : -5)) + '" text-anchor="middle" ' + etq + '>' + fnum(x, dec) + '</text>';
  }
  for (let y = Math.ceil(ymin / paso) * paso; y <= ymax; y += paso) {
    if (Math.abs(y) < paso / 2) continue;
    o += '<text x="' + f1(ey + 4) + '" y="' + f1(Y(y) + 3) + '" ' + etq + '>' + fnum(y, dec) + 'j</text>';
  }
  o += '<text x="' + (W - 8) + '" y="' + f1(Math.min(Math.max(Y(0) - 6, 12), H - 22)) + '" text-anchor="end" font-family="Arial" font-size="11" font-style="italic" fill="#5b6875">Re</text>';
  o += '<text x="' + f1(Math.min(X(0) + 6, W - 24)) + '" y="12" font-family="Arial" font-size="11" font-style="italic" fill="#5b6875">Im</text>';

  if (Rg) {
    const halo = 'paint-order="stroke" stroke="#fff" stroke-width="3" stroke-linejoin="round"';
    const txt = (x, y, s, col = '#12181f', anc = 'start', ex = '') => '<text x="' + f1(x) + '" y="' + f1(y) + '" font-family="Arial" font-size="11.5" fill="' + col + '" text-anchor="' + anc + '" ' + halo + ' ' + ex + '>' + s + '</text>';
    // asíntotas
    if (S.ver.asint && Rg.asint.sigma !== undefined) {
      const sg = Rg.asint.sigma, L = (W + H) / V.k;
      Rg.asint.angs.forEach(a => {
        const r = a.ang * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
        o += '<line x1="' + f1(X(sg)) + '" y1="' + f1(Y(0)) + '" x2="' + f1(X(sg + L * c)) + '" y2="' + f1(Y(L * s)) + '" stroke="#7b8896" stroke-width="1.2" stroke-dasharray="6 4"/>';
        if (S.ver.vals) {
          const dpx = 70 / V.k;
          o += txt(X(sg + dpx * c) + (c >= 0 ? 4 : -4), Y(dpx * s) + (s >= 0 ? -6 : 14), fnum(a.ang, 2) + '°', '#5b6875', c >= 0 ? 'start' : 'end');
        }
      });
      o += '<path d="M' + f1(X(sg)) + ' ' + f1(Y(0) - 6) + ' l6 6 l-6 6 l-6 -6z" fill="#fff" stroke="#5b6875" stroke-width="1.4"/>';
      if (S.ver.vals) o += txt(X(sg), Y(0) + 22, 'σa = ' + fnum(sg), '#5b6875', 'middle');
    }
    // ramas
    ramas.forEach((r, bi) => {
      const col = COLORES[bi % COLORES.length];
      let d = '', lx = 1e9, ly = 1e9, acum = 0, sig = 130;
      let flechas = '';
      for (let i = 0; i < r.x.length; i++) {
        const px = X(r.x[i]), py = Y(r.y[i]);
        if (Math.abs(px) > 1e5 || Math.abs(py) > 1e5) continue;
        const dx = px - lx, dy = py - ly, seg = Math.hypot(dx, dy);
        if (seg < 0.7 && i < r.x.length - 1) continue;
        d += (d ? 'L' : 'M') + f1(px) + ' ' + f1(py);
        if (lx < 1e8) {
          acum += seg;
          if (S.ver.flechas && acum > sig && px > 0 && px < W && py > 0 && py < H && seg > 0.5) {
            const a = Math.atan2(dy, dx), ca = Math.cos(a), sa = Math.sin(a);
            flechas += '<path d="M' + f1(px) + ' ' + f1(py) + ' l' + f1(-9 * ca + 4.5 * sa) + ' ' + f1(-9 * sa - 4.5 * ca) + ' l' + f1(1 * ca - 9 * sa) + ' ' + f1(1 * sa + 9 * ca) + 'z" fill="' + col + '"/>';
            sig = acum + 260;
          }
        }
        lx = px; ly = py;
      }
      o += '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>' + flechas;
    });
    // puntos de ruptura y cruces
    if (S.ver.vals) {
      Rg.rup.filas.filter(f => f.ok).forEach(f => {
        const px = X(f.z.re), py = Y(f.z.im);
        o += '<rect x="' + f1(px - 4.5) + '" y="' + f1(py - 4.5) + '" width="9" height="9" fill="#fff" stroke="#c2410c" stroke-width="2"/>';
        o += txt(px, py + (f.z.im > 0 ? -10 : 20), 'σb = ' + fcomp(f.z, 3) + (f.K ? '  (K = ' + fnum(f.K.re, 3) + ')' : ''), '#c2410c', 'middle');
      });
      Rg.cruce.filas.filter(f => f.valido).forEach(f => (f.w < 1e-9 ? [1] : [1, -1]).forEach(sg => {
        const px = X(0), py = Y(sg * f.w);
        o += '<path d="M' + f1(px) + ' ' + f1(py - 6) + ' l6 6 l-6 6 l-6 -6z" fill="#fff" stroke="#8e44ad" stroke-width="2"/>';
        const nombre = f.w < 1e-9 ? 'ωc = 0' : (sg > 0 ? '+' : '−') + 'jωc = ' + (sg > 0 ? '' : '−') + 'j' + fnum(f.w, 3);
        o += txt(px + 10, f.w < 1e-9 ? py - 10 : py + 4, nombre + '  (Kc = ' + fnum(f.K, 3) + ')', '#8e44ad');
      }));
    }
    // polos y ceros (con ángulos)
    const angulos = [];
    Rg.angulos.forEach(a => a.vals.forEach(v => angulos.push({ a, v })));
    if (S.ver.vals) angulos.forEach(({ a, v }) => {
      const px = X(a.g.z.re), py = Y(a.g.z.im), r = v * Math.PI / 180;
      const cx = Math.cos(r), cy = -Math.sin(r), ex = px + 40 * cx, ey = py + 40 * cy, col = a.tipo === 'salida' ? '#c0392b' : '#0d5bd6';
      o += '<line x1="' + f1(px) + '" y1="' + f1(py) + '" x2="' + f1(ex) + '" y2="' + f1(ey) + '" stroke="' + col + '" stroke-width="1.4" stroke-dasharray="3 2"/>';
      o += txt(ex + (cx >= 0 ? 4 : -4), ey + (cy >= 0 ? 12 : -4), (a.tipo === 'salida' ? 'θ = ' : 'φ = ') + fnum(v, 2) + '°', col, cx >= 0 ? 'start' : 'end');
    });
    Rg.ceros.forEach(g => {
      const px = X(g.z.re), py = Y(g.z.im);
      o += '<circle cx="' + f1(px) + '" cy="' + f1(py) + '" r="6" fill="#fff" stroke="#12181f" stroke-width="2"/>';
      if (g.mult > 1) o += txt(px + 8, py - 8, '×' + g.mult, '#12181f');
    });
    // un polo y un cero cancelados: la cruz dentro del círculo, sin ángulos ni ramas
    Rg.cancelados.forEach(g => {
      const px = X(g.z.re), py = Y(g.z.im);
      o += '<circle cx="' + f1(px) + '" cy="' + f1(py) + '" r="7" fill="#fff" stroke="#8a97a5" stroke-width="1.6"/>';
      o += '<path d="M' + f1(px - 4) + ' ' + f1(py - 4) + ' l8 8 M' + f1(px - 4) + ' ' + f1(py + 4) + ' l8 -8" stroke="#8a97a5" stroke-width="1.8" stroke-linecap="round"/>';
    });
    Rg.polos.forEach(g => {
      const px = X(g.z.re), py = Y(g.z.im);
      o += '<path d="M' + f1(px - 5.5) + ' ' + f1(py - 5.5) + ' l11 11 M' + f1(px - 5.5) + ' ' + f1(py + 5.5) + ' l11 -11" stroke="#12181f" stroke-width="2.4" stroke-linecap="round"/>';
      if (g.mult > 1) o += txt(px + 8, py - 8, '×' + g.mult, '#12181f');
    });
  }
  svg.innerHTML = o;
  $('vacio').style.display = Rg ? 'none' : 'flex';
  $('leyenda').style.display = Rg ? '' : 'none';
  if (Rg) {
    $('leyenda').innerHTML =
      '<div><svg viewBox="0 0 16 12"><path d="M3 1 l10 10 M3 11 l10 -10" stroke="#12181f" stroke-width="2.2"/></svg>polos</div>' +
      '<div><svg viewBox="0 0 16 12"><circle cx="8" cy="6" r="4.5" fill="#fff" stroke="#12181f" stroke-width="2"/></svg>ceros</div>' +
      '<div><svg viewBox="0 0 16 12"><path d="M1 6h14" stroke="#0d5bd6" stroke-width="2.2"/></svg>LGR (K &gt; 0)</div>' +
      '<div><svg viewBox="0 0 16 12"><path d="M1 6h14" stroke="#7b8896" stroke-width="1.4" stroke-dasharray="4 3"/></svg>asíntotas</div>' +
      (Rg.cancelados.length ? '<div><svg viewBox="0 0 16 12"><circle cx="8" cy="6" r="5" fill="#fff" stroke="#8a97a5" stroke-width="1.4"/><path d="M5 3 l6 6 M5 9 l6 -6" stroke="#8a97a5" stroke-width="1.4"/></svg>polo y cero cancelados</div>' : '');
  }
}

/* ---------- interacción con el gráfico ---------- */
const punteros = new Map();
let arrastre = null;
svg.addEventListener('pointerdown', e => {
  svg.setPointerCapture(e.pointerId);
  punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
  arrastre = { cx: V.cx, cy: V.cy, k: V.k, x: e.clientX, y: e.clientY, dist: distancia(), mx: media().x, my: media().y };
  svg.classList.add('arrastrando');
  $('tip').style.display = 'none';
});
const distancia = () => { const p = [...punteros.values()]; return p.length < 2 ? 0 : Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); };
const media = () => { const p = [...punteros.values()]; return p.length ? { x: p.reduce((s, q) => s + q.x, 0) / p.length, y: p.reduce((s, q) => s + q.y, 0) / p.length } : { x: 0, y: 0 }; };
svg.addEventListener('pointermove', e => {
  if (punteros.has(e.pointerId)) {
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!arrastre) return;
    if (punteros.size >= 2 && arrastre.dist > 0) {
      const f = distancia() / arrastre.dist, m = media();
      V.k = arrastre.k * f;
      V.cx = arrastre.cx - (m.x - arrastre.mx) / V.k;
      V.cy = arrastre.cy + (m.y - arrastre.my) / V.k;
    } else if (punteros.size === 1) {
      V.cx = arrastre.cx - (e.clientX - arrastre.x) / V.k;
      V.cy = arrastre.cy + (e.clientY - arrastre.y) / V.k;
    }
    dibujar();
    return;
  }
  mostrarTip(e);
});
function soltar(e) {
  punteros.delete(e.pointerId);
  arrastre = punteros.size ? { cx: V.cx, cy: V.cy, k: V.k, x: media().x, y: media().y, dist: distancia(), mx: media().x, my: media().y } : null;
  if (!punteros.size) svg.classList.remove('arrastrando');
}
svg.addEventListener('pointerup', soltar);
svg.addEventListener('pointercancel', soltar);
svg.addEventListener('pointerleave', () => { $('tip').style.display = 'none'; });
function zoomEn(f, px, py) {
  const W = stage.clientWidth, H = stage.clientHeight;
  const mx = V.cx + (px - W / 2) / V.k, my = V.cy - (py - H / 2) / V.k;
  V.k *= f;
  V.cx = mx - (px - W / 2) / V.k; V.cy = my + (py - H / 2) / V.k;
  dibujar();
}
svg.addEventListener('wheel', e => {
  e.preventDefault();
  const r = svg.getBoundingClientRect();
  const f = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? r.height : 1;   // Firefox cuenta en líneas
  zoomEn(Math.pow(1.0017, -e.deltaY * f), e.clientX - r.left, e.clientY - r.top);
}, { passive: false });
svg.addEventListener('dblclick', () => { ajustarVista(); dibujar(); });
$('z-mas').onclick = () => zoomEn(1.3, stage.clientWidth / 2, stage.clientHeight / 2);
$('z-menos').onclick = () => zoomEn(1 / 1.3, stage.clientWidth / 2, stage.clientHeight / 2);

/* Al pasar el mouse por una rama: el punto s y el K que le corresponde */
let tipPend = false;
function mostrarTip(e) {
  if (tipPend || !Rg) return;
  tipPend = true;
  requestAnimationFrame(() => {
    tipPend = false;
    const r = svg.getBoundingClientRect(), W = r.width, H = r.height;
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    let best = 14, hit = null;
    ramas.forEach(b => {
      for (let i = 0; i < b.x.length; i++) {
        const px = W / 2 + (b.x[i] - V.cx) * V.k, py = H / 2 - (b.y[i] - V.cy) * V.k;
        const d = Math.hypot(px - mx, py - my);
        if (d < best) { best = d; hit = { x: b.x[i], y: b.y[i], K: b.K[i], px, py }; }
      }
    });
    const tip = $('tip');
    if (!hit) { tip.style.display = 'none'; return; }
    tip.textContent = 's = ' + fcomp(C(hit.x, hit.y), 3) + '   K = ' + fnum(hit.K, 4);
    tip.style.display = 'block';
    tip.style.left = Math.min(hit.px + 12, W - tip.offsetWidth - 6) + 'px';
    tip.style.top = Math.max(hit.py - 30, 4) + 'px';
  });
}
new ResizeObserver(() => dibujar()).observe(stage);

/* =====================================================================
   DETALLES PASO A PASO
   ===================================================================== */
function dibujarDetalles() {
  const el = $('det-cuerpo');
  if (!Rg) { el.innerHTML = '<div class="vacio-det">Cuando ingreses una función válida, acá aparecen todos los cálculos paso a paso.</div>'; return; }
  const R = Rg;
  const abiertos = new Set([...el.querySelectorAll('details.paso[open]')].map(d => d.dataset.id));
  const primera = !el.querySelector('details.paso');
  const paso = (id, n, titulo, cuerpo) =>
    '<details class="paso" data-id="' + id + '"' + (primera || abiertos.has(id) ? ' open' : '') + '><summary><span class="num">' + n + '</span>' + titulo + '</summary><div class="cuerpo">' + cuerpo + '</div></details>';
  const ec = (h, sm) => '<div class="ec' + (sm ? ' sm' : '') + '">' + h + '</div>';
  const listaSing = (gs, v) => gs.length ? gs.map(g => fcomp(g.z) + (g.mult > 1 ? ' <small>(×' + g.mult + ')</small>' : '')).join(' ; ') : '—';
  let h = '';

  /* 1. Ecuación característica */
  let b = '';
  if (R.modo === 'zp') {
    b += '<p>La ecuación característica es <b>1 + K · G(s)H(s) = 0</b>, con los factores de los ceros arriba y los de los polos abajo:</p>';
    // tal como se ingresaron: con los pares cancelados, si los hay (se simplifican más abajo)
    const todos = gs => gs.concat(R.cancelados).sort((a, b) => b.z.re - a.z.re || b.z.im - a.z.im);
    b += ec('1 + K · ' + fr(factoresSimples(todos(R.ceros)), factoresSimples(todos(R.polos))) + ' = 0');
    b += '<p>Agrupando cada par de complejos conjugados en un polinomio de segundo grado:</p>';
    b += ec('1 + K · ' + fr(factoresAgrupados(todos(R.ceros)), factoresAgrupados(todos(R.polos))) + ' = 0');
    b += '<p>Desarrollando los productos:</p>';
    b += ec('1 + K · ' + fr(polyHTML(R.Nsin), polyHTML(R.Dsin)) + ' = 0');
  } else {
    b += '<p>Dato: <b>1 + K · N(s)/D(s) = 0</b>.</p>';
    b += ec('1 + K · ' + fr(polyHTML(R.N0), polyHTML(R.D0)) + ' = 0');
    if (R.notas.length) b += '<p>' + R.notas.map(esc).join(' ') + '</p>' + ec('1 + K′ · ' + fr(polyHTML(R.N), polyHTML(R.D)) + ' = 0');
    b += '<p>Los <b>ceros</b> son las raíces de N(s) = 0 y los <b>polos</b>, las de D(s) = 0:</p>';
    b += ec('N(s) = ' + factoresSimples(R.ceros) + (R.m ? '' : ' (constante)'), true);
    b += ec('D(s) = ' + factoresSimples(R.polos), true);
  }
  if (R.cancelados.length) {
    b += '<p>Hay polos y ceros en el mismo punto: <b>' + R.cancelados.map(g => fcomp(g.z) + (g.mult > 1 ? ' (×' + g.mult + ')' : '')).join(' ; ') +
      '</b>. Se cancelan en G(s)H(s), así que el lugar de raíces se calcula con la función simplificada:</p>';
    b += ec('1 + K · ' + fr(factoresSimples(R.ceros), factoresSimples(R.polos)) + ' = 0', true);
    b += '<p>Ojo: en D(s) + K·N(s) sin simplificar, ese punto sigue siendo raíz para todo K (un modo que la realimentación no mueve). Se tiene en cuenta en la conclusión.</p>';
  }
  b += '<p>Forma polinómica: <b>D(s) + K·N(s) = 0</b></p>';
  b += ec(polyHTML(R.D) + ' + K·(' + polyHTML(R.N) + ') = 0', true);
  h += paso('car', 1, 'Ecuación característica', b);

  /* 2. Polos, ceros y eje real */
  b = '<table class="t"><tr><th>Singularidad</th><th>Valores</th><th>Cantidad</th></tr>' +
    '<tr><td>Ceros</td><td>' + listaSing(R.ceros) + '</td><td>m = ' + R.m + '</td></tr>' +
    '<tr><td>Polos</td><td>' + listaSing(R.polos) + '</td><td>n = ' + R.n + '</td></tr></table>';
  b += '<p>El LGR tiene <b>' + Math.max(R.n, R.m) + ' ramas</b>: nacen en los polos (K = 0) y terminan en los ceros (K → ∞)' +
    (R.n > R.m ? '; las <b>' + (R.n - R.m) + '</b> restantes se van al infinito siguiendo las asíntotas.' : R.n < R.m ? '; ' + (R.m - R.n) + ' ramas llegan desde el infinito.' : '.') + '</p>';
  b += '<p><b>LGR sobre el eje real:</b> un punto del eje real pertenece al lugar si deja a su <b>derecha</b> una cantidad <b>impar</b> de polos y ceros reales (con su multiplicidad). Los complejos no cuentan.</p>';
  if (!R.eje.length) b += '<div class="res no-res">No hay polos ni ceros reales: ningún tramo del eje real pertenece al LGR.</div>';
  else {
    const lim = x => x === Infinity ? '+∞' : x === -Infinity ? '−∞' : fnum(x);
    b += '<table class="t"><tr><th>Tramo</th><th>Sing. a la derecha</th><th>¿LGR?</th></tr>' +
      R.eje.map(f => '<tr><td>(' + lim(f.a) + ' ; ' + lim(f.b) + ')</td><td>' + f.cnt + '</td><td class="' + (f.ok ? 'si' : 'no') + '">' + (f.ok ? 'Sí (impar)' : 'No') + '</td></tr>').join('') + '</table>';
    const ok = R.eje.filter(f => f.ok);
    b += ok.length ? '<div class="res">Pertenece al LGR: ' + ok.map(f => '[' + (f.a === -Infinity ? '−∞' : fnum(f.a)) + ' ; ' + fnum(f.b) + ']').join(' ∪ ') + '</div>' : '<div class="res no-res">Ningún tramo del eje real pertenece al LGR.</div>';
  }
  h += paso('eje', 2, 'Polos, ceros y LGR sobre el eje real', b);

  /* 3. Ángulos de las asíntotas */
  const A = R.asint, d = A.d;
  b = '<p>Cantidad de asíntotas: <b>|n − m|</b> = |' + R.n + ' − ' + R.m + '| = ' + Math.abs(d) + '.</p>';
  if (d === 0) {
    b += '<div class="res no-res">No hay asíntotas: n − m = ' + R.n + ' − ' + R.m + ' = 0, así que la expresión 180°(2k+1)/(n − m) divide por cero. Las ' + R.n + ' ramas terminan en los ' + R.m + ' ceros y ninguna se va al infinito.</div>';
  } else {
    b += ec('θ<sub>k</sub> = ' + fr('180°·(2k + 1)', d > 0 ? 'n − m' : 'm − n') + ',&nbsp; k = 0, 1, …, ' + (Math.abs(d) - 1), true);
    b += '<table class="t"><tr><th>k</th><th>Cálculo</th><th>θ<sub>k</sub></th></tr>' + A.angs.map(a =>
      '<tr><td>' + a.k + '</td><td>180°·(2·' + a.k + ' + 1) / ' + Math.abs(d) + ' = ' + fnum(a.crudo, 2) + '°</td><td><b>' + fang(a.ang) + '</b></td></tr>').join('') + '</table>';
    if (A.angs.some(a => Math.abs(a.crudo - a.ang) > 1e-9)) b += '<p>Los ángulos mayores a 360° se reducen restando vueltas completas.</p>';
    if (Math.abs(d) === 1) b += '<p>Como hay una sola asíntota, k = 1, 2… repiten el mismo ángulo.</p>';
    if (d < 0) b += '<p>Como n &lt; m, las ramas llegan desde el infinito (hay m − n polos en el infinito).</p>';
  }
  h += paso('asi', 3, 'Ángulos de las asíntotas', b);

  /* 4. Centroide */
  if (d === 0) b = '<div class="res no-res">No existe punto de origen de las asíntotas porque no hay asíntotas (n − m = 0 haría que σ<sub>a</sub> = (Σp − Σz)/0 no esté definido).</div>';
  else {
    const sp = expandir(R.polos).map(z => '(' + fcomp(z) + ')').join(' + '), sz = expandir(R.ceros).map(z => '(' + fcomp(z) + ')').join(' + ');
    b = ec('σ<sub>a</sub> = ' + fr('Σ polos − Σ ceros', 'n − m'), true);
    b += ec('σ<sub>a</sub> = ' + fr('[' + sp + '] − [' + (sz || '0') + ']', R.n + ' − ' + R.m), true);
    b += ec('σ<sub>a</sub> = ' + fr(fnum(A.sumP) + ' − (' + fnum(A.sumZ) + ')', fnum(d)) + ' = <b>' + fnum(A.sigma) + '</b>', true);
    b += '<p>La parte imaginaria de las sumas es 0 porque los complejos vienen de a pares conjugados.</p><div class="res">Las asíntotas nacen en σ<sub>a</sub> = ' + fnum(A.sigma) + ' (sobre el eje real).</div>';
  }
  h += paso('cen', 4, 'Punto donde nacen las asíntotas', b);

  /* 5. Puntos de ruptura */
  const Rp = R.rup;
  b = '<p>Se despeja K de la ecuación característica y se deriva respecto de s:</p>';
  b += ec('K = −' + fr('D(s)', 'N(s)') + ' = ' + fr('−(' + polyHTML(R.D) + ')', polyHTML(R.N)), true);
  b += ec(fr('dK', 'ds') + ' = ' + fr("D′(s)·N(s) − D(s)·N′(s)", 'N(s)²') + ' = 0', true);
  b += '<p>Como un cociente es 0 cuando su numerador es 0, alcanza con resolver <b>D′N − D·N′ = 0</b>:</p>';
  b += ec("D′(s) = " + polyHTML(Rp.Dp), true) + ec("N′(s) = " + (R.m ? polyHTML(Rp.Np) : '0 (N es constante)'), true);
  b += ec("D′·N = " + polyHTML(Rp.t1), true) + ec("D·N′ = " + polyHTML(Rp.t2), true);
  b += ec("D′·N − D·N′ = " + polyHTML(Rp.P) + ' = 0', true);
  if (!Rp.filas.length) b += '<div class="res no-res">El polinomio no tiene raíces: <b>no hay puntos de ruptura</b>.</div>';
  else {
    b += '<p>Un candidato es punto de ruptura si pertenece al LGR, es decir, si el K que le corresponde (K = −D/N) es <b>real y positivo</b>.</p>';
    b += '<table class="t"><tr><th>Raíz s</th><th>K = −D/N</th><th>¿Punto de ruptura?</th></tr>' + Rp.filas.map(f =>
      '<tr><td>' + fcomp(f.z, 4) + (f.mult > 1 ? ' <small>(×' + f.mult + ')</small>' : '') + '</td><td>' + (f.K ? fcomp(f.K, 4) : '∞') + '</td><td class="' + (f.ok ? 'si' : 'no') + '">' +
      (f.ok ? 'Sí' + (f.tipo ? ' · ' + f.tipo : '') + (f.nota ? ' · ' + f.nota : '') : 'No · ' + f.nota) + '</td></tr>').join('') + '</table>';
    const ok = Rp.filas.filter(f => f.ok);
    b += ok.length ? '<div class="res">Puntos de ruptura: ' + ok.map(f => 's = ' + fcomp(f.z)).join(' ; ') + '</div>' : '<div class="res no-res">Ninguna raíz pertenece al LGR: <b>no hay puntos de ruptura</b>.</div>';
  }
  h += paso('rup', 5, 'Puntos de ruptura', b);

  /* 6. Cruce con el eje imaginario */
  const Cz = R.cruce;
  b = '<p>Se reemplaza <b>s = jω</b> en D(s) + K·N(s) = 0 y se separa en parte real e imaginaria:</p>';
  b += ec('Re: ' + polyHTML(Cz.Dr, 'ω') + ' + K·(' + polyHTML(Cz.Nr, 'ω') + ') = 0', true);
  b += ec('Im: ' + polyHTML(Cz.Di, 'ω') + ' + K·(' + polyHTML(Cz.Ni, 'ω') + ') = 0', true);
  if (Cz.identico) {
    b += '<div class="res">Las dos ecuaciones son proporcionales para todo ω: el LGR (o un tramo) <b>coincide con el eje imaginario</b>, por eso no hay un único valor crítico.</div>';
  } else {
    b += '<p>Se despeja K de cada una y se igualan, eliminándolo: K = −Re<sub>D</sub>/Re<sub>N</sub> = −Im<sub>D</sub>/Im<sub>N</sub>, de donde</p>';
    b += ec('Im<sub>D</sub>·Re<sub>N</sub> − Re<sub>D</sub>·Im<sub>N</sub> = ' + polyHTML(Cz.Q, 'ω') + ' = 0', true);
    if (!Cz.filas.length) b += '<div class="res no-res">Ninguna raíz de ω es real: <b>no existe ω crítico</b> ni K crítico. El LGR no atraviesa el eje imaginario.</div>';
    else {
      b += '<p>Raíces reales (se listan ω ≥ 0; −ω es simétrica) y el K que cada una exige, reemplazando en la ecuación:</p>';
      b += '<table class="t"><tr><th>ω (rad/s)</th><th>K</th><th>¿Sirve?</th></tr>' + Cz.filas.map(f =>
        '<tr><td>±' + fnum(f.w) + '</td><td>' + fnum(f.K) + '</td><td class="' + (f.valido ? 'si' : 'no') + '">' + (f.valido ? 'Sí · K &gt; 0' + (f.nota ? ' · ' + f.nota : '') : 'No · ' + f.nota) + '</td></tr>').join('') + '</table>';
      const ok = Cz.filas.filter(f => f.valido);
      b += ok.length ? '<div class="res">' + ok.map(f => 'ω<sub>c</sub> = ±' + fnum(f.w) + ' rad/s &nbsp;·&nbsp; K<sub>c</sub> = ' + fnum(f.K)).join('<br>') + '</div>'
        : '<div class="res no-res">Los valores de ω obtenidos exigen K ≤ 0, que no pertenece al LGR (K &gt; 0): <b>no existe ω crítico ni K crítico válidos</b>. El LGR no atraviesa el eje imaginario.</div>';
    }
  }
  h += paso('cru', 6, 'ω crítico y K crítico', b);

  /* 7. Ángulos de salida y llegada */
  if (!R.angulos.length) b = '<div class="res no-res">No hay polos ni ceros complejos: no corresponde calcular ángulos de salida ni de llegada.</div>';
  else {
    b = '<p>Se mide, desde la singularidad compleja, el ángulo del vector que la une con cada una de las demás singularidades.</p>';
    b += ec('θ<sub>salida</sub> = 180° − Σ ∠(polo − otros polos) + Σ ∠(polo − ceros)', true);
    b += ec('φ<sub>llegada</sub> = 180° + Σ ∠(cero − polos) − Σ ∠(cero − otros ceros)', true);
    R.angulos.forEach(a => {
      const sal = a.tipo === 'salida', mult = a.g.mult;
      b += '<p><b>' + (sal ? 'Salida desde el polo ' : 'Llegada al cero ') + fcomp(a.g.z) + (mult > 1 ? ' (×' + mult + ')' : '') + '</b></p>';
      b += '<table class="t"><tr><th>Desde</th><th>Vector</th><th>Ángulo</th></tr>' + a.terminos.map(t =>
        '<tr><td>' + (t.tipo === 'polo' ? 'polo ' : 'cero ') + fcomp(t.de.z) + (t.de.mult > 1 ? ' <small>(×' + t.de.mult + ')</small>' : '') + '</td><td>' + fcomp(t.v, 3) + '</td><td>' + fang(t.ang) + '</td></tr>').join('') + '</table>';
      const sP = fnum(a.sP, 2), sC = fnum(a.sC, 2);
      const pol = sal ? '180° − ' + sP + '° + ' + sC + '°' : '180° + ' + sP + '° − ' + sC + '°';
      b += ec((sal ? 'θ' : 'φ') + ' = ' + pol + ' = ' + fnum(sal ? 180 - a.sP + a.sC : 180 + a.sP - a.sC, 2) + '°' + (mult > 1 ? ' (se divide por la multiplicidad ' + mult + ')' : ''), true);
      b += '<div class="res">' + (sal ? 'θ' : 'φ') + ' = ' + a.vals.map(v => '<b>' + fang(v) + '</b>').join(' ; ') + '</div>';
    });
    b += '<p>Los ángulos de un par conjugado son opuestos entre sí (θ y −θ): sirven de verificación.</p>';
  }
  h += paso('ang', 7, 'Ángulos de salida y de llegada', b);

  /* 8. Conclusión */
  b = '<p>Con ω<sub>c</sub> y K<sub>c</sub> se sabe en qué valores de K los polos de lazo cerrado cruzan el eje imaginario:</p>';
  if (!R.crit.length) {
    b += '<div class="res">El LGR no atraviesa el eje imaginario para K &gt; 0, así que <b>los polos de lazo cerrado no cambian de semiplano</b>.</div>';
  }
  b += '<table class="t"><tr><th>Rango de K</th><th>Polos en el semiplano derecho</th><th>Sistema</th></tr>' + R.tramos.map(t =>
    '<tr><td>' + (t.a === 0 ? '0 &lt; K' : fnum(t.a) + ' &lt; K') + (isFinite(t.b) ? ' &lt; ' + fnum(t.b) : '') + '</td><td>' + t.spd + '</td><td class="' + (t.spd === 0 && !t.eje ? 'si' : 'no') + '">' + (t.spd === 0 ? (t.eje ? 'marginal' : 'estable') : 'inestable') + '</td></tr>').join('') + '</table>';
  const t0 = R.tramos[0], tN = R.tramos[R.tramos.length - 1];
  if (R.crit.length) b += '<div class="res">Los polos de lazo cerrado cruzan el eje imaginario en K = ' + R.crit.map(fnum).join(' ; ') + '. ' +
    (t0.spd === 0 && tN.spd > 0 ? 'El sistema es estable para K &lt; ' + fnum(R.crit[0]) + ' e inestable para K mayor.' : t0.spd > 0 && tN.spd === 0 ? 'El sistema es inestable para K pequeños y se estabiliza al superar K = ' + fnum(R.crit[R.crit.length - 1]) + '.' : 'La estabilidad cambia al cruzar esos valores de K.') + '</div>';
  else b += '<div class="res ' + (t0.spd === 0 ? '' : 'no-res') + '">' + (t0.spd === 0 ? 'Todos los polos de lazo cerrado quedan en el semiplano izquierdo para cualquier K &gt; 0: el sistema es <b>estable para todo K</b>.' : 'Hay ' + t0.spd + ' polo(s) en el semiplano derecho y no cruzan el eje: el sistema es <b>inestable para todo K &gt; 0</b>.') + '</div>';
  if (R.cancelados.length) {
    const fuera = R.cancelados.filter(g => g.z.re >= -1e-7 * Math.max(1, R.escala));
    b += '<p>Los polos cancelados (' + R.cancelados.map(g => fcomp(g.z)).join(' ; ') + ') siguen siendo polos de lazo cerrado para todo K: ' +
      (fuera.length ? '<b>como ' + (fuera.length > 1 ? 'hay' : 'hay uno') + ' en el semiplano derecho o sobre el eje, están contados en la tabla</b>.' : 'están en el semiplano izquierdo, así que no cambian la estabilidad.') + '</p>';
  }
  h += paso('con', 8, 'Conclusión sobre los polos de lazo cerrado', b);

  /* 9. Comandos equivalentes */
  const num = v => (+v.toFixed(10)).toString();
  const ml = z => Math.abs(z.im) < 1e-12 ? num(z.re) : num(z.re) + (z.im < 0 ? '-' : '+') + num(Math.abs(z.im)) + 'i';
  const sl = z => Math.abs(z.im) < 1e-12 ? num(z.re) : num(z.re) + (z.im < 0 ? '-' : '+') + num(Math.abs(z.im)) + '*%i';
  const vec = (p, f = num) => '[' + p.map(f).join(' ') + ']';
  let mat, sci;
  if (R.modo === 'zp') {
    const zc = expandir(R.ceros), pl = expandir(R.polos);
    mat = 'ceros = [' + zc.map(ml).join(' ') + "]';\npolos = [" + pl.map(ml).join(' ') + '];\n[NUM,DEN] = zp2tf(ceros,polos,1)\nsys = tf(NUM,DEN)\nrlocus(NUM,DEN)\n';
    sci = "s = poly(0,'s');\nceros = [" + zc.map(sl).join(' ') + '];\npolos = [' + pl.map(sl).join(' ') + '];\n' + (zc.length ? "sis = poly(ceros,'s','roots') / poly(polos,'s','roots')" : "sis = 1 / poly(polos,'s','roots')") + '\nevans(sis)\n[k,w] = kpure(sis)\n';
  } else {
    mat = 'NUM = ' + vec(R.N) + ';\nDEN = ' + vec(R.D) + ';\nceros = roots(NUM)\npolos = roots(DEN)\nrlocus(NUM,DEN)\n';
    sci = "s = poly(0,'s');\nnum = poly(" + vec(R.N.slice().reverse()) + ",'s','coeff');\nden = poly(" + vec(R.D.slice().reverse()) + ",'s','coeff');\nsis = num/den\nroots(num)\nroots(den)\nevans(sis)\n[k,w] = kpure(sis)\n";
  }
  mat += '% asíntotas\nn = ' + R.n + '; m = ' + R.m + ';\nang = 180*(2*(0:n-m-1)+1)/(n-m)\nsigma = (sum(polos)-sum(ceros))/(n-m)\n';
  mat += '% puntos de ruptura: K = -D/N\n[dn,dd] = polyder(-DEN,NUM);\nroots(dn)\n';
  b = '<p>Para comprobar con el software de la cátedra:</p><p><b>MatLab</b></p><pre class="cod">' + esc(mat) + '</pre><p><b>SciLab</b></p><pre class="cod">' + esc(sci) + '</pre>';
  h += paso('cmd', 9, 'Comandos equivalentes (MatLab / SciLab)', b);

  el.innerHTML = h;
}

/* =====================================================================
   BARRA, MODOS, EJEMPLOS, EXPORTACIÓN
   ===================================================================== */
function pasarAInputs() {
  $('i-N').value = S.N; $('i-D').value = S.D; $('i-Z').value = S.Z; $('i-P').value = S.P;
  $('m-ec').classList.toggle('on', S.modo === 'ec');
  $('m-zp').classList.toggle('on', S.modo === 'zp');
  $('f-ec').hidden = S.modo !== 'ec';
  $('f-zp').hidden = S.modo !== 'zp';
  [['asint', 'v-asint'], ['vals', 'v-vals'], ['flechas', 'v-flechas'], ['grid', 'v-grid']].forEach(([k, id]) => $(id).classList.toggle('on', !!S.ver[k]));
}
let t = null;
function diferir() { clearTimeout(t); t = setTimeout(calcular, 250); }
[['i-N', 'N'], ['i-D', 'D'], ['i-Z', 'Z'], ['i-P', 'P']].forEach(([id, k]) => {
  $(id).addEventListener('input', e => { S[k] = e.target.value; diferir(); });
  $(id).addEventListener('keydown', e => { if (e.key === 'Enter') { clearTimeout(t); calcular(); } });
});
function modo(m) { S.modo = m; pasarAInputs(); calcular(); }
$('m-ec').onclick = () => modo('ec');
$('m-zp').onclick = () => modo('zp');

(function llenarEjemplos() {
  const sel = $('ejemplos');
  sel.innerHTML = '<option value="">Ejemplos…</option>';
  let grupo = null, og = null;
  EJEMPLOS.forEach((e, i) => {
    if (e.g !== grupo) { og = document.createElement('optgroup'); og.label = e.g; sel.appendChild(og); grupo = e.g; }
    const op = document.createElement('option'); op.value = i; op.textContent = e.t; og.appendChild(op);
  });
  sel.onchange = () => {
    const e = EJEMPLOS[+sel.value];
    if (!e) return;
    S.modo = e.modo;
    if (e.modo === 'ec') { S.N = e.N; S.D = e.D; } else { S.Z = e.Z; S.P = e.P; }
    pasarAInputs(); calcular();
    sel.value = '';
  };
})();

[['asint', 'v-asint'], ['vals', 'v-vals'], ['flechas', 'v-flechas'], ['grid', 'v-grid']].forEach(([k, id]) => {
  $(id).onclick = () => { S.ver[k] = !S.ver[k]; pasarAInputs(); guardar(); dibujar(); };
});
$('b-ajustar').onclick = () => { ajustarVista(); dibujar(); };
$('b-det').onclick = () => { const a = $('detalles'); a.classList.toggle('collapsed'); $('b-det').classList.toggle('on', !a.classList.contains('collapsed')); setTimeout(dibujar, 230); };
$('d-abrir').onclick = () => document.querySelectorAll('details.paso').forEach(d => d.open = true);
$('d-cerrar').onclick = () => document.querySelectorAll('details.paso').forEach(d => d.open = false);
document.querySelectorAll('.glab').forEach(g => g.addEventListener('click', () => g.parentElement.classList.toggle('collapsed')));

function descargar(nombre, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function svgExportado() {
  const W = stage.clientWidth, H = stage.clientHeight;
  return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' +
    '<rect width="' + W + '" height="' + H + '" fill="#ffffff"/>' + svg.innerHTML + '</svg>';
}
$('e-svg').onclick = () => { if (Rg) descargar('lgr.svg', new Blob([svgExportado()], { type: 'image/svg+xml' })); };
$('e-png').onclick = () => {
  if (!Rg) return;
  const W = stage.clientWidth, H = stage.clientHeight, img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2;
    const g = c.getContext('2d'); g.scale(2, 2); g.drawImage(img, 0, 0, W, H);
    c.toBlob(b => descargar('lgr.png', b), 'image/png');
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgExportado());
};

/* ---------- arranque ---------- */
cargar();
pasarAInputs();
if (innerWidth <= 820) { $('detalles').classList.add('collapsed'); $('b-det').classList.remove('on'); }
calcular();
