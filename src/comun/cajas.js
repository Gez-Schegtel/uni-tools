/* ======================= cajas: encuadre y alineación =======================
   Para las herramientas de elementos rectangulares (bloques y compuertas): rectOf(n)
   de cada una da la caja que ocupa un elemento, y con eso salen el encuadre y la
   alineación. El ruteo en ángulo recto está en ortogonal.js. */
function bboxNodos() {
  const lista = S[HERRAMIENTA.nodos];
  if (!lista.length) return { l: 0, t: 0, r: 400, b: 300 };
  let l = 1e9, t = 1e9, r = -1e9, b = -1e9;
  for (const n of lista) { const R = rectOf(n); l = Math.min(l, R.l); t = Math.min(t, R.t); r = Math.max(r, R.r); b = Math.max(b, R.b); }
  return { l, t, r, b };
}
function bboxAll() {
  const lista = S[HERRAMIENTA.nodos];
  if (!lista.length) return { l: 0, t: 0, r: 400, b: 300 };
  let { l, t, r, b } = bboxNodos();
  for (const c of (S[HERRAMIENTA.conexiones] || [])) {
    if (!c.pts) continue;
    const pad = c.label ? 18 : 0;
    for (const p of c.pts) {
      l = Math.min(l, p.x - pad); t = Math.min(t, p.y - pad);
      r = Math.max(r, p.x + pad); b = Math.max(b, p.y + pad);
    }
  }
  return { l, t, r, b };
}
/* Alinea o reparte la selección; después las conexiones vuelven a su ruta automática */
function alinear(kind) {
  const ns = S.sel.map(buscarNodo).filter(Boolean);
  if ((kind === "dh" || kind === "dv") && ns.length < 3) {
    toast("Elegí al menos 3 elementos para distribuir");
    return;
  }
  if (ns.length < 2) { toast("Elegí al menos dos elementos"); return; }
  const rs = ns.map(rectOf);
  if (kind === "left") { const v = Math.min(...rs.map(r => r.l)); ns.forEach((n, i) => n.x = snapV(n.x + v - rs[i].l)); }
  if (kind === "right") { const v = Math.max(...rs.map(r => r.r)); ns.forEach((n, i) => n.x = snapV(n.x + v - rs[i].r)); }
  if (kind === "top") { const v = Math.min(...rs.map(r => r.t)); ns.forEach((n, i) => n.y = snapV(n.y + v - rs[i].t)); }
  if (kind === "bottom") { const v = Math.max(...rs.map(r => r.b)); ns.forEach((n, i) => n.y = snapV(n.y + v - rs[i].b)); }
  if (kind === "cx") { const v = ns.reduce((a, n) => a + n.x, 0) / ns.length; ns.forEach(n => n.x = snapV(v)); }
  if (kind === "cy") { const v = ns.reduce((a, n) => a + n.y, 0) / ns.length; ns.forEach(n => n.y = snapV(v)); }
  if (kind === "dh") {
    const s = ns.slice().sort((a, b) => a.x - b.x);
    const step = (s[s.length - 1].x - s[0].x) / (s.length - 1);
    s.forEach((n, i) => n.x = snapV(s[0].x + step * i));
  }
  if (kind === "dv") {
    const s = ns.slice().sort((a, b) => a.y - b.y);
    const step = (s[s.length - 1].y - s[0].y) / (s.length - 1);
    s.forEach((n, i) => n.y = snapV(s[0].y + step * i));
  }
  const movidos = new Set(ns.map(n => n.id));
  S[HERRAMIENTA.conexiones].forEach(c => { if (movidos.has(c.from.id) || movidos.has(c.to.id)) rutaAuto(c); });
  commit(); render();
}
