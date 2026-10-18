import { pathD, type Punto } from "../../core/routing/orthogonal.ts";

/* ===================================================================
   Geometría de Pines, Puertos y Ruteo Ortogonal para el Lienzo
   =================================================================== */

export interface PinInfo {
  id: string; // ej: "in:0", "in:1", "out:0", "out:1"
  type: "in" | "out" | "port";
  index: number | string;
  x: number; // coordenadas relativas al centro del nodo
  y: number;
  label?: string;
  isClk?: boolean;
  dir?: { x: number; y: number };
}

export const STUB = 12;

/**
 * Dimensiones base de cada tipo de componente
 */
export function getNodeDimensions(node: any): { w: number; h: number } {
  if (node.w && node.h) return { w: node.w, h: node.h };

  switch (node.type) {
    case "in":
      return { w: 54, h: 32 };
    case "out":
      return { w: 36, h: 36 };
    case "clk":
      return { w: 54, h: 32 };
    case "and":
    case "nand":
      return { w: 60, h: 44 };
    case "or":
    case "nor":
      return { w: 62, h: 46 };
    case "xor":
    case "xnor":
      return { w: 66, h: 46 };
    case "not":
    case "buf":
      return { w: 48, h: 36 };
    case "ff": {
      const pinsCount = (node.kind === "jk" || node.kind === "sr") ? 3 : 2;
      return { w: 100, h: 36 + pinsCount * 26 };
    }
    case "half-adder":
    case "full-adder":
      return { w: 90, h: 64 };
    case "block":
      return { w: 76, h: 44 };
    case "sum":
      return { w: 50, h: 50 };
    case "node":
      return { w: 14, h: 14 };
    default:
      return { w: 64, h: 40 };
  }
}

/**
 * Calcula los pines locales de un componente
 */
