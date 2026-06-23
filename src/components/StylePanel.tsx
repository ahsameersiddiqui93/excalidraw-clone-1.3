/**
 * Left-side style panel ("island"). Shown when a shape tool is active or
 * elements are selected — same visibility rule as Excalidraw.
 *
 * Editing a style updates both the app-state defaults (for future elements)
 * and any currently-selected elements.
 */

import { useSyncExternalStore } from "react";
import { store } from "../store/store";
import { mutateElement } from "../elements/newElement";
import { measureText } from "../elements/textMeasure";
import {
  STROKE_COLORS,
  BACKGROUND_COLORS,
} from "../constants";
import {
  bringForward,
  bringToFront,
  sendBackward,
  sendToBack,
  deleteSelection,
  duplicateSelection,
} from "../actions/actions";
import type {
  AppStateStyles,
  ExcalidrawElement,
  FillStyle,
  FontFamily,
  StrokeStyle,
  TextAlign,
} from "../types";
import { TrashIcon } from "./icons";

/** Apply a style change to defaults + selected elements (with history). */
const applyStyle = (updates: Partial<AppStateStyles>) => {
  store.updateAppState(updates);
  const selected = store.getSelectedElements();
  if (selected.length > 0) {
    store.updateElements(
      (el) => {
        const next = mutateElement(el, updates as Partial<ExcalidrawElement>);
        // Re-measure text if font properties changed.
        if (
          el.type === "text" &&
          ("fontSize" in updates || "fontFamily" in updates)
        ) {
          const m = measureText(
            next.text ?? "",
            next.fontSize ?? 20,
            next.fontFamily ?? "hand-drawn"
          );
          next.width = m.width;
          next.height = m.height;
        }
        return next;
      },
      new Set(selected.map((el) => el.id)),
      true
    );
  }
};

