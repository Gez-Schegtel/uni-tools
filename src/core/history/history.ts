/* ===================================================================
   Máquina de Estado e Historial Inmutable (Undo / Redo)
   Conforme a la especificación en docs/specs/core/history.spec.md
   =================================================================== */

export class HistoryManager<T> {
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private currentSnap: string | null = null;
  private maxDepth: number;

  constructor(maxDepth: number = 120) {
    this.maxDepth = maxDepth;
  }

  /**
   * Guarda un nuevo snapshot en el historial si cambió respecto al último estado.
   */
  public commit(state: T): boolean {
    const snap = JSON.stringify(state);
    if (snap === this.currentSnap) return false;

    if (this.currentSnap !== null) {
      this.undoStack.push(this.currentSnap);
      if (this.undoStack.length > this.maxDepth) {
        this.undoStack.shift();
      }
    }

    this.redoStack = [];
    this.currentSnap = snap;
    return true;
  }

  /**
   * Deshace el último cambio y devuelve el estado restaurado.
   */
  public undo(): T | null {
    if (!this.undoStack.length || this.currentSnap === null) return null;

    this.redoStack.push(this.currentSnap);
    const snap = this.undoStack.pop()!;
    this.currentSnap = snap;
    return JSON.parse(snap) as T;
  }

  /**
   * Rehace el cambio revertido y devuelve el estado restaurado.
   */
  public redo(): T | null {
    if (!this.redoStack.length || this.currentSnap === null) return null;

    this.undoStack.push(this.currentSnap);
    const snap = this.redoStack.pop()!;
    this.currentSnap = snap;
    return JSON.parse(snap) as T;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.currentSnap = null;
  }
}
