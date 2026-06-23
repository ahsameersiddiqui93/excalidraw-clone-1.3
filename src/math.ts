/** Geometry helpers used by hit-testing, transforms and rendering. */

import type { Point } from "./types";

/** Rotate point (x, y) around center (cx, cy) by `angle` radians. */
export const rotatePoint = (
  x: number,
  y: number,
  cx: number,
  cy: number,
  angle: number
): [number, number] => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = x - cx;
  const dy = y - cy;
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
};

export const distance = (x1: number, y1: number, x2: number, y2: number) =>
  Math.hypot(x2 - x1, y2 - y1);

/** Distance from point p to segment (a, b). */
export const distanceToSegment = (
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number => {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(px, py, ax, ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return distance(px, py, ax + t * dx, ay + t * dy);
};

/** Axis-aligned bounds of a set of points. */
export const getPointsBounds = (
  points: readonly Point[]
): [number, number, number, number] => {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
};

export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/** Normalize a rect that may have negative width/height (drag direction). */
export const normalizeRect = (
  x: number,
  y: number,
  w: number,
  h: number
): [number, number, number, number] => [
  w < 0 ? x + w : x,
  h < 0 ? y + h : y,
  Math.abs(w),
  Math.abs(h),
];
