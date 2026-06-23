/**
 * App shell — composes the canvas with all floating UI islands and wires up
 * global keyboard shortcuts and localStorage persistence.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Canvas } from "./components/Canvas";
import { Toolbar } from "./components/Toolbar";
import { StylePanel } from "./components/StylePanel";
import { Footer } from "./components/Footer";
import { Menu } from "./components/Menu";
import { TextEditor } from "./components/TextEditor";
import { useKeyboard } from "./hooks/useKeyboard";
import { store } from "./store/store";
import { loadFromLocalStorage, saveToLocalStorage } from "./data/json";

export const App = () => {
  const { appState } = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  useKeyboard();

  // Restore the previous session on first mount.
  useEffect(() => {
    loadFromLocalStorage();
  }, []);

  // Debounced auto-save to localStorage.
  useEffect(() => {
    const id = window.setTimeout(() => {
      saveToLocalStorage(store.getElements(), store.getAppState());
    }, 300);
    return () => window.clearTimeout(id);
  });

  const handleTextEdit = useCallback((elementId: string) => {
    store.updateAppState({ editingTextId: elementId });
    setEditingTextId(elementId);
  }, []);

  const handleTextEditClose = useCallback(() => {
    setEditingTextId(null);
  }, []);

  return (
    <div className="app">
      <Canvas onTextEdit={handleTextEdit} />
      {/* Floating UI layer */}
      <div className="ui-top">
        <Menu />
        <Toolbar />
        <div className="ui-top-spacer" />
      </div>
      <StylePanel />
      <Footer />
      {editingTextId && appState.editingTextId && (
        <TextEditor elementId={editingTextId} onClose={handleTextEditClose} />
      )}
    </div>
  );
};
