---
title: Annotation layer over a web page
component: ./McGrawHillExample.tsx
priority: 10
keywords: [annotation, iframe, background, overlay, education, mcgraw-hill, aleks, desmos, embed]
---

Use tldraw as an annotation layer on top of an existing web page.

---

This example loads a McGraw-Hill ALEKS assignment preview page inside an iframe
and renders a transparent tldraw editor on top of it. A custom floating
toolbar (eraser, pencil, line, clear, undo) replaces the page's built-in
drawing toolbar, and an "Insert Desmos graph" button drops a live, interactive
Desmos calculator onto the canvas as an embed shape.

Key techniques:

- `Background: null` in `components` removes tldraw's background so the
  iframe beneath shows through.
- `hideUi` hides the default toolbar and menus; we render our own via children
  of `<Tldraw>`.
- `editor.createShape({ type: 'embed', props: { url } })` inserts a Desmos
  graph using tldraw's built-in embed definitions.
