/* ===================================================================
   Síntesis de Diagrama de Bloques Equivalente a partir de un SFG
   Preservado y tipado con TypeScript puro desacoplado del DOM.
   =================================================================== */

import type {
  SenalNodo,
  SenalRama,
  BloqueNodo,
  BloqueFlecha,
  DocumentoBloques
} from "../schemas/document.schema.ts";

const MENOS = "−";
const aGrilla = (v: number) => Math.round(v / 20) * 20;
const ALTO_BLOQUE = 40,
  ANCHO_SUMA = 50,
  ALTO_SUMA = 50;
const AIRE = 20,
  AIRE_X = 30;
const PISO_ARCO = 60;

const anchoTextoAprox = (s: string, tam: number) =>
  Math.max(26, s.length * tam * 0.55);

function etiquetaDeRama(r: SenalRama, destino?: BloqueNodo): string {
  const g = String(r.g == null ? "1" : r.g).trim();
  return destino && destino.type === "sum" && /^-/.test(g) ? g.slice(1).trim() : g;
}

function ladoDeRama(
  r: SenalRama,
  nodosMap: Map<string, SenalNodo>
): "b" | "recto" | "t" {
  if (r.de === r.a) return "b";
  const A = nodosMap.get(r.de);
  const B = nodosMap.get(r.a);
  if (!A || !B) return "recto";
  if (!r.curva) return B.x >= A.x ? "recto" : "b";
  return B.x >= A.x ? "t" : "b";
}

function xLibre(bl: BloqueNodo, x1: number, x2: number, puestos: BloqueNodo[]): number | null {
  const estorban = puestos.filter(e => Math.abs(e.y - bl.y) < (e.h + bl.h) / 2 + AIRE);
  const choca = (x: number) => estorban.some(e => Math.abs(e.x - x) < (e.w + bl.w) / 2 + AIRE);
  const centro = (x1 + x2) / 2;
  const alcance = Math.max(0, (x2 - x1) / 2);
  for (let d = 0; d <= alcance; d += AIRE) {
    for (const x of d ? [centro - d, centro + d] : [centro]) {
      if (!choca(aGrilla(x))) return aGrilla(x);
    }
  }
  return null;
}

