import { describe, it, expect } from "vitest";
import { equivalenteEnBloques } from "../../src/core/mason/synthesis.ts";
import type { SenalNodo, SenalRama } from "../../src/core/schemas/document.schema.ts";

describe("Síntesis de Diagrama de Bloques Equivalente (Core)", () => {
  it("sintetiza bloques y sumadores para un lazo cerrado con realimentación", () => {
    const nodos: SenalNodo[] = [
      { id: "nR", nombre: "r", x: 0, y: 0, tipo: "entrada" },
      { id: "nA", nombre: "a", x: 100, y: 0, tipo: "normal" },
      { id: "nY", nombre: "y", x: 200, y: 0, tipo: "salida" }
    ];

    const ramas: SenalRama[] = [
      { id: "r1", de: "nR", a: "nA", g: "1", curva: 0 },
      { id: "r2", de: "nA", a: "nY", g: "G", curva: 0 },
      { id: "r3", de: "nY", a: "nA", g: "-H", curva: -20 }
    ];

    const doc = equivalenteEnBloques(nodos, ramas, "mi-sistema");
    expect(doc.nombre).toBe("mi-sistema-bloques");
    expect(doc.nodes.length).toBeGreaterThan(0);

    // Debe contener al menos un sumador
    const sumador = doc.nodes.find(n => n.type === "sum");
    expect(sumador).toBeDefined();

    // Debe contener el bloque de función de transferencia G
    const bloqueG = doc.nodes.find(n => n.type === "block" && n.label === "G");
    expect(bloqueG).toBeDefined();

    // Debe contener el bloque de realimentación H
    const bloqueH = doc.nodes.find(n => n.type === "block" && n.label === "H");
    expect(bloqueH).toBeDefined();

    // Debe haber conexiones dirigidas
    expect(doc.edges.length).toBeGreaterThan(0);
  });
});
