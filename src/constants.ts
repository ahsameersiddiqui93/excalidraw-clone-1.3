/** Shared constants — colors and sizes mirror Excalidraw's palette. */

import type { AppState } from "./types";

/** Stroke color palette (Excalidraw defaults). */
export const STROKE_COLORS = [
  "#1e1e1e",
  "#e03131",
  "#2f9e44",
  "#1971c2",
  "#f08c00",
];

/** Background color palette (Excalidraw defaults). */
export const BACKGROUND_COLORS = [
  "transparent",
  "#ffc9c9",
  "#b2f2bb",
  "#a5d8ff",
  "#ffec99",
];

export const CANVAS_BACKGROUND_COLORS = [
  "#ffffff",
  "#f8f9fa",
  "#f5faff",
  "#fffce8",
  "#fdf8f6",
];

export const FONT_FAMILY_CSS: Record<string, string> = {
  "hand-drawn": "Virgil, 'Segoe UI Emoji', sans-serif",
  normal: "Helvetica, 'Segoe UI Emoji', sans-serif",
  code: "'Cascadia Code', 'Courier New', monospace",
};

export const DEFAULT_APP_STATE: AppState = {
  activeTool: "selection",
  toolLocked: false,
  scrollX: 0,
  scrollY: 0,
  zoom: 1,
  selectedElementIds: {},
  editingTextId: null,
  viewBackgroundColor: "#ffffff",
  strokeColor: "#1e1e1e",
  backgroundColor: "transparent",
  fillStyle: "hachure",
  strokeWidth: 1,
  strokeStyle: "solid",
  roughness: 1,
  opacity: 100,
  fontSize: 20,
  fontFamily: "hand-drawn",
  textAlign: "left",
};

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 30;
export const ZOOM_STEP = 0.1;

/** Pixel size of square transform handles (screen space). */
export const HANDLE_SIZE = 8;
/** Distance of rotation handle above the selection box (screen space). */
export const ROTATION_HANDLE_GAP = 16;
/** Hit-test threshold in scene pixels (divided by zoom at call sites). */
export const HIT_THRESHOLD = 10;

export const SELECTION_COLOR = "#6965db";

export const LOCAL_STORAGE_KEY = "excalidraw-clone";

/** Tool keyboard shortcuts: key -> tool (matches Excalidraw 1-9/letters). */
export const TOOL_SHORTCUTS: Record<string, string> = {
  v: "selection",
  "1": "selection",
  r: "rectangle",
  "2": "rectangle",
  d: "diamond",
  "3": "diamond",
  o: "ellipse",
  "4": "ellipse",
  a: "arrow",
  "5": "arrow",
  l: "line",
  "6": "line",
  p: "draw",
  "7": "draw",
  t: "text",
  "8": "text",
};