export function equivalenteEnBloques(
  nodos: SenalNodo[],
  ramas: SenalRama[],
  nombre: string = "diagrama-senales"
): DocumentoBloques {
  const nodes: BloqueNodo[] = [];
  const edges: BloqueFlecha[] = [];
  let c = 0;
  const nid = () => "bn" + ++c;
  const eid = () => "be" + ++c;

  const nodosMap = new Map(nodos.map(n => [n.id, n]));
  const entraEn = new Map<string, BloqueNodo>();
  const saleDe = new Map<string, BloqueNodo>();
  const cadenaDe = new Map<string, BloqueNodo[]>();
  const destino = new Map<string, { el: BloqueNodo; p: "l" | "r" | "t" | "b" }>();

  let pasoY = Infinity;
  for (const a of nodos) {
    for (const b of nodos) {
      if (a !== b && Math.abs(a.y - b.y) > 1) {
        pasoY = Math.min(pasoY, Math.abs(a.y - b.y));
      }
    }
  }
  const escY = isFinite(pasoY) ? Math.max(1, (ALTO_SUMA + 2 * AIRE) / pasoY) : 1;
  const gy = (v: number) => aGrilla(v * escY);

  const agregar = (e: BloqueNodo): BloqueNodo => {
    nodes.push(e);
    return e;
  };

  const unir = (
    A: BloqueNodo,
    pA: "l" | "r" | "t" | "b",
    B: BloqueNodo,
    pB: "l" | "r" | "t" | "b"
  ) => {
    edges.push({
      id: eid(),
      from: { id: A.id, port: pA },
      to: { id: B.id, port: pB },
      variant: 0,
      label: ""
    });
  };

  const enOrden = nodos.slice().sort((a, b) => a.x - b.x);

  for (const n of enOrden) {
    const ent = ramas.filter(r => r.a === n.id);
    const sal = ramas.filter(r => r.de === n.id);
    const base = (): BloqueNodo => ({
      id: nid(),
      type: "block",
      x: 0,
      y: gy(n.y),
      w: 72,
      h: 42,
      label: "",
      font: 14
    });

    const io = (): BloqueNodo =>
      agregar({
        ...base(),
        type: "io",
        w: anchoTextoAprox(n.nombre, 14) + 12,
        h: 20,
        label: n.nombre
      });

    const sumador = (ramasSum: SenalRama[], encadenado: boolean): BloqueNodo => {
      const signos: Record<string, string> = {
        l: encadenado ? "+" : "",
        t: "",
        r: "",
        b: ""
      };
      const prefe: Record<string, ("l" | "t" | "r" | "b")[]> = {
        recto: ["l", "t", "b"],
        t: ["t", "l", "b"],
        b: ["b", "l", "t"]
      };

      const el = agregar({
        ...base(),
        type: "sum",
        w: ANCHO_SUMA,
        h: ALTO_SUMA,
        font: 13,
        signs: signos as any,
        cross: true
      });

      for (const r of ramasSum) {
        const lado = ladoDeRama(r, nodosMap);
        const p = (prefe[lado] || prefe.recto).find(q => !signos[q]) || "l";
        signos[p] = /^\s*-/.test(String(r.g)) ? MENOS : "+";
        destino.set(r.id, { el, p });
      }
      return el;
    };

    let cadena: BloqueNodo[];
    const autolazo = ent.some(r => r.de === n.id);

    if (n.tipo === "entrada" || !ent.length) {
      cadena = [io()];
    } else if (n.tipo === "salida" && ent.length === 1 && !autolazo) {
      cadena = [io()];
    } else if (ent.length >= 2 || n.tipo === "salida") {
      const resto = ent.slice();
      cadena = [];
      while (resto.length) {
        const s = sumador(resto.splice(0, cadena.length ? 2 : 3), cadena.length > 0);
        if (cadena.length) {
          unir(cadena[cadena.length - 1], "r", s, "l");
        }
        cadena.push(s);
      }
      const ultimo = cadena[cadena.length - 1];
      if (n.tipo === "salida") {
        cadena.push(io());
        unir(ultimo, "r", cadena[cadena.length - 1], "l");
      } else if (sal.length >= 2) {
        cadena.push(agregar({ ...base(), type: "node", w: 10, h: 10 }));
        unir(ultimo, "r", cadena[cadena.length - 1], "l");
      }
    } else {
      cadena = [agregar({ ...base(), type: "node", w: 10, h: 10 })];
    }

    cadenaDe.set(n.id, cadena);
    entraEn.set(n.id, cadena[0]);
    saleDe.set(n.id, cadena[cadena.length - 1]);
  }

  // Acomodo horizontal
  const bloqueDeRecta = new Map<string, BloqueNodo>();
  let borde = 0;
  const apoyar = (e: BloqueNodo, aire: number) => {
    e.x = aGrilla(borde + aire + e.w / 2);
    if (e.x - e.w / 2 < borde + aire - 0.5) e.x += 20;
    borde = e.x + e.w / 2;
  };

  const llegadaDe = (r: SenalRama) =>
    destino.has(r.id) ? destino.get(r.id)!.el : entraEn.get(r.a);

  enOrden.forEach((n, i) => {
    const cadena = cadenaDe.get(n.id);
    if (!cadena) return;
    apoyar(cadena[0], i === 0 ? -cadena[0].w / 2 : AIRE_X);
    for (const e of cadena.slice(1)) apoyar(e, AIRE);
    const sig = enOrden[i + 1];
    if (!sig) return;
    const r = ramas.find(
      x => x.de === n.id && x.a === sig.id && ladoDeRama(x, nodosMap) === "recto"
    );
    const et = r && etiquetaDeRama(r, llegadaDe(r));
    if (!et || et === "1") return;
    const bl = agregar({
      id: nid(),
      type: "block",
      h: ALTO_BLOQUE,
      font: 15,
      label: et,
      w: anchoTextoAprox(et, 15) + 30,
      x: 0,
      y: gy((n.y + sig.y) / 2)
    });
    apoyar(bl, AIRE_X);
    bloqueDeRecta.set(r.id, bl);
  });

  // Alturas de arcos
  const alturaDeArco = new Map<string, number>();
  const puestos: { t: any[]; b: any[] } = { t: [], b: [] };

  const franjaDe = (r: SenalRama) => {
    const A = saleDe.get(r.de);
    const B = llegadaDe(r);
    if (!A || !B) return null;
    const et = etiquetaDeRama(r, B);
    const lleva = et !== "1" && et !== "";
    const ancho = lleva ? anchoTextoAprox(et, 15) + 30 : 0;
    const bx = r.de === r.a ? A.x : (A.x + B.x) / 2;
    return {
      x1: Math.min(A.x, B.x),
      x2: Math.max(A.x, B.x),
      bx1: lleva ? bx - ancho / 2 : 0,
      bx2: lleva ? bx + ancho / 2 : -1
    };
  };

  ramas
    .filter(r => ladoDeRama(r, nodosMap) !== "recto")
    .map(r => ({ r, f: franjaDe(r) }))
    .filter((o): o is { r: SenalRama; f: NonNullable<ReturnType<typeof franjaDe>> } => !!o.f)
    .sort((a, b) => a.f.x2 - a.f.x1 - (b.f.x2 - b.f.x1))
    .forEach(({ r, f }) => {
      const lado = ladoDeRama(r, nodosMap);
      const lista = lado === "t" ? puestos.t : puestos.b;
      let h = PISO_ARCO;
      while (
        lista.some(c => {
          const lineas = Math.min(c.x2, f.x2) - Math.max(c.x1, f.x1) > 4;
          const bloques = Math.min(c.bx2, f.bx2) - Math.max(c.bx1, f.bx1) > -AIRE;
          if (!lineas && !bloques) return false;
          return Math.abs(c.h - h) < (bloques ? ALTO_BLOQUE + AIRE : AIRE);
        })
      ) {
        h += AIRE;
      }
      lista.push({ h, ...f });
      alturaDeArco.set(r.id, h);
    });

  for (const r of ramas) {
    const A = saleDe.get(r.de);
    const B = llegadaDe(r);
    if (!A || !B) continue;
    const etiqueta = etiquetaDeRama(r, B);
    const lado = ladoDeRama(r, nodosMap);
    const pSal: "l" | "r" | "t" | "b" = lado === "recto" ? "r" : lado;
    const pEnt: "l" | "r" | "t" | "b" = destino.has(r.id)
      ? destino.get(r.id)!.p
      : lado === "recto"
      ? "l"
      : lado;

    if (etiqueta === "1" || etiqueta === "") {
      unir(A, pSal, B, pEnt);
      continue;
    }

    let bl = bloqueDeRecta.get(r.id);
    if (!bl) {
      bl = {
        id: nid(),
        type: "block",
        h: ALTO_BLOQUE,
        font: 15,
        label: etiqueta,
        w: anchoTextoAprox(etiqueta, 15) + 30,
        x: 0,
        y: 0
      };
      const x1 = Math.min(A.x, B.x);
      const x2 = Math.max(A.x, B.x);
      let hueco = alturaDeArco.get(r.id) || PISO_ARCO;
      let x: number | null = null;
      for (let intento = 0; intento < 10 && x === null; intento++, hueco += AIRE) {
        bl.y = aGrilla(lado === "t" ? Math.min(A.y, B.y) - hueco : Math.max(A.y, B.y) + hueco);
        x = r.de === r.a ? aGrilla(A.x) : xLibre(bl, x1, x2, nodes);
      }
      bl.x = x === null ? aGrilla((x1 + x2) / 2) : x;
      agregar(bl);
    }

    const entraAlBloque: "l" | "r" = lado === "b" ? "r" : "l";
    const saleDelBloque: "l" | "r" = lado === "b" ? "l" : "r";
    unir(A, pSal, bl, entraAlBloque);
    unir(bl, saleDelBloque, B, pEnt);
  }

  return {
    nombre: nombre + "-bloques",
    nodes,
    edges,
    tema: {
      relleno: "#ffffff",
      borde: "#101418",
      texto: "#101418",
      flecha: "#101418",
      fondo: "#ffffff"
    },
    hoja: null
  };
}
