/* ---------- formato ---------- */
function fnum(x, d = 4) {
  if (!isFinite(x)) return x > 0 ? '∞' : x < 0 ? '−∞' : 'NaN';
  let s = (+x).toFixed(d);
  if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
  if (s === '-0') s = '0';
  return s.replace('-', '−').replace('.', ',');
}
function fcomp(z, d = 4) {
  const t = 1e-9 * Math.max(1, Math.abs(z.re), Math.abs(z.im));
  const re = Math.abs(z.re) < t ? 0 : z.re, im = Math.abs(z.im) < t ? 0 : z.im;
  if (im === 0) return fnum(re, d);
  const ims = (Math.abs(Math.abs(im) - 1) < 1e-12 ? '' : fnum(Math.abs(im), d)) + 'j';
  if (re === 0) return (im < 0 ? '−' : '') + ims;
  return fnum(re, d) + (im < 0 ? ' − ' : ' + ') + ims;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sup = e => e === 1 ? '' : '<sup>' + e + '</sup>';
function polyHTML(p, v = 's') {
  p = pTrim(p);
  const g = p.length - 1;
  let out = '';
  p.forEach((c, i) => {
    if (Math.abs(c) < 1e-12) return;
    const e = g - i, a = Math.abs(c);
    const coef = (Math.abs(a - 1) < 1e-12 && e > 0) ? '' : fnum(a);
    const parte = coef + (e === 0 ? '' : v + sup(e));
    if (!out) out = (c < 0 ? '−' : '') + parte;
    else out += (c < 0 ? ' − ' : ' + ') + parte;
  });
  return out || '0';
}
const fraccion = (a, b) => '<span class="fr"><span>' + a + '</span><span>' + b + '</span></span>';
function factorHTML(r, v = 's') {
  if (Math.abs(r.im) < 1e-12) {
    if (Math.abs(r.re) < 1e-12) return v;
    return '(' + v + (r.re < 0 ? ' + ' : ' − ') + fnum(Math.abs(r.re)) + ')';
  }
  return '(' + v + ' − (' + fcomp(r) + '))';
}
function factoresSimples(gs) {
  if (!gs.length) return '1';
  return gs.flatMap(g => Array.from({ length: g.mult }, () => factorHTML(g.z))).join('');
}
function factoresAgrupados(gs) {
  if (!gs.length) return '1';
  return gs.map(g => {
    if (Math.abs(g.z.im) < 1e-12) return Math.abs(g.z.re) < 1e-12 ? 's' + sup(g.mult) : factorHTML(g.z) + sup(g.mult);
    if (g.z.im < 0) return '';
    return '(' + polyHTML([1, -2 * g.z.re, g.z.re * g.z.re + g.z.im * g.z.im]) + ')' + sup(g.mult);
  }).join('');
}
const mod360 = a => { a = ((a % 360) + 360) % 360; return (360 - a < 1e-9) ? 0 : a; };
const angDe = z => Math.atan2(z.im, z.re) * 180 / Math.PI;
const fang = a => fnum(a, 2) + '°';
