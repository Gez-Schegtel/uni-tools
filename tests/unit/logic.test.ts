import { describe, it, expect } from "vitest";
import { evalGate, simulate, truthTable } from "../../src/core/logic/simulator.ts";
import { simplify } from "../../src/core/logic/minimizer.ts";
import type { SimuladorNodo, SimuladorCable } from "../../src/core/schemas/document.schema.ts";

describe("Simulador Lógico y Quine-McCluskey (Core)", () => {
  it("evalúa compuertas básicas correctamente", () => {
    expect(evalGate("and", [1, 1])).toBe(1);
    expect(evalGate("and", [1, 0])).toBe(0);
    expect(evalGate("or", [0, 1])).toBe(1);
    expect(evalGate("or", [0, 0])).toBe(0);
    expect(evalGate("xor", [1, 1])).toBe(0);
    expect(evalGate("xor", [1, 0])).toBe(1);
    expect(evalGate("nand", [1, 1])).toBe(0);
    expect(evalGate("not", [1])).toBe(0);
  });

  it("simula una red combinacional (circuito AND -> NOT)", () => {
    const nodes: SimuladorNodo[] = [
      { id: "inA", type: "in", x: 0, y: 0, on: true },
      { id: "inB", type: "in", x: 0, y: 50, on: true },
      { id: "and1", type: "and", x: 100, y: 25 },
      { id: "not1", type: "not", x: 200, y: 25 },
      { id: "out1", type: "out", x: 300, y: 25 }
    ];

    const wires: SimuladorCable[] = [
      { id: "w1", from: { id: "inA", pin: "o" }, to: { id: "and1", pin: 0 } },
      { id: "w2", from: { id: "inB", pin: "o" }, to: { id: "and1", pin: 1 } },
      { id: "w3", from: { id: "and1", pin: "o" }, to: { id: "not1", pin: 0 } },
      { id: "w4", from: { id: "not1", pin: "o" }, to: { id: "out1", pin: 0 } }
    ];

    const res = simulate(nodes, wires);
    expect(res.osc).toBe(false);
    expect(res.val.get("and1#0")).toBe(1);
    expect(res.val.get("not1#0")).toBe(0);
    expect(res.val.get("out1#0")).toBe(0);
  });

  it("genera la tabla de verdad para un semisumador (Half Adder)", () => {
    const nodes: SimuladorNodo[] = [
      { id: "inA", type: "in", x: 0, y: 0, label: "A" },
      { id: "inB", type: "in", x: 0, y: 50, label: "B" },
      { id: "xor1", type: "xor", x: 100, y: 20 },
      { id: "and1", type: "and", x: 100, y: 80 },
      { id: "outS", type: "out", x: 200, y: 20, label: "S" },
      { id: "outC", type: "out", x: 200, y: 80, label: "C" }
    ];

    const wires: SimuladorCable[] = [
      { id: "w1", from: { id: "inA", pin: "o" }, to: { id: "xor1", pin: 0 } },
      { id: "w2", from: { id: "inB", pin: "o" }, to: { id: "xor1", pin: 1 } },
      { id: "w3", from: { id: "inA", pin: "o" }, to: { id: "and1", pin: 0 } },
      { id: "w4", from: { id: "inB", pin: "o" }, to: { id: "and1", pin: 1 } },
      { id: "w5", from: { id: "xor1", pin: "o" }, to: { id: "outS", pin: 0 } },
      { id: "w6", from: { id: "and1", pin: "o" }, to: { id: "outC", pin: 0 } }
    ];

    const tt = truthTable(nodes, wires);
    expect(tt).not.toBeNull();
    expect(tt!.rows.length).toBe(4); // 2^2 = 4 filas

    // Fila 0: 0 + 0 -> S=0, C=0
    expect(tt!.rows[0].out).toEqual([0, 0]);
    // Fila 1: 0 + 1 -> S=1, C=0
    expect(tt!.rows[1].out).toEqual([1, 0]);
    // Fila 2: 1 + 0 -> S=1, C=0
    expect(tt!.rows[2].out).toEqual([1, 0]);
    // Fila 3: 1 + 1 -> S=0, C=1
    expect(tt!.rows[3].out).toEqual([0, 1]);
  });

  it("simplifica minitérminos con Quine-McCluskey", () => {
    // Función f(A,B,C) = sum(0, 1, 2, 5)
    // 0 = 000 (A'B'C')
    // 1 = 001 (A'B'C)
    // 2 = 010 (A'BC')
    // 5 = 101 (AB'C)
    // Minitérminos 0 y 1 combinan en 00- (A'B')
    // Minitérminos 0 y 2 combinan en 0-0 (A'C')
    // Minitérminos 1 y 5 combinan en -01 (B'C)
    const s = simplify([0, 1, 2, 5], 3, ["A", "B", "C"]);
    expect(s).toContain("A'C'");
    expect(s).toContain("B'C");
  });
});