export function getComponentPins(node: any): PinInfo[] {
  const { w, h } = getNodeDimensions(node);
  const pins: PinInfo[] = [];

  // 1. Simulador Lógico: Conmutadores y Sondas
  if (node.type === "in") {
    pins.push({
      id: "out:0",
      type: "out",
      index: "o",
      x: w / 2 + STUB,
      y: 0,
      dir: { x: 1, y: 0 }
    });
    return pins;
  }

  if (node.type === "out") {
    pins.push({
      id: "in:0",
      type: "in",
      index: 0,
      x: -w / 2 - STUB,
      y: 0,
      dir: { x: -1, y: 0 }
    });
    return pins;
  }

  if (node.type === "clk") {
    pins.push({
      id: "out:0",
      type: "out",
      index: "o",
      x: w / 2 + STUB,
      y: 0,
      dir: { x: 1, y: 0 }
    });
    return pins;
  }

  // 2. Compuertas Lógicas Combinacionales
  if (/^(and|nand|or|nor|xor|xnor|not|buf)$/.test(node.type)) {
    const isSingleInput = node.type === "not" || node.type === "buf";
    const inCount = isSingleInput ? 1 : (node.pins || 2);
    const bubbleOffset = /^(nand|nor|xnor|not)$/.test(node.type) ? 7 : 0;

    // Pines de entrada (a la izquierda)
    for (let i = 0; i < inCount; i++) {
      const y = inCount === 1 ? 0 : -h / 2 + (h * (i + 1)) / (inCount + 1);
      pins.push({
        id: `in:${i}`,
        type: "in",
        index: i,
        x: -w / 2 - STUB,
        y,
        dir: { x: -1, y: 0 }
      });
    }

    // Pin de salida (a la derecha)
    pins.push({
      id: "out:0",
      type: "out",
      index: "o",
      x: w / 2 + bubbleOffset + STUB,
      y: 0,
      dir: { x: 1, y: 0 }
    });
    return pins;
  }

  // 3. Biestables / Flip-Flops (D, JK, T, SR)
  if (node.type === "ff") {
    const kind = node.kind || "d";
    let inputDefs: { n: string; clk?: boolean }[] = [];

    if (kind === "d") inputDefs = [{ n: "D" }, { n: "CLK", clk: true }];
    else if (kind === "t") inputDefs = [{ n: "T" }, { n: "CLK", clk: true }];
    else if (kind === "jk") inputDefs = [{ n: "J" }, { n: "CLK", clk: true }, { n: "K" }];
    else if (kind === "sr") inputDefs = [{ n: "S" }, { n: "CLK", clk: true }, { n: "R" }];

    // Entradas en la izquierda
    inputDefs.forEach((def, i) => {
      const y = -h / 2 + 30 + i * 26;
      pins.push({
        id: `in:${i}`,
        type: "in",
        index: i,
        x: -w / 2 - STUB,
        y,
        label: def.n,
        isClk: def.clk,
        dir: { x: -1, y: 0 }
      });
    });

    // Salidas Q y Q̄ en la derecha
    pins.push({
      id: "out:0",
      type: "out",
      index: "o0",
      x: w / 2 + STUB,
      y: -h / 2 + 32,
      label: "Q",
      dir: { x: 1, y: 0 }
    });
    pins.push({
      id: "out:1",
      type: "out",
      index: "o1",
      x: w / 2 + STUB,
      y: h / 2 - 24,
      label: "Q̄",
      dir: { x: 1, y: 0 }
    });
    return pins;
  }

  // 4. Bloques de Diagrama de Control
  if (node.type === "block" || node.type === "io") {
    pins.push({ id: "in:l", type: "in", index: "l", x: -w / 2, y: 0, dir: { x: -1, y: 0 } });
    pins.push({ id: "out:r", type: "out", index: "r", x: w / 2, y: 0, dir: { x: 1, y: 0 } });
    return pins;
  }

  if (node.type === "sum") {
    const r = w / 2;
    pins.push({ id: "in:l", type: "in", index: "l", x: -r, y: 0, label: node.signs?.l, dir: { x: -1, y: 0 } });
    pins.push({ id: "in:t", type: "in", index: "t", x: 0, y: -r, label: node.signs?.t, dir: { x: 0, y: -1 } });
    pins.push({ id: "in:b", type: "in", index: "b", x: 0, y: r, label: node.signs?.b, dir: { x: 0, y: 1 } });
    pins.push({ id: "out:r", type: "out", index: "r", x: r, y: 0, label: node.signs?.r || "+", dir: { x: 1, y: 0 } });
    return pins;
  }

  if (node.type === "node") {
    pins.push({ id: "port:c", type: "port", index: "c", x: 0, y: 0, dir: { x: 1, y: 0 } });
    return pins;
  }

  // 5. Señales (SFG)
  if (node.tipo !== undefined) {
    pins.push({ id: "out:r", type: "out", index: "r", x: 10, y: 0, dir: { x: 1, y: 0 } });
    pins.push({ id: "in:l", type: "in", index: "l", x: -10, y: 0, dir: { x: -1, y: 0 } });
    return pins;
  }

  return pins;
}

/**
 * Obtiene la coordenada absoluta y dirección de un pin en el espacio mundo
 */
export function getPinWorldPosition(
  node: any,
  pinIdOrIndex: string | number | undefined,
  preferredType: "in" | "out" = "out"
): { pt: Punto; dir: { x: number; y: number }; pin?: PinInfo } {
  const pins = getComponentPins(node);

  if (pinIdOrIndex !== undefined && pinIdOrIndex !== null) {
    // Coincidencia exacta por id o index
    const exact = pins.find(p => p.id === pinIdOrIndex || p.index === pinIdOrIndex);
    if (exact) {
      return {
        pt: { x: node.x + exact.x, y: node.y + exact.y },
        dir: exact.dir || (exact.type === "out" ? { x: 1, y: 0 } : { x: -1, y: 0 }),
        pin: exact
      };
    }

    // Coincidencia por "o", "o0", "o1"
    if (typeof pinIdOrIndex === "string" && pinIdOrIndex.startsWith("o")) {
      const idx = pinIdOrIndex === "o" ? 0 : +pinIdOrIndex.slice(1);
      const outPin = pins.find(p => p.type === "out" && (p.index === pinIdOrIndex || p.index === idx || p.id === `out:${idx}`));
      if (outPin) {
        return {
          pt: { x: node.x + outPin.x, y: node.y + outPin.y },
          dir: outPin.dir || { x: 1, y: 0 },
          pin: outPin
        };
      }
    }

    // Coincidencia por índice numérico de entrada
    if (typeof pinIdOrIndex === "number" || /^\d+$/.test(String(pinIdOrIndex))) {
      const inPin = pins.find(p => p.type === preferredType && p.index === +pinIdOrIndex);
      if (inPin) {
        return {
          pt: { x: node.x + inPin.x, y: node.y + inPin.y },
          dir: inPin.dir || { x: -1, y: 0 },
          pin: inPin
        };
      }
    }
  }

  // Fallback
  const fallback = pins.find(p => p.type === preferredType) || pins[0] || { x: 0, y: 0, type: "out", dir: { x: 1, y: 0 } };
  return {
    pt: { x: node.x + fallback.x, y: node.y + fallback.y },
    dir: fallback.dir || { x: 1, y: 0 },
    pin: fallback as PinInfo
  };
}

