# Excalidraw Clone

A faithful recreation of [Excalidraw](https://excalidraw.com)'s core functionality, UX,
and architecture — built from scratch with React, TypeScript, Vite and rough.js.

## Setup

```bash
npm install
npm run dev       # start dev server (http://localhost:5173)
npm run build     # type-check + production build
npm run preview   # preview the production build
```

## Architecture

The design mirrors the major subsystems of the original Excalidraw repository:

| Subsystem | Original Excalidraw | This clone |
|---|---|---|
| Element model | `packages/element` — plain serializable objects with `version`/`seed` | `src/types.ts`, `src/elements/` |
| Scene + state | `Scene` class + `AppState`, React kept out of hot paths | `src/store/store.ts` (external store + `useSyncExternalStore`) |
| History | snapshot-based undo/redo stacks | `src/store/history.ts` |
| Rendering | single canvas, rough.js drawables cached per element version | `src/renderer/renderScene.ts`, `src/renderer/shapeCache.ts` |
| Interactions | giant `App` pointer state machine | `src/components/Canvas.tsx` (`PointerDownState` union) |
| Actions | `actionManager` | `src/actions/actions.ts` |
| Export/persist | `data/` (json, image, localStorage) | `src/data/json.ts`, `src/data/export.ts` |

### Folder structure

```
src/
├── types.ts                 # Element & AppState type definitions
├── constants.ts             # Palettes, defaults, shortcuts
├── math.ts                  # Geometry helpers (rotation, distances)
├── store/
│   ├── store.ts             # Centralized external store
│   └── history.ts           # Undo/redo snapshot stacks
├── elements/
│   ├── newElement.ts        # Element factories, mutate/duplicate
│   ├── bounds.ts            # AABB + rotated bounds
│   ├── hitTest.ts           # Outline/fill aware hit-testing
│   ├── transformHandles.ts  # Resize/rotate handle geometry
│   ├── resize.ts            # Resize math (aspect lock, flips, rotation pivot)
│   └── textMeasure.ts       # Canvas-based text measurement
├── renderer/
│   ├── shapeCache.ts        # rough.js drawable generation + version cache
│   └── renderScene.ts       # Full-scene canvas render w/ culling + selection UI
├── actions/actions.ts       # Clipboard, layering, zoom, delete, duplicate
├── data/
│   ├── json.ts              # .excalidraw save/load + localStorage autosave
│   └── export.ts            # PNG & SVG export
├── hooks/useKeyboard.ts     # Global shortcuts
├── components/
│   ├── Canvas.tsx           # Pointer interaction state machine
│   ├── Toolbar.tsx          # Top tool island
│   ├── StylePanel.tsx       # Left style island
│   ├── Footer.tsx           # Zoom + undo/redo
│   ├── Menu.tsx             # Hamburger menu (open/save/export/clear)
│   ├── TextEditor.tsx       # WYSIWYG textarea overlay
│   └── icons.tsx
├── App.tsx                  # Shell + persistence wiring
└── main.tsx
```

### Key engineering decisions

- **External store, not React state.** High-frequency updates (drag, draw,
  pan) write to a plain store and repaint via `requestAnimationFrame`; React
  components only re-render for UI chrome (toolbar, panel, zoom display).
- **Immutable elements with `version` numbers.** Every mutation produces a new
  object with a bumped version — this powers both cheap history snapshots
  (reference sharing) and rough.js shape-cache invalidation.
- **Deterministic sketchiness.** Each element carries a random `seed` passed
  to rough.js so shapes don't "wiggle" between repaints — same as Excalidraw.
- **Screen-constant UI on a zoomed canvas.** Selection borders/handles are
  drawn in scene space but sized by `1/zoom`.
- **Storage.** No database needed: autosave to `localStorage` (debounced),
  plus explicit `.excalidraw` JSON file save/load.

## Feature parity table

| Feature | Excalidraw | Clone |
|---|---|---|
| Infinite canvas, pan (space/middle-drag/wheel), wheel & pinch zoom | ✅ | ✅ |
| Tools: selection, rectangle, diamond, ellipse, arrow, line, draw, text | ✅ | ✅ |
| Tool lock (keep tool active) | ✅ | ✅ |
| Click-drag creation, shift = square/circle/15° snap | ✅ | ✅ |
| Resize handles (8), aspect-lock with shift, flipping | ✅ | ✅ |
| Rotation handle with 15° shift-snap | ✅ | ✅ |
| Multi-select (shift-click, marquee), group move | ✅ | ✅ |
| Duplicate (⌘D), copy/cut/paste, delete, select all | ✅ | ✅ |
| Stroke/background color, fill style, stroke width/style, sloppiness, opacity | ✅ | ✅ |
| Font family (hand-drawn/normal/code), size, alignment | ✅ | ✅ |
| Layering: bring/send forward/backward/front/back (⌘[ ⌘] ⌥⌘[ ⌥⌘]) | ✅ | ✅ |
| Undo/redo (⌘Z / ⌘⇧Z / ⌘Y) | ✅ | ✅ |
| Tool shortcuts (V/1, R/2, D/3, O/4, A/5, L/6, P/7, T/8) | ✅ | ✅ |
| Arrow-key nudge | ✅ | ✅ |
| PNG / SVG export (selection or all), styled | ✅ | ✅ |
| Save/load `.excalidraw` JSON, localStorage autosave & restore | ✅ | ✅ |
| Zoom controls + reset, scroll/zoom restore on load | ✅ | ✅ |
| Double-click text to edit | ✅ | ✅ |
| Element binding (arrows attached to shapes) | ✅ | ❌ (out of scope) |
| Real-time collaboration | ✅ | ❌ (out of scope) |
| Libraries, images, frames, dark mode | ✅ | ❌ (out of scope) |

## Testing plan

**Manual smoke tests**
1. Draw each shape type; verify hand-drawn appearance and a stable sketch (no re-randomizing).
2. Pan with space-drag and wheel; zoom with ⌘±, ctrl+wheel, pinch — verify zoom anchors at the cursor.
3. Select, multi-select via marquee and shift-click; move, resize (with/without shift), rotate (with/without shift).
4. Style every property with elements selected — confirm live updates and that new elements inherit the styles.
5. Undo/redo across creation, movement, deletion, style edits; confirm selection restoration.
6. Copy/paste/duplicate/delete via shortcuts and panel buttons.
7. Layering operations with overlapping shapes.
8. Text: click with T, type multi-line, blur to commit, double-click to re-edit, empty text discards.
9. Export PNG/SVG of all/selection; save & reload `.excalidraw` file; reload the page to verify autosave restore.

**Automated (suggested next step)**
- Unit tests (Vitest): `math.ts`, `hitTest.ts`, `resize.ts`, `history.ts`.
- Integration tests (React Testing Library + jsdom pointer events): drawing and selection flows.
- E2E (Playwright): full draw → style → export workflow, screenshot diffs.
