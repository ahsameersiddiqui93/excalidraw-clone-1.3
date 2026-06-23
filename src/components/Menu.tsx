/**
 * Hamburger menu (top-left): open / save / export / clear canvas /
 * canvas background — mirrors Excalidraw's main menu.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { store } from "../store/store";
import { loadFromJSON, saveAsJSON } from "../data/json";
import { exportToPng, exportToSvg } from "../data/export";
import { clearCanvas } from "../actions/actions";
import { CANVAS_BACKGROUND_COLORS } from "../constants";
import { MenuIcon } from "./icons";

export const Menu = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const { appState } = useSyncExternalStore(store.subscribe, store.getSnapshot);

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  /** Export selection if present, otherwise everything. */
  const getExportElements = () => {
    const selected = store.getSelectedElements();
    return selected.length > 0 ? selected : store.getVisibleElements();
  };

  return (
    <div className="menu-container" ref={ref}>
      <button
        className="island menu-button"
        onClick={() => setOpen(!open)}
        title="Menu"
      >
        <MenuIcon size={18} />
      </button>
      {open && (
        <div className="island menu-dropdown">
          <button
            onClick={() => {
              void loadFromJSON();
              setOpen(false);
            }}
          >
            Open…
          </button>
          <button
            onClick={() => {
              saveAsJSON(store.getElements(), store.getAppState());
              setOpen(false);
            }}
          >
            Save to file
          </button>
          <button
            onClick={() => {
              exportToPng(getExportElements(), store.getAppState());
              setOpen(false);
            }}
          >
            Export image (PNG)
          </button>
          <button
            onClick={() => {
              exportToSvg(getExportElements(), store.getAppState());
              setOpen(false);
            }}
          >
            Export image (SVG)
          </button>
          <div className="menu-divider" />
          <button
            onClick={() => {
              clearCanvas();
              setOpen(false);
            }}
          >
            Reset the canvas
          </button>
          <div className="menu-divider" />
          <div className="menu-label">Canvas background</div>
          <div className="color-row menu-bg-row">
            {CANVAS_BACKGROUND_COLORS.map((color) => (
              <button
                key={color}
                className={`color-swatch ${
                  appState.viewBackgroundColor === color ? "active" : ""
                }`}
                style={{ backgroundColor: color }}
                onClick={() =>
                  store.updateAppState({ viewBackgroundColor: color })
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
