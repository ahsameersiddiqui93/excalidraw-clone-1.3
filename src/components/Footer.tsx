/**
 * Bottom-left floating controls: zoom out / percentage / zoom in,
 * plus undo & redo — matching Excalidraw's footer placement.
 */

import { useSyncExternalStore } from "react";
import { store } from "../store/store";
import { resetZoom, zoomIn, zoomOut } from "../actions/actions";
import { RedoIcon, UndoIcon } from "./icons";

export const Footer = () => {
  const { appState } = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return (
    <div className="footer">
      <div className="island zoom-controls">
        <button onClick={zoomOut} title="Zoom out (⌘-)">−</button>
        <button
          className="zoom-value"
          onClick={resetZoom}
          title="Reset zoom (⌘0)"
        >
          {Math.round(appState.zoom * 100)}%
        </button>
        <button onClick={zoomIn} title="Zoom in (⌘+)">+</button>
      </div>
      <div className="island undo-redo">
        <button onClick={() => store.undo()} title="Undo (⌘Z)">
          <UndoIcon size={16} />
        </button>
        <button onClick={() => store.redo()} title="Redo (⌘⇧Z)">
          <RedoIcon size={16} />
        </button>
      </div>
    </div>
  );
};
