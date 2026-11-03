/* =====================================================================
   ENTRADA → MODELO
   ===================================================================== */
const EJEMPLOS = [
  { g: 'Ejemplo de la cátedra', t: 'Ceros 1±2j, −3 · Polos 4, −2±3j, −2', modo: 'zp', Z: '1+2j; 1-2j; -3', P: '4; -2+3j; -2-3j; -2' },
  { g: 'Tutorial MatLab/SciLab', t: '(s + 4,5) / (s(s² + 6s + 45))', modo: 'ec', N: 's+4,5', D: 's(s^2+6s+45)' },
  { g: 'Guía 3 · 2.1 (ecuación)', t: 'Ej. 1: K / (s³ + 5s² + 4s)', modo: 'ec', N: '1', D: 's^3+5s^2+4s' },
  { g: 'Guía 3 · 2.1 (ecuación)', t: 'Ej. 2: (s² + 4s + 53) / (s³ + 3s² − 18s)', modo: 'ec', N: 's^2+4s+53', D: 's^3+3s^2-18s' },
  { g: 'Guía 3 · 2.1 (ecuación)', t: 'Ej. 5: (s² − 2s + 10) / (s² + 4s − 5)', modo: 'ec', N: 's^2-2s+10', D: 's^2+4s-5' },
  { g: 'Guía 3 · 2.1 (ecuación)', t: 'Ej. 6: (s² + 4) / (s² + 6s)', modo: 'ec', N: 's^2+4', D: 's^2+6s' },
  { g: 'Guía 3 · 2.1 (ecuación)', t: 'Ej. 7: (s − 6) / (s³ + 12s² + 9s + 292)', modo: 'ec', N: 's-6', D: 's^3+12s^2+9s+292' },
  { g: 'Guía 3 · 2.1 (ecuación)', t: 'Ej. 8: 1 / (s(s² + 6s + 25))', modo: 'ec', N: '1', D: 's(s^2+6s+25)' },
  { g: 'Guía 3 · 2.2 (ceros y polos)', t: 'Ej. 1: polos 0; −3; −6', modo: 'zp', Z: '', P: '0; -3; -6' },
  { g: 'Guía 3 · 2.2 (ceros y polos)', t: 'Ej. 2: cero −3 · polos −4, −4±2j', modo: 'zp', Z: '-3', P: '-4; -4-2j; -4+2j' },
  { g: 'Guía 3 · 2.2 (ceros y polos)', t: 'Ej. 3: cero −1 · polos 0, −2, −3', modo: 'zp', Z: '-1', P: '0; -2; -3' },
  { g: 'Guía 3 · 2.2 (ceros y polos)', t: 'Ej. 4: polos −1, −2±2j', modo: 'zp', Z: '', P: '-1; -2-2j; -2+2j' },
  { g: 'Guía 3 · 2.2 (ceros y polos)', t: 'Ej. 5: ceros ±j · polos 0, −2', modo: 'zp', Z: 'j; -j', P: '0; -2' },
  { g: 'Guía 3 · 2.2 (ceros y polos)', t: 'Ej. 6: cero −1 · polos 0, −3±3j', modo: 'zp', Z: '-1', P: '0; -3-3j; -3+3j' },
  { g: 'Guía 3 · 2.2 (ceros y polos)', t: 'Ej. 7: ceros −3±8j · polos 0, −6, 3', modo: 'zp', Z: '-3+8j; -3-8j', P: '0; -6; 3' },
  { g: 'Guía 3 · 2.2 (ceros y polos)', t: 'Ej. 8: cero −2 · polos 0, −2±j', modo: 'zp', Z: '-2', P: '0; -2-j; -2+j' },
  { g: 'Guía 3 · 2.2 (ceros y polos)', t: 'Ej. 9: ceros −2, −3 · polos 0, −1', modo: 'zp', Z: '-2; -3', P: '0; -1' },
  { g: 'Guía 3 · 3.1 (software)', t: 'Ej. 1: grado 4 / grado 5', modo: 'ec', N: 's^4+10s^3+76s^2+344s-1088', D: 's^5+22s^4+184s^3+696s^2+263s-5166' },
  { g: 'Guía 3 · 3.1 (software)', t: 'Ej. 2: grado 4 / grado 5', modo: 'ec', N: 's^4-s^3-13s^2+41s+52', D: 's^5+20s^4+151s^3+500s^2+600s' },
  { g: 'Guía 3 · 3.1 (software)', t: 'Ej. 3: grado 4 / grado 5', modo: 'ec', N: 's^4-5s^3-63s^2+153s+810', D: 's^5+16s^4+105s^3+206s^2-976s' },
  { g: 'Guía 3 · 3.1 (software)', t: 'Ej. 4: grado 3 / grado 5', modo: 'ec', N: 's^3+11s^2+57s+203', D: 's^5+10s^4-100s^3-1000s^2-576s+5760' },
  { g: 'Guía 3 · 3.2 (software)', t: 'Ej. 1: 3 ceros · 5 polos', modo: 'zp', Z: '-1+3j; -1-3j; -6', P: '6; 2; -5; -7; -10' },
  { g: 'Guía 3 · 3.2 (software)', t: 'Ej. 2: 3 ceros · 5 polos', modo: 'zp', Z: '-1+6j; -1-6j; 3', P: '-2+3j; -2-3j; 2; -3,5; -7' },
  { g: 'Guía 3 · 3.2 (software)', t: 'Ej. 3: ceros 0, 2 · 3 polos', modo: 'zp', Z: '0; 2', P: '-1; -2,5+3j; -2,5-3j' },
  { g: 'Guía 3 · 3.2 (software)', t: 'Ej. 4: 3 ceros · 5 polos', modo: 'zp', Z: '-4-7j; -4+7j; -7', P: '1-2j; 1+2j; 0; -3; -6' },
  { g: 'Guía 3 · 3.2 (software)', t: 'Ej. 5: 4 ceros · 5 polos', modo: 'zp', Z: '-5+8j; -5-8j; 0; 6', P: '0; -2; 3; -5; 7' },
  { g: 'Guía 3 · 3.2 (software)', t: 'Ej. 6: 4 ceros · 5 polos', modo: 'zp', Z: '-5+7j; -5-7j; 6; -5', P: '-8-3j; -8+3j; 2; -2; -6' }
];

