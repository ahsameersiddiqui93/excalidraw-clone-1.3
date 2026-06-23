/**
 * Text editing overlay — a borderless textarea positioned exactly over the
 * text element in screen space, mirroring Excalidraw's WYSIWYG editor.
 * Commits on blur or Escape; Enter inserts newlines.
 */

import { useEffect, useRef } from "react";
import { store } from "../store/store";
import { measureText } from "../elements/textMeasure";
import { FONT_FAMILY_CSS } from "../constants";
import { mutateElement } from "../elements/newElement";

interface TextEditorProps {
  elementId: string;
  onClose: () => void;
}

export const TextEditor = ({ elementId, onClose }: TextEditorProps) => {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const element = store
    .getElements()
    .find((el) => el.id === elementId && !el.isDeleted);

  useEffect(() => {
    const textarea = ref.current;
    if (textarea) {
      textarea.focus();
      textarea.select();
    }
  }, []);

  if (!element || element.type !== "text") return null;

  const appState = store.getAppState();
  const { scrollX, scrollY, zoom } = appState;
  const fontSize = (element.fontSize ?? 20) * zoom;
  const screenX = element.x * zoom + scrollX;
  const screenY = element.y * zoom + scrollY;

  /** Resize element bounds to fit text and keep textarea in sync. */
  const handleChange = (value: string) => {
    const metrics = measureText(
      value || " ",
      element.fontSize ?? 20,
      element.fontFamily ?? "hand-drawn"
    );
    store.updateElements(
      (el) =>
        mutateElement(el, {
          text: value,
          width: metrics.width,
          height: metrics.height,
        }),
      new Set([elementId])
    );
  };

  /** Commit: drop empty text elements, otherwise record history. */
  const handleClose = () => {
    const current = store
      .getElements()
      .find((el) => el.id === elementId);
    if (current && !(current.text ?? "").trim()) {
      store.setElements(
        store.getElements().filter((el) => el.id !== elementId)
      );
      store.updateAppState({ selectedElementIds: {} });
    } else {
      store.commit();
    }
    store.updateAppState({ editingTextId: null });
    onClose();
  };

  return (
    <textarea
      ref={ref}
      className="text-editor"
      dir="auto"
      wrap="off"
      defaultValue={element.text ?? ""}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleClose}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
          handleClose();
        }
      }}
      style={{
        position: "fixed",
        left: screenX,
        top: screenY,
        fontSize,
        lineHeight: 1.25,
        fontFamily: FONT_FAMILY_CSS[element.fontFamily ?? "hand-drawn"],
        color: element.strokeColor,
        opacity: element.opacity / 100,
        textAlign: element.textAlign ?? "left",
        minWidth: 50,
        minHeight: fontSize * 1.25,
        width: Math.max(element.width * zoom + 20, 50),
        height: element.height * zoom + 10,
        transform: `rotate(${element.angle}rad)`,
        transformOrigin: "left top",
      }}
    />
  );
};
