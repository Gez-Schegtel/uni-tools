/* =====================================================================
   BARRA: campos, modos, ejemplos, botones y exportación
   ===================================================================== */
function pasarAInputs() {
  $('#i-N').value = S.N; $('#i-D').value = S.D; $('#i-Z').value = S.Z; $('#i-P').value = S.P;
  $('#m-ec').classList.toggle('on', S.modo === 'ec');
  $('#m-zp').classList.toggle('on', S.modo === 'zp');
  $('#f-ec').hidden = S.modo !== 'ec';
  $('#f-zp').hidden = S.modo !== 'zp';
  [['asint', 'v-asint'], ['vals', 'v-vals'], ['flechas', 'v-flechas'], ['grid', 'v-grid']].forEach(([k, id]) => $('#' + id).classList.toggle('on', !!S.ver[k]));
}
let temporizadorCalculo = null;
function diferir() { clearTimeout(temporizadorCalculo); temporizadorCalculo = setTimeout(calcular, 250); }
[['i-N', 'N'], ['i-D', 'D'], ['i-Z', 'Z'], ['i-P', 'P']].forEach(([id, k]) => {
  $('#' + id).addEventListener('input', e => { S[k] = e.target.value; diferir(); });
  $('#' + id).addEventListener('keydown', e => { if (e.key === 'Enter') { clearTimeout(temporizadorCalculo); calcular(); } });
});
function modo(m) { S.modo = m; pasarAInputs(); calcular(); }
$('#m-ec').onclick = () => modo('ec');
$('#m-zp').onclick = () => modo('zp');

(function llenarEjemplos() {
  const sel = $('#ejemplos');
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
  $('#' + id).onclick = () => { S.ver[k] = !S.ver[k]; pasarAInputs(); autoguardar(); dibujar(); };
});
$('#b-ajustar').onclick = () => { ajustarVista(); dibujar(); };
$('#b-det').onclick = () => { const a = $('#detalles'); a.classList.toggle('collapsed'); $('#b-det').classList.toggle('on', !a.classList.contains('collapsed')); setTimeout(dibujar, 230); };
$('#d-abrir').onclick = () => document.querySelectorAll('details.paso').forEach(d => d.open = true);
$('#d-cerrar').onclick = () => document.querySelectorAll('details.paso').forEach(d => d.open = false);
document.querySelectorAll('.glab').forEach(g => g.addEventListener('click', () => g.parentElement.classList.toggle('collapsed')));

/* La leyenda de la pantalla es HTML: para la exportación se arma la misma en SVG */
function leyendaSVG(W) {
  const items = [
    ['<path d="M3 1 l10 10 M3 11 l10 -10" stroke="#12181f" stroke-width="2.2"/>', 'polos'],
    ['<circle cx="8" cy="6" r="4.5" fill="#fff" stroke="#12181f" stroke-width="2"/>', 'ceros'],
    ['<path d="M1 6h14" stroke="#0d5bd6" stroke-width="2.2"/>', 'LGR (K > 0)'],
    ['<path d="M1 6h14" stroke="#7b8896" stroke-width="1.4" stroke-dasharray="4 3"/>', 'asíntotas'],
  ];
  if (resultado.cancelados.length) items.push(['<circle cx="8" cy="6" r="5" fill="#fff" stroke="#8a97a5" stroke-width="1.4"/><path d="M5 3 l6 6 M5 9 l6 -6" stroke="#8a97a5" stroke-width="1.4"/>', 'polo y cero cancelados']);
  const ancho = 170, alto = 12 + items.length * 18, x0 = W - ancho - 12;
  return '<g transform="translate(' + x0 + ',10)"><rect width="' + ancho + '" height="' + alto + '" rx="8" fill="#fff" fill-opacity=".92" stroke="#d7dee6"/>' +
    items.map(([ico, txt], i) => '<g transform="translate(10,' + (8 + i * 18) + ')"><svg width="16" height="12" viewBox="0 0 16 12" overflow="visible">' + ico +
      '</svg><text x="22" y="10" font-family="Arial" font-size="11" fill="#3d4b5a">' + esc(txt) + '</text></g>').join('') + '</g>';
}
/* El SVG exportado lleva el gráfico, la leyenda y el documento adentro (para volver a abrirlo) */
function svgExportado() {
  const W = stage.clientWidth, H = stage.clientHeight;
  return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' +
    '<metadata id="uni-tools-datos">' + esc(JSON.stringify(docDatos())) + '</metadata>' +
    '<rect width="' + W + '" height="' + H + '" fill="#ffffff"/>' + svg.innerHTML + leyendaSVG(W) + '</svg>';
}
$('#e-svg').onclick = () => { if (resultado) descargar(NOMBRE_ARCHIVO + '.svg', new Blob([svgExportado()], { type: 'image/svg+xml' })); };
$('#e-png').onclick = () => {
  if (!resultado) return;
  const W = stage.clientWidth, H = stage.clientHeight, img = new Image(), k = 3;   // al triple, como las otras herramientas
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = W * k; c.height = H * k;
    const g = c.getContext('2d'); g.scale(k, k); g.drawImage(img, 0, 0, W, H);
    c.toBlob(b => { descargar(NOMBRE_ARCHIVO + '.png', b); toast('PNG descargado (3×)'); }, 'image/png');
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgExportado());
};
