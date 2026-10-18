/* ===================================================================
   Tipógrafo y Parser de Ecuaciones Matemáticas (estilo LaTeX / Bloques)
   Preservado y tipado con TypeScript puro desacoplado del DOM.
   =================================================================== */

export const SIMBOLOS: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", zeta: "ζ", eta: "η",
  theta: "θ", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", pi: "π", rho: "ρ",
  sigma: "σ", tau: "τ", phi: "φ", chi: "χ", psi: "ψ", omega: "ω", Gamma: "Γ", Delta: "Δ",
  Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π", Sigma: "Σ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
  infty: "∞", pm: "±", mp: "∓", cdot: "·", times: "×", le: "≤", ge: "≥", ne: "≠",
  approx: "≈", sqrt: "√", int: "∫", partial: "∂", to: "→"
};

export type FichaTipo = "cmd" | "num" | "id" | "op";

export interface Ficha {
  k: FichaTipo;
  v: string;
}

export type AstNodo =
  | { t: "op"; s: string; esp?: number }
  | { t: "run"; s: string }
  | { t: "sup" | "sub"; items: AstNodo[] }
  | { t: "frac"; num: AstNodo[]; den: AstNodo[] }
  | { t: "grupo"; items: AstNodo[]; izq: string; der: string };

/**
 * 1. Tokenizador léxico
 */
export function fichas(src: string): Ficha[] {
  const s = String(src == null ? "" : src);
  const t: Ficha[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === "\\") {
      const m = /^\\([A-Za-z]+)/.exec(s.slice(i));
      if (m) {
        t.push({ k: "cmd", v: m[1] });
        i += m[0].length;
        continue;
      }
      i++;
      continue;
    }
    if (/[0-9]/.test(c)) {
      const m = /^[0-9]+(\.[0-9]+)?/.exec(s.slice(i));
      if (m) {
        t.push({ k: "num", v: m[0] });
        i += m[0].length;
        continue;
      }
    }
    if (/[A-Za-zΑ-Ωα-ω]/.test(c)) {
      const m = /^[A-Za-zΑ-Ωα-ω]+/.exec(s.slice(i));
      if (m) {
        t.push({ k: "id", v: m[0] });
        i += m[0].length;
        continue;
      }
    }
    t.push({ k: "op", v: c });
    i++;
  }
  return t;
}

const MULT = ["*", "·", "×"];

/**
 * 2. Analizador sintáctico con precedencia de operadores
 */
export function parsearEcuacion(src: string): AstNodo[] {
  const tk = fichas(src);
  let p = 0;

  const ficha = (): Ficha | undefined => tk[p];
  const esOp = (...vs: string[]): boolean =>
    !!tk[p] && tk[p].k === "op" && vs.indexOf(tk[p].v) >= 0;

  function expr(): AstNodo[] {
    let items = termino();
    while (esOp("+", "-", "=", "<", ">", "≤", "≥", "≠", ",")) {
      const op = tk[p++].v;
      const der = termino();
      items = items.concat(
        [{ t: "op", s: op === "-" ? "−" : op, esp: op === "," ? 0 : 0.24 }],
        der
      );
    }
    return items;
  }

  function termino(): AstNodo[] {
    const f0 = factor();
    if (!f0) return [];
    const facs: { op: string; items: AstNodo[] }[] = [{ op: "ini", items: f0 }];
    for (;;) {
      if (esOp(...MULT, "/")) {
        const op = tk[p++].v;
        const g = factor();
        if (!g) break;
        facs.push({ op: op === "/" ? "/" : "·", items: g });
      } else if (empiezaAtomo()) {
        const g = factor();
        if (!g) break;
        facs.push({ op: "imp", items: g });
      } else break;
    }
    if (!facs.some(f => f.op === "/")) return producto(facs);
    const arriba = facs.filter(f => f.op !== "/");
    const abajo = facs.filter(f => f.op === "/");
    return [{ t: "frac", num: producto(arriba, true), den: producto(abajo, true) }];
  }

  function producto(
    facs: { op: string; items: AstNodo[] }[],
    solos?: boolean
  ): AstNodo[] {
    let out: AstNodo[] = [];
    facs.forEach((f, i) => {
      if (i > 0 && f.op !== "imp") out.push({ t: "op", s: "·", esp: 0.14 });
      out = out.concat(desnudar(f.items, !!solos && facs.length === 1));
    });
    return out;
  }

  function factor(): AstNodo[] | null {
    if (esOp("-", "+")) {
      const sg = tk[p++].v;
      const r = factor();
      return [{ t: "op", s: sg === "-" ? "−" : "+", esp: 0 } as AstNodo].concat(r || []);
    }
    let base = atomo();
    if (!base) return null;
    while (esOp("^", "_")) {
      const op = tk[p++].v;
      base = base.concat([{ t: op === "^" ? "sup" : "sub", items: llave() }]);
    }
    return base;
  }

  function llave(): AstNodo[] {
    if (esOp("{")) {
      p++;
      const e = expr();
      if (esOp("}")) p++;
      return e;
    }
    if (esOp("-", "+")) {
      const sg = tk[p++].v;
      return [{ t: "op", s: sg === "-" ? "−" : "+", esp: 0 } as AstNodo].concat(llave());
    }
    const t = ficha();
    if (t && t.k === "id" && t.v.length > 1) {
      tk[p] = { k: "id", v: t.v.slice(1) };
      return [{ t: "run", s: t.v[0] }];
    }
    return atomo() || [];
  }

  function atomo(): AstNodo[] | null {
    const t = ficha();
    if (!t) return null;
    if (t.k === "op" && (t.v === "(" || t.v === "[")) {
      const cierra = t.v === "(" ? ")" : "]";
      p++;
      const dentro = expr();
      if (esOp(cierra)) p++;
      return [{ t: "grupo", items: dentro, izq: t.v, der: cierra }];
    }
    if (t.k === "num") {
      p++;
      return [{ t: "run", s: t.v }];
    }
    if (t.k === "id") {
      p++;
      const items: AstNodo[] = [{ t: "run", s: t.v }];
      if (
        tk[p] &&
        tk[p].k === "num" &&
        t.v.length <= 2 &&
        t.v.toLowerCase() !== "s" &&
        tk[p].v.indexOf(".") < 0
      ) {
        items.push({ t: "sub", items: [{ t: "run", s: tk[p].v }] });
        p++;
      }
      return items;
    }
    if (t.k === "cmd") {
      p++;
      if (t.v === "frac") {
        const a = llave();
        const b = llave();
        return [{ t: "frac", num: desnudar(a, true), den: desnudar(b, true) }];
      }
      return [{ t: "run", s: SIMBOLOS[t.v] || t.v }];
    }
    if (t.k === "op" && "+-*/^_(){}[]".indexOf(t.v) < 0) {
      p++;
      return [{ t: "run", s: t.v }];
    }
    p++;
    return null;
  }

  function empiezaAtomo(): boolean {
    const t = ficha();
    if (!t) return false;
    return (
      t.k === "id" || t.k === "num" || t.k === "cmd" || t.v === "(" || t.v === "["
    );
  }

  const r = expr();
  return r.length ? r : [];
}

