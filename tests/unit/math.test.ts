import { describe, it, expect } from "vitest";
import { parsearEcuacion, estimarDimensiones } from "../../src/core/math/parser.ts";

describe("Parser de Ecuaciones Matemáticas (Core)", () => {
  it("parsea fracciones simples y anidadas", () => {
    const ast = parsearEcuacion("K/(s+1)");
    expect(ast.length).toBe(1);
    expect(ast[0].t).toBe("frac");
    if (ast[0].t === "frac") {
      expect(ast[0].num[0]).toEqual({ t: "run", s: "K" });
      expect(ast[0].den[0]).toEqual({ t: "run", s: "s" });
    }
  });

  it("reconoce comandos LaTeX de símbolos griegos", () => {
    const ast = parsearEcuacion("\\omega_n");
    expect(ast[0]).toEqual({ t: "run", s: "ω" });
  });

  it("calcula dimensiones de cajas con mayor altura para fracciones", () => {
    const cajaSimple = estimarDimensiones("G");
    const cajaFrac = estimarDimensiones("K/(s+1)");
    expect(cajaFrac.up + cajaFrac.down).toBeGreaterThan(cajaSimple.up + cajaSimple.down);
  });
});
