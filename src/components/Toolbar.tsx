/**
 * Top toolbar — tool buttons with number badges, matching Excalidraw's
 * floating "island" toolbar centered at the top of the screen.
 */

import { useSyncExternalStore } from "react";
import { store } from "../store/store";
import type { ToolType } from "../types";
import {
  SelectionIcon,
  RectangleIcon,
  DiamondIcon,
  EllipseIcon,
  ArrowIcon,
  LineIcon,
  DrawIcon,
  TextIcon,
  LockIcon,
} from "./icons";

const TOOLS: {
  type: ToolType;
  icon: () => JSX.Element;
  title: string;
  shortcut: string;
}[] = [
  { type: "selection", icon: () => <SelectionIcon />, title: "Selection", shortcut: "1" },
  { type: "rectangle", icon: () => <RectangleIcon />, title: "Rectangle", shortcut: "2" },
  { type: "diamond", icon: () => <DiamondIcon />, title: "Diamond", shortcut: "3" },
  { type: "ellipse", icon: () => <EllipseIcon />, title: "Ellipse", shortcut: "4" },
  { type: "arrow", icon: () => <ArrowIcon />, title: "Arrow", shortcut: "5" },
  { type: "line", icon: () => <LineIcon />, title: "Line", shortcut: "6" },
  { type: "draw", icon: () => <DrawIcon />, title: "Draw", shortcut: "7" },
  { type: "text", icon: () => <TextIcon />, title: "Text", shortcut: "8" },
];

export const Toolbar = () => {
  const { appState } = useSyncExternalStore(store.subscribe, store.getSnapshot);

  return (
    <div className="toolbar island">
      <button
        className={`tool-lock ${appState.toolLocked ? "active" : ""}`}
        title="Keep selected tool active after drawing"
        onClick={() =>
          store.updateAppState({ toolLocked: !appState.toolLocked })
        }
      >
        <LockIcon size={14} />
      </button>
      <div className="toolbar-divider" />
      {TOOLS.map((tool) => (
        <button
          key={tool.type}
          className={`tool-button ${
            appState.activeTool === tool.type ? "active" : ""
          }`}
          title={`${tool.title} — ${tool.shortcut}`}
          onClick={() =>
            store.updateAppState({
              activeTool: tool.type,
              ...(tool.type !== "selection"
                ? { selectedElementIds: {} }
                : {}),
            })
          }
        >
          {tool.icon()}
          <span className="tool-shortcut">{tool.shortcut}</span>
        </button>
      ))}
    </div>
  );
};
