/* =====================================================================
   BARRA: campos, modos, ejemplos, botones y exportación
   ===================================================================== */
function pasarAInputs() {
  $('i-N').value = S.N; $('i-D').value = S.D; $('i-Z').value = S.Z; $('i-P').value = S.P;
  $('m-ec').classList.toggle('on', S.modo === 'ec');
  $('m-zp').classList.toggle('on', S.modo === 'zp');
  $('f-ec').hidden = S.modo !== 'ec';
  $('f-zp').hidden = S.modo !== 'zp';
  [['asint', 'v-asint'], ['vals', 'v-vals'], ['flechas', 'v-flechas'], ['grid', 'v-grid']].forEach(([k, id]) => $(id).classList.toggle('on', !!S.ver[k]));
}
let temporizadorCalculo = null;
function diferir() { clearTimeout(temporizadorCalculo); temporizadorCalculo = setTimeout(calcular, 250); }
[['i-N', 'N'], ['i-D', 'D'], ['i-Z', 'Z'], ['i-P', 'P']].forEach(([id, k]) => {
  $(id).addEventListener('input', e => { S[k] = e.target.value; diferir(); });
  $(id).addEventListener('keydown', e => { if (e.key === 'Enter') { clearTimeout(temporizadorCalculo); calcular(); } });
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
$('e-svg').onclick = () => { if (resultado) descargar('lgr.svg', new Blob([svgExportado()], { type: 'image/svg+xml' })); };
$('e-png').onclick = () => {
  if (!resultado) return;
  const W = stage.clientWidth, H = stage.clientHeight, img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2;
    const g = c.getContext('2d'); g.scale(2, 2); g.drawImage(img, 0, 0, W, H);
    c.toBlob(b => descargar('lgr.png', b), 'image/png');
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgExportado());
};
