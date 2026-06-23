/**
 * Canvas component — owns the <canvas> element and all pointer interaction
 * state machines: drawing, selecting (click + marquee), moving, resizing,
 * rotating, panning and wheel zooming.
 *
 * Rendering is performed imperatively via requestAnimationFrame whenever the
 * store or interaction state changes, keeping React out of the hot path.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { store } from "../store/store";
import { renderScene } from "../renderer/renderScene";
import { newElement, mutateElement } from "../elements/newElement";
import {
  getElementAtPosition,
  getElementsWithinSelection,
} from "../elements/hitTest";
import {
  getTransformHandles,
  getHandleAtPosition,
  getCursorForHandle,
} from "../elements/transformHandles";
import {
  resizeElement,
  snapshotForResize,
  type ResizeSnapshot,
} from "../elements/resize";
import { getCommonBounds } from "../elements/bounds";
import { normalizeRect } from "../math";
import { HIT_THRESHOLD } from "../constants";
import { setZoom } from "../actions/actions";
import type { ExcalidrawElement, HandleType, Point } from "../types";

/** Interaction state for the active pointer gesture. */
type PointerDownState =
  | { type: "drawing"; elementId: string; originX: number; originY: number }
  | {
      type: "moving";
      originX: number;
      originY: number;
      /** id -> original x/y of every selected element. */
      originals: Map<string, { x: number; y: number }>;
      moved: boolean;
    }
  | {
      type: "resizing";
      handle: HandleType;
      elementId: string;
      snapshot: ResizeSnapshot;
    }
  | {
      type: "rotating";
      elementId: string;
      centerX: number;
      centerY: number;
      initialAngle: number;
      initialPointerAngle: number;
    }
  | { type: "marquee"; originX: number; originY: number }
  | { type: "panning"; startX: number; startY: number; scrollX: number; scrollY: number };

interface CanvasProps {
  /** Begin editing a text element (creates the textarea overlay). */
  onTextEdit: (elementId: string, sceneX: number, sceneY: number) => void;
}

