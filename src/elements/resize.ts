/**
 * Resize logic. Given the element state at drag start, a handle, and the
 * current pointer position, compute the element's new bounds. Linear element
 * points are scaled proportionally with the bounding box.
 */

import type { ExcalidrawElement, HandleType, Point } from "../types";
import { rotatePoint } from "../math";

export interface ResizeSnapshot {
  x: number;
  y: number;
  width: number;
  height: number;
  points?: Point[];
  fontSize?: number;
}

export const snapshotForResize = (
  element: ExcalidrawElement
): ResizeSnapshot => ({
  x: element.x,
  y: element.y,
  width: element.width,
  height: element.height,
  points: element.points ? element.points.map((p): Point => [p[0], p[1]]) : undefined,
  fontSize: element.fontSize,
});

/**
 * Compute updates for a single-element resize.
 * Pointer coordinates are in scene space; we un-rotate them into the
 * element's local frame so resizing rotated elements behaves naturally.
 */
export const resizeElement = (
  element: ExcalidrawElement,
  original: ResizeSnapshot,
  handle: HandleType,
  pointerX: number,
  pointerY: number,
  shiftKey: boolean
): Partial<ExcalidrawElement> => {
  // Un-rotate pointer around the ORIGINAL center.
  const cx = original.x + original.width / 2;
  const cy = original.y + original.height / 2;
  const [px, py] = element.angle
    ? rotatePoint(pointerX, pointerY, cx, cy, -element.angle)
    : [pointerX, pointerY];

  let x1 = original.x;
  let y1 = original.y;
  let x2 = original.x + original.width;
  let y2 = original.y + original.height;

  if (handle.includes("w")) x1 = px;
  if (handle.includes("e")) x2 = px;
  if (handle.includes("n")) y1 = py;
  if (handle.includes("s")) y2 = py;

  // Shift = preserve aspect ratio (corner handles only).
  if (shiftKey && handle.length === 2 && original.width && original.height) {
    const ratio = original.height / original.width;
    const newW = x2 - x1;
    const newH = y2 - y1;
    if (Math.abs(newW * ratio) > Math.abs(newH)) {
      const fixedH = Math.abs(newW) * ratio * Math.sign(newH || 1);
      if (handle.includes("n")) y1 = y2 - fixedH;
      else y2 = y1 + fixedH;
    } else {
      const fixedW = (Math.abs(newH) / ratio) * Math.sign(newW || 1);
      if (handle.includes("w")) x1 = x2 - fixedW;
      else x2 = x1 + fixedW;
    }
  }

  // Allow flipping by swapping.
  let newX = Math.min(x1, x2);
  let newY = Math.min(y1, y2);
  const newW = Math.abs(x2 - x1);
  const newH = Math.abs(y2 - y1);

  const updates: Partial<ExcalidrawElement> = {
    x: newX,
    y: newY,
    width: newW,
    height: newH,
  };

  // Scale linear element points proportionally.
  if (original.points && original.width && original.height) {
    const scaleX = newW / original.width;
    const scaleY = newH / original.height;
    const flippedX = x2 < x1;
    const flippedY = y2 < y1;
    updates.points = original.points.map(([ox, oy]): Point => [
      flippedX ? (original.width - ox) * scaleX : ox * scaleX,
      flippedY ? (original.height - oy) * scaleY : oy * scaleY,
    ]);
  }

  // Scale text font size with height.
  if (element.type === "text" && original.fontSize && original.height) {
    updates.fontSize = Math.max(
      4,
      original.fontSize * (newH / original.height)
    );
  }

  // Keep the rotation pivot stable: after resizing a rotated element, the
  // center moves; recompute position so the dragged handle stays under the
  // cursor in screen space.
  if (element.angle) {
    const newCx = newX + newW / 2;
    const newCy = newY + newH / 2;
    const [rcx, rcy] = rotatePoint(newCx, newCy, cx, cy, element.angle);
    updates.x = newX + (rcx - newCx);
    updates.y = newY + (rcy - newCy);
  }

  return updates;
};
