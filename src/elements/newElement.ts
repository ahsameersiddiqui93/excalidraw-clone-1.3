/** Element factory functions. */

import { nanoid } from "nanoid";
import type {
  AppState,
  ExcalidrawElement,
  Point,
  ToolType,
} from "../types";

const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

/** Create a new element at (x, y) using the current app-state styles. */
export const newElement = (
  type: Exclude<ToolType, "selection">,
  x: number,
  y: number,
  appState: AppState
): ExcalidrawElement => {
  const element: ExcalidrawElement = {
    id: nanoid(),
    type,
    x,
    y,
    width: 0,
    height: 0,
    angle: 0,
    strokeColor: appState.strokeColor,
    backgroundColor: appState.backgroundColor,
    fillStyle: appState.fillStyle,
    strokeWidth: appState.strokeWidth,
    strokeStyle: appState.strokeStyle,
    roughness: appState.roughness,
    opacity: appState.opacity,
    seed: randomSeed(),
    version: 1,
    isDeleted: false,
  };
  if (type === "arrow" || type === "line" || type === "draw") {
    element.points = [[0, 0]];
  }
  if (type === "text") {
    element.text = "";
    element.fontSize = appState.fontSize;
    element.fontFamily = appState.fontFamily;
    element.textAlign = appState.textAlign;
  }
  return element;
};

/** Clone an element with a new id (used for duplicate / paste). */
export const duplicateElement = (
  element: ExcalidrawElement,
  offsetX = 10,
  offsetY = 10
): ExcalidrawElement => ({
  ...element,
  id: nanoid(),
  x: element.x + offsetX,
  y: element.y + offsetY,
  seed: randomSeed(),
  version: 1,
  points: element.points ? element.points.map((p): Point => [p[0], p[1]]) : undefined,
});

/** Produce a mutated copy with bumped version (cache invalidation). */
export const mutateElement = (
  element: ExcalidrawElement,
  updates: Partial<ExcalidrawElement>
): ExcalidrawElement => ({
  ...element,
  ...updates,
  version: element.version + 1,
});
