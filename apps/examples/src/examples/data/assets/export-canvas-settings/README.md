---
title: Export canvas as image (with settings)
component: ./ExportCanvasImageSettingsExample.tsx
priority: 2
keywords:
  [
    toimage,
    export,
    download,
    png,
    svg,
    blob,
    background,
    padding,
    scale,
    darkmode,
    bounds,
    box,
    tlimageexportoptions,
  ]
---

Try each `TLImageExportOptions` setting (background, dark mode, padding, scale, bounds) when exporting with `editor.toImage`.

---

Builds on the [Export canvas as image](https://tldraw.dev/examples/export-canvas-as-image) example with a control panel for the options `editor.toImage` accepts: `background`, `darkMode`, `padding`, `scale`, and a page-space `bounds` box that crops the export instead of fitting it to the shapes. The box starts at the current viewport; set its width or height to 0 to fit all shapes again.

Draw something, adjust the settings, and press "Export canvas as image" to download a PNG.
