import { describe, it, expect } from "vitest";
import {
  DocumentoBloquesSchema,
  DocumentoSimuladorSchema,
  DocumentoSenalesSchema
} from "../../src/core/schemas/document.schema.ts";

describe("Document Schemas (Zod)", () => {
  it("valida y normaliza un documento de bloques legacy", () => {
    const raw = {
      nombre: "mi-diagrama",
      nodes: [
        { id: "n1", type: "block", x: 100, y: 100, label: "G(s)" },
        { id: "n2", type: "sum", x: 200, y: 100 }
      ],
      edges: [
        { id: "e1", from: { id: "n1", port: "r" }, to: { id: "n2", port: "l" } }
      ]
    };

    const res = DocumentoBloquesSchema.safeParse(raw);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.nodes[0].w).toBe(72);
      expect(res.data.nodes[0].h).toBe(42);
      expect(res.data.nodes[1].signs?.l).toBe("+");
    }
  });

  it("valida y normaliza un circuito lógico legacy", () => {
    const raw = {
      nombre: "sumador",
      nodes: [
        { id: "n1", type: "in", x: 40, y: 40, label: "A", on: true },
        { id: "n2", type: "and", x: 120, y: 40 },
        { id: "n3", type: "out", x: 200, y: 40, label: "S" }
      ],
      wires: [
        { id: "w1", from: { id: "n1", pin: "o" }, to: { id: "n2", pin: 0 } }
      ]
    };

    const res = DocumentoSimuladorSchema.safeParse(raw);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.nodes[0].on).toBe(true);
      expect(res.data.wires[0].variant).toBe(0);
    }
  });

  it("valida y normaliza un diagrama de señales SFG", () => {
    const raw = {
      nombre: "sfg-test",
      nodos: [
        { id: "n1", nombre: "x1", x: 100, y: 100, tipo: "entrada" },
        { id: "n2", nombre: "x2", x: 200, y: 100, tipo: "salida" }
      ],
      ramas: [
        { id: "r1", de: "n1", a: "n2", g: "G1" }
      ]
    };

    const res = DocumentoSenalesSchema.safeParse(raw);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.nodos[0].tipo).toBe("entrada");
      expect(res.data.ramas[0].curva).toBe(0);
    }
  });
});
