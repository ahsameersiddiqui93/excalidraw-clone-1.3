/**
 * Global keyboard shortcuts, mirroring Excalidraw bindings:
 *   Tools: V/1, R/2, D/3, O/4, A/5, L/6, P/7, T/8
 *   Cmd/Ctrl: Z (undo), Shift+Z / Y (redo), C/X/V (clipboard), D (duplicate),
 *             A (select all), +/-/0 (zoom)
 *   Delete/Backspace (delete), arrows (nudge)
 */

import { useEffect } from "react";
import { store } from "../store/store";
import { TOOL_SHORTCUTS } from "../constants";
import {
  copySelection,
  cutSelection,
  pasteFromClipboard,
  deleteSelection,
  duplicateSelection,
  selectAll,
  zoomIn,
  zoomOut,
  resetZoom,
  bringToFront,
  sendToBack,
  bringForward,
  sendBackward,
} from "../actions/actions";
import { mutateElement } from "../elements/newElement";
import type { ToolType } from "../types";

export const useKeyboard = (): void => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Skip when typing in inputs/textareas.
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        return;
      }
      if (store.getAppState().editingTextId) return;

      const cmd = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (cmd) {
        switch (key) {
          case "z":
            e.preventDefault();
            if (e.shiftKey) store.redo();
            else store.undo();
            return;
          case "y":
            e.preventDefault();
            store.redo();
            return;
          case "c":
            e.preventDefault();
            copySelection();
            return;
          case "x":
            e.preventDefault();
            cutSelection();
            return;
          case "v":
            e.preventDefault();
            void pasteFromClipboard();
            return;
          case "d":
            e.preventDefault();
            duplicateSelection();
            return;
          case "a":
            e.preventDefault();
            selectAll();
            return;
          case "=":
          case "+":
            e.preventDefault();
            zoomIn();
            return;
          case "-":
            e.preventDefault();
            zoomOut();
            return;
          case "0":
            e.preventDefault();
            resetZoom();
            return;
          case "]":
            e.preventDefault();
            if (e.altKey) bringToFront();
            else bringForward();
            return;
          case "[":
            e.preventDefault();
            if (e.altKey) sendToBack();
            else sendBackward();
            return;
        }
        return;
      }

      // Delete selection.
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelection();
        return;
      }

      // Arrow-key nudge (shift = larger step).
      if (e.key.startsWith("Arrow")) {
        const selected = store.getSelectedElements();
        if (selected.length === 0) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        store.updateElements(
          (el) => mutateElement(el, { x: el.x + dx, y: el.y + dy }),
          new Set(selected.map((el) => el.id)),
          true
        );
        return;
      }

      // Tool switching.
      const tool = TOOL_SHORTCUTS[key];
      if (tool && !e.altKey) {
        store.updateAppState({
          activeTool: tool as ToolType,
          ...(tool !== "selection" ? { selectedElementIds: {} } : {}),
        });
        return;
      }

      // Escape clears selection / resets to selection tool.
      if (e.key === "Escape") {
        store.updateAppState({
          selectedElementIds: {},
          activeTool: "selection",
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
};
