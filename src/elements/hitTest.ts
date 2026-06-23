/**
 * Hit testing — determines whether a scene-coordinate point hits an element.
 * Mirrors Excalidraw behavior: shapes with transparent backgrounds are only
 * hit on their outline; filled shapes are hit anywhere inside.
 */

import type { ExcalidrawElement } from "../types";
import { distanceToSegment, rotatePoint } from "../math";
import { getElementBounds, getElementRotatedBounds } from "./bounds";

/** Test if point (x, y) in scene coords hits `element` within `threshold`. */
export const hitTestElement = (
  element: ExcalidrawElement,
  x: number,
  y: number,
  threshold: number
): boolean => {
  // Un-rotate the pointer into the element's local (unrotated) frame.
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const [px, py] = element.angle
    ? rotatePoint(x, y, cx, cy, -element.angle)
    : [x, y];

  switch (element.type) {
    case "rectangle":
    case "text":
      return hitRectangle(element, px, py, threshold);
    case "ellipse":
      return hitEllipse(element, px, py, threshold);
    case "diamond":
      return hitDiamond(element, px, py, threshold);
    case "arrow":
    case "line":
    case "draw":
      return hitLinear(element, px, py, threshold);
    default:
      return false;
  }
};

const isFilled = (element: ExcalidrawElement) =>
  element.backgroundColor !== "transparent" || element.type === "text";

const hitRectangle = (
  element: ExcalidrawElement,
  px: number,
  py: number,
  threshold: number
): boolean => {
  const [x1, y1, x2, y2] = getElementBounds(element);
  const inside =
    px >= x1 - threshold &&
    px <= x2 + threshold &&
    py >= y1 - threshold &&
    py <= y2 + threshold;
  if (!inside) return false;
  if (isFilled(element)) return true;
  // Outline only: near any of the four edges.
  return (
    Math.abs(px - x1) <= threshold ||
    Math.abs(px - x2) <= threshold ||
    Math.abs(py - y1) <= threshold ||
    Math.abs(py - y2) <= threshold
  );
};

const hitEllipse = (
  element: ExcalidrawElement,
  px: number,
  py: number,
  threshold: number
): boolean => {
  const rx = element.width / 2;
  const ry = element.height / 2;
  if (rx <= 0 || ry <= 0) return false;
  const cx = element.x + rx;
  const cy = element.y + ry;
  // Normalized radial distance (1 = exactly on the ellipse).
  const dx = (px - cx) / (rx + threshold);
  const dy = (py - cy) / (ry + threshold);
  const outer = dx * dx + dy * dy <= 1;
  if (!outer) return false;
  if (isFilled(element)) return true;
  const innerRx = Math.max(rx - threshold, 0);
  const innerRy = Math.max(ry - threshold, 0);
  if (innerRx === 0 || innerRy === 0) return true;
  const idx = (px - cx) / innerRx;
  const idy = (py - cy) / innerRy;
  return idx * idx + idy * idy >= 1;
};

const hitDiamond = (
  element: ExcalidrawElement,
  px: number,
  py: number,
  threshold: number
): boolean => {
  const [x1, y1, x2, y2] = getElementBounds(element);
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  // Diamond vertices: top, right, bottom, left.
  const verts: [number, number][] = [
    [cx, y1],
    [x2, cy],
    [cx, y2],
    [x1, cy],
  ];
  if (isFilled(element)) {
    // Point inside diamond via normalized manhattan-ish test.
    const w = (x2 - x1) / 2 || 1;
    const h = (y2 - y1) / 2 || 1;
    if (Math.abs(px - cx) / w + Math.abs(py - cy) / h <= 1) return true;
  }
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = verts[i];
    const [bx, by] = verts[(i + 1) % 4];
    if (distanceToSegment(px, py, ax, ay, bx, by) <= threshold) return true;
  }
  return false;
};

const hitLinear = (
  element: ExcalidrawElement,
  px: number,
  py: number,
  threshold: number
): boolean => {
  const points = element.points;
  if (!points || points.length === 0) return false;
  if (points.length === 1) {
    const [ax, ay] = points[0];
    return (
      Math.hypot(px - (element.x + ax), py - (element.y + ay)) <= threshold
    );
  }
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];
    if (
      distanceToSegment(
        px,
        py,
        element.x + ax,
        element.y + ay,
        element.x + bx,
        element.y + by
      ) <= threshold
    ) {
      return true;
    }
  }
  return false;
};

/** Topmost element (z-order aware) hit at scene point. */
export const getElementAtPosition = (
  elements: readonly ExcalidrawElement[],
  x: number,
  y: number,
  threshold: number
): ExcalidrawElement | null => {
  // Iterate from topmost (end of array) to bottom.
  for (let i = elements.length - 1; i >= 0; i--) {
    const element = elements[i];
    if (element.isDeleted) continue;
    if (hitTestElement(element, x, y, threshold)) return element;
  }
  return null;
};

/** All elements fully contained within a selection rectangle. */
export const getElementsWithinSelection = (
  elements: readonly ExcalidrawElement[],
  x1: number,
  y1: number,
  x2: number,
  y2: number
): ExcalidrawElement[] => {
  return elements.filter((element) => {
    if (element.isDeleted) return false;
    const [ex1, ey1, ex2, ey2] = getElementRotatedBounds(element);
    return ex1 >= x1 && ey1 >= y1 && ex2 <= x2 && ey2 <= y2;
  });
};
