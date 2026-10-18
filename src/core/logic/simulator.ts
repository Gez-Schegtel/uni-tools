import type { SimuladorNodo, SimuladorCable } from "../schemas/document.schema.ts";

export interface PinDef {
  n: string;
  clk?: boolean;
}

export interface BiestableDef {
  nombre: string;
  pins: PinDef[];
  f: ((d: number[], q: number) => number | null) | null;
  nota: string;
}

export const BIESTABLES: Record<string, BiestableDef> = {
  rs: {
    nombre: "RS",
    pins: [{ n: "S" }, { n: "CLK", clk: true }, { n: "R" }],
    f: (d, q) => (d[0] && d[1] ? null : d[0] ? 1 : d[1] ? 0 : q),
    nota: "S=R=1 es la combinación prohibida"
  },
  jk: {
    nombre: "JK",
    pins: [{ n: "J" }, { n: "CLK", clk: true }, { n: "K" }],
    f: (d, q) => (d[0] && d[1] ? (q ? 0 : 1) : d[0] ? 1 : d[1] ? 0 : q),
    nota: "J=K=1 conmuta"
  },
  d: {
    nombre: "D",
    pins: [{ n: "D" }, { n: "CLK", clk: true }],
    f: d => (d[0] ? 1 : 0),
    nota: "Copia D en cada flanco"
  },
  t: {
    nombre: "T",
    pins: [{ n: "T" }, { n: "CLK", clk: true }],
    f: (d, q) => (d[0] ? (q ? 0 : 1) : q),
    nota: "T=1 conmuta"
  }
};

export const nIn = (n: SimuladorNodo): number => {
  if (n.type === "ff") return n.pins || 2;
  if (n.type === "marco") return 0;
  if (n.type === "out") return 1;
  if (n.type === "not" || n.type === "buf") return 1;
  if (n.type === "half-adder") return 2;
  if (n.type === "full-adder") return 3;
  return n.pins || 2;
};

export const nOut = (n: SimuladorNodo): number => {
  if (n.type === "ff" || n.type === "half-adder" || n.type === "full-adder") return 2;
  if (n.type === "out" || n.type === "label" || n.type === "marco") return 0;
  return 1;
};

export const esSalida = (pin: string | number): boolean => typeof pin === "string" && pin[0] === "o";
export const idxSalida = (pin: string | number): number => (pin === "o" ? 0 : +String(pin).slice(1));
export const claveSal = (id: string, i: number): string => id + "#" + i;

export function sumaDe(type: string, v: number[]): number[] {
  const unos = v.reduce((a, b) => a + (b === 1 ? 1 : 0), 0);
  return type === "half-adder"
    ? [unos === 1 ? 1 : 0, unos === 2 ? 1 : 0]
    : [unos & 1, unos >= 2 ? 1 : 0];
}

export function evalGate(t: string, v: number[]): number {
  const some = v.some(x => x === 1);
  const every = v.length > 0 && v.every(x => x === 1);
  const par = v.reduce((a, b) => a ^ (b === 1 ? 1 : 0), 0);
  switch (t) {
    case "and":
      return every ? 1 : 0;
    case "nand":
      return every ? 0 : 1;
    case "or":
      return some ? 1 : 0;
    case "nor":
      return some ? 0 : 1;
    case "xor":
      return par;
    case "xnor":
      return par ? 0 : 1;
    case "not":
      return v[0] === 1 ? 0 : 1;
    case "buf":
    case "out":
      return v[0] === 1 ? 1 : 0;
    default:
      return 0;
  }
}

export function proximoQ(kind: string, datos: number[], q: number): number {
  const def = BIESTABLES[kind];
  if (!def || !def.f) return q;
  const res = def.f(datos, q);
  return res === null || res === undefined ? q : res ? 1 : 0;
}

export interface SimulationResult {
  val: Map<string, number>;
  osc: boolean;
}

/**
 * Simulación en dos tiempos de circuitos lógicos combinacionales y secuenciales.
 */
