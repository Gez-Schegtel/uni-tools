import type { SenalNodo, SenalRama } from "../schemas/document.schema.ts";

export interface Trayectoria {
  simbolo: string;
  ramas: SenalRama[];
  nodos: Set<string>;
  gan: string;
  ruta: string;
  valor?: number | null;
}

export interface Lazo {
  simbolo: string;
  ramas: SenalRama[];
  nodos: Set<string>;
  gan: string;
  ruta: string;
  valor?: number | null;
}

export interface TerminoDeterminante {
  orden: number;
  indices: number[];
}

export interface DeterminanteResult {
  terminos: TerminoDeterminante[];
  combos: Record<number, number[][]>;
}

export interface CofactorResult {
  p: Trayectoria;
  libres: Lazo[];
  det: DeterminanteResult;
}

export interface MasonAnalisis {
  entrada?: SenalNodo;
  salida?: SenalNodo;
  P: Trayectoria[];
  L: Lazo[];
  det: DeterminanteResult;
  cof: CofactorResult[];
  deltaTexto: string;
  deltaValor: number | null;
}

export interface EcuacionNodal {
  nodo: SenalNodo;
  texto: string;
}

export function nodosDeRamas(ramas: SenalRama[]): Set<string> {
  const s = new Set<string>();
  for (const r of ramas) {
    s.add(r.de);
    s.add(r.a);
  }
  return s;
}

export function seTocan(a: Set<string>, b: Set<string>): boolean {
  for (const n of a) {
    if (b.has(n)) return true;
  }
  return false;
}

export function trayectorias(
  nodos: SenalNodo[],
  ramas: SenalRama[],
  desdeId?: string,
  hastaId?: string
): SenalRama[][] {
  const res: SenalRama[][] = [];
  if (!desdeId || !hastaId || desdeId === hastaId) return res;

  const salientesDe = (id: string) => ramas.filter(r => r.de === id);

  const paso = (actual: string, visitados: Set<string>, camino: SenalRama[]) => {
    for (const r of salientesDe(actual)) {
      if (r.a === hastaId) {
        res.push(camino.concat(r));
        continue;
      }
      if (visitados.has(r.a)) continue;
      visitados.add(r.a);
      camino.push(r);
      paso(r.a, visitados, camino);
      camino.pop();
      visitados.delete(r.a);
    }
  };

  paso(desdeId, new Set([desdeId]), []);
  return res;
}

export function lazos(nodos: SenalNodo[], ramas: SenalRama[]): SenalRama[][] {
  const res: SenalRama[][] = [];
  const idx = new Map(nodos.map((n, i) => [n.id, i]));
  const salientesDe = (id: string) => ramas.filter(r => r.de === id);

  for (const inicio of nodos) {
    const i0 = idx.get(inicio.id);
    if (i0 === undefined) continue;

    const paso = (actual: string, visitados: Set<string>, camino: SenalRama[]) => {
      for (const r of salientesDe(actual)) {
        if (r.a === inicio.id) {
          res.push(camino.concat(r));
          continue;
        }
        const aIdx = idx.get(r.a);
        if (aIdx === undefined || aIdx < i0 || visitados.has(r.a)) continue;
        visitados.add(r.a);
        camino.push(r);
        paso(r.a, visitados, camino);
        camino.pop();
        visitados.delete(r.a);
      }
    };

    paso(inicio.id, new Set([inicio.id]), []);
  }
  return res;
}

export function combinacionesDisjuntas(ls: { nodos: Set<string> }[]): Record<number, number[][]> {
  const porTamano: Record<number, number[][]> = {};
  const paso = (desde: number, actual: number[]) => {
    if (actual.length >= 2) {
      (porTamano[actual.length] = porTamano[actual.length] || []).push(actual.slice());
    }
    for (let i = desde; i < ls.length; i++) {
      if (actual.every(j => !seTocan(ls[j].nodos, ls[i].nodos))) {
        actual.push(i);
        paso(i + 1, actual);
        actual.pop();
      }
    }
  };
  paso(0, []);
  return porTamano;
}

export function determinante(ls: { nodos: Set<string> }[]): DeterminanteResult {
  const combos = combinacionesDisjuntas(ls);
  const terminos: TerminoDeterminante[] = [];
  ls.forEach((_, i) => terminos.push({ orden: 1, indices: [i] }));
  Object.keys(combos)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach(k => combos[k].forEach(c => terminos.push({ orden: k, indices: c })));
  return { terminos, combos };
}

export function gananciaDe(ramas: SenalRama[]): string[] {
  return ramas.map(r => (r.g === "" || r.g == null ? "1" : String(r.g)));
}

