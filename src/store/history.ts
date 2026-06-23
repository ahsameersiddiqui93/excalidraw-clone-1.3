/**
 * Undo/redo history.
 *
 * Stores immutable snapshots of the element list plus the selection, like
 * Excalidraw. Snapshots are cheap because elements are immutable objects —
 * each entry just holds references. Recording is skipped when nothing
 * actually changed (dedupe via shallow comparison of element refs).
 */

import type { AppState, ExcalidrawElement } from "../types";

export interface HistoryEntry {
  elements: readonly ExcalidrawElement[];
  selectedElementIds: Record<string, true>;
}

const MAX_HISTORY = 200;

export class History {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }

  /** Push current state as a checkpoint. Clears the redo stack. */
  record(elements: readonly ExcalidrawElement[], appState: AppState) {
    const last = this.undoStack[this.undoStack.length - 1];
    if (last && elementsEqual(last.elements, elements)) {
      // Still update the selection so undo restores a sensible selection.
      last.selectedElementIds = { ...appState.selectedElementIds };
      return;
    }
    this.undoStack.push({
      elements,
      selectedElementIds: { ...appState.selectedElementIds },
    });
    if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
    this.redoStack = [];
  }

  /** Pop a snapshot to restore; pushes current state onto the redo stack. */
  undo(
    currentElements: readonly ExcalidrawElement[],
    appState: AppState
  ): HistoryEntry | null {
    // The top of the undo stack is the *current* committed state; we need
    // the one before it.
    if (this.undoStack.length < 2) return null;
    const current = this.undoStack.pop()!;
    this.redoStack.push({
      elements: currentElements,
      selectedElementIds: { ...appState.selectedElementIds },
    });
    return this.undoStack[this.undoStack.length - 1] ?? current;
  }

  redo(
    currentElements: readonly ExcalidrawElement[],
    appState: AppState
  ): HistoryEntry | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    this.undoStack.push({
      elements: entry.elements,
      selectedElementIds: { ...entry.selectedElementIds },
    });
    return entry;
  }
}

const elementsEqual = (
  a: readonly ExcalidrawElement[],
  b: readonly ExcalidrawElement[]
) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};
