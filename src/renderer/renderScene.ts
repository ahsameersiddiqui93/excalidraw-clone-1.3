/**
 * Canvas rendering pipeline.
 *
 * Renders the entire scene each frame onto a single <canvas>:
 *   1. clear + fill view background
 *   2. apply viewport transform (devicePixelRatio * zoom, scroll)
 *   3. draw each visible element (rough.js drawables / text)
 *   4. draw selection overlays (borders, transform handles, marquee)
 *
 * Viewport-culled and rAF-batched by the caller for performance.
 */

import rough from "roughjs/bin/rough";
import type { RoughCanvas } from "roughjs/bin/canvas";
import type { AppState, ExcalidrawElement } from "../types";
import { getShapeForElement } from "./shapeCache";
import { getFontString } from "../elements/textMeasure";
import { getCommonBounds, getElementRotatedBounds } from "../elements/bounds";
import { getTransformHandles } from "../elements/transformHandles";
import { HANDLE_SIZE, SELECTION_COLOR } from "../constants";

export interface RenderConfig {
  canvas: HTMLCanvasElement;
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  /** Marquee selection rect in scene coords, if dragging one. */
  selectionRect: { x: number; y: number; width: number; height: number } | null;
}

let roughCanvasCache: { canvas: HTMLCanvasElement; rc: RoughCanvas } | null =
  null;

const getRoughCanvas = (canvas: HTMLCanvasElement): RoughCanvas => {
  if (roughCanvasCache?.canvas !== canvas) {
    roughCanvasCache = { canvas, rc: rough.canvas(canvas) };
  }
  return roughCanvasCache.rc;
};

export const renderScene = ({
  canvas,
  elements,
  appState,
  selectionRect,
}: RenderConfig): void => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const { scrollX, scrollY, zoom } = appState;
  const viewW = canvas.width / dpr;
  const viewH = canvas.height / dpr;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = appState.viewBackgroundColor;
  ctx.fillRect(0, 0, viewW, viewH);

  // Scene transform: screen = scene * zoom + scroll.
  ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * scrollX, dpr * scrollY);

  const rc = getRoughCanvas(canvas);

  // Viewport bounds in scene coordinates, used for culling.
  const vx1 = -scrollX / zoom;
  const vy1 = -scrollY / zoom;
  const vx2 = vx1 + viewW / zoom;
  const vy2 = vy1 + viewH / zoom;

  for (const element of elements) {
    if (element.isDeleted) continue;
    if (appState.editingTextId === element.id) continue; // hidden while editing
    const [ex1, ey1, ex2, ey2] = getElementRotatedBounds(element);
    const pad = 50;
    if (ex2 < vx1 - pad || ex1 > vx2 + pad || ey2 < vy1 - pad || ey1 > vy2 + pad) {
      continue; // culled
    }
    renderElement(ctx, rc, element);
  }

  renderSelectionUI(ctx, elements, appState);

  if (selectionRect) {
    ctx.save();
    ctx.strokeStyle = SELECTION_COLOR;
    ctx.fillStyle = "rgba(105, 101, 219, 0.08)";
    ctx.lineWidth = 1 / zoom;
    ctx.fillRect(
      selectionRect.x,
      selectionRect.y,
      selectionRect.width,
      selectionRect.height
    );
    ctx.strokeRect(
      selectionRect.x,
      selectionRect.y,
      selectionRect.width,
      selectionRect.height
    );
    ctx.restore();
  }
};

const renderElement = (
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvas,
  element: ExcalidrawElement
): void => {
  ctx.save();
  ctx.globalAlpha = element.opacity / 100;

  // Move to element origin and rotate around its center.
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  ctx.translate(cx, cy);
  ctx.rotate(element.angle);
  ctx.translate(-element.width / 2, -element.height / 2);

  if (element.type === "text") {
    renderText(ctx, element);
  } else {
    for (const drawable of getShapeForElement(element)) {
      rc.draw(drawable);
    }
  }
  ctx.restore();
};

const renderText = (
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawElement
): void => {
  const fontSize = element.fontSize ?? 20;
  const fontFamily = element.fontFamily ?? "hand-drawn";
  const textAlign = element.textAlign ?? "left";
  ctx.font = getFontString(fontSize, fontFamily);
  ctx.fillStyle = element.strokeColor;
  ctx.textBaseline = "top";
  const lineHeight = fontSize * 1.25;
  const lines = (element.text ?? "").split("\n");
  for (let i = 0; i < lines.length; i++) {
    let tx = 0;
    if (textAlign === "center") {
      ctx.textAlign = "center";
      tx = element.width / 2;
    } else if (textAlign === "right") {
      ctx.textAlign = "right";
      tx = element.width;
    } else {
      ctx.textAlign = "left";
    }
    ctx.fillText(lines[i], tx, i * lineHeight + (lineHeight - fontSize) / 2);
  }
};

/** Selection borders + transform handles, all sized in screen space. */
const renderSelectionUI = (
  ctx: CanvasRenderingContext2D,
  elements: readonly ExcalidrawElement[],
  appState: AppState
): void => {
  const selected = elements.filter(
    (el) => !el.isDeleted && appState.selectedElementIds[el.id]
  );
  if (selected.length === 0 || appState.editingTextId) return;

  const zoom = appState.zoom;
  const lineWidth = 1 / zoom;
  const pad = 4 / zoom;

  ctx.save();
  ctx.strokeStyle = SELECTION_COLOR;
  ctx.lineWidth = lineWidth;

  // Per-element dashed borders when multiple are selected.
  if (selected.length > 1) {
    ctx.setLineDash([2 / zoom, 4 / zoom]);
    for (const element of selected) {
      const [x1, y1, x2, y2] = getElementRotatedBounds(element);
      ctx.strokeRect(x1 - pad, y1 - pad, x2 - x1 + pad * 2, y2 - y1 + pad * 2);
    }
    ctx.setLineDash([]);
  }

  // Common selection box.
  const single = selected.length === 1 ? selected[0] : null;
  let bx1: number, by1: number, bx2: number, by2: number;
  let angle = 0;
  if (single) {
    bx1 = single.x;
    by1 = single.y;
    bx2 = single.x + single.width;
    by2 = single.y + single.height;
    angle = single.angle;
  } else {
    [bx1, by1, bx2, by2] = getCommonBounds(selected);
  }

  const cx = (bx1 + bx2) / 2;
  const cy = (by1 + by2) / 2;

  ctx.save();
  if (angle) {
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);
  }
  ctx.strokeRect(bx1 - pad, by1 - pad, bx2 - bx1 + pad * 2, by2 - by1 + pad * 2);
  ctx.restore();

  // Transform handles (skip side handles for tiny or linear-ish boxes).
  const isLinearSingle =
    single && (single.type === "line" || single.type === "arrow") &&
    (single.points?.length ?? 0) <= 2;
  const handles = getTransformHandles(
    bx1,
    by1,
    bx2,
    by2,
    angle,
    zoom,
    !isLinearSingle
  );
  const size = HANDLE_SIZE / zoom;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = SELECTION_COLOR;
  for (const [key, [hx, hy]] of Object.entries(handles)) {
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(angle);
    ctx.beginPath();
    if (key === "rotation") {
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
    } else {
      // Rounded-square handles like Excalidraw.
      const r = size / 4;
      roundRectPath(ctx, -size / 2, -size / 2, size, size, r);
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
};

const roundRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};
