/* =====================================================================
   DETALLES PASO A PASO
   ===================================================================== */
function dibujarDetalles() {
  const el = $('det-cuerpo');
  if (!resultado) { el.innerHTML = '<div class="vacio-det">Cuando ingreses una función válida, acá aparecen todos los cálculos paso a paso.</div>'; return; }
  const R = resultado;
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
    b += ec('1 + K · ' + fraccion(factoresSimples(todos(R.ceros)), factoresSimples(todos(R.polos))) + ' = 0');
    b += '<p>Agrupando cada par de complejos conjugados en un polinomio de segundo grado:</p>';
    b += ec('1 + K · ' + fraccion(factoresAgrupados(todos(R.ceros)), factoresAgrupados(todos(R.polos))) + ' = 0');
    b += '<p>Desarrollando los productos:</p>';
    b += ec('1 + K · ' + fraccion(polyHTML(R.Nsin), polyHTML(R.Dsin)) + ' = 0');
  } else {
    b += '<p>Dato: <b>1 + K · N(s)/D(s) = 0</b>.</p>';
    b += ec('1 + K · ' + fraccion(polyHTML(R.N0), polyHTML(R.D0)) + ' = 0');
    if (R.notas.length) b += '<p>' + R.notas.map(esc).join(' ') + '</p>' + ec('1 + K′ · ' + fraccion(polyHTML(R.N), polyHTML(R.D)) + ' = 0');
    b += '<p>Los <b>ceros</b> son las raíces de N(s) = 0 y los <b>polos</b>, las de D(s) = 0:</p>';
    b += ec('N(s) = ' + factoresSimples(R.ceros) + (R.m ? '' : ' (constante)'), true);
    b += ec('D(s) = ' + factoresSimples(R.polos), true);
  }
  if (R.cancelados.length) {
    b += '<p>Hay polos y ceros en el mismo punto: <b>' + R.cancelados.map(g => fcomp(g.z) + (g.mult > 1 ? ' (×' + g.mult + ')' : '')).join(' ; ') +
      '</b>. Se cancelan en G(s)H(s), así que el lugar de raíces se calcula con la función simplificada:</p>';
    b += ec('1 + K · ' + fraccion(factoresSimples(R.ceros), factoresSimples(R.polos)) + ' = 0', true);
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
    b += ec('θ<sub>k</sub> = ' + fraccion('180°·(2k + 1)', d > 0 ? 'n − m' : 'm − n') + ',&nbsp; k = 0, 1, …, ' + (Math.abs(d) - 1), true);
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
    b = ec('σ<sub>a</sub> = ' + fraccion('Σ polos − Σ ceros', 'n − m'), true);
    b += ec('σ<sub>a</sub> = ' + fraccion('[' + sp + '] − [' + (sz || '0') + ']', R.n + ' − ' + R.m), true);
    b += ec('σ<sub>a</sub> = ' + fraccion(fnum(A.sumP) + ' − (' + fnum(A.sumZ) + ')', fnum(d)) + ' = <b>' + fnum(A.sigma) + '</b>', true);
    b += '<p>La parte imaginaria de las sumas es 0 porque los complejos vienen de a pares conjugados.</p><div class="res">Las asíntotas nacen en σ<sub>a</sub> = ' + fnum(A.sigma) + ' (sobre el eje real).</div>';
  }
  h += paso('cen', 4, 'Punto donde nacen las asíntotas', b);

  /* 5. Puntos de ruptura */
  const Rp = R.rup;
  b = '<p>Se despeja K de la ecuación característica y se deriva respecto de s:</p>';
  b += ec('K = −' + fraccion('D(s)', 'N(s)') + ' = ' + fraccion('−(' + polyHTML(R.D) + ')', polyHTML(R.N)), true);
  b += ec(fraccion('dK', 'ds') + ' = ' + fraccion("D′(s)·N(s) − D(s)·N′(s)", 'N(s)²') + ' = 0', true);
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
