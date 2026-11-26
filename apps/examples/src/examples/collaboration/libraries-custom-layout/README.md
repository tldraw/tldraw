---
title: Custom libraries layout
component: ./LibrariesCustomLayoutExample.tsx
priority: 20
keywords: [libraries, library, hooks, headless, tray, layout, drag, custom ui]
---

Build your own libraries UI from the libraries hooks.

---

Instead of `LibrariesPanel`, this example lays the libraries out as a tray along the bottom of the canvas. Each library is a shelf that folds shut; its pieces place on click or drag, and "Add selection" saves the selected shapes to it. Everything comes from hooks such as `useLibraries`, `useLibraryItems` and `useLibraryItemDrag`, so the layout is entirely the host's.
