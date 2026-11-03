/* ---------- interacción con el gráfico ---------- */
const punteros = new Map();
let arrastre = null;
svg.addEventListener('pointerdown', e => {
  svg.setPointerCapture(e.pointerId);
  punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
  arrastre = { cx: vista.cx, cy: vista.cy, k: vista.k, x: e.clientX, y: e.clientY, dist: distancia(), mx: media().x, my: media().y };
  svg.classList.add('arrastrando');
  $('#tip').style.display = 'none';
});
const distancia = () => { const p = [...punteros.values()]; return p.length < 2 ? 0 : Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); };
const media = () => { const p = [...punteros.values()]; return p.length ? { x: p.reduce((s, q) => s + q.x, 0) / p.length, y: p.reduce((s, q) => s + q.y, 0) / p.length } : { x: 0, y: 0 }; };
svg.addEventListener('pointermove', e => {
  if (punteros.has(e.pointerId)) {
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!arrastre) return;
    if (punteros.size >= 2 && arrastre.dist > 0) {
      const f = distancia() / arrastre.dist, m = media();
      vista.k = arrastre.k * f;
      vista.cx = arrastre.cx - (m.x - arrastre.mx) / vista.k;
      vista.cy = arrastre.cy + (m.y - arrastre.my) / vista.k;
    } else if (punteros.size === 1) {
      vista.cx = arrastre.cx - (e.clientX - arrastre.x) / vista.k;
      vista.cy = arrastre.cy + (e.clientY - arrastre.y) / vista.k;
    }
    dibujar();
    return;
  }
  mostrarTip(e);
});
function soltar(e) {
  punteros.delete(e.pointerId);
  arrastre = punteros.size ? { cx: vista.cx, cy: vista.cy, k: vista.k, x: media().x, y: media().y, dist: distancia(), mx: media().x, my: media().y } : null;
  if (!punteros.size) svg.classList.remove('arrastrando');
}
svg.addEventListener('pointerup', soltar);
svg.addEventListener('pointercancel', soltar);
svg.addEventListener('pointerleave', () => { $('#tip').style.display = 'none'; });
function zoomEn(f, px, py) {
  const W = stage.clientWidth, H = stage.clientHeight;
  const mx = vista.cx + (px - W / 2) / vista.k, my = vista.cy - (py - H / 2) / vista.k;
  vista.k *= f;
  vista.cx = mx - (px - W / 2) / vista.k; vista.cy = my + (py - H / 2) / vista.k;
  dibujar();
}
svg.addEventListener('wheel', e => {
  e.preventDefault();
  const r = svg.getBoundingClientRect();
  const f = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? r.height : 1;   // Firefox cuenta en líneas
  zoomEn(Math.pow(1.0017, -e.deltaY * f), e.clientX - r.left, e.clientY - r.top);
}, { passive: false });
svg.addEventListener('dblclick', () => { ajustarVista(); dibujar(); });
$('#z-mas').onclick = () => zoomEn(1.3, stage.clientWidth / 2, stage.clientHeight / 2);
$('#z-menos').onclick = () => zoomEn(1 / 1.3, stage.clientWidth / 2, stage.clientHeight / 2);

/* Al pasar el mouse por una rama: el punto s y el K que le corresponde */
let tipPend = false;
function mostrarTip(e) {
  if (tipPend || !resultado) return;
  tipPend = true;
  requestAnimationFrame(() => {
    tipPend = false;
    const r = svg.getBoundingClientRect(), W = r.width, H = r.height;
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    let best = 14, hit = null;
    ramas.forEach(b => {
      for (let i = 0; i < b.x.length; i++) {
        const px = W / 2 + (b.x[i] - vista.cx) * vista.k, py = H / 2 - (b.y[i] - vista.cy) * vista.k;
        const d = Math.hypot(px - mx, py - my);
        if (d < best) { best = d; hit = { x: b.x[i], y: b.y[i], K: b.K[i], px, py }; }
      }
    });
    const tip = $('#tip');
    if (!hit) { tip.style.display = 'none'; return; }
    tip.textContent = 's = ' + fcomp(complejo(hit.x, hit.y), 3) + '   K = ' + fnum(hit.K, 4);
    tip.style.display = 'block';
    tip.style.left = Math.min(hit.px + 12, W - tip.offsetWidth - 6) + 'px';
    tip.style.top = Math.max(hit.py - 30, 4) + 'px';
  });
}
new ResizeObserver(() => dibujar()).observe(stage);