export function producto(factores: string[]): string {
  const utiles = factores.filter(f => f !== "1");
  if (!utiles.length) return "1";
  if (utiles.length === 1) return utiles[0];
  return utiles.map(f => (/^[\w.]+$/.test(f) ? f : "(" + f + ")")).join("·");
}

export function rutaDe(ramas: SenalRama[], nodosMap: Map<string, SenalNodo>): string {
  if (!ramas.length) return "";
  const getNombre = (id: string) => nodosMap.get(id)?.nombre || "?";
  const nombres = [getNombre(ramas[0].de)].concat(ramas.map(r => getNombre(r.a)));
  return nombres.join(" → ");
}

export function textoDelta(ls: Lazo[], det: DeterminanteResult): string {
  if (!ls.length) return "1";
  let s = "1";
  const porOrden: Record<number, TerminoDeterminante[]> = {};
  det.terminos.forEach(t => (porOrden[t.orden] = porOrden[t.orden] || []).push(t));

  Object.keys(porOrden)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach(k => {
      const signo = k % 2 ? " − " : " + ";
      s +=
        signo +
        porOrden[k]
          .map(t => t.indices.map(i => ls[i].simbolo).join(""))
          .join(signo === " − " ? " − " : " + ");
    });
  return s;
}

export function valorDelta(ls: Lazo[], det: DeterminanteResult): number | null {
  if (ls.some(l => l.valor === null || l.valor === undefined)) return null;
  let v = 1;
  det.terminos.forEach(t => {
    const prod = t.indices.reduce((a, i) => a * (ls[i].valor ?? 1), 1);
    v += (t.orden % 2 ? -1 : 1) * prod;
  });
  return v;
}

export function conValores<T extends { ramas: SenalRama[]; valor?: number | null }>(items: T[]): T[] {
  items.forEach(it => {
    const vs = gananciaDe(it.ramas).map(s => {
      const v = Number(String(s).trim());
      return Number.isFinite(v) ? v : null;
    });
    it.valor = vs.some(v => v === null) ? null : vs.reduce((a, b) => (a ?? 1) * (b ?? 1), 1);
  });
  return items;
}

export function analizarMason(nodos: SenalNodo[], ramas: SenalRama[]): MasonAnalisis {
  const nodosMap = new Map(nodos.map(n => [n.id, n]));
  const entrada = nodos.find(n => n.tipo === "entrada");
  const salida = nodos.find(n => n.tipo === "salida");

  const P: Trayectoria[] = trayectorias(nodos, ramas, entrada?.id, salida?.id).map((rList, i) => ({
    simbolo: "P" + (i + 1),
    ramas: rList,
    nodos: nodosDeRamas(rList),
    gan: producto(gananciaDe(rList)),
    ruta: rutaDe(rList, nodosMap)
  }));

  const L: Lazo[] = lazos(nodos, ramas).map((rList, i) => ({
    simbolo: "L" + (i + 1),
    ramas: rList,
    nodos: nodosDeRamas(rList),
    gan: producto(gananciaDe(rList)),
    ruta: rutaDe(rList, nodosMap)
  }));

  conValores(P);
  conValores(L);

  const det = determinante(L);

  const cof: CofactorResult[] = P.map(p => {
    const libres = L.filter(l => !seTocan(l.nodos, p.nodos));
    const d = determinante(libres);
    return { p, libres, det: d };
  });

  const deltaTextoStr = textoDelta(L, det);
  const deltaValorNum = valorDelta(L, det);

  return {
    entrada,
    salida,
    P,
    L,
    det,
    cof,
    deltaTexto: deltaTextoStr,
    deltaValor: deltaValorNum
  };
}

export function ecuacionesNodales(nodos: SenalNodo[], ramas: SenalRama[]): EcuacionNodal[] {
  const nodosMap = new Map(nodos.map(n => [n.id, n]));
  const getNombre = (id: string) => nodosMap.get(id)?.nombre || "?";

  return nodos.map(n => {
    const entra = ramas.filter(r => r.a === n.id);
    if (!entra.length) {
      return {
        nodo: n,
        texto: n.nombre + " = " + (n.tipo === "entrada" ? "entrada del sistema" : "0")
      };
    }

    const partes = entra.map(r => {
      let g = (r.g === "" || r.g == null ? "1" : String(r.g)).trim();
      let signo = "+";
      if (g[0] === "-") {
        signo = "−";
        g = g.slice(1).trim() || "1";
      }
      const factor = g === "1" ? "" : (/^[\w.]+$/.test(g) ? g : "(" + g + ")") + "·";
      return { signo, txt: factor + getNombre(r.de) };
    });

    const texto =
      n.nombre +
      " = " +
      partes
        .map((p, i) => (i === 0 ? (p.signo === "−" ? "−" : "") : " " + p.signo + " ") + p.txt)
        .join("");

    return { nodo: n, texto };
  });
}
