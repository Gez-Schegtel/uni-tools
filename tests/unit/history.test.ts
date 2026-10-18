import { describe, it, expect } from "vitest";
import { HistoryManager } from "../../src/core/history/history.ts";

describe("Máquina de Estado e Historial (Core)", () => {
  it("realiza commits y operaciones de undo/redo correctamente", () => {
    const history = new HistoryManager<{ count: number }>();

    history.commit({ count: 1 });
    expect(history.canUndo()).toBe(false);

    history.commit({ count: 2 });
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);

    // Undo -> debe volver a { count: 1 }
    const step1 = history.undo();
    expect(step1).toEqual({ count: 1 });
    expect(history.canRedo()).toBe(true);

    // Redo -> debe volver a { count: 2 }
    const step2 = history.redo();
    expect(step2).toEqual({ count: 2 });
  });

  it("ignora commits con estados idénticos", () => {
    const history = new HistoryManager<{ text: string }>();
    expect(history.commit({ text: "hola" })).toBe(true);
    expect(history.commit({ text: "hola" })).toBe(false);
  });
});
