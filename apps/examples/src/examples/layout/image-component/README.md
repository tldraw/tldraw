---
title: Snapshot image component
component: ./TldrawImageExample.tsx
priority: 20
keywords:
  [
    tldrawimage,
    snapshot,
    display snapshot,
    read only,
    getsnapshot,
    store snapshot,
    tlstoresnapshot,
    format,
    svg,
    png,
  ]
---

Render a store snapshot as a static SVG or PNG image with the `TldrawImage` component.

---

`TldrawImage` takes a `TLStoreSnapshot` and renders it as an image, with no editor, canvas, or UI. It's a lightweight way to show a read-only preview of a document. Props like `pageId`, `bounds`, `background`, `darkMode`, `padding`, `scale`, and `format` control what gets rendered and how.

This example toggles between an editable `Tldraw` and a `TldrawImage` of the same document. Try editing the drawing, panning or zooming, switching to dark mode, then pressing "Save drawing": the image is regenerated with the editor's current page, viewport bounds, and theme. Use the format dropdown to switch between SVG and PNG output.