class ErrorEntrada extends Error { constructor(msg, extra) { super(msg); this.extra = extra; } }

function construirModelo(S) {
  const notas = [];
  if (S.modo === 'ec') {
    let N0, D0;
    try { N0 = parsearPoli(S.N, true); } catch (err) { throw new ErrorEntrada('Numerador: ' + err.message, { campo: 'N' }); }
    try { D0 = parsearPoli(S.D); } catch (err) { throw new ErrorEntrada('Denominador: ' + err.message, { campo: 'D' }); }
    if (D0.length < 2) throw new ErrorEntrada('El denominador tiene que ser de grado 1 o más.', { campo: 'D' });
    if (N0.length - 1 > GRADO_MAX) throw new ErrorEntrada('El numerador no puede pasar de grado ' + GRADO_MAX + '.', { campo: 'N' });
    if (D0.length - 1 > GRADO_MAX) throw new ErrorEntrada('El denominador no puede pasar de grado ' + GRADO_MAX + '.', { campo: 'D' });
    if (N0.length === 1 && Math.abs(N0[0]) < 1e-14) throw new ErrorEntrada('El numerador no puede ser 0.', { campo: 'N' });
    const c = N0[0], d = D0[0];
    const N = pScale(N0, 1 / c), D = pScale(D0, 1 / d);
    const ganancia = c / d;
    if (Math.abs(ganancia - 1) > 1e-12)
      notas.push('Se llevaron N(s) y D(s) a forma mónica: el parámetro del LGR pasa a ser K′ = K · ' + fnum(ganancia) + (ganancia < 0 ? ' (como es negativo, el LGR dibujado corresponde a K′ > 0, es decir, K < 0 en la ecuación original)' : '') + '.');
    const cerosL = limpiar(raicesPoli(N)), polosL = limpiar(raicesPoli(D));
    return { modo: 'ec', N, D, N0, D0, cerosL, polosL, notas };
  }
  let cerosL, polosL;
  try { cerosL = parsearLista(S.Z); } catch (err) { throw new ErrorEntrada('Ceros: ' + err.message, { campo: 'Z' }); }
  try { polosL = parsearLista(S.P); } catch (err) { throw new ErrorEntrada('Polos: ' + err.message, { campo: 'P' }); }
  [['ceros', cerosL], ['polos', polosL]].forEach(([q, l]) => {
    if (l.notaComa) notas.push('En los ' + q + ', «' + l.notaComa + '» se leyó con coma decimal. Si eran números separados, separalos con «;».');
  });
  if (!polosL.length) throw new ErrorEntrada('Hace falta al menos un polo.', { campo: 'P' });
  if (cerosL.length > GRADO_MAX) throw new ErrorEntrada('No puede haber más de ' + GRADO_MAX + ' ceros.', { campo: 'Z' });
  if (polosL.length > GRADO_MAX) throw new ErrorEntrada('No puede haber más de ' + GRADO_MAX + ' polos.', { campo: 'P' });
  // los complejos tienen que venir con su conjugado, si no los coeficientes no son reales
  const faltan = { Z: [], P: [] };
  [['Z', cerosL], ['P', polosL]].forEach(([k, lista]) => {
    const libres = lista.slice();
    lista.forEach(z => {
      if (Math.abs(z.im) < 1e-12) return;
      const i = libres.findIndex(w => Math.abs(w.re - z.re) < 1e-9 && Math.abs(w.im + z.im) < 1e-9);
      if (i >= 0) { libres.splice(i, 1); return; }
      const yaMarcado = libres.findIndex(w => w === z);
      if (yaMarcado >= 0) libres.splice(yaMarcado, 1);
      faltan[k].push(complejo(z.re, -z.im));
    });
  });
  if (faltan.Z.length || faltan.P.length) {
    const txt = [['ceros', faltan.Z], ['polos', faltan.P]].filter(x => x[1].length).map(x => x[0] + ': ' + x[1].map(fcomp).join('; ')).join(' · ');
    throw new ErrorEntrada('Falta el conjugado de algún número complejo (' + txt + '). Con coeficientes reales los complejos aparecen de a pares.', { faltan });
  }
  const N = pDesdeRaices(cerosL), D = pDesdeRaices(polosL);
  return { modo: 'zp', N, D, cerosL: limpiar(cerosL), polosL: limpiar(polosL), notas };
}
