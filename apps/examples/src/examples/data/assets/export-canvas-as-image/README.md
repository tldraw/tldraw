---
title: Export canvas as image
component: ./ExportCanvasImageExample.tsx
priority: 2
keywords: [export, toimage, download, png, svg, blob, screenshot, canvas export, sharepanel]
---

Render every shape on the page to a PNG with `editor.toImage` and download it.

---

`editor.toImage(shapeIds, options)` renders a set of shapes to an image `Blob`. This example puts a button in the `SharePanel` slot that passes every shape on the current page, then downloads the resulting PNG using a temporary link with a `download` attribute.

Draw a few shapes and press "Export canvas as image". For the full set of export options (background, padding, scale, dark mode, custom bounds), see the [with settings](https://tldraw.dev/examples/export-canvas-settings) variant.
