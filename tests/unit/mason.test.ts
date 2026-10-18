import { describe, it, expect } from "vitest";
import { analizarMason, ecuacionesNodales } from "../../src/core/mason/mason.ts";
import type { SenalNodo, SenalRama } from "../../src/core/schemas/document.schema.ts";

describe("Motor de Análisis de Mason (Core)", () => {
  it("resuelve un sistema de lazo simple con realimentación negativa", () => {
    // Grafo: R (in) -> A -> B -> Y (out)
    // Rama R->A: 1
    // Rama A->B: G
    // Rama B->Y: 1
    // Lazo B->A: -H
    const nodos: SenalNodo[] = [
      { id: "nR", nombre: "r", x: 0, y: 0, tipo: "entrada" },
      { id: "nA", nombre: "a", x: 100, y: 0, tipo: "normal" },
      { id: "nB", nombre: "b", x: 200, y: 0, tipo: "normal" },
      { id: "nY", nombre: "y", x: 300, y: 0, tipo: "salida" }
    ];

    const ramas: SenalRama[] = [
      { id: "r1", de: "nR", a: "nA", g: "1", curva: 0 },
      { id: "r2", de: "nA", a: "nB", g: "G", curva: 0 },
      { id: "r3", de: "nB", a: "nY", g: "1", curva: 0 },
      { id: "r4", de: "nB", a: "nA", g: "-H", curva: -20 }
    ];

    const res = analizarMason(nodos, ramas);

    // 1 trayectoria directa
    expect(res.P.length).toBe(1);
    expect(res.P[0].gan).toBe("G");

    // 1 lazo: A -> B -> A
    expect(res.L.length).toBe(1);
    expect(res.L[0].gan).toBe("G·(-H)");

    // Determinante delta = 1 - L1
    expect(res.deltaTexto).toBe("1 − L1");

    // Cofactor de P1 (el lazo toca a la trayectoria, por lo que libres = 0 y det = 1)
    expect(res.cof[0].libres.length).toBe(0);
  });

  it("calcula valores numéricos de delta y lazos cuando las ganancias son numéricas", () => {
    const nodos: SenalNodo[] = [
      { id: "nR", nombre: "r", x: 0, y: 0, tipo: "entrada" },
      { id: "nA", nombre: "a", x: 100, y: 0, tipo: "normal" },
      { id: "nY", nombre: "y", x: 200, y: 0, tipo: "salida" }
    ];

    const ramas: SenalRama[] = [
      { id: "r1", de: "nR", a: "nA", g: "2", curva: 0 },
      { id: "r2", de: "nA", a: "nY", g: "3", curva: 0 },
      { id: "r3", de: "nA", a: "nA", g: "0.5", curva: 40 } // Autolazo
    ];

    const res = analizarMason(nodos, ramas);
    expect(res.P[0].valor).toBe(6); // 2 * 3
    expect(res.L[0].valor).toBe(0.5); // 0.5
    expect(res.deltaValor).toBe(0.5); // 1 - 0.5 = 0.5
  });

  it("genera el sistema de ecuaciones nodales algebraico", () => {
    const nodos: SenalNodo[] = [
      { id: "nR", nombre: "r", x: 0, y: 0, tipo: "entrada" },
      { id: "nA", nombre: "a", x: 100, y: 0, tipo: "normal" }
    ];

    const ramas: SenalRama[] = [
      { id: "r1", de: "nR", a: "nA", g: "-5", curva: 0 }
    ];

    const eqs = ecuacionesNodales(nodos, ramas);
    expect(eqs.length).toBe(2);
    expect(eqs[0].texto).toBe("r = entrada del sistema");
    expect(eqs[1].texto).toBe("a = −5·r");
  });
});
