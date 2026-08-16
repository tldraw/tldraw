---
title: Inset editor
component: ./InsetExample.tsx
priority: 0
keywords: [inline, embedded, non-fullscreen, layout, container, positioning, inset, wrapper]
---

Place the `Tldraw` component in a container that doesn't fill the screen.

---

The `Tldraw` component fills its container, and that container can be anywhere in your layout. Here it's an absolutely positioned box inset 100px from every edge of the page. Pointer events, keyboard shortcuts, camera, and UI all work the same as in a full-screen editor because the editor measures its own container rather than the window.

For examples with several fixed-size editors on one page, see [Inset editor (fixed sizes)](https://tldraw.dev/examples/inline).