function desnudar(items: AstNodo[], siempre: boolean): AstNodo[] {
  if (items.length === 1 && items[0].t === "grupo") {
    const dentro = items[0].items;
    if (siempre) return dentro;
    if (dentro.length === 1 && dentro[0].t === "frac") return dentro;
  }
  return items;
}

export interface Caja {
  w: number;
  up: number;
  down: number;
}

/**
 * 3. Cálculo de dimensiones de cajas (aproximación rápida agnóstica al DOM)
 */
export function estimarDimensiones(label: string, fontSize: number = 14): Caja {
  const ast = parsearEcuacion(label);
  return cajaFila(ast, fontSize);
}

function cajaFila(items: AstNodo[], fs: number): Caja {
  const cajas = (items || []).map(it => cajaDe(it, fs));
  const w = cajas.reduce((a, c) => a + c.w, 0);
  const up = Math.max(fs * 0.55, ...cajas.map(c => c.up));
  const down = Math.max(fs * 0.45, ...cajas.map(c => c.down));
  return { w, up, down };
}

function cajaDe(it: AstNodo, fs: number): Caja {
  if (it.t === "run" || it.t === "op") {
    const esp = it.t === "op" ? (it.esp === undefined ? 0.18 : it.esp) * fs : 0;
    const w = (it.s.length * fs * 0.55) + esp * 2;
    return { w, up: fs * 0.55, down: fs * 0.45 };
  }
  if (it.t === "sup" || it.t === "sub") {
    const f2 = fs * 0.72;
    const dentro = cajaFila(it.items, f2);
    const dy = it.t === "sup" ? -fs * 0.34 : fs * 0.28;
    return {
      w: dentro.w + fs * 0.04,
      up: it.t === "sup" ? -dy + dentro.up : Math.max(fs * 0.55, -dy + dentro.up),
      down: it.t === "sub" ? dy + dentro.down : Math.max(fs * 0.45, dy + dentro.down)
    };
  }
  if (it.t === "frac") {
    const num = cajaFila(it.num, fs);
    const den = cajaFila(it.den, fs);
    const pad = Math.max(4, fs * 0.28);
    const hueco = fs * 0.3;
    const w = Math.max(num.w, den.w) + pad * 2;
    return {
      w,
      up: hueco + num.down + num.up,
      down: hueco + den.up + den.down
    };
  }
  if (it.t === "grupo") {
    const dentro = cajaFila(it.items, fs);
    const alto = dentro.up + dentro.down;
    const estirar = alto > fs * 1.5;
    const pw = estirar ? Math.max(fs * 0.24, alto * 0.075) : fs * 0.4;
    return {
      w: dentro.w + pw * 2 + fs * 0.08,
      up: estirar ? dentro.up + 1.5 : Math.max(dentro.up, fs * 0.58),
      down: estirar ? dentro.down + 1.5 : Math.max(dentro.down, fs * 0.48)
    };
  }
  return { w: 0, up: fs * 0.55, down: fs * 0.45 };
}
