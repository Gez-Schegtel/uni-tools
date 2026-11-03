/* ---------- vista: el encuadre y el dibujo del gráfico ---------- */
function ajustarVista() {
  const W = stage.clientWidth || 800, H = stage.clientHeight || 500;
  const pts = resultado ? resultado.clave : [complejo(-1, 0), complejo(1, 0)];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  pts.forEach(z => { x0 = Math.min(x0, z.re); x1 = Math.max(x1, z.re); y0 = Math.min(y0, z.im); y1 = Math.max(y1, z.im); });
  let bw = x1 - x0, bh = y1 - y0;
  const ref = Math.max(bw, bh);
  if (!(ref > 1e-9)) { bw = bh = 4; } else { bw = Math.max(bw, ref * 0.25); bh = Math.max(bh, ref * 0.25); }
  vista.cx = (x0 + x1) / 2; vista.cy = (y0 + y1) / 2;
  vista.k = Math.min(W / (bw * 1.5), H / (bh * 1.5));
  if (resultado && resultado.asint.d > 0 && resultado.asint.sigma !== undefined) { /* las asíntotas salen de la vista: ya se ve su dirección */ }
}
const nice = r => {
  const p = Math.pow(10, Math.floor(Math.log10(r))), f = r / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
};

function dibujar() {
  const W = stage.clientWidth, H = stage.clientHeight;
  if (!W || !H) return;
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  const X = x => W / 2 + (x - vista.cx) * vista.k, Y = y => H / 2 - (y - vista.cy) * vista.k;
  const f1 = v => Math.round(v * 10) / 10;
  let o = '';
  const xmin = vista.cx - W / 2 / vista.k, xmax = vista.cx + W / 2 / vista.k, ymin = vista.cy - H / 2 / vista.k, ymax = vista.cy + H / 2 / vista.k;
  const paso = nice(70 / vista.k);
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

  if (resultado) {
    const halo = 'paint-order="stroke" stroke="#fff" stroke-width="3" stroke-linejoin="round"';
    const txt = (x, y, s, col = '#12181f', anc = 'start', ex = '') => '<text x="' + f1(x) + '" y="' + f1(y) + '" font-family="Arial" font-size="11.5" fill="' + col + '" text-anchor="' + anc + '" ' + halo + ' ' + ex + '>' + s + '</text>';
    // asíntotas
    if (S.ver.asint && resultado.asint.sigma !== undefined) {
      const sg = resultado.asint.sigma, L = (W + H) / vista.k;
      resultado.asint.angs.forEach(a => {
        const r = a.ang * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
        o += '<line x1="' + f1(X(sg)) + '" y1="' + f1(Y(0)) + '" x2="' + f1(X(sg + L * c)) + '" y2="' + f1(Y(L * s)) + '" stroke="#7b8896" stroke-width="1.2" stroke-dasharray="6 4"/>';
        if (S.ver.vals) {
          const dpx = 70 / vista.k;
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
      resultado.rup.filas.filter(f => f.ok).forEach(f => {
        const px = X(f.z.re), py = Y(f.z.im);
        o += '<rect x="' + f1(px - 4.5) + '" y="' + f1(py - 4.5) + '" width="9" height="9" fill="#fff" stroke="#c2410c" stroke-width="2"/>';
        o += txt(px, py + (f.z.im > 0 ? -10 : 20), 'σb = ' + fcomp(f.z, 3) + (f.K ? '  (K = ' + fnum(f.K.re, 3) + ')' : ''), '#c2410c', 'middle');
      });
      resultado.cruce.filas.filter(f => f.valido).forEach(f => (f.w < 1e-9 ? [1] : [1, -1]).forEach(sg => {
        const px = X(0), py = Y(sg * f.w);
        o += '<path d="M' + f1(px) + ' ' + f1(py - 6) + ' l6 6 l-6 6 l-6 -6z" fill="#fff" stroke="#8e44ad" stroke-width="2"/>';
        const nombre = f.w < 1e-9 ? 'ωc = 0' : (sg > 0 ? '+' : '−') + 'jωc = ' + (sg > 0 ? '' : '−') + 'j' + fnum(f.w, 3);
        o += txt(px + 10, f.w < 1e-9 ? py - 10 : py + 4, nombre + '  (Kc = ' + fnum(f.K, 3) + ')', '#8e44ad');
      }));
    }
    // polos y ceros (con ángulos)
    const angulos = [];
    resultado.angulos.forEach(a => a.vals.forEach(v => angulos.push({ a, v })));
    if (S.ver.vals) angulos.forEach(({ a, v }) => {
      const px = X(a.g.z.re), py = Y(a.g.z.im), r = v * Math.PI / 180;
      const cx = Math.cos(r), cy = -Math.sin(r), ex = px + 40 * cx, ey = py + 40 * cy, col = a.tipo === 'salida' ? '#c0392b' : '#0d5bd6';
      o += '<line x1="' + f1(px) + '" y1="' + f1(py) + '" x2="' + f1(ex) + '" y2="' + f1(ey) + '" stroke="' + col + '" stroke-width="1.4" stroke-dasharray="3 2"/>';
      o += txt(ex + (cx >= 0 ? 4 : -4), ey + (cy >= 0 ? 12 : -4), (a.tipo === 'salida' ? 'θ = ' : 'φ = ') + fnum(v, 2) + '°', col, cx >= 0 ? 'start' : 'end');
    });
    resultado.ceros.forEach(g => {
      const px = X(g.z.re), py = Y(g.z.im);
      o += '<circle cx="' + f1(px) + '" cy="' + f1(py) + '" r="6" fill="#fff" stroke="#12181f" stroke-width="2"/>';
      if (g.mult > 1) o += txt(px + 8, py - 8, '×' + g.mult, '#12181f');
    });
    // un polo y un cero cancelados: la cruz dentro del círculo, sin ángulos ni ramas
    resultado.cancelados.forEach(g => {
      const px = X(g.z.re), py = Y(g.z.im);
      o += '<circle cx="' + f1(px) + '" cy="' + f1(py) + '" r="7" fill="#fff" stroke="#8a97a5" stroke-width="1.6"/>';
      o += '<path d="M' + f1(px - 4) + ' ' + f1(py - 4) + ' l8 8 M' + f1(px - 4) + ' ' + f1(py + 4) + ' l8 -8" stroke="#8a97a5" stroke-width="1.8" stroke-linecap="round"/>';
    });
    resultado.polos.forEach(g => {
      const px = X(g.z.re), py = Y(g.z.im);
      o += '<path d="M' + f1(px - 5.5) + ' ' + f1(py - 5.5) + ' l11 11 M' + f1(px - 5.5) + ' ' + f1(py + 5.5) + ' l11 -11" stroke="#12181f" stroke-width="2.4" stroke-linecap="round"/>';
      if (g.mult > 1) o += txt(px + 8, py - 8, '×' + g.mult, '#12181f');
    });
  }
  svg.innerHTML = o;
  $('vacio').style.display = resultado ? 'none' : 'flex';
  $('leyenda').style.display = resultado ? '' : 'none';
  if (resultado) {
    $('leyenda').innerHTML =
      '<div><svg viewBox="0 0 16 12"><path d="M3 1 l10 10 M3 11 l10 -10" stroke="#12181f" stroke-width="2.2"/></svg>polos</div>' +
      '<div><svg viewBox="0 0 16 12"><circle cx="8" cy="6" r="4.5" fill="#fff" stroke="#12181f" stroke-width="2"/></svg>ceros</div>' +
      '<div><svg viewBox="0 0 16 12"><path d="M1 6h14" stroke="#0d5bd6" stroke-width="2.2"/></svg>LGR (K &gt; 0)</div>' +
      '<div><svg viewBox="0 0 16 12"><path d="M1 6h14" stroke="#7b8896" stroke-width="1.4" stroke-dasharray="4 3"/></svg>asíntotas</div>' +
      (resultado.cancelados.length ? '<div><svg viewBox="0 0 16 12"><circle cx="8" cy="6" r="5" fill="#fff" stroke="#8a97a5" stroke-width="1.4"/><path d="M5 3 l6 6 M5 9 l6 -6" stroke="#8a97a5" stroke-width="1.4"/></svg>polo y cero cancelados</div>' : '');
  }
}
