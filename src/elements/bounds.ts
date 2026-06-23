/** Element bounds computation (axis-aligned, rotation-aware variants). */

import type { ExcalidrawElement } from "../types";
import { rotatePoint } from "../math";

/** Unrotated bounding box [x1, y1, x2, y2] in scene coordinates. */
export const getElementBounds = (
  element: ExcalidrawElement
): [number, number, number, number] => {
  return [
    element.x,
    element.y,
    element.x + element.width,
    element.y + element.height,
  ];
};

/** Bounding box that accounts for rotation (used for selection box of multiple elements). */
export const getElementRotatedBounds = (
  element: ExcalidrawElement
): [number, number, number, number] => {
  const [x1, y1, x2, y2] = getElementBounds(element);
  if (!element.angle) return [x1, y1, x2, y2];
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const corners = [
    rotatePoint(x1, y1, cx, cy, element.angle),
    rotatePoint(x2, y1, cx, cy, element.angle),
    rotatePoint(x2, y2, cx, cy, element.angle),
    rotatePoint(x1, y2, cx, cy, element.angle),
  ];
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [px, py] of corners) {
    minX = Math.min(minX, px);
    minY = Math.min(minY, py);
    maxX = Math.max(maxX, px);
    maxY = Math.max(maxY, py);
  }
  return [minX, minY, maxX, maxY];
};

/** Combined bounds of multiple elements. */
export const getCommonBounds = (
  elements: readonly ExcalidrawElement[]
): [number, number, number, number] => {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const element of elements) {
    const [x1, y1, x2, y2] = getElementRotatedBounds(element);
    minX = Math.min(minX, x1);
    minY = Math.min(minY, y1);
    maxX = Math.max(maxX, x2);
    maxY = Math.max(maxY, y2);
  }
  return [minX, minY, maxX, maxY];
};
