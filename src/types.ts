/**
 * Core type definitions for the Excalidraw clone.
 *
 * The element model mirrors Excalidraw's: every shape on the canvas is a
 * plain serializable object. Linear elements (line/arrow/draw) store their
 * geometry as relative points; all elements share x/y/width/height/angle.
 */

export type ToolType =
  | "selection"
  | "rectangle"
  | "diamond"
  | "ellipse"
  | "arrow"
  | "line"
  | "draw"
  | "text";

export type FillStyle = "hachure" | "cross-hatch" | "solid";
export type StrokeStyle = "solid" | "dashed" | "dotted";
export type TextAlign = "left" | "center" | "right";
export type FontFamily = "hand-drawn" | "normal" | "code";

/** [x, y] tuple relative to the element's x/y origin. */
export type Point = readonly [number, number];

export interface ExcalidrawElement {
  id: string;
  type: Exclude<ToolType, "selection">;
  /** Top-left corner in scene (world) coordinates. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Rotation in radians around the element center. */
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  /** 0..2 — controls rough.js sketchiness. */
  roughness: number;
  /** 0..100 */
  opacity: number;
  /** Seed for deterministic rough.js rendering. */
  seed: number;
  /** Monotonically-increasing version used to invalidate shape cache. */
  version: number;
  isDeleted: boolean;
  /** Points for line/arrow/draw elements, relative to x/y. */
  points?: Point[];
  /** Text element specific properties. */
  text?: string;
  fontSize?: number;
  fontFamily?: FontFamily;
  textAlign?: TextAlign;
}

export interface TextElement extends ExcalidrawElement {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: FontFamily;
  textAlign: TextAlign;
}

export interface LinearElement extends ExcalidrawElement {
  type: "arrow" | "line" | "draw";
  points: Point[];
}

/** Current styling defaults applied to newly created elements. */
export interface AppStateStyles {
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  roughness: number;
  opacity: number;
  fontSize: number;
  fontFamily: FontFamily;
  textAlign: TextAlign;
}

/** Full application state held by the central store. */
export interface AppState extends AppStateStyles {
  activeTool: ToolType;
  /** Keep current tool active after drawing (toolbar lock). */
  toolLocked: boolean;
  /** Viewport translation in CSS pixels (scene * zoom + scroll = screen). */
  scrollX: number;
  scrollY: number;
  zoom: number;
  selectedElementIds: Record<string, true>;
  /** id of text element currently being edited, if any. */
  editingTextId: string | null;
  /** Canvas background color. */
  viewBackgroundColor: string;
}

/** Resize/rotate handle identifiers (transform handles). */
export type HandleType =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "rotation";

/** Serialized scene file (.excalidraw compatible-ish). */
export interface SceneFile {
  type: string;
  version: number;
  source: string;
  elements: ExcalidrawElement[];
  appState: Partial<AppState>;
}
