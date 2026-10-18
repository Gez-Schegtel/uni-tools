import { describe, it, expect } from "vitest";
import {
  getNodeDimensions,
  getComponentPins,
  getPinWorldPosition,
  computeOrthogonalRoute,
  getGateSvgPath,
  getXorBackArc
} from "../../src/ui/canvas/geometry.ts";

describe("Geometría de Componentes y Ruteo Ortogonal", () => {
  it("calcula dimensiones base precisas según tipo de nodo", () => {
    expect(getNodeDimensions({ type: "in" })).toEqual({ w: 54, h: 32 });
    expect(getNodeDimensions({ type: "out" })).toEqual({ w: 36, h: 36 });
    expect(getNodeDimensions({ type: "and" })).toEqual({ w: 60, h: 44 });
    expect(getNodeDimensions({ type: "ff", kind: "d" })).toEqual({ w: 100, h: 88 });
    expect(getNodeDimensions({ type: "ff", kind: "jk" })).toEqual({ w: 100, h: 114 });
  });

  it("genera los pines correctos para compuertas básicas y biestables", () => {
    // Compuerta AND de 2 entradas
    const andPins = getComponentPins({ type: "and", pins: 2 });
    expect(andPins).toHaveLength(3); // 2 in + 1 out
    expect(andPins.filter(p => p.type === "in")).toHaveLength(2);
    expect(andPins.find(p => p.type === "out")?.id).toBe("out:0");

    // Inversor NOT (1 entrada)
    const notPins = getComponentPins({ type: "not" });
    expect(notPins).toHaveLength(2); // 1 in + 1 out
    expect(notPins[0].type).toBe("in");
    expect(notPins[1].type).toBe("out");

    // Flip-Flop JK (J, CLK, K en entrada; Q, Q̄ en salida)
    const jkPins = getComponentPins({ type: "ff", kind: "jk" });
    expect(jkPins).toHaveLength(5);
    const inPins = jkPins.filter(p => p.type === "in");
    expect(inPins).toHaveLength(3);
    expect(inPins[0].label).toBe("J");
    expect(inPins[1].label).toBe("CLK");
    expect(inPins[1].isClk).toBe(true);
    expect(inPins[2].label).toBe("K");

    const outPins = jkPins.filter(p => p.type === "out");
    expect(outPins).toHaveLength(2);
    expect(outPins[0].label).toBe("Q");
    expect(outPins[1].label).toBe("Q̄");
  });

  it("calcula coordenadas de pines en el espacio mundo", () => {
    const node = { id: "and1", type: "and", x: 200, y: 150, pins: 2 };
    const outPos = getPinWorldPosition(node, "o", "out");
    expect(outPos.pt.x).toBeGreaterThan(200);
    expect(outPos.pt.y).toBe(150);
    expect(outPos.dir).toEqual({ x: 1, y: 0 });

    const in0Pos = getPinWorldPosition(node, 0, "in");
    expect(in0Pos.pt.x).toBeLessThan(200);
    expect(in0Pos.dir).toEqual({ x: -1, y: 0 });
  });

  it("rutea conexiones de forma ortogonal en ángulo recto con esquinas curvadas", () => {
    const p1 = { x: 100, y: 100 };
    const p2 = { x: 300, y: 200 };
    const ruta = computeOrthogonalRoute(p1, p2, { x: 1, y: 0 }, { x: -1, y: 0 });

    expect(ruta).toMatch(/^M 100 100/);
    expect(ruta).toContain("Q"); // Verifica esquinas redondeadas
    expect(ruta).toMatch(/L 300 200$/);
  });

  it("produce rutas de esquiva para bucles de realimentación hacia atrás", () => {
    const p1 = { x: 300, y: 100 };
    const p2 = { x: 100, y: 100 };
    const rutaFeedback = computeOrthogonalRoute(p1, p2, { x: 1, y: 0 }, { x: -1, y: 0 });

    expect(rutaFeedback).toMatch(/^M 300 100/);
    expect(rutaFeedback).toContain("Q");
    expect(rutaFeedback).toMatch(/L 100 100$/);
  });

  it("genera comandos SVG ANSI válidos para compuertas", () => {
    const andPath = getGateSvgPath("and", 60, 44);
    expect(andPath).toContain("A"); // Arco semicircular
    expect(andPath).toContain("Z");

    const orPath = getGateSvgPath("or", 62, 46);
    expect(orPath).toContain("C"); // Curvas Bezier
    expect(orPath).toContain("Q");

    const xorArc = getXorBackArc(66, 46);
    expect(xorArc).toContain("M");
    expect(xorArc).toContain("Q");
  });
});