export const StylePanel = () => {
  const { appState } = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const selected = store.getSelectedElements();

  const visible =
    appState.activeTool !== "selection" || selected.length > 0;
  if (!visible) return null;

  const hasText =
    appState.activeTool === "text" ||
    selected.some((el) => el.type === "text");
  const hasFillable =
    appState.activeTool !== "text" ||
    selected.some((el) => el.type !== "text");

  return (
    <div className="style-panel island">
      {/* Stroke color */}
      <Section label="Stroke">
        <div className="color-row">
          {STROKE_COLORS.map((color) => (
            <ColorSwatch
              key={color}
              color={color}
              active={appState.strokeColor === color}
              onClick={() => applyStyle({ strokeColor: color })}
            />
          ))}
          <input
            type="color"
            className="color-input"
            value={appState.strokeColor}
            onChange={(e) => applyStyle({ strokeColor: e.target.value })}
            title="Custom stroke color"
          />
        </div>
      </Section>

      {/* Background */}
      {hasFillable && (
        <Section label="Background">
          <div className="color-row">
            {BACKGROUND_COLORS.map((color) => (
              <ColorSwatch
                key={color}
                color={color}
                active={appState.backgroundColor === color}
                onClick={() => applyStyle({ backgroundColor: color })}
              />
            ))}
            <input
              type="color"
              className="color-input"
              value={
                appState.backgroundColor === "transparent"
                  ? "#ffffff"
                  : appState.backgroundColor
              }
              onChange={(e) =>
                applyStyle({ backgroundColor: e.target.value })
              }
              title="Custom background color"
            />
          </div>
        </Section>
      )}

      {/* Fill style */}
      {hasFillable && appState.backgroundColor !== "transparent" && (
        <Section label="Fill">
          <ButtonRow
            options={[
              { value: "hachure", label: "Hachure" },
              { value: "cross-hatch", label: "Cross" },
              { value: "solid", label: "Solid" },
            ]}
            value={appState.fillStyle}
            onChange={(v) => applyStyle({ fillStyle: v as FillStyle })}
          />
        </Section>
      )}

      {/* Stroke width */}
      <Section label="Stroke width">
        <ButtonRow
          options={[
            { value: "1", label: "Thin" },
            { value: "2", label: "Bold" },
            { value: "4", label: "Extra" },
          ]}
          value={String(appState.strokeWidth)}
          onChange={(v) => applyStyle({ strokeWidth: Number(v) })}
        />
      </Section>

      {/* Stroke style */}
      <Section label="Stroke style">
        <ButtonRow
          options={[
            { value: "solid", label: "—" },
            { value: "dashed", label: "- -" },
            { value: "dotted", label: "···" },
          ]}
          value={appState.strokeStyle}
          onChange={(v) => applyStyle({ strokeStyle: v as StrokeStyle })}
        />
      </Section>

      {/* Roughness (sloppiness) */}
      <Section label="Sloppiness">
        <ButtonRow
          options={[
            { value: "0", label: "Draft" },
            { value: "1", label: "Artist" },
            { value: "2", label: "Cartoon" },
          ]}
          value={String(appState.roughness)}
          onChange={(v) => applyStyle({ roughness: Number(v) })}
        />
      </Section>

      {/* Font controls */}
      {hasText && (
        <>
          <Section label="Font size">
            <ButtonRow
              options={[
                { value: "16", label: "S" },
                { value: "20", label: "M" },
                { value: "28", label: "L" },
                { value: "36", label: "XL" },
              ]}
              value={String(appState.fontSize)}
              onChange={(v) => applyStyle({ fontSize: Number(v) })}
            />
          </Section>
          <Section label="Font family">
            <ButtonRow
              options={[
                { value: "hand-drawn", label: "✎" },
                { value: "normal", label: "A" },
                { value: "code", label: "{}" },
              ]}
              value={appState.fontFamily}
              onChange={(v) => applyStyle({ fontFamily: v as FontFamily })}
            />
          </Section>
          <Section label="Text align">
            <ButtonRow
              options={[
                { value: "left", label: "⇤" },
                { value: "center", label: "⇔" },
                { value: "right", label: "⇥" },
              ]}
              value={appState.textAlign}
              onChange={(v) => applyStyle({ textAlign: v as TextAlign })}
            />
          </Section>
        </>
      )}

      {/* Opacity */}
      <Section label="Opacity">
        <input
          type="range"
          min={0}
          max={100}
          step={10}
          value={appState.opacity}
          onChange={(e) => applyStyle({ opacity: Number(e.target.value) })}
          className="opacity-slider"
        />
      </Section>

      {/* Layers + actions, only with a selection */}
      {selected.length > 0 && (
        <>
          <Section label="Layers">
            <div className="button-row">
              <button title="Send to back (⌥⌘[)" onClick={sendToBack}>⤓</button>
              <button title="Send backward (⌘[)" onClick={sendBackward}>↓</button>
              <button title="Bring forward (⌘])" onClick={bringForward}>↑</button>
              <button title="Bring to front (⌥⌘])" onClick={bringToFront}>⤒</button>
            </div>
          </Section>
          <Section label="Actions">
            <div className="button-row">
              <button title="Duplicate (⌘D)" onClick={duplicateSelection}>⧉</button>
              <button title="Delete (⌫)" onClick={deleteSelection}>
                <TrashIcon size={16} />
              </button>
            </div>
          </Section>
        </>
      )}
    </div>
  );
};

const Section = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="panel-section">
    <div className="panel-label">{label}</div>
    {children}
  </div>
);

const ColorSwatch = ({
  color,
  active,
  onClick,
}: {
  color: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    className={`color-swatch ${active ? "active" : ""} ${
      color === "transparent" ? "transparent" : ""
    }`}
    style={color === "transparent" ? {} : { backgroundColor: color }}
    onClick={onClick}
    title={color}
  />
);

const ButtonRow = ({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="button-row">
    {options.map((opt) => (
      <button
        key={opt.value}
        className={value === opt.value ? "active" : ""}
        onClick={() => onChange(opt.value)}
      >
        {opt.label}
      </button>
    ))}
  </div>
);
