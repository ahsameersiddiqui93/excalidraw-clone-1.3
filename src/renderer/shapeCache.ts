/**
 * Rough.js shape generation with caching.
 *
 * Generating rough drawables is expensive; like Excalidraw, we cache the
 * generated drawable per element and invalidate via the element `version`.
 */

import rough from "roughjs/bin/rough";
import { RoughGenerator } from "roughjs/bin/generator";
import type { Drawable, Options } from "roughjs/bin/core";
import type { ExcalidrawElement } from "../types";

const generator: RoughGenerator = rough.generator();

interface CacheEntry {
  version: number;
  drawables: Drawable[];
}

const cache = new WeakMap<ExcalidrawElement, CacheEntry>();
const byId = new Map<string, CacheEntry & { element: ExcalidrawElement }>();

/** Rough.js options derived from element style properties. */
const getRoughOptions = (element: ExcalidrawElement): Options => {
  const options: Options = {
    seed: element.seed,
    strokeWidth: element.strokeWidth,
    stroke: element.strokeColor,
    roughness: element.roughness,
    bowing: 1,
    fillStyle: element.fillStyle === "cross-hatch" ? "cross-hatch" : element.fillStyle,
    fillWeight: element.strokeWidth / 2,
    hachureGap: element.strokeWidth * 4,
    disableMultiStroke: element.strokeStyle !== "solid",
  };
  if (element.backgroundColor !== "transparent") {
    options.fill = element.backgroundColor;
  }
  if (element.strokeStyle === "dashed") {
    options.strokeLineDash = [8, 8 + element.strokeWidth];
  } else if (element.strokeStyle === "dotted") {
    options.strokeLineDash = [1.5, 6 + element.strokeWidth];
  }
  return options;
};

/** Build rough drawables for an element in its local coordinate space. */
const generateDrawables = (element: ExcalidrawElement): Drawable[] => {
  const options = getRoughOptions(element);
  const { width: w, height: h } = element;

  switch (element.type) {
    case "rectangle":
      return [generator.rectangle(0, 0, w, h, options)];
    case "ellipse":
      return [generator.ellipse(w / 2, h / 2, w, h, options)];
    case "diamond":
      return [
        generator.polygon(
          [
            [w / 2, 0],
            [w, h / 2],
            [w / 2, h],
            [0, h / 2],
          ],
          options
        ),
      ];
    case "line":
    case "draw": {
      const pts = (element.points ?? []).map((p) => [p[0], p[1]] as [number, number]);
      if (pts.length < 2) return [];
      if (element.type === "draw") {
        // Freehand: low-roughness curve through the recorded points.
        return [
          generator.curve(pts, { ...options, roughness: 0, bowing: 0 }),
        ];
      }
      return [generator.linearPath(pts, options)];
    }
    case "arrow": {
      const pts = element.points ?? [];
      if (pts.length < 2) return [];
      const drawables: Drawable[] = [
        generator.linearPath(
          pts.map((p) => [p[0], p[1]] as [number, number]),
          options
        ),
      ];
      // Arrowhead on the last segment.
      const [x2, y2] = pts[pts.length - 1];
      const [x1, y1] = pts[pts.length - 2];
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const length = Math.min(30, Math.hypot(x2 - x1, y2 - y1) * 0.5) || 0;
      const headLen = Math.max(length, 10);
      const a1 = angle + Math.PI - Math.PI / 7;
      const a2 = angle + Math.PI + Math.PI / 7;
      drawables.push(
        generator.line(
          x2,
          y2,
          x2 + headLen * Math.cos(a1),
          y2 + headLen * Math.sin(a1),
          options
        ),
        generator.line(
          x2,
          y2,
          x2 + headLen * Math.cos(a2),
          y2 + headLen * Math.sin(a2),
          options
        )
      );
      return drawables;
    }
    default:
      return [];
  }
};

/** Cached drawables for an element (text returns []). */
export const getShapeForElement = (
  element: ExcalidrawElement
): Drawable[] => {
  if (element.type === "text") return [];
  const cached = byId.get(element.id);
  if (cached && cached.version === element.version) {
    return cached.drawables;
  }
  const drawables = generateDrawables(element);
  byId.set(element.id, { version: element.version, drawables, element });
  return drawables;
};
