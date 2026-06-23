/** PNG / SVG export. Renders elements onto a standalone surface. */

import type { AppState, ExcalidrawElement } from "../types";
import { getCommonBounds } from "../elements/bounds";
import { renderScene } from "../renderer/renderScene";
import { downloadBlob } from "./json";
import rough from "roughjs/bin/rough";
import { getShapeForElement } from "../renderer/shapeCache";
import { FONT_FAMILY_CSS } from "../constants";

const EXPORT_PADDING = 16;

/** Export elements (selected subset or all) as a PNG download. */
export const exportToPng = (
  elements: readonly ExcalidrawElement[],
  appState: AppState,
  scale = 2
): void => {
  const visible = elements.filter((el) => !el.isDeleted);
  if (visible.length === 0) return;
  const [x1, y1, x2, y2] = getCommonBounds(visible);
  const width = (x2 - x1 + EXPORT_PADDING * 2) * scale;
  const height = (y2 - y1 + EXPORT_PADDING * 2) * scale;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  // Reuse the scene renderer with a temporary viewport that frames the
  // content. devicePixelRatio is baked into scale here.
  const exportState: AppState = {
    ...appState,
    zoom: 1,
    scrollX: -x1 + EXPORT_PADDING,
    scrollY: -y1 + EXPORT_PADDING,
    selectedElementIds: {},
    editingTextId: null,
  };

  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  // renderScene uses devicePixelRatio; temporarily emulate it via scale.
  const dpr = window.devicePixelRatio;
  Object.defineProperty(window, "devicePixelRatio", {
    value: scale,
    configurable: true,
  });
  renderScene({
    canvas,
    elements: visible,
    appState: exportState,
    selectionRect: null,
  });
  Object.defineProperty(window, "devicePixelRatio", {
    value: dpr,
    configurable: true,
  });

  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, "drawing.png");
  });
};

/** Export elements as an SVG download (vector, preserves rough style). */
export const exportToSvg = (
  elements: readonly ExcalidrawElement[],
  appState: AppState
): void => {
  const visible = elements.filter((el) => !el.isDeleted);
  if (visible.length === 0) return;
  const [x1, y1, x2, y2] = getCommonBounds(visible);
  const width = x2 - x1 + EXPORT_PADDING * 2;
  const height = y2 - y1 + EXPORT_PADDING * 2;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("xmlns", svgNS);
  svg.setAttribute("width", `${width}`);
  svg.setAttribute("height", `${height}`);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const bg = document.createElementNS(svgNS, "rect");
  bg.setAttribute("width", "100%");
  bg.setAttribute("height", "100%");
  bg.setAttribute("fill", appState.viewBackgroundColor);
  svg.appendChild(bg);

  const rsvg = rough.svg(svg as unknown as SVGSVGElement);

  for (const element of visible) {
    const offsetX = element.x - x1 + EXPORT_PADDING;
    const offsetY = element.y - y1 + EXPORT_PADDING;
    const cx = offsetX + element.width / 2;
    const cy = offsetY + element.height / 2;
    const deg = (element.angle * 180) / Math.PI;

    const group = document.createElementNS(svgNS, "g");
    group.setAttribute(
      "transform",
      `translate(${offsetX} ${offsetY}) rotate(${deg} ${element.width / 2} ${
        element.height / 2
      })`
    );
    group.setAttribute("opacity", `${element.opacity / 100}`);

    if (element.type === "text") {
      const fontSize = element.fontSize ?? 20;
      const lineHeight = fontSize * 1.25;
      const lines = (element.text ?? "").split("\n");
      for (let i = 0; i < lines.length; i++) {
        const textNode = document.createElementNS(svgNS, "text");
        textNode.setAttribute("y", `${i * lineHeight + fontSize}`);
        textNode.setAttribute("font-size", `${fontSize}`);
        textNode.setAttribute(
          "font-family",
          FONT_FAMILY_CSS[element.fontFamily ?? "hand-drawn"]
        );
        textNode.setAttribute("fill", element.strokeColor);
        const align = element.textAlign ?? "left";
        if (align === "center") {
          textNode.setAttribute("x", `${element.width / 2}`);
          textNode.setAttribute("text-anchor", "middle");
        } else if (align === "right") {
          textNode.setAttribute("x", `${element.width}`);
          textNode.setAttribute("text-anchor", "end");
        } else {
          textNode.setAttribute("x", "0");
        }
        textNode.textContent = lines[i];
        group.appendChild(textNode);
      }
    } else {
      for (const drawable of getShapeForElement(element)) {
        group.appendChild(rsvg.draw(drawable));
      }
    }
    svg.appendChild(group);
  }

  const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
  downloadBlob(blob, "drawing.svg");
};
