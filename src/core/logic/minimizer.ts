/* ===================================================================
   Optimizador y Minimizador Booleano (Quine-McCluskey + Búsqueda Exacta)
   Fiel a la lógica original de uni-tools pero con TypeScript estricto.
   =================================================================== */

interface ImplicantePrimo {
  bits: number;
  mask: number;
}

export function simplify(minterms: number[], n: number, nombres?: string[]): string {
  if (!minterms.length) return "0";
  if (minterms.length === 1 << n) return "1";

  let grupo: ImplicantePrimo[] = minterms.map(m => ({ bits: m, mask: 0 }));
  const primos: ImplicantePrimo[] = [];

  // Fase 1: Quine-McCluskey para encontrar todos los implicantes primos
  while (grupo.length) {
    const sig = new Map<string, ImplicantePrimo>();
    const usado = new Array(grupo.length).fill(false);

    for (let i = 0; i < grupo.length; i++) {
      for (let j = i + 1; j < grupo.length; j++) {
        const a = grupo[i];
        const b = grupo[j];
        if (a.mask !== b.mask) continue;
        const dif = a.bits ^ b.bits;
        if (dif && (dif & (dif - 1)) === 0) {
          usado[i] = usado[j] = true;
          const bits = a.bits & ~dif;
          const mask = a.mask | dif;
          sig.set(bits + "/" + mask, { bits, mask });
        }
      }
    }

    grupo.forEach((g, i) => {
      if (!usado[i] && !primos.some(p => p.bits === g.bits && p.mask === g.mask)) {
        primos.push(g);
      }
    });

    grupo = Array.from(sig.values());
  }

  const cubre = (p: ImplicantePrimo, m: number) => (m & ~p.mask) === p.bits;
  const falta = new Set<number>(minterms);
  const elegidos: ImplicantePrimo[] = [];

  // Fase 2: Implicantes primos esenciales
  for (const m of minterms) {
    const c = primos.filter(p => cubre(p, m));
    if (c.length === 1 && !elegidos.includes(c[0])) {
      elegidos.push(c[0]);
    }
  }

  for (const p of elegidos) {
    for (const m of Array.from(falta)) {
      if (cubre(p, m)) falta.delete(m);
    }
  }

  // Fase 3: Búsqueda exacta de cobertura con poda y timeout de 150ms
  const literales = (p: ImplicantePrimo) => {
    let c = 0;
    for (let i = 0; i < n; i++) {
      if (!(p.mask & (1 << i))) c++;
    }
    return c;
  };

  const resto = primos.filter(p => !elegidos.includes(p));
  const golosa: ImplicantePrimo[] = [];
  const faltaG = new Set<number>(falta);

  while (faltaG.size) {
    let mejor: ImplicantePrimo | null = null;
    let cuenta = -1;
    for (const p of resto) {
      if (golosa.includes(p)) continue;
      let c = 0;
      for (const m of faltaG) {
        if (cubre(p, m)) c++;
      }
      if (c > cuenta || (c === cuenta && mejor && literales(p) < literales(mejor))) {
        cuenta = c;
        mejor = p;
      }
    }
    if (!mejor || cuenta <= 0) break;
    golosa.push(mejor);
    for (const m of Array.from(faltaG)) {
      if (cubre(mejor, m)) faltaG.delete(m);
    }
  }

  let mejorSel: ImplicantePrimo[] = golosa;
  let mejorLit = golosa.reduce((a, p) => a + literales(p), 0);

  const porM = new Map<number, ImplicantePrimo[]>();
  for (const m of falta) {
    porM.set(
      m,
      resto.filter(p => cubre(p, m)).sort((a, b) => literales(a) - literales(b))
    );
  }

  const limite = Date.now() + 150;
  let pasos = 0;

  const buscar = (faltan: Set<number>, sel: ImplicantePrimo[], lit: number) => {
    if ((++pasos & 255) === 0 && Date.now() > limite) pasos = -Infinity;
    if (pasos < 0) return;
    if (!faltan.size) {
      if (sel.length < mejorSel.length || (sel.length === mejorSel.length && lit < mejorLit)) {
        mejorSel = sel.slice();
        mejorLit = lit;
      }
      return;
    }
    if (sel.length + 1 > mejorSel.length) return;

    let cands: ImplicantePrimo[] | null = null;
    for (const m of faltan) {
      const c = porM.get(m);
      if (c && (!cands || c.length < cands.length)) {
        cands = c;
        if (c.length <= 1) break;
      }
    }

    if (!cands) return;

    for (const p of cands) {
      if (sel.length + 1 === mejorSel.length && lit + literales(p) >= mejorLit) continue;
      const quedan = new Set<number>();
      for (const m of faltan) {
        if (!cubre(p, m)) quedan.add(m);
      }
      sel.push(p);
      buscar(quedan, sel, lit + literales(p));
      sel.pop();
    }
  };

  if (falta.size && !faltaG.size) {
    buscar(falta, [], 0);
  }

  elegidos.push(...mejorSel);
  return elegidos.map(p => termino(p, n, nombres)).join(" + ") || "0";
}

export function termino(p: ImplicantePrimo, n: number, nombres?: string[]): string {
  let s = "";
  for (let i = 0; i < n; i++) {
    const bit = 1 << (n - 1 - i);
    if (p.mask & bit) continue;
    s += (nombres ? nombres[i] : String.fromCharCode(65 + i)) + (p.bits & bit ? "" : "'");
  }
  return s || "1";
}
