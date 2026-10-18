import { describe, it, expect } from "vitest";
import { cleanPts, segsOf, segRect, pathD } from "../../src/core/routing/orthogonal.ts";

describe("Ruteo Ortogonal (Core)", () => {
  it("limpia puntos colineales y redundantes", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 }, // colineal horizontal
      { x: 20, y: 15 },
      { x: 20, y: 30 }  // colineal vertical
    ];

    const clean = cleanPts(pts);
    expect(clean.length).toBe(3);
    expect(clean[0]).toEqual({ x: 0, y: 0 });
    expect(clean[1]).toEqual({ x: 20, y: 0 });
    expect(clean[2]).toEqual({ x: 20, y: 30 });
  });

  it("detecta colisión de segmentos contra rectángulos de obstáculos", () => {
    const obstacle = { l: 50, r: 100, t: 50, b: 100 };
    // Segmento que atraviesa el obstáculo
    const segIntersecta: [{ x: number; y: number }, { x: number; y: number }] = [
      { x: 20, y: 70 },
      { x: 120, y: 70 }
    ];
    // Segmento lejos del obstáculo
    const segLejos: [{ x: number; y: number }, { x: number; y: number }] = [
      { x: 10, y: 10 },
      { x: 40, y: 10 }
    ];

    expect(segRect(segIntersecta, obstacle)).toBe(true);
    expect(segRect(segLejos, obstacle)).toBe(false);
  });

  it("genera comando SVG pathD con esquinas redondeadas", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 }
    ];
    const d = pathD(pts, 5);
    expect(d).toContain("M 0 0");
    expect(d).toContain("Q 50 0");
    expect(d).toContain("L 50 50");
  });
});
