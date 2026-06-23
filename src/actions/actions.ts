/**
 * High-level actions invoked by the UI and keyboard shortcuts:
 * clipboard, delete/duplicate, layering, select all, zoom.
 */

import { store } from "../store/store";
import { duplicateElement } from "../elements/newElement";
import type { ExcalidrawElement } from "../types";
import { clamp } from "../math";
import { MAX_ZOOM, MIN_ZOOM } from "../constants";

/** In-memory clipboard (also mirrored to system clipboard as JSON). */
let internalClipboard: ExcalidrawElement[] = [];

export const copySelection = (): void => {
  const selected = store.getSelectedElements();
  if (selected.length === 0) return;
  internalClipboard = selected.map((el) => ({ ...el }));
  // Mirror to system clipboard in Excalidraw-compatible JSON format.
  const payload = JSON.stringify({
    type: "excalidraw/clipboard",
    elements: internalClipboard,
  });
  navigator.clipboard?.writeText(payload).catch(() => {});
};

export const cutSelection = (): void => {
  copySelection();
  deleteSelection();
};

export const pasteFromClipboard = async (): Promise<void> => {
  let elementsToPaste = internalClipboard;
  // Prefer system clipboard if it contains our payload.
  try {
    const text = await navigator.clipboard?.readText();
    if (text) {
      const data = JSON.parse(text);
      if (data?.type === "excalidraw/clipboard" && Array.isArray(data.elements)) {
        elementsToPaste = data.elements;
      }
    }
  } catch {
    // permission denied or invalid JSON — fall back to internal clipboard
  }
  if (elementsToPaste.length === 0) return;

  const newElements = elementsToPaste.map((el) =>
    duplicateElement(el, 16, 16)
  );
  const selectedIds: Record<string, true> = {};
  newElements.forEach((el) => (selectedIds[el.id] = true));
  store.setElements([...store.getElements(), ...newElements]);
  store.updateAppState({ selectedElementIds: selectedIds });
  store.commit();
};

export const deleteSelection = (): void => {
  const ids = store.getAppState().selectedElementIds;
  if (Object.keys(ids).length === 0) return;
  store.updateElements(
    (el) => ({ ...el, isDeleted: true, version: el.version + 1 }),
    new Set(Object.keys(ids))
  );
  store.updateAppState({ selectedElementIds: {} });
  store.commit();
};

export const duplicateSelection = (): void => {
  const selected = store.getSelectedElements();
  if (selected.length === 0) return;
  const newElements = selected.map((el) => duplicateElement(el));
  const selectedIds: Record<string, true> = {};
  newElements.forEach((el) => (selectedIds[el.id] = true));
  store.setElements([...store.getElements(), ...newElements]);
  store.updateAppState({ selectedElementIds: selectedIds });
  store.commit();
};

export const selectAll = (): void => {
  const selectedIds: Record<string, true> = {};
  store.getVisibleElements().forEach((el) => (selectedIds[el.id] = true));
  store.updateAppState({ selectedElementIds: selectedIds });
};

/** ---- Layering (z-order) — operate on the element array order ---- */

const reorder = (
  mode: "front" | "back" | "forward" | "backward"
): void => {
  const elements = [...store.getElements()];
  const ids = store.getAppState().selectedElementIds;
  const selected = elements.filter((el) => ids[el.id]);
  if (selected.length === 0) return;

  if (mode === "front") {
    const rest = elements.filter((el) => !ids[el.id]);
    store.setElements([...rest, ...selected], true);
    return;
  }
  if (mode === "back") {
    const rest = elements.filter((el) => !ids[el.id]);
    store.setElements([...selected, ...rest], true);
    return;
  }

  // Single-step move: swap each selected element with its neighbor.
  if (mode === "forward") {
    for (let i = elements.length - 2; i >= 0; i--) {
      if (ids[elements[i].id] && !ids[elements[i + 1].id]) {
        [elements[i], elements[i + 1]] = [elements[i + 1], elements[i]];
      }
    }
  } else {
    for (let i = 1; i < elements.length; i++) {
      if (ids[elements[i].id] && !ids[elements[i - 1].id]) {
        [elements[i], elements[i - 1]] = [elements[i - 1], elements[i]];
      }
    }
  }
  store.setElements(elements, true);
};

export const bringToFront = () => reorder("front");
export const sendToBack = () => reorder("back");
export const bringForward = () => reorder("forward");
export const sendBackward = () => reorder("backward");

/** ---- Zoom ---- */

/** Zoom keeping the given screen point fixed (defaults to viewport center). */
export const setZoom = (
  newZoom: number,
  centerX = window.innerWidth / 2,
  centerY = window.innerHeight / 2
): void => {
  const { zoom, scrollX, scrollY } = store.getAppState();
  const clamped = clamp(newZoom, MIN_ZOOM, MAX_ZOOM);
  // Keep the scene point under (centerX, centerY) stationary.
  const sceneX = (centerX - scrollX) / zoom;
  const sceneY = (centerY - scrollY) / zoom;
  store.updateAppState({
    zoom: clamped,
    scrollX: centerX - sceneX * clamped,
    scrollY: centerY - sceneY * clamped,
  });
};

export const zoomIn = () => setZoom(store.getAppState().zoom * 1.1);
export const zoomOut = () => setZoom(store.getAppState().zoom / 1.1);
export const resetZoom = () => setZoom(1);

export const clearCanvas = (): void => {
  if (store.getVisibleElements().length === 0) return;
  if (!window.confirm("This will clear the whole canvas. Are you sure?")) {
    return;
  }
  store.setElements([], true);
  store.updateAppState({ selectedElementIds: {} });
};