/**
 * Limpia puntos duplicados o colineales consecutivos en un trazado ortogonal
 */
export function cleanOrthogonalPoints(pts: Punto[]): Punto[] {
  if (!pts || pts.length < 2) return pts || [];
  const out: Punto[] = [pts[0]];

  for (let i = 1; i < pts.length; i++) {
    const prev = out[out.length - 1];
    const curr = pts[i];
    // Evitar puntos duplicados
    if (Math.abs(prev.x - curr.x) < 0.5 && Math.abs(prev.y - curr.y) < 0.5) {
      continue;
    }
    out.push(curr);
  }

  // Eliminar puntos colineales redundantes en medio de tramos rectos
  const res: Punto[] = [];
  for (let i = 0; i < out.length; i++) {
    if (i > 0 && i < out.length - 1) {
      const a = out[i - 1];
      const b = out[i];
      const c = out[i + 1];
      const colinearX = Math.abs(a.x - b.x) < 0.5 && Math.abs(b.x - c.x) < 0.5;
      const colinearY = Math.abs(a.y - b.y) < 0.5 && Math.abs(b.y - c.y) < 0.5;
      if (colinearX || colinearY) continue;
    }
    res.push(out[i]);
  }

  return res;
}

export interface WireSegment {
  index: number;
  p1: Punto;
  p2: Punto;
  mid: Punto;
  isVertical: boolean;
  len: number;
}

/**
 * Calcula los vértices ortogonales a 90° cuadrados para una conexión
 */
export function computeOrthogonalPoints(
  p1: Punto,
  p2: Punto,
  dir1: { x: number; y: number } = { x: 1, y: 0 },
  dir2: { x: number; y: number } = { x: -1, y: 0 },
  manualMidX?: number,
  manualMidY?: number
): Punto[] {
  const pts: Punto[] = [p1];

  // Distancia mínima de salida del puerto (stub)
  const stubLen = 14;
  const start = { x: p1.x + dir1.x * stubLen, y: p1.y + dir1.y * stubLen };
  const end = { x: p2.x + dir2.x * stubLen, y: p2.y + dir2.y * stubLen };

  pts.push(start);

  if (dir1.x === 1 && dir2.x === -1) {
    if (start.x + 8 < end.x) {
      // Caso directo hacia adelante: quiebre vertical
      const midX = manualMidX !== undefined ? manualMidX : Math.round((start.x + end.x) / 40) * 20;
      pts.push({ x: midX, y: start.y });
      pts.push({ x: midX, y: end.y });
    } else {
      // Retorno hacia atrás / realimentación: esquiva por arriba o abajo
      const defaultDetourY = Math.abs(start.y - end.y) < 30
        ? start.y + 44
        : (start.y > end.y ? start.y + 36 : start.y - 36);
      const detourY = manualMidY !== undefined ? manualMidY : defaultDetourY;
      const x1 = manualMidX !== undefined ? manualMidX : start.x + 16;
      pts.push({ x: x1, y: start.y });
      pts.push({ x: x1, y: detourY });
      pts.push({ x: end.x - 16, y: detourY });
      pts.push({ x: end.x - 16, y: end.y });
    }
  } else {
    // Otros alineamientos
    if (dir1.x !== 0 && dir2.y !== 0) {
      pts.push({ x: end.x, y: start.y });
    } else if (dir1.y !== 0 && dir2.x !== 0) {
      pts.push({ x: start.x, y: end.y });
    } else {
      const midX = manualMidX !== undefined ? manualMidX : (start.x + end.x) / 2;
      pts.push({ x: midX, y: start.y });
      pts.push({ x: midX, y: end.y });
    }
  }

  pts.push(end);
  pts.push(p2);

  return cleanOrthogonalPoints(pts);
}

