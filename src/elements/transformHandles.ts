/**
 * Transform (resize/rotate) handle positions and hit-testing.
 * Handle positions are computed in scene coordinates; sizes scale with 1/zoom
 * so they stay constant in screen space, exactly like Excalidraw.
 */

import { HANDLE_SIZE, ROTATION_HANDLE_GAP } from "../constants";
import { rotatePoint } from "../math";
import type { HandleType } from "../types";

export interface TransformHandles {
  /** handle -> [centerX, centerY] in scene coordinates (already rotated). */
  [key: string]: [number, number];
}

/**
 * Compute handle centers for a bounding box (x1..y2) rotated by `angle`
 * around its center. `zoom` keeps handles screen-size constant.
 */
export const getTransformHandles = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  angle: number,
  zoom: number,
  includeSides = true
): TransformHandles => {
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const margin = 4 / zoom;
  const positions: Record<string, [number, number]> = {
    nw: [x1 - margin, y1 - margin],
    ne: [x2 + margin, y1 - margin],
    se: [x2 + margin, y2 + margin],
    sw: [x1 - margin, y2 + margin],
    rotation: [cx, y1 - margin - ROTATION_HANDLE_GAP / zoom],
  };
  if (includeSides) {
    positions.n = [cx, y1 - margin];
    positions.s = [cx, y2 + margin];
    positions.w = [x1 - margin, cy];
    positions.e = [x2 + margin, cy];
  }
  const handles: TransformHandles = {};
  for (const [key, [hx, hy]] of Object.entries(positions)) {
    handles[key] = angle ? rotatePoint(hx, hy, cx, cy, angle) : [hx, hy];
  }
  return handles;
};

/** Which handle (if any) is under the scene point. */
export const getHandleAtPosition = (
  handles: TransformHandles,
  x: number,
  y: number,
  zoom: number
): HandleType | null => {
  const r = (HANDLE_SIZE / zoom) * 1.2;
  for (const [key, [hx, hy]] of Object.entries(handles)) {
    if (Math.abs(x - hx) <= r && Math.abs(y - hy) <= r) {
      return key as HandleType;
    }
  }
  return null;
};

/** Cursor style for a given handle accounting for element rotation. */
export const getCursorForHandle = (
  handle: HandleType,
  angle: number
): string => {
  if (handle === "rotation") return "grab";
  // Base direction in degrees for each handle.
  const base: Record<string, number> = {
    n: 0,
    ne: 45,
    e: 90,
    se: 135,
    s: 180,
    sw: 225,
    w: 270,
    nw: 315,
  };
  const deg = (base[handle] + (angle * 180) / Math.PI + 360) % 360;
  const cursors = [
    "ns-resize",
    "nesw-resize",
    "ew-resize",
    "nwse-resize",
  ];
  return cursors[Math.round(deg / 45) % 4];
};
