/** Text measurement via an offscreen canvas (matches rendered fonts). */

import { FONT_FAMILY_CSS } from "../constants";
import type { FontFamily } from "../types";

const measureCanvas = document.createElement("canvas");
const measureCtx = measureCanvas.getContext("2d")!;

export const getFontString = (fontSize: number, fontFamily: FontFamily) =>
  `${fontSize}px ${FONT_FAMILY_CSS[fontFamily]}`;

/** Measure multi-line text; returns width/height in scene pixels. */
export const measureText = (
  text: string,
  fontSize: number,
  fontFamily: FontFamily
): { width: number; height: number } => {
  measureCtx.font = getFontString(fontSize, fontFamily);
  const lines = text.split("\n");
  const lineHeight = fontSize * 1.25;
  let width = 0;
  for (const line of lines) {
    width = Math.max(width, measureCtx.measureText(line).width);
  }
  return { width: Math.max(width, 1), height: lines.length * lineHeight };
};
