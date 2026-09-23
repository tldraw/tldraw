---
title: PDF editor
component: ./PdfEditorExample.tsx
priority: 1
keywords:
  [
    pdf,
    annotation,
    camera options,
    constraints,
    zoom,
    pan,
    camera bounds,
    pan speed,
    zoom speed,
    scroll,
    document viewer,
  ]
---

Annotate a PDF on the canvas and export the result back to a PDF.

---

Each PDF page is rendered with `pdfjs-dist` and placed on the canvas as a locked image shape. Side effects keep those page shapes locked and below every other shape. Camera constraints (`editor.setCameraOptions`) confine the viewport to the document, with `contain` behavior so you can scroll through pages but not away from them.

The `OnTheCanvas` slot draws a translucent overlay around the pages, and the export button uses `editor.toImage` with per-page `bounds` to render the annotations for each page and stamp them onto the original PDF with `pdf-lib`.

Try it: open your own PDF or use the example, draw on it, then press "Export PDF".