export const Canvas = ({ onTextEdit }: CanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerState = useRef<PointerDownState | null>(null);
  const selectionRect = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const spaceDown = useRef(false);
  const rafId = useRef(0);
  const lastClickTime = useRef(0);
  const lastClickId = useRef<string | null>(null);

  // Subscribe so the component re-renders on store changes (cheap — the
  // actual pixels are drawn in the rAF callback below).
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);

  /** Schedule a repaint on next animation frame (deduped). */
  const scheduleRender = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      renderScene({
        canvas,
        elements: store.getElements(),
        appState: store.getAppState(),
        selectionRect: selectionRect.current,
      });
    });
  }, []);

  // Repaint whenever the store snapshot changes.
  useEffect(() => {
    scheduleRender();
  }, [snapshot, scheduleRender]);

  // Resize the canvas backing store with the window / DPR.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      scheduleRender();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [scheduleRender]);

  // Track spacebar for pan mode (matches Excalidraw).
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target instanceof HTMLTextAreaElement)) {
        spaceDown.current = true;
        if (canvasRef.current && !pointerState.current) {
          canvasRef.current.style.cursor = "grab";
        }
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceDown.current = false;
        if (canvasRef.current && !pointerState.current) {
          canvasRef.current.style.cursor = "";
        }
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Wheel: zoom with ctrl/cmd (and pinch), pan otherwise — like Excalidraw.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { zoom, scrollX, scrollY } = store.getAppState();
      if (e.ctrlKey || e.metaKey) {
        // Pinch-zoom / ctrl+wheel zoom towards the cursor.
        const delta = -e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.002);
        setZoom(zoom * (1 + delta), e.clientX, e.clientY);
      } else {
        // Two-finger pan (touchpad) or wheel scroll.
        store.updateAppState({
          scrollX: scrollX - e.deltaX,
          scrollY: scrollY - e.deltaY,
        });
      }
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  /** Convert a pointer event to scene coordinates. */
  const toScene = (e: { clientX: number; clientY: number }) => {
    const { scrollX, scrollY, zoom } = store.getAppState();
    return {
      x: (e.clientX - scrollX) / zoom,
      y: (e.clientY - scrollY) / zoom,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button === 2) return; // ignore right-click for now
    const canvas = canvasRef.current!;
    canvas.setPointerCapture(e.pointerId);

    const appState = store.getAppState();
    const { x, y } = toScene(e);
    const threshold = HIT_THRESHOLD / appState.zoom;

    // Finish any in-progress text editing first.
    if (appState.editingTextId) return;

    // Middle button or space = pan.
    if (e.button === 1 || spaceDown.current) {
      pointerState.current = {
        type: "panning",
        startX: e.clientX,
        startY: e.clientY,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
      };
      canvas.style.cursor = "grabbing";
      return;
    }

    const tool = appState.activeTool;

    if (tool === "selection") {
      const selected = store.getSelectedElements();

      // 1. Check transform handles of the current selection.
      if (selected.length > 0) {
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
        const handles = getTransformHandles(bx1, by1, bx2, by2, angle, appState.zoom);
        const handle = getHandleAtPosition(handles, x, y, appState.zoom);
        if (handle && single) {
          if (handle === "rotation") {
            pointerState.current = {
              type: "rotating",
              elementId: single.id,
              centerX: single.x + single.width / 2,
              centerY: single.y + single.height / 2,
              initialAngle: single.angle,
              initialPointerAngle: Math.atan2(
                y - (single.y + single.height / 2),
                x - (single.x + single.width / 2)
              ),
            };
          } else {
            pointerState.current = {
              type: "resizing",
              handle,
              elementId: single.id,
              snapshot: snapshotForResize(single),
            };
          }
          return;
        }
      }

      // 2. Hit an element? -> select (or extend selection) and start moving.
      const hit = getElementAtPosition(store.getElements(), x, y, threshold);
      if (hit) {
        // Double-click on text -> edit it.
        const now = Date.now();
        if (
          hit.type === "text" &&
          now - lastClickTime.current < 400 &&
          lastClickId.current === hit.id
        ) {
          onTextEdit(hit.id, hit.x, hit.y);
          pointerState.current = null;
          return;
        }
        lastClickTime.current = now;
        lastClickId.current = hit.id;

        let selectedIds = appState.selectedElementIds;
        if (e.shiftKey) {
          // Toggle membership.
          selectedIds = { ...selectedIds };
          if (selectedIds[hit.id]) delete selectedIds[hit.id];
          else selectedIds[hit.id] = true;
          store.updateAppState({ selectedElementIds: selectedIds });
        } else if (!selectedIds[hit.id]) {
          selectedIds = { [hit.id]: true };
          store.updateAppState({ selectedElementIds: selectedIds });
        }
        const originals = new Map<string, { x: number; y: number }>();
        store.getSelectedElements().forEach((el) => {
          originals.set(el.id, { x: el.x, y: el.y });
        });
        pointerState.current = {
          type: "moving",
          originX: x,
          originY: y,
          originals,
          moved: false,
        };
        return;
      }

      // 3. Empty space -> marquee selection.
      if (!e.shiftKey) {
        store.updateAppState({ selectedElementIds: {} });
      }
      pointerState.current = { type: "marquee", originX: x, originY: y };
      selectionRect.current = { x, y, width: 0, height: 0 };
      scheduleRender();
      return;
    }

    if (tool === "text") {
      // Create a text element and open the editor immediately.
      const element = newElement("text", x, y, appState);
      store.setElements([...store.getElements(), element]);
      store.updateAppState({
        selectedElementIds: { [element.id]: true },
      });
      onTextEdit(element.id, x, y);
      if (!appState.toolLocked) {
        store.updateAppState({ activeTool: "selection" });
      }
      pointerState.current = null;
      return;
    }

    // Shape/linear tools: create the element and enter drawing mode.
    const element = newElement(tool, x, y, appState);
    store.setElements([...store.getElements(), element]);
    pointerState.current = {
      type: "drawing",
      elementId: element.id,
      originX: x,
      originY: y,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const state = pointerState.current;
    const appState = store.getAppState();
    const canvas = canvasRef.current!;

    if (!state) {
      // Update hover cursor.
      if (appState.activeTool !== "selection") {
        canvas.style.cursor = "crosshair";
        return;
      }
      if (spaceDown.current) return;
      const { x, y } = toScene(e);
      const selected = store.getSelectedElements();
      if (selected.length === 1) {
        const el = selected[0];
        const handles = getTransformHandles(
          el.x,
          el.y,
          el.x + el.width,
          el.y + el.height,
          el.angle,
          appState.zoom
        );
        const handle = getHandleAtPosition(handles, x, y, appState.zoom);
        if (handle) {
          canvas.style.cursor = getCursorForHandle(handle, el.angle);
          return;
        }
      }
      const hit = getElementAtPosition(
        store.getElements(),
        x,
        y,
        HIT_THRESHOLD / appState.zoom
      );
      canvas.style.cursor = hit ? "move" : "";
      return;
    }

    const { x, y } = toScene(e);

    switch (state.type) {
      case "panning": {
        store.updateAppState({
          scrollX: state.scrollX + (e.clientX - state.startX),
          scrollY: state.scrollY + (e.clientY - state.startY),
        });
        break;
      }
      case "drawing": {
        const elements = store.getElements();
        const element = elements.find((el) => el.id === state.elementId);
        if (!element) break;

        let updates: Partial<ExcalidrawElement>;
        if (element.type === "draw") {
          // Freehand: append points; bounds grow to fit.
          const points: Point[] = [
            ...(element.points ?? []),
            [x - element.x, y - element.y],
          ];
          let minX = 0,
            minY = 0,
            maxX = 0,
            maxY = 0;
          for (const [px, py] of points) {
            minX = Math.min(minX, px);
            minY = Math.min(minY, py);
            maxX = Math.max(maxX, px);
            maxY = Math.max(maxY, py);
          }
          // Re-anchor so points stay non-negative relative to x/y.
          updates = {
            x: element.x + minX,
            y: element.y + minY,
            width: maxX - minX,
            height: maxY - minY,
            points: points.map((p): Point => [p[0] - minX, p[1] - minY]),
          };
        } else if (element.type === "line" || element.type === "arrow") {
          let dx = x - state.originX;
          let dy = y - state.originY;
          if (e.shiftKey) {
            // Snap to 15° increments.
            const angle = Math.atan2(dy, dx);
            const snapped = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);
            const len = Math.hypot(dx, dy);
            dx = len * Math.cos(snapped);
            dy = len * Math.sin(snapped);
          }
          const minX = Math.min(0, dx);
          const minY = Math.min(0, dy);
          updates = {
            x: state.originX + minX,
            y: state.originY + minY,
            width: Math.abs(dx),
            height: Math.abs(dy),
            points: [
              [0 - minX, 0 - minY],
              [dx - minX, dy - minY],
            ],
          };
        } else {
          // Rectangle / diamond / ellipse.
          let w = x - state.originX;
          let h = y - state.originY;
          if (e.shiftKey) {
            // Square/circle constraint.
            const size = Math.max(Math.abs(w), Math.abs(h));
            w = size * Math.sign(w || 1);
            h = size * Math.sign(h || 1);
          }
          const [nx, ny, nw, nh] = normalizeRect(
            state.originX,
            state.originY,
            w,
            h
          );
          updates = { x: nx, y: ny, width: nw, height: nh };
        }
        store.updateElements(
          (el) => mutateElement(el, updates),
          new Set([state.elementId])
        );
        break;
      }
      case "moving": {
        const dx = x - state.originX;
        const dy = y - state.originY;
        if (Math.abs(dx) + Math.abs(dy) > 0) state.moved = true;
        store.updateElements(
          (el) => {
            const orig = state.originals.get(el.id);
            if (!orig) return el;
            return mutateElement(el, { x: orig.x + dx, y: orig.y + dy });
          },
          new Set(state.originals.keys())
        );
        break;
      }
      case "resizing": {
        const element = store
          .getElements()
          .find((el) => el.id === state.elementId);
        if (!element) break;
        const updates = resizeElement(
          element,
          state.snapshot,
          state.handle,
          x,
          y,
          e.shiftKey
        );
        store.updateElements(
          (el) => mutateElement(el, updates),
          new Set([state.elementId])
        );
        break;
      }
      case "rotating": {
        const pointerAngle = Math.atan2(y - state.centerY, x - state.centerX);
        let angle =
          state.initialAngle + (pointerAngle - state.initialPointerAngle);
        if (e.shiftKey) {
          // Snap to 15° increments.
          angle = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);
        }
        store.updateElements(
          (el) => mutateElement(el, { angle }),
          new Set([state.elementId])
        );
        break;
      }
      case "marquee": {
        const [rx, ry, rw, rh] = normalizeRect(
          state.originX,
          state.originY,
          x - state.originX,
          y - state.originY
        );
        selectionRect.current = { x: rx, y: ry, width: rw, height: rh };
        const within = getElementsWithinSelection(
          store.getElements(),
          rx,
          ry,
          rx + rw,
          ry + rh
        );
        const selectedIds: Record<string, true> = {};
        within.forEach((el) => (selectedIds[el.id] = true));
        store.updateAppState({ selectedElementIds: selectedIds });
        scheduleRender();
        break;
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const state = pointerState.current;
    pointerState.current = null;
    const canvas = canvasRef.current!;
    canvas.releasePointerCapture(e.pointerId);
    canvas.style.cursor = spaceDown.current ? "grab" : "";

    if (!state) return;

    switch (state.type) {
      case "drawing": {
        const element = store
          .getElements()
          .find((el) => el.id === state.elementId);
        if (!element) break;
        // Discard zero-size shapes (simple click without drag).
        const tooSmall =
          element.type !== "draw" &&
          element.width < 2 &&
          element.height < 2;
        if (tooSmall) {
          store.setElements(
            store.getElements().filter((el) => el.id !== element.id)
          );
        } else {
          const appState = store.getAppState();
          store.updateAppState({
            selectedElementIds: { [element.id]: true },
            ...(appState.toolLocked ? {} : { activeTool: "selection" as const }),
          });
          store.commit();
        }
        break;
      }
      case "moving": {
        if (state.moved) store.commit();
        break;
      }
      case "resizing":
      case "rotating": {
        store.commit();
        break;
      }
      case "marquee": {
        selectionRect.current = null;
        scheduleRender();
        break;
      }
      case "panning":
        break;
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="app-canvas"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
};