/**
 * Obtiene los segmentos individuales (tramos) de un cable para permitir su arrastre
 */
export function getWireSegments(pts: Punto[]): WireSegment[] {
  const segments: WireSegment[] = [];
  if (!pts || pts.length < 2) return segments;

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const isVertical = Math.abs(a.x - b.x) < 0.5;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    segments.push({
      index: i,
      p1: a,
      p2: b,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      isVertical,
      len
    });
  }

  return segments;
}

/**
 * Obtiene los vértices intermedios (esquinas a 90°) donde es posible abrir bifurcaciones
 */
export function getWireCorners(pts: Punto[]): { pt: Punto; index: number }[] {
  if (!pts || pts.length <= 2) return [];
  const corners: { pt: Punto; index: number }[] = [];
  for (let i = 1; i < pts.length - 1; i++) {
    corners.push({ pt: pts[i], index: i });
  }
  return corners;
}

/**
 * Ruteo ortogonal en ángulo recto estrictamente cuadrado (radio 0)
 */
export function computeOrthogonalRoute(
  p1: Punto,
  p2: Punto,
  dir1: { x: number; y: number } = { x: 1, y: 0 },
  dir2: { x: number; y: number } = { x: -1, y: 0 },
  manualMidX?: number,
  manualMidY?: number
): string {
  const pts = computeOrthogonalPoints(p1, p2, dir1, dir2, manualMidX, manualMidY);
  // Radio 0 = esquinas 100% cuadradas a 90° sin curvas redondeadas
  return pathD(pts, 0);
}

/**
 * Genera la forma SVG estándar (ANSI/IEEE) para compuertas lógicas
 */
export function getGateSvgPath(type: string, w: number, h: number): string {
  const l = -w / 2;
  const r = w / 2;
  const t = -h / 2;
  const b = h / 2;

  if (type === "and" || type === "nand") {
    return `M ${l} ${t} H ${r - h / 2} A ${h / 2} ${h / 2} 0 0 1 ${r - h / 2} ${b} H ${l} Z`;
  }

  if (type === "or" || type === "nor") {
    return `M ${l} ${t} C ${l + w * 0.45} ${t} ${l + w * 0.85} ${t * 0.5} ${r} 0` +
      ` C ${l + w * 0.85} ${b * 0.5} ${l + w * 0.45} ${b} ${l} ${b}` +
      ` Q ${l + w * 0.28} 0 ${l} ${t} Z`;
  }

  if (type === "xor" || type === "xnor") {
    return `M ${l} ${t} C ${l + w * 0.45} ${t} ${l + w * 0.85} ${t * 0.5} ${r} 0` +
      ` C ${l + w * 0.85} ${b * 0.5} ${l + w * 0.45} ${b} ${l} ${b}` +
      ` Q ${l + w * 0.28} 0 ${l} ${t} Z`;
  }

  if (type === "not" || type === "buf") {
    return `M ${l} ${t} L ${r} 0 L ${l} ${b} Z`;
  }

  return `M ${l} ${t} H ${r} V ${b} H ${l} Z`;
}

/**
 * Retorna el arco curvo trasero desfasado para compuertas XOR y XNOR
 */
export function getXorBackArc(w: number, h: number): string {
  const l = -w / 2 - 6;
  const t = -h / 2;
  const b = h / 2;
  return `M ${l} ${t} Q ${l + w * 0.28} 0 ${l} ${b}`;
}
