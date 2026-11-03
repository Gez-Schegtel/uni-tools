/* ---------- lectura de lo que escribe el usuario ---------- */
function parsearComplejo(t) {
  t = t.replace(/[−–]/g, '-').replace(/\s+/g, '');
  // se parte en los + y − que no son el signo de un exponente (1e-4 es un solo número)
  const m = t.match(/[+-]?(?:[^+-]|(?<=\de)[+-]|(?<=\dE)[+-])+/g);
  if (!m || m.join('') !== t) return null;
  let re = 0, im = 0;
  for (const x of m) {
    if (/[ji]$/i.test(x)) {
      const c = x.slice(0, -1);
      if (!/^[+-]?((\d+\.?\d*|\.\d+)([eE][+-]?\d+)?)?$/.test(c)) return null;
      im += c === '' || c === '+' ? 1 : c === '-' ? -1 : parseFloat(c);
    } else {
      if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(x)) return null;
      re += parseFloat(x);
    }
  }
  return complejo(re, im);
}
/* La coma es decimal (−3,5): «1,2» es un número, no dos. Como se puede querer decir lo
   otro, si aparece y no hay «;» en la lista, se deja una nota (lista.notaComa). */
function parsearLista(txt) {
  let t = txt.replace(/[−–]/g, '-').replace(/[\[\]]/g, ' ');
  if (/^\s*(no\s+existen?|ninguno|ninguna|-|—)?\s*$/i.test(t)) return [];
  const comas = t.match(/\d,\d+/g);
  const ambigua = !!comas && !t.includes(';');
  t = t.replace(/(\d),(\d)/g, '$1.$2');
  t = t.replace(/(\d|\.)\s*([+-])\s*((?:\d+\.?\d*|\.\d+)?[ji])(?![\w.])/gi, '$1$2$3');
  const lista = t.split(/[;,\s]+/).filter(Boolean).map(x => {
    const z = parsearComplejo(x);
    if (!z) throw new Error('No entiendo «' + x + '». Usá, por ejemplo, 2; -3,5; -2+3j');
    return z;
  });
  if (ambigua) lista.notaComa = comas.join(', ');
  return lista;
}
/* La K va afuera: N(s) y D(s) se escriben sin ella. En el numerador se acepta como primer
   factor («K(s+1)», «K·(s+1)», «K»), que es como se lo copia de la guía; en cualquier otro
   lugar se rechaza, porque antes se tomaba como 1 y «s² + Ks + 1» daba otro problema. */
function parsearPoli(txt, conK) {
  let t = txt.replace(/[−–]/g, '-').replace(/[·×]/g, '*').replace(/(\d),(\d)/g, '$1.$2')
    .replace(/[²³⁴⁵⁶⁷⁸⁹]/g, c => '^' + (2 + '²³⁴⁵⁶⁷⁸⁹'.indexOf(c))).trim();
  if (conK) {
    const sinK = t.replace(/^[kK](?![\w])\s*\*?\s*/, '');
    if (sinK !== t) t = sinK || '1';
  }
  if (/[kK]/.test(t)) throw new Error(conK ? 'La K va adelante, como factor de todo el numerador: K(s + 1)' : 'La K no va en el denominador: escribí D(s) sin K');
  if (!t) throw new Error('Falta completar el polinomio');
  if (t[0] === '[') {
    const v = t.replace(/[\[\]]/g, ' ').split(/[\s;,]+/).filter(Boolean).map(Number);
    if (!v.length || v.some(isNaN)) throw new Error('El vector de coeficientes no es válido');
    return pTrim(v);
  }
  const tok = [], re = /((?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|[sS]|[()+\-*\/^])/y;
  let i = 0;
  while (i < t.length) {
    if (/\s/.test(t[i])) { i++; continue; }
    re.lastIndex = i;
    const m = re.exec(t);
    if (!m) throw new Error('Carácter no válido: «' + t[i] + '»');
    tok.push(m[1]); i = re.lastIndex;
  }
  let p = 0;
  const peek = () => tok[p];
  function atomo() {
    const x = tok[p++];
    if (x === undefined) throw new Error('La expresión está incompleta');
    if (x === '(') { const r = expr(); if (tok[p++] !== ')') throw new Error('Falta cerrar un paréntesis'); return r; }
    if (/^[sS]$/.test(x)) return [1, 0];
    if (/^[\d.]/.test(x)) return [parseFloat(x)];
    throw new Error('No se esperaba «' + x + '»');
  }
  function potencia() {
    let b = atomo();
    if (peek() === '^') {
      p++;
      const e = tok[p++];
      if (!e || !/^\d+$/.test(e)) throw new Error('El exponente debe ser un entero positivo');
      if (+e > GRADO_MAX) throw new Error('El exponente no puede pasar de ' + GRADO_MAX);
      let r = [1];
      for (let k = 0; k < +e; k++) r = pMul(r, b);
      b = r;
    }
    return b;
  }
  function unario() {
    if (peek() === '-') { p++; return pScale(unario(), -1); }
    if (peek() === '+') { p++; return unario(); }
    return potencia();
  }
  function term() {
    let r = unario();
    for (;;) {
      const x = peek();
      if (x === '*') { p++; r = pMul(r, unario()); }
      else if (x === '/') {
        p++;
        const q = pTrim(unario());
        if (q.length > 1) throw new Error('Sólo se puede dividir por un número: usá N(s) y D(s) por separado');
        r = pScale(r, 1 / q[0]);
      } else if (x !== undefined && /^[\d.sS(]/.test(x)) r = pMul(r, potencia());
      else break;
    }
    return r;
  }
  function expr() {
    let r = term();
    while (peek() === '+' || peek() === '-') {
      const o = tok[p++], q = term();
      r = pAdd(r, o === '+' ? q : pScale(q, -1));
    }
    return r;
  }
  const r = expr();
  if (p < tok.length) throw new Error('Sobra «' + tok[p] + '» en la expresión');
  return pTrim(r);
}
