/** Scene serialization: save/load .excalidraw JSON and localStorage. */

import { LOCAL_STORAGE_KEY } from "../constants";
import type { AppState, ExcalidrawElement, SceneFile } from "../types";
import { store } from "../store/store";

export const serializeScene = (
  elements: readonly ExcalidrawElement[],
  appState: AppState
): string => {
  const file: SceneFile = {
    type: "excalidraw",
    version: 2,
    source: "excalidraw-clone",
    elements: elements.filter((el) => !el.isDeleted),
    appState: {
      viewBackgroundColor: appState.viewBackgroundColor,
      scrollX: appState.scrollX,
      scrollY: appState.scrollY,
      zoom: appState.zoom,
    },
  };
  return JSON.stringify(file, null, 2);
};

/** Trigger a file download of the current scene. */
export const saveAsJSON = (
  elements: readonly ExcalidrawElement[],
  appState: AppState
): void => {
  const blob = new Blob([serializeScene(elements, appState)], {
    type: "application/json",
  });
  downloadBlob(blob, "drawing.excalidraw");
};

/** Open a file picker and load the chosen scene into the store. */
export const loadFromJSON = async (): Promise<void> => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".excalidraw,application/json";
  const file = await new Promise<File | null>((resolve) => {
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
  if (!file) return;
  const text = await file.text();
  restoreFromText(text);
};

/** Parse + sanity-check scene JSON and replace the current scene. */
export const restoreFromText = (text: string): void => {
  try {
    const data = JSON.parse(text) as SceneFile;
    if (!Array.isArray(data.elements)) return;
    store.replaceScene(
      data.elements.filter((el) => el && el.id && el.type),
      {
        viewBackgroundColor:
          data.appState?.viewBackgroundColor ?? "#ffffff",
        scrollX: data.appState?.scrollX ?? 0,
        scrollY: data.appState?.scrollY ?? 0,
        zoom: data.appState?.zoom ?? 1,
        selectedElementIds: {},
      }
    );
  } catch (error) {
    console.error("Failed to restore scene:", error);
  }
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/** ---- localStorage persistence (auto-save like Excalidraw) ---- */

export const saveToLocalStorage = (
  elements: readonly ExcalidrawElement[],
  appState: AppState
): void => {
  try {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      serializeScene(elements, appState)
    );
  } catch {
    // storage full / unavailable — ignore
  }
};

export const loadFromLocalStorage = (): void => {
  const text = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (text) restoreFromText(text);
};