export function simulate(
  nodes: SimuladorNodo[],
  wires: SimuladorCable[],
  prev?: Map<string, number>
): SimulationResult {
  const val = new Map<string, number>();
  const src = new Map<string, { id: string; i: number }>();

  for (const w of wires) {
    src.set(w.to.id + ":" + w.to.pin, {
      id: w.from.id,
      i: idxSalida(w.from.pin || "o")
    });
  }

  const leer = (id: string, i: number) => val.get(claveSal(id, i)) || 0;
  const entrada = (n: SimuladorNodo, i: number) => {
    const q = src.get(n.id + ":" + i);
    return q ? leer(q.id, q.i) : 0;
  };

  for (const n of nodes) {
    if (n.type === "in" || n.type === "clk") {
      val.set(claveSal(n.id, 0), n.on ? 1 : 0);
    } else if (n.type === "ff") {
      val.set(claveSal(n.id, 0), n.q ? 1 : 0);
      val.set(claveSal(n.id, 1), n.q ? 0 : 1);
    } else {
      for (let i = 0; i < Math.max(1, nOut(n)); i++) {
        val.set(claveSal(n.id, i), (prev && prev.get(claveSal(n.id, i))) || 0);
      }
    }
  }

  const comb = nodes.filter(n => !/^(in|clk|ff|label|marco)$/.test(n.type));
  const asincronos = nodes.filter(n => n.type === "ff" && n.conClk === false);

  const asentar = (): boolean => {
    for (let pass = 0; ; pass++) {
      let cambio = false;
      for (const n of comb) {
        const v: number[] = [];
        for (let i = 0; i < nIn(n); i++) v.push(entrada(n, i));
        const r =
          n.type === "half-adder" || n.type === "full-adder"
            ? sumaDe(n.type, v)
            : [evalGate(n.type, v)];
        for (let i = 0; i < r.length; i++) {
          if (r[i] !== leer(n.id, i)) {
            val.set(claveSal(n.id, i), r[i]);
            cambio = true;
          }
        }
      }
      for (const n of asincronos) {
        // Biestables sin reloj: actúan como latches
        const datos: number[] = [];
        for (let i = 0; i < nIn(n); i++) datos.push(entrada(n, i));
        const nq = proximoQ(n.kind || "d", datos, n.q ? 1 : 0);
        if (nq !== n.q) {
          n.q = nq;
          cambio = true;
        }
        val.set(claveSal(n.id, 0), n.q ? 1 : 0);
        val.set(claveSal(n.id, 1), n.q ? 0 : 1);
      }
      if (!cambio) return false;
      if (pass > 60) return true; // Oscilación detectada
    }
  };

  let osc = asentar();
  const ffs = nodes.filter(n => n.type === "ff" && n.conClk !== false);

  if (ffs.length) {
    for (let vuelta = 0; vuelta < 16; vuelta++) {
      let disparo = false;
      for (const n of ffs) {
        const ic = 1; // Reloj en el pin 1 por convención
        const clk = entrada(n, ic);
        // Flanco de subida
        const clkPrev = (n as any).clkPrev || 0;
        if (clk === 1 && !clkPrev) {
          const datos = [entrada(n, 0)];
          if (n.kind === "jk" || n.kind === "sr") {
            datos.push(entrada(n, 2));
          }
          const nq = proximoQ(n.kind || "d", datos, n.q ? 1 : 0);
          if (nq !== n.q) disparo = true;
          n.q = nq;
        }
        (n as any).clkPrev = clk;
        val.set(claveSal(n.id, 0), n.q ? 1 : 0);
        val.set(claveSal(n.id, 1), n.q ? 0 : 1);
      }
      if (!disparo) break;
      osc = asentar() || osc;
    }
  }

  return { val, osc };
}

export interface TruthTableRow {
  m: number;
  in: number[];
  out: number[];
  osc: boolean;
}

export interface TruthTableResult {
  ins: SimuladorNodo[];
  outs: SimuladorNodo[];
  rows: TruthTableRow[];
  demasiadas?: number;
}

export function truthTable(nodes: SimuladorNodo[], wires: SimuladorCable[]): TruthTableResult | null {
  const ins = nodes.filter(n => n.type === "in").sort((a, b) => a.x - b.x || a.y - b.y);
  const outs = nodes.filter(n => n.type === "out").sort((a, b) => a.y - b.y || a.x - b.x);

  if (!ins.length || !outs.length) return null;
  if (ins.length > 10) return { ins, outs, rows: [], demasiadas: ins.length };

  const copia: SimuladorNodo[] = nodes.map(n => JSON.parse(JSON.stringify(n)));
  const rows: TruthTableRow[] = [];
  const total = 1 << ins.length;

  for (let m = 0; m < total; m++) {
    for (let i = 0; i < ins.length; i++) {
      const target = copia.find(n => n.id === ins[i].id);
      if (target) {
        target.on = !!((m >> (ins.length - 1 - i)) & 1);
      }
    }
    const { val, osc } = simulate(copia, wires);
    rows.push({
      m,
      in: ins.map((_, i) => (m >> (ins.length - 1 - i)) & 1),
      out: outs.map(o => val.get(claveSal(o.id, 0)) || 0),
      osc
    });
  }

  return { ins, outs, rows };
}
