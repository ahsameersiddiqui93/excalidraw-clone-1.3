/**
 * Centralized store using the external-store pattern (useSyncExternalStore).
 *
 * Mirrors Excalidraw's architecture: a single mutable-ish scene of elements
 * plus an app-state object. Components subscribe to snapshots; the canvas
 * renderer reads state imperatively each frame to avoid React re-renders
 * during high-frequency interactions (drag, draw, pan).
 */

import { DEFAULT_APP_STATE } from "../constants";
import type { AppState, ExcalidrawElement } from "../types";
import { History } from "./history";

export interface StoreSnapshot {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
}

type Listener = () => void;

class Store {
  private elements: readonly ExcalidrawElement[] = [];
  private appState: AppState = { ...DEFAULT_APP_STATE };
  private listeners = new Set<Listener>();
  private snapshot: StoreSnapshot = {
    elements: this.elements,
    appState: this.appState,
  };
  readonly history = new History();

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): StoreSnapshot => this.snapshot;

  getElements = () => this.elements;
  getAppState = () => this.appState;

  /** Non-deleted elements (render/hit-test set). */
  getVisibleElements = () => this.elements.filter((el) => !el.isDeleted);

  getSelectedElements = () => {
    const ids = this.appState.selectedElementIds;
    return this.elements.filter((el) => !el.isDeleted && ids[el.id]);
  };

  private emit() {
    this.snapshot = { elements: this.elements, appState: this.appState };
    this.listeners.forEach((l) => l());
  }

  /** Replace elements; `commit` pushes an undo checkpoint. */
  setElements(elements: readonly ExcalidrawElement[], commit = false) {
    this.elements = elements;
    if (commit) this.commit();
    this.emit();
  }

  updateAppState(updates: Partial<AppState>) {
    this.appState = { ...this.appState, ...updates };
    this.emit();
  }

  /** Apply updates to specific elements by id. */
  updateElements(
    updater: (element: ExcalidrawElement) => ExcalidrawElement,
    ids: Set<string>,
    commit = false
  ) {
    this.elements = this.elements.map((el) =>
      ids.has(el.id) ? updater(el) : el
    );
    if (commit) this.commit();
    this.emit();
  }

  /** Record current state into the undo stack. */
  commit() {
    this.history.record(this.elements, this.appState);
  }

  undo() {
    const entry = this.history.undo(this.elements, this.appState);
    if (entry) {
      this.elements = entry.elements;
      this.appState = {
        ...this.appState,
        selectedElementIds: entry.selectedElementIds,
        editingTextId: null,
      };
      this.emit();
    }
  }

  redo() {
    const entry = this.history.redo(this.elements, this.appState);
    if (entry) {
      this.elements = entry.elements;
      this.appState = {
        ...this.appState,
        selectedElementIds: entry.selectedElementIds,
        editingTextId: null,
      };
      this.emit();
    }
  }

  /** Replace whole scene (import / restore). */
  replaceScene(
    elements: readonly ExcalidrawElement[],
    appState?: Partial<AppState>
  ) {
    this.elements = elements;
    if (appState) {
      this.appState = { ...this.appState, ...appState };
    }
    this.history.clear();
    this.commit();
    this.emit();
  }
}

export const store = new Store();
// Seed the history baseline with the initial empty scene.
store.commit();
